import { NextResponse } from "next/server";
import { connectAdminDb, AdminReceipt, AdminShipment, AdminUser } from "@/lib/db";
import { getRelayerStatus } from "@/lib/chain";

export async function GET() {
  try {
    await connectAdminDb();

    // Aggregate GMV and sales totals for issued receipts and voided receipts concurrently
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

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
    ] = await Promise.all([
      AdminReceipt.aggregate([
        { $match: { status: { $in: ["Issued", "issued"] } } },
        {
          $group: {
            _id: "$currency",
            totalGmv: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
      AdminReceipt.aggregate([
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
        $or: [{ role: "merchant" }, { hasMerchantProfile: true }],
      }),
      AdminShipment.aggregate([
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
      },
      incidents: {
        activeCount: totalActiveIncidents,
        activeDisputes: activeDisputesCount,
        unanchoredQueue: unanchoredCount,
      },
      custody: custodyMap,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to aggregate metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
