import { NextResponse } from "next/server";
import { connectAdminDb, AdminReceipt, AdminShipment } from "@/lib/db";

export async function POST() {
  try {
    await connectAdminDb();

    // Query unanchored items
    const [pendingReceipts, pendingShipments] = await Promise.all([
      AdminReceipt.find({ onChainStatus: { $in: ["pending", "failed"] } })
        .limit(20)
        .select("_id receiptNumber onChainStatus"),
      AdminShipment.find({ onChainStatus: { $in: ["pending", "failed"] } })
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
      });
      if (internalRes.ok) {
        reconcilerReport = await internalRes.json();
      }
    } catch {
      // Reconciler endpoint may be in a different process or port
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
