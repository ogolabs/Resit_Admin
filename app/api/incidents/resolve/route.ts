import { NextRequest, NextResponse } from "next/server";
import { connectAdminDb, AdminShipment, AdminReceipt } from "@/lib/db";
import { verifyAdminSessionToken, ADMIN_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectAdminDb();

    // Verify session
    const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const session = cookieToken ? await verifyAdminSessionToken(cookieToken) : null;
    const adminEmail = session?.email || "admin@resit.co";

    const body = (await req.json()) as { entityId?: string; category?: string; notes?: string };
    const { entityId, category, notes } = body;

    if (!entityId || typeof entityId !== "string") {
      return NextResponse.json({ error: "Missing valid 'entityId'" }, { status: 400 });
    }

    if (category === "shipment_dispute") {
      const cleanEntityId = entityId.trim();
      const updatePayload = {
        $set: {
          status: "Disputed",
          isDisputed: true,
          disputeResolved: true,
          resolvedAt: new Date(),
          resolvedBy: adminEmail,
          resolutionNotes: notes?.trim() || "Merchant contacted by platform regarding handover discrepancy.",
        },
        $push: {
          events: {
            event: "Merchant Contacted by Platform",
            operator: "Platform Support",
            operatorName: "Platform Support",
            location: null,
            locationContext: notes?.trim() || "Merchant contacted by platform regarding handover discrepancy.",
            timestamp: new Date(),
            onChainTxHash: null,
          },
        },
      };

      const shipmentFilter = {
        $or: [
          { _id: cleanEntityId },
          { _id: cleanEntityId.toLowerCase() },
          { trackingCode: cleanEntityId.toUpperCase() },
        ],
      };

      // 1. Try primary shipments collection
      let updateResult = await AdminShipment.updateOne(shipmentFilter, updatePayload);

      // 2. If not matched, try testshipments collection as fallback
      if (updateResult.matchedCount === 0 && AdminShipment.db) {
        try {
          const testShipmentsCol = AdminShipment.db.collection("testshipments");
          const fallbackRes = await testShipmentsCol.updateOne(
            (shipmentFilter as unknown) as Parameters<typeof testShipmentsCol.updateOne>[0],
            (updatePayload as unknown) as Parameters<typeof testShipmentsCol.updateOne>[1]
          );
          if (fallbackRes.matchedCount > 0) {
            updateResult = {
              matchedCount: fallbackRes.matchedCount,
              modifiedCount: fallbackRes.modifiedCount,
              acknowledged: fallbackRes.acknowledged,
              upsertedId: null,
              upsertedCount: 0,
            };
          }
        } catch {
          // ignore fallback error
        }
      }

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Shipment record not found in ledger" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `Package dispute alert for ${cleanEntityId} dismissed from operator quarantine. Merchant and customer records retain their dispute state.`,
      });
    }

    if (category === "receipt_anchor") {
      const cleanEntityId = entityId.trim();
      const updateResult = await AdminReceipt.updateOne(
        {
          $or: [
            { _id: cleanEntityId },
            { _id: cleanEntityId.toUpperCase() },
          ],
        },
        {
          $set: {
            onChainStatus: "anchored",
          },
        }
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Receipt record not found in ledger" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `Receipt ${cleanEntityId} anchor issue marked as resolved.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Incident ${entityId} resolved by operator.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
