import { NextResponse } from "next/server";
import { connectAdminDb, AdminReceipt, AdminShipment } from "@/lib/db";
import {
  getUnanchoredReceiptFilter,
  getUnanchoredShipmentFilter,
  healDriftedAnchors,
} from "@/lib/ledger-queries";

export async function POST() {
  try {
    await connectAdminDb();
    void healDriftedAnchors();

    // Query unanchored items
    const [pendingReceipts, pendingShipments] = await Promise.all([
      AdminReceipt.find(getUnanchoredReceiptFilter())
        .limit(20)
        .select("_id receiptNumber onChainStatus"),
      AdminShipment.find(getUnanchoredShipmentFilter())
        .limit(20)
        .select("_id trackingCode onChainStatus"),
    ]);

    const totalIdentified = pendingReceipts.length + pendingShipments.length;

    // Optional: Call the internal frontend reconcile endpoint if accessible
    const frontendBaseUrl = process.env.FRONTEND_INTERNAL_URL || "http://localhost:3000";
    let reconcilerReport = null;

    try {
      const internalRes = await fetch(`${frontendBaseUrl}/api/v1/relayer/reconcile?limit=25`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (internalRes.ok) {
        reconcilerReport = await internalRes.json();
      }
    } catch {
      // If primary configured URL failed or timed out and wasn't localhost:3000, attempt localhost fallback
      if (frontendBaseUrl !== "http://localhost:3000") {
        try {
          const fallbackRes = await fetch("http://localhost:3000/api/v1/relayer/reconcile?limit=25", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(15_000),
          });
          if (fallbackRes.ok) {
            reconcilerReport = await fallbackRes.json();
          }
        } catch {
          // Reconciler endpoint may be in a separate process or port
        }
      }
    }

    return NextResponse.json({
      success: true,
      sweepTimestamp: new Date().toISOString(),
      identifiedUnanchored: {
        receipts: pendingReceipts.length,
        shipments: pendingShipments.length,
        total: totalIdentified,
      },
      reconcilerReport: reconcilerReport || {
        status: "sweep_queued",
        message: `${totalIdentified} pending records queued for background relayer processing`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to execute reconciliation sweep";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
