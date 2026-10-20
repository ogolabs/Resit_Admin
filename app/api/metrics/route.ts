import { NextResponse } from "next/server";
import { connectAdminDb, AdminReceipt, AdminShipment, AdminUser } from "@/lib/db";
import { getRelayerStatus } from "@/lib/chain";
import {
  getPendingQueueReceiptFilter,
  getPendingQueueShipmentFilter,
  getUnanchoredReceiptFilter,
  getUnanchoredShipmentFilter,
  healDriftedAnchors,
} from "@/lib/ledger-queries";
import { convertToUsd, convertUsdToNgn, formatMoney } from "@/lib/currency";

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
    void healDriftedAnchors();

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
      pendingReceiptCount,
      pendingShipmentCount,
      unanchoredReceiptCount,
      unanchoredShipmentCount,
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
      AdminReceipt.countDocuments(getPendingQueueReceiptFilter()),
      AdminShipment.countDocuments(getPendingQueueShipmentFilter()),
      AdminReceipt.countDocuments(getUnanchoredReceiptFilter(fiveMinutesAgo)),
      AdminShipment.countDocuments(getUnanchoredShipmentFilter(fiveMinutesAgo)),
      AdminShipment.countDocuments({
        $and: [
          { $or: [{ status: "Disputed" }, { isDisputed: true }] },
          { disputeResolved: { $ne: true } },
        ],
      }),
      AdminReceipt.aggregate<{ _id: { date: string; currency: string }; count: number; total: number }>([
        { $match: { createdAt: { $gte: sevenDaysAgo }, status: { $in: ["Issued", "issued"] } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              currency: { $ifNull: ["$currency", "NGN"] },
            },
            count: { $sum: 1 },
            total: { $sum: "$total" },
          },
        },
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

    // Format currency sums for issued receipts (Active GMV normalized in USD and tracked by currency)
    let totalGmvUsd = 0;
    let gmvNgn = 0;
    const byCurrency: Record<
      string,
      { currency: string; total: number; formatted: string; count: number; usdValue: number }
    > = {};

    for (const item of issuedSalesAgg) {
      const curr = (item._id || "NGN").toUpperCase();
      const usdVal = convertToUsd(item.totalGmv, curr);
      totalGmvUsd += usdVal;

      if (curr === "NGN") {
        gmvNgn += item.totalGmv;
      }

      byCurrency[curr] = {
        currency: curr,
        total: item.totalGmv,
        formatted: formatMoney(item.totalGmv, curr),
        count: item.count,
        usdValue: usdVal,
      };
    }

    // Format currency sums for voided receipts
    let totalVoidedUsd = 0;
    let voidedNgn = 0;
    for (const item of voidedSalesAgg) {
      const curr = (item._id || "NGN").toUpperCase();
      const usdVal = convertToUsd(item.totalVoided, curr);
      totalVoidedUsd += usdVal;

      if (curr === "NGN") {
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

    // Evaluate live queue & incident counts
    const pendingQueueCount = pendingReceiptCount + pendingShipmentCount;
    const unanchoredCount = unanchoredReceiptCount + unanchoredShipmentCount;
    const relayerBalanceNum = parseFloat(relayerStatus.balanceEtn || "0");
    const relayerGasIncident = relayerBalanceNum < 50 ? 1 : 0;
    const totalActiveIncidents = pendingQueueCount + activeDisputesCount + relayerGasIncident;

    // Format 7-Day Continuous Time Series
    const dailyReceiptsMap = new Map<string, { count: number; gmvUsd: number; gmvNgn: number }>();
    for (const item of dailyReceiptsAgg) {
      const dateStr = item._id.date;
      const curr = item._id.currency || "NGN";
      const existing = dailyReceiptsMap.get(dateStr) || { count: 0, gmvUsd: 0, gmvNgn: 0 };
      const usdVal = convertToUsd(item.total, curr);
      existing.count += item.count;
      existing.gmvUsd += usdVal;
      existing.gmvNgn += convertUsdToNgn(usdVal);
      dailyReceiptsMap.set(dateStr, existing);
    }
    const dailyShipmentsMap = new Map(dailyShipmentsAgg.map((s) => [s._id, s]));

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyActivity: Array<{
      date: string;
      label: string;
      receiptsCount: number;
      shipmentsCount: number;
      gmvUsd: number;
      gmvNgn: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = dayLabels[d.getUTCDay()];
      const dayNumber = d.getUTCDate();
      const rItem = dailyReceiptsMap.get(dateStr) || { count: 0, gmvUsd: 0, gmvNgn: 0 };
      const sItem = dailyShipmentsMap.get(dateStr) || { count: 0 };

      dailyActivity.push({
        date: dateStr,
        label: `${dayName} ${dayNumber}`,
        receiptsCount: rItem.count,
        shipmentsCount: sItem.count,
        gmvUsd: rItem.gmvUsd,
        gmvNgn: rItem.gmvNgn,
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
        detail: formatMoney(r.total, r.currency),
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

    const totalGmvNgnEquiv = convertUsdToNgn(totalGmvUsd);
    const totalVoidedNgnEquiv = convertUsdToNgn(totalVoidedUsd);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      gmv: {
        usd: totalGmvUsd,
        formattedUsd: formatMoney(totalGmvUsd, "USD"),
        ngn: gmvNgn,
        formattedNgn: formatMoney(gmvNgn, "NGN"),
        ngnEquivalent: totalGmvNgnEquiv,
        formattedNgnEquivalent: formatMoney(totalGmvNgnEquiv, "NGN", { maximumFractionDigits: 0 }),
        byCurrency,
        primaryCurrency: "USD",
      },
      voided: {
        count: voidedReceiptCount,
        ratePercent: voidRatePercent.toFixed(1),
        totalUsd: totalVoidedUsd,
        formattedUsd: formatMoney(totalVoidedUsd, "USD"),
        totalNgn: voidedNgn,
        formattedNgn: formatMoney(voidedNgn, "NGN"),
        ngnEquivalent: totalVoidedNgnEquiv,
        formattedNgnEquivalent: formatMoney(totalVoidedNgnEquiv, "NGN", { maximumFractionDigits: 0 }),
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
        unanchoredQueue: pendingQueueCount,
        pendingQueue: pendingQueueCount,
        pendingReceipts: pendingReceiptCount,
        pendingShipments: pendingShipmentCount,
        unanchoredBacklog: unanchoredCount,
        unanchoredReceipts: unanchoredReceiptCount,
        unanchoredShipments: unanchoredShipmentCount,
        network: relayerStatus.network,
      },
      incidents: {
        activeCount: totalActiveIncidents,
        activeDisputes: activeDisputesCount,
        unanchoredQueue: pendingQueueCount,
        pendingQueue: pendingQueueCount,
        unanchoredBacklog: unanchoredCount,
        unanchoredReceipts: unanchoredReceiptCount,
        unanchoredShipments: unanchoredShipmentCount,
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
