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

    // In development mode, prioritize local frontend dev server (port 3000)
    const isDev = process.env.NODE_ENV === "development";
    const primaryUrl = isDev
      ? "http://localhost:3000"
      : process.env.FRONTEND_INTERNAL_URL || "http://localhost:3000";
    const fallbackUrl = isDev
      ? process.env.FRONTEND_INTERNAL_URL || null
      : "http://localhost:3000";

    let reconcilerReport = null;
    const cronSecret = process.env.CRON_SECRET;
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
    };

    try {
      const internalRes = await fetch(`${primaryUrl}/api/v1/relayer/reconcile?limit=25`, {
        method: "POST",
        headers: requestHeaders,
        signal: AbortSignal.timeout(15_000),
      });
      if (internalRes.ok) {
        reconcilerReport = await internalRes.json();
      }
    } catch {
      if (fallbackUrl && fallbackUrl !== primaryUrl) {
        try {
          const fallbackRes = await fetch(`${fallbackUrl}/api/v1/relayer/reconcile?limit=25`, {
            method: "POST",
            headers: requestHeaders,
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
