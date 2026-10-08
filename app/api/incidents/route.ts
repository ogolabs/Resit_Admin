import { NextResponse } from "next/server";
import { connectAdminDb, AdminReceipt, AdminShipment, AdminUser } from "@/lib/db";
import { getRelayerStatus } from "@/lib/chain";

export interface IncidentItem {
  id: string;
  category: "relayer" | "receipt_anchor" | "shipment_dispute";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  entityId?: string;
  merchantAddress?: string;
  merchantName?: string;
  amountOrTracking?: string;
  createdAt: Date;
  canRetry?: boolean;
  canResolve?: boolean;
}

export async function GET() {
  try {
    await connectAdminDb();

    // 1. Relayer Health Evaluation
    const relayer = await getRelayerStatus();
    const balanceNum = parseFloat(relayer.balanceEtn);

    const incidents: IncidentItem[] = [];

    if (balanceNum < 10) {
      incidents.push({
        id: "inc-relayer-gas-critical",
        category: "relayer",
        severity: "critical",
        title: "Relayer Low Gas Exhaustion",
        description: `Relayer wallet (${relayer.address.slice(0, 8)}...) balance is critically low at ${relayer.balanceEtn} ETN (< 10 ETN). Immediate risk of transaction reverts!`,
        entityId: relayer.address,
        createdAt: new Date(),
        canRetry: false,
      });
    } else if (balanceNum < 50) {
      incidents.push({
        id: "inc-relayer-gas-warning",
        category: "relayer",
        severity: "warning",
        title: "Relayer Gas Depletion Warning",
        description: `Relayer balance is ${relayer.balanceEtn} ETN (< 50 ETN). Fuel top-up advised to prevent queuing stalls.`,
        entityId: relayer.address,
        createdAt: new Date(),
        canRetry: false,
      });
    }

    if (relayer.rpcLatencyMs > 3000) {
      incidents.push({
        id: "inc-relayer-rpc-latency",
        category: "relayer",
        severity: "warning",
        title: "Electroneum RPC Degradation",
        description: `Node latency is ${relayer.rpcLatencyMs}ms, exceeding the 3,000ms SLA target.`,
        createdAt: new Date(),
        canRetry: false,
      });
    }

    // 2. Query Unanchored Receipts (> 5 minutes old) or Failed Status
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const stalledReceipts = await AdminReceipt.find({
      $or: [
        { onChainStatus: "failed" },
        { onChainStatus: "pending", createdAt: { $lt: fiveMinutesAgo } },
        {
          onChainTxHash: null,
          status: { $in: ["Issued", "issued"] },
          createdAt: { $lt: fiveMinutesAgo },
        },
      ],
    })
      .select("_id merchantAddress merchantName total currency status onChainStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    for (const r of stalledReceipts) {
      const isFailed = r.onChainStatus === "failed";
      incidents.push({
        id: `inc-rec-${r._id}`,
        category: "receipt_anchor",
        severity: isFailed ? "critical" : "warning",
        title: isFailed ? "On-Chain Anchor Reverted" : "Ledger Anchor Delayed",
        description: `Receipt ${r._id} issued at store has no verified on-chain confirmation hash after 5+ minutes.`,
        entityId: r._id,
        merchantAddress: r.merchantAddress,
        merchantName: r.merchantName || undefined,
        amountOrTracking: `${r.currency || "NGN"} ${r.total.toLocaleString()}`,
        createdAt: r.createdAt,
        canRetry: true,
      });
    }

    // 3. Query Disputed Shipments (only active, unresolved disputes)
    const disputedShipments = await AdminShipment.find({
      $and: [
        { $or: [{ status: "Disputed" }, { isDisputed: true }] },
        { disputeResolved: { $ne: true } },
      ],
    })
      .select("_id shipperAddress trackingCode status isDisputed createdBy metadata createdAt")
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    const shippersToLookup = disputedShipments
      .filter((s) => !s.createdBy?.name && s.shipperAddress)
      .map((s) => s.shipperAddress.toLowerCase());

    const merchantLookup = new Map<string, string>();
    if (shippersToLookup.length > 0) {
      const users = await AdminUser.find({
        $or: [
          { _id: { $in: shippersToLookup } },
          { eoaAddress: { $in: shippersToLookup } },
          { walletPublicAddress: { $in: shippersToLookup } },
        ],
      })
        .select("_id eoaAddress walletPublicAddress companyName fullName")
        .lean();

      for (const u of users) {
        const name = u.companyName || u.fullName;
        if (name) {
          if (u._id) merchantLookup.set(u._id.toLowerCase(), name);
          if (u.eoaAddress) merchantLookup.set(u.eoaAddress.toLowerCase(), name);
          if (u.walletPublicAddress) merchantLookup.set(u.walletPublicAddress.toLowerCase(), name);
        }
      }
    }

    for (const s of disputedShipments) {
      const tracking =
        s.trackingCode ||
        (s._id.startsWith("0x") ? `SHPT-${s._id.slice(2, 14).toUpperCase()}` : s._id);

      const mName =
        s.createdBy?.name ||
        merchantLookup.get(s.shipperAddress?.toLowerCase() || "") ||
        ((s.metadata as Record<string, unknown> | undefined)?.merchantName as string | undefined) ||
        undefined;

      incidents.push({
        id: `inc-ship-${s._id}`,
        category: "shipment_dispute",
        severity: "critical",
        title: "Physical Custody Handover Dispute",
        description: `Package ${tracking} was flagged with a recipient delivery discrepancy.`,
        entityId: s._id,
        merchantAddress: s.shipperAddress,
        merchantName: mName,
        amountOrTracking: tracking,
        createdAt: s.createdAt,
        canRetry: false,
        canResolve: true,
      });
    }

    // Rank severity: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    incidents.sort((a, b) => {
      const rankDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const criticalCount = incidents.filter((i) => i.severity === "critical").length;
    const warningCount = incidents.filter((i) => i.severity === "warning").length;
    const infoCount = incidents.filter((i) => i.severity === "info").length;

    return NextResponse.json({
      incidents,
      summary: {
        total: incidents.length,
        critical: criticalCount,
        warning: warningCount,
        info: infoCount,
        stalledReceipts: stalledReceipts.length,
        disputedShipments: disputedShipments.length,
        relayerGas: relayer.balanceEtn,
        relayerStatus:
          balanceNum < 10
            ? "Critical Fuel (<10 ETN)"
            : balanceNum < 50
            ? "Low Fuel (<50 ETN)"
            : balanceNum >= 100
            ? "Healthy (>=100 ETN)"
            : "Moderate (>=50 ETN)",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
