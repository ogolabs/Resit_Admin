import { NextRequest, NextResponse } from "next/server";
import { connectAdminDb, AdminReceipt } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await connectAdminDb();

    const body = (await req.json()) as { entityId?: string; category?: string };
    const { entityId, category } = body;

    if (!entityId || typeof entityId !== "string") {
      return NextResponse.json({ error: "Missing valid 'entityId'" }, { status: 400 });
    }

    if (category === "receipt_anchor") {
      const receipt = await AdminReceipt.findById(entityId);
      if (!receipt) {
        return NextResponse.json({ error: "Receipt record not found" }, { status: 404 });
      }

      // Reset to pending so write-behind worker picks it up
      receipt.onChainStatus = "pending";
      await receipt.save();

      return NextResponse.json({
        success: true,
        message: `Receipt ${entityId} status reset to 'pending' for immediate re-anchoring.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Incident event ${entityId} acknowledged by operator.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
