import { NextRequest, NextResponse } from "next/server";
import { connectAdminDb, AdminReceipt, AdminShipment, AdminUser, IShipmentDoc, IReceiptDoc } from "@/lib/db";

export interface UnifiedRecordItem {
  id: string;
  rawId?: string;
  recordType: "receipt" | "shipment";
  merchantOrShipper: string;
  merchantName?: string;
  detail: string;
  status: string;
  isVoidedOrDisputed: boolean;
  onChainStatus: string;
  createdAt: Date;
}

export async function GET(req: NextRequest) {
  try {
    await connectAdminDb();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const recordType = searchParams.get("type") || "all";
    const statusFilter = (searchParams.get("status") || "all").toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const queryReceipts = recordType === "all" || recordType === "receipts";
    const queryShipments = recordType === "all" || recordType === "shipments";

    const receiptFilter: Record<string, unknown> = {};
    const shipmentFilter: Record<string, unknown> = {};

    // MongoDB Index-aware filter routing
    if (q) {
      if (q.startsWith("0x") && q.length === 42) {
        // Direct indexed lookup on merchantAddress / shipperAddress
        const lowerAddress = q.toLowerCase();
        receiptFilter.merchantAddress = lowerAddress;
        shipmentFilter.shipperAddress = lowerAddress;
      } else if (q.toUpperCase().startsWith("REC-")) {
        // Direct primary key index lookup on receipts
        receiptFilter._id = q.toUpperCase();
        shipmentFilter._id = { $exists: false };
      } else if (
        q.toUpperCase().startsWith("SHPT-") ||
        q.toUpperCase().startsWith("RCV-") ||
        q.toUpperCase().startsWith("RST-") ||
        q.toUpperCase().startsWith("PKG-")
      ) {
        // Direct indexed lookup on shipment tracking code
        receiptFilter._id = { $exists: false };
        shipmentFilter.$or = [
          { trackingCode: q.toUpperCase() },
          { _id: q.toLowerCase() },
          { _id: q },
        ];
      } else {
        const regex = new RegExp(q, "i");
        // Also match merchants by updated companyName or fullName
        const matchingUsers = await AdminUser.find({
          $or: [{ companyName: regex }, { fullName: regex }],
        })
          .select("_id eoaAddress walletPublicAddress")
          .lean();
        const userAddrs = matchingUsers
          .flatMap((u) => [u._id, u.eoaAddress, u.walletPublicAddress])
          .filter(Boolean)
          .map((a) => (a as string).toLowerCase());

        receiptFilter.$or = [
          { _id: regex },
          { merchantName: regex },
          { customerName: regex },
          { customerPhone: regex },
          ...(userAddrs.length > 0 ? [{ merchantAddress: { $in: userAddrs } }] : []),
        ];
        shipmentFilter.$or = [
          { _id: regex },
          { trackingCode: regex },
          { "createdBy.name": regex },
          { "metadata.name": regex },
          { "metadata.receiverName": regex },
          { "metadata.destination": regex },
          ...(userAddrs.length > 0 ? [{ shipperAddress: { $in: userAddrs } }] : []),
        ];
      }
    }

    if (statusFilter !== "all") {
      if (statusFilter === "issued") {
        receiptFilter.status = { $in: ["Issued", "issued"] };
        shipmentFilter.status = { $in: ["Created", "InTransit"] };
      } else if (statusFilter === "voided") {
        receiptFilter.status = { $in: ["Voided", "voided"] };
        shipmentFilter._id = { $exists: false };
      } else if (statusFilter === "delivered" || statusFilter === "verified") {
        receiptFilter._id = { $exists: false };
        shipmentFilter.status = { $in: ["Delivered", "Verified"] };
      } else if (statusFilter === "disputed") {
        receiptFilter._id = { $exists: false };
        shipmentFilter.$or = [{ status: "Disputed" }, { isDisputed: true }];
      }
    }

    // Parallel count queries for metrics and pagination
    const [receiptCount, shipmentCount, receiptAnchored, shipmentAnchored, receiptVoided, shipmentDisputed] =
      await Promise.all([
        queryReceipts ? AdminReceipt.countDocuments(receiptFilter) : 0,
        queryShipments ? AdminShipment.countDocuments(shipmentFilter) : 0,
        queryReceipts ? AdminReceipt.countDocuments({ ...receiptFilter, onChainStatus: "anchored" }) : 0,
        queryShipments ? AdminShipment.countDocuments({ ...shipmentFilter, onChainStatus: "anchored" }) : 0,
        queryReceipts ? AdminReceipt.countDocuments({ ...receiptFilter, status: { $in: ["Voided", "voided"] } }) : 0,
        queryShipments ? AdminShipment.countDocuments({ ...shipmentFilter, $or: [{ status: "Disputed" }, { isDisputed: true }] }) : 0,
      ]);

    const total = receiptCount + shipmentCount;
    const anchoredCount = receiptAnchored + shipmentAnchored;
    const voidedOrDisputedCount = receiptVoided + shipmentDisputed;

    // Lean projected queries to minimize database I/O & memory footprint
    let paginated: UnifiedRecordItem[] = [];

    if (recordType === "receipts") {
      const rawReceipts = await AdminReceipt.find(receiptFilter)
        .select("_id merchantAddress merchantName businessName total currency status onChainStatus createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const receipts = rawReceipts as unknown as IReceiptDoc[];
      const merchantLookup = await buildMerchantLookupMap(receipts.map((r) => r.merchantAddress));
      paginated = receipts.map((r) => mapReceiptRecord(r, merchantLookup));
    } else if (recordType === "shipments") {
      const rawShipments = await AdminShipment.find(shipmentFilter)
        .select("_id shipperAddress trackingCode status isDisputed createdBy metadata onChainStatus createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const shipments = rawShipments as unknown as IShipmentDoc[];
      const merchantLookup = await buildMerchantLookupMap(shipments.map((s) => s.shipperAddress));
      paginated = shipments.map((s) => mapShipmentRecord(s, merchantLookup));
    } else {
      // Merged query: fetch up to skip + limit from both, sort, and slice
      const fetchDepth = skip + limit;
      const [rawReceipts, rawShipments] = await Promise.all([
        AdminReceipt.find(receiptFilter)
          .select("_id merchantAddress merchantName businessName total currency status onChainStatus createdAt")
          .sort({ createdAt: -1 })
          .limit(fetchDepth)
          .lean(),
        AdminShipment.find(shipmentFilter)
          .select("_id shipperAddress trackingCode status isDisputed createdBy metadata onChainStatus createdAt")
          .sort({ createdAt: -1 })
          .limit(fetchDepth)
          .lean(),
      ]);

      const receipts = rawReceipts as unknown as IReceiptDoc[];
      const shipments = rawShipments as unknown as IShipmentDoc[];
      const merchantLookup = await buildMerchantLookupMap([
        ...receipts.map((r) => r.merchantAddress),
        ...shipments.map((s) => s.shipperAddress),
      ]);

      const merged: UnifiedRecordItem[] = [];

      for (const r of receipts) {
        merged.push(mapReceiptRecord(r, merchantLookup));
      }

      for (const s of shipments) {
        merged.push(mapShipmentRecord(s, merchantLookup));
      }

      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      paginated = merged.slice(skip, skip + limit);
    }

    return NextResponse.json({
      records: paginated,
      total,
      receiptCount,
      shipmentCount,
      anchoredCount,
      voidedOrDisputedCount,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function buildMerchantLookupMap(addresses: string[]): Promise<Map<string, string>> {
  const lookupMap = new Map<string, string>();
  const uniqueAddresses = Array.from(new Set(addresses.map((a) => (a || "").toLowerCase()))).filter(Boolean);
  if (uniqueAddresses.length === 0) return lookupMap;

  const users = await AdminUser.find({
    $or: [
      { _id: { $in: uniqueAddresses } },
      { eoaAddress: { $in: uniqueAddresses } },
      { walletPublicAddress: { $in: uniqueAddresses } },
    ],
  })
    .select("_id eoaAddress walletPublicAddress companyName fullName")
    .lean();

  for (const u of users) {
    const name = u.companyName || u.fullName;
    if (name) {
      if (u._id) lookupMap.set(u._id.toLowerCase(), name);
      if (u.eoaAddress) lookupMap.set(u.eoaAddress.toLowerCase(), name);
      if (u.walletPublicAddress) lookupMap.set(u.walletPublicAddress.toLowerCase(), name);
    }
  }

  return lookupMap;
}

function mapReceiptRecord(
  r: IReceiptDoc,
  merchantLookupMap: Map<string, string>
): UnifiedRecordItem {
  const isVoided = (r.status || "").toLowerCase() === "voided";
  const merchantName =
    merchantLookupMap.get((r.merchantAddress || "").toLowerCase()) ||
    r.businessName ||
    r.merchantName ||
    undefined;

  return {
    id: r._id,
    rawId: r._id,
    recordType: "receipt",
    merchantOrShipper: r.merchantAddress,
    merchantName,
    detail: `${r.currency || "NGN"} ${r.total.toLocaleString()}`,
    status: isVoided ? "Voided" : "Issued",
    isVoidedOrDisputed: isVoided,
    onChainStatus: r.onChainStatus || "anchored",
    createdAt: r.createdAt,
  };
}

function mapShipmentRecord(
  s: IShipmentDoc,
  merchantLookupMap: Map<string, string>
): UnifiedRecordItem {
  const isDisputed = Boolean(s.isDisputed) || (s.status || "").toLowerCase() === "disputed";
  const normalId =
    s.trackingCode ||
    (s._id.startsWith("0x") ? `SHPT-${s._id.slice(2, 14).toUpperCase()}` : s._id);

  const merchantName =
    merchantLookupMap.get((s.shipperAddress || "").toLowerCase()) ||
    s.createdBy?.name ||
    (s.metadata?.merchantName as string | undefined) ||
    undefined;

  const meta = s.metadata as Record<string, unknown> | undefined;
  let detail = "Package Dispatch";
  if (meta) {
    const pkgName = (meta.name as string) || "Package";
    const destination = (meta.destination as string) || "";
    if (destination) {
      detail = `${pkgName} → ${destination}`;
    } else if (meta.receiptNumber) {
      detail = `${pkgName} (${meta.receiptNumber})`;
    } else {
      detail = pkgName;
    }
  } else if (s.trackingCode) {
    detail = "Tracked Parcel";
  }

  return {
    id: normalId,
    rawId: s._id,
    recordType: "shipment",
    merchantOrShipper: s.shipperAddress,
    merchantName,
    detail,
    status: s.status,
    isVoidedOrDisputed: isDisputed,
    onChainStatus: s.onChainStatus || "anchored",
    createdAt: s.createdAt,
  };
}
