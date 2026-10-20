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

export async function GET() {
  const startTime = Date.now();

  try {
    const mongooseConn = await connectAdminDb();
    void healDriftedAnchors();
    const dbPingStart = Date.now();
    
    // Quick ping to measure MongoDB round-trip time
    if (mongooseConn.connection.db) {
      await mongooseConn.connection.db.command({ ping: 1 });
    }
    const dbPingMs = Date.now() - dbPingStart;

    // Run database count queries and blockchain queries concurrently
    const [
      receiptsCount,
      pendingReceipts,
      pendingShipments,
      unanchoredReceipts,
      shipmentsCount,
      unanchoredShipments,
      merchantsCount,
      usersCount,
      relayer,
    ] = await Promise.all([
      AdminReceipt.countDocuments(),
      AdminReceipt.countDocuments(getPendingQueueReceiptFilter()),
      AdminShipment.countDocuments(getPendingQueueShipmentFilter()),
      AdminReceipt.countDocuments(getUnanchoredReceiptFilter()),
      AdminShipment.countDocuments(),
      AdminShipment.countDocuments(getUnanchoredShipmentFilter()),
      AdminUser.countDocuments({ role: "merchant" }),
      AdminUser.countDocuments(),
      getRelayerStatus(),
    ]);

    const mem = process.memoryUsage();
    const totalPending = pendingReceipts + pendingShipments;
    const totalUnanchored = unanchoredReceipts + unanchoredShipments;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      database: {
        readyState: mongooseConn.connection.readyState,
        statusText:
          mongooseConn.connection.readyState === 1
            ? "connected"
            : mongooseConn.connection.readyState === 2
            ? "connecting"
            : "disconnected",
        pingLatencyMs: dbPingMs,
        collections: {
          receipts: receiptsCount,
          shipments: shipmentsCount,
          merchants: merchantsCount,
          users: usersCount,
        },
        queueDepth: {
          pendingReceipts,
          pendingShipments,
          totalPending,
          unanchoredReceipts,
          unanchoredShipments,
          totalUnanchored,
        },
      },
      relayer,
      runtime: {
        nodeVersion: process.version,
        memoryHeapUsedMb: (mem.heapUsed / 1024 / 1024).toFixed(2),
        memoryRssMb: (mem.rss / 1024 / 1024).toFixed(2),
        uptimeSeconds: Math.floor(process.uptime()),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch infrastructure telemetry";
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        error: message,
      },
      { status: 500 }
    );
  }
}
