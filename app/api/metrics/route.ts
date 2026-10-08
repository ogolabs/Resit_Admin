import { NextResponse } from "next/server";
import { connectAdminDb, AdminReceipt, AdminShipment, AdminUser } from "@/lib/db";
import { getRelayerStatus } from "@/lib/chain";

const DEFAULT_CURRENCY_MAP: Record<string, string> = {
  NG: "NGN",
  US: "USD",
  GB: "GBP",
  GH: "GHS",
  KE: "KES",
  CA: "CAD",
  ZA: "ZAR",
  FR: "EUR",
  DE: "EUR",
  AE: "AED",
  JP: "JPY",
  CN: "CNY",
  IN: "INR",
};

let regionNames: Intl.DisplayNames | null = null;
function getCountryName(code: string): string {
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code) || code;
  } catch {
    return code;
  }
}

export async function GET() {
  try {
    await connectAdminDb();

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      issuedSalesAgg,
      voidedSalesAgg,
      issuedReceiptCount,
      voidedReceiptCount,
      merchantCount,
      shipmentCountsByStatus,
      relayerStatus,
      unanchoredCount,
      activeDisputesCount,
      dailyReceiptsAgg,
      dailyShipmentsAgg,
      countryAgg,
      latestReceipts,
      latestShipments,
    ] = await Promise.all([
      AdminReceipt.aggregate<{ _id: string; totalGmv: number; count: number }>([
        { $match: { status: { $in: ["Issued", "issued"] } } },
        {
          $group: {
            _id: "$currency",
            totalGmv: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
      AdminReceipt.aggregate<{ _id: string; totalVoided: number; count: number }>([
        { $match: { status: { $in: ["Voided", "voided"] } } },
        {
          $group: {
            _id: "$currency",
            totalVoided: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
      AdminReceipt.countDocuments({ status: { $in: ["Issued", "issued"] } }),
      AdminReceipt.countDocuments({ status: { $in: ["Voided", "voided"] } }),
      AdminUser.countDocuments({
        $or: [{ role: "merchant" }, { hasMerchantProfile: true }, { companyName: { $exists: true, $ne: null } }],
      }),
      AdminShipment.aggregate<{ _id: string; count: number }>([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      getRelayerStatus(),
      AdminReceipt.countDocuments({
        $or: [
          { onChainStatus: "failed" },
          { onChainStatus: "pending", createdAt: { $lt: fiveMinutesAgo } },
          {
            onChainTxHash: null,
            status: { $in: ["Issued", "issued"] },
            createdAt: { $lt: fiveMinutesAgo },
          },
        ],
      }),
      AdminShipment.countDocuments({
        $and: [
          { $or: [{ status: "Disputed" }, { isDisputed: true }] },
          { disputeResolved: { $ne: true } },
        ],
      }),
      AdminReceipt.aggregate<{ _id: string; count: number; gmv: number }>([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            gmv: {
              $sum: {
                $cond: [{ $in: ["$status", ["Issued", "issued"]] }, "$total", 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AdminShipment.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AdminUser.aggregate<{ _id: string | null; count: number }>([
        {
          $group: {
            _id: "$country",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      AdminReceipt.find()
        .select("_id merchantAddress merchantName total currency status createdAt")
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
      AdminShipment.find()
        .select("_id shipperAddress trackingCode status createdBy metadata createdAt")
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
    ]);

    // Format currency sums for issued receipts (Active GMV)
    let gmvNgn = 0;
    let gmvUsd = 0;
    for (const item of issuedSalesAgg) {
      if (item._id === "USD") {
        gmvUsd += item.totalGmv;
      } else {
        gmvNgn += item.totalGmv;
      }
    }

    // Format currency sums for voided receipts
    let voidedNgn = 0;
    let voidedUsd = 0;
    for (const item of voidedSalesAgg) {
      if (item._id === "USD") {
        voidedUsd += item.totalVoided;
      } else {
        voidedNgn += item.totalVoided;
      }
    }

    const totalReceipts = issuedReceiptCount + voidedReceiptCount;
    const voidRatePercent = totalReceipts > 0 ? (voidedReceiptCount / totalReceipts) * 100 : 0;

    // Format shipment status map
    const custodyMap: Record<string, number> = {
      Created: 0,
      InTransit: 0,
      Delivered: 0,
      Verified: 0,
      Disputed: activeDisputesCount,
    };

    for (const item of shipmentCountsByStatus) {
      if (item._id && typeof item.count === "number" && item._id !== "Disputed") {
        custodyMap[item._id] = item.count;
      }
    }

    // Evaluate live incident count
    const relayerBalanceNum = parseFloat(relayerStatus.balanceEtn || "0");
    const relayerGasIncident = relayerBalanceNum < 50 ? 1 : 0;
    const totalActiveIncidents = unanchoredCount + activeDisputesCount + relayerGasIncident;

    // Format 7-Day Continuous Time Series
    const dailyReceiptsMap = new Map(dailyReceiptsAgg.map((r) => [r._id, r]));
    const dailyShipmentsMap = new Map(dailyShipmentsAgg.map((s) => [s._id, s]));

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyActivity: Array<{
      date: string;
      label: string;
      receiptsCount: number;
      shipmentsCount: number;
      gmvNgn: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = dayLabels[d.getUTCDay()];
      const dayNumber = d.getUTCDate();
      const rItem = dailyReceiptsMap.get(dateStr) || { count: 0, gmv: 0 };
      const sItem = dailyShipmentsMap.get(dateStr) || { count: 0 };

      dailyActivity.push({
        date: dateStr,
        label: `${dayName} ${dayNumber}`,
        receiptsCount: rItem.count,
        shipmentsCount: sItem.count,
        gmvNgn: rItem.gmv,
      });
    }

    // Format Country Distribution
    const totalUsers = countryAgg.reduce((acc, c) => acc + c.count, 0) || 1;
    const countryMap = new Map<string, number>();

    for (const c of countryAgg) {
      if (!c._id) continue;
      const code = String(c._id).toUpperCase().trim();
      if (!code) continue;
      const existing = countryMap.get(code) || 0;
      countryMap.set(code, existing + c.count);
    }

    // If merchants exist but had unassigned country field (legacy records), assign to NG primary market
    if (countryMap.size === 0 && countryAgg.length > 0) {
      const totalUnassigned = countryAgg.reduce((acc, c) => acc + c.count, 0);
      if (totalUnassigned > 0) {
        countryMap.set("NG", totalUnassigned);
      }
    }

    const countryDistribution: Array<{
      code: string;
      name: string;
      count: number;
      percentage: number;
      currency: string;
    }> = [];

    for (const [code, count] of countryMap.entries()) {
      const countryName = getCountryName(code);
      const currency = DEFAULT_CURRENCY_MAP[code] || "NGN";
      const percentage = Math.round((count / totalUsers) * 100);
      countryDistribution.push({
        code,
        name: countryName,
        count,
        percentage,
        currency,
      });
    }

    countryDistribution.sort((a, b) => b.count - a.count);

    // Format Recent Events
    const recentEvents: Array<{
      id: string;
      rawId?: string;
      recordType: "receipt" | "shipment";
      merchantName?: string;
      detail: string;
      status: string;
      createdAt: Date;
    }> = [];

    for (const r of latestReceipts) {
      recentEvents.push({
        id: r._id,
        rawId: r._id,
        recordType: "receipt",
        merchantName: r.merchantName || undefined,
        detail: `${r.currency || "NGN"} ${r.total.toLocaleString()}`,
        status: (r.status || "Issued").toLowerCase() === "voided" ? "Voided" : "Issued",
        createdAt: r.createdAt,
      });
    }

    for (const s of latestShipments) {
      const normalId =
        s.trackingCode ||
        (s._id.startsWith("0x") ? `SHPT-${s._id.slice(2, 14).toUpperCase()}` : s._id);

      const meta = s.metadata as Record<string, unknown> | undefined;
      let detail = "Package Dispatch";
      if (meta?.name && meta?.destination) {
        detail = `${meta.name} → ${meta.destination}`;
      } else if (meta?.name) {
        detail = String(meta.name);
      }

      recentEvents.push({
        id: normalId,
        rawId: s._id,
        recordType: "shipment",
        merchantName: s.createdBy?.name || undefined,
        detail,
        status: s.status,
        createdAt: s.createdAt,
      });
    }

    recentEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const topRecentEvents = recentEvents.slice(0, 5);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      gmv: {
        ngn: gmvNgn,
        usd: gmvUsd,
        formattedNgn: `₦${gmvNgn.toLocaleString()}`,
        formattedUsd: `$${gmvUsd.toLocaleString()}`,
      },
      voided: {
        count: voidedReceiptCount,
        ratePercent: voidRatePercent.toFixed(1),
        totalNgn: voidedNgn,
        totalUsd: voidedUsd,
        formattedNgn: `₦${voidedNgn.toLocaleString()}`,
        formattedUsd: `$${voidedUsd.toLocaleString()}`,
      },
      counts: {
        totalReceipts,
        issuedReceipts: issuedReceiptCount,
        voidedReceipts: voidedReceiptCount,
        merchants: merchantCount,
      },
      relayer: {
        address: relayerStatus.address,
        isLowBalance: relayerStatus.isLowBalance,
        balanceEtn: relayerStatus.balanceEtn,
        unanchoredQueue: unanchoredCount,
        network: relayerStatus.network,
      },
      incidents: {
        activeCount: totalActiveIncidents,
        activeDisputes: activeDisputesCount,
        unanchoredQueue: unanchoredCount,
      },
      custody: custodyMap,
      dailyActivity,
      countryDistribution,
      recentEvents: topRecentEvents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to aggregate metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
