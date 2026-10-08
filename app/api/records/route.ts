import { NextRequest, NextResponse } from "next/server";
import { connectAdminDb, AdminReceipt, AdminShipment } from "@/lib/db";

export interface UnifiedRecordItem {
  id: string;
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
      } else if (q.toUpperCase().startsWith("PKG-")) {
        // Direct primary key index lookup on shipments
        receiptFilter._id = { $exists: false };
        shipmentFilter._id = q.toUpperCase();
      } else if (q.toUpperCase().startsWith("RST-")) {
        // Direct indexed lookup on shipment tracking code
        receiptFilter._id = { $exists: false };
        shipmentFilter.trackingCode = q.toUpperCase();
      } else {
        const regex = new RegExp(q, "i");
        receiptFilter.$or = [
          { _id: regex },
          { merchantName: regex },
          { customerName: regex },
          { customerPhone: regex },
        ];
        shipmentFilter.$or = [
          { _id: regex },
          { trackingCode: regex },
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
      const receipts = await AdminReceipt.find(receiptFilter)
        .select("_id merchantAddress merchantName total currency status onChainStatus createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      paginated = receipts.map((r) => {
        const isVoided = (r.status || "").toLowerCase() === "voided";
        return {
          id: r._id,
          recordType: "receipt",
          merchantOrShipper: r.merchantAddress,
          merchantName: r.merchantName || undefined,
          detail: `${r.currency || "NGN"} ${r.total.toLocaleString()}`,
          status: isVoided ? "Voided" : "Issued",
          isVoidedOrDisputed: isVoided,
          onChainStatus: r.onChainStatus || "anchored",
          createdAt: r.createdAt,
        };
      });
    } else if (recordType === "shipments") {
      const shipments = await AdminShipment.find(shipmentFilter)
        .select("_id shipperAddress trackingCode status isDisputed onChainStatus createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      paginated = shipments.map((s) => {
        const isDisputed = Boolean(s.isDisputed) || (s.status || "").toLowerCase() === "disputed";
        return {
          id: s._id,
          recordType: "shipment",
          merchantOrShipper: s.shipperAddress,
          detail: s.trackingCode || "PKG Label",
          status: s.status,
          isVoidedOrDisputed: isDisputed,
          onChainStatus: s.onChainStatus || "anchored",
          createdAt: s.createdAt,
        };
      });
    } else {
      // Merged query: fetch up to skip + limit from both, sort, and slice
      const fetchDepth = skip + limit;
      const [receipts, shipments] = await Promise.all([
        AdminReceipt.find(receiptFilter)
          .select("_id merchantAddress merchantName total currency status onChainStatus createdAt")
          .sort({ createdAt: -1 })
          .limit(fetchDepth)
          .lean(),
        AdminShipment.find(shipmentFilter)
          .select("_id shipperAddress trackingCode status isDisputed onChainStatus createdAt")
          .sort({ createdAt: -1 })
          .limit(fetchDepth)
          .lean(),
      ]);

      const merged: UnifiedRecordItem[] = [];

      for (const r of receipts) {
        const isVoided = (r.status || "").toLowerCase() === "voided";
        merged.push({
          id: r._id,
          recordType: "receipt",
          merchantOrShipper: r.merchantAddress,
          merchantName: r.merchantName || undefined,
          detail: `${r.currency || "NGN"} ${r.total.toLocaleString()}`,
          status: isVoided ? "Voided" : "Issued",
          isVoidedOrDisputed: isVoided,
          onChainStatus: r.onChainStatus || "anchored",
          createdAt: r.createdAt,
        });
      }

      for (const s of shipments) {
        const isDisputed = Boolean(s.isDisputed) || (s.status || "").toLowerCase() === "disputed";
        merged.push({
          id: s._id,
          recordType: "shipment",
          merchantOrShipper: s.shipperAddress,
          detail: s.trackingCode || "PKG Label",
          status: s.status,
          isVoidedOrDisputed: isDisputed,
          onChainStatus: s.onChainStatus || "anchored",
          createdAt: s.createdAt,
        });
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
