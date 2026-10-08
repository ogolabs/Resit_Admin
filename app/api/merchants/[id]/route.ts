import { NextRequest, NextResponse } from "next/server";
import {
  connectAdminDb,
  AdminUser,
  AdminReceipt,
  AdminBranch,
  AdminTeamMember,
  AdminShipment,
} from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectAdminDb();
    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();

    // Find user by _id or eoaAddress
    const user = await AdminUser.findOne({
      $or: [
        { _id: decodedId },
        { eoaAddress: decodedId.toLowerCase() },
      ],
    }).lean();

    if (!user) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const merchantAddress = (user.eoaAddress || user._id).toLowerCase();

    // Fetch branches, team members, and recent activity concurrently
    const [branches, teamMembers, recentReceipts, receiptStats, recentShipments, shipmentCount] =
      await Promise.all([
        AdminBranch.find({ merchantAddress })
          .select("_id name location phone managerName managerAddress isDefault createdAt")
          .sort({ createdAt: -1 })
          .lean(),
        AdminTeamMember.find({ merchantAddress })
          .select("_id memberName memberEmail memberPhone branchId branchName role status invitedAt")
          .sort({ createdAt: -1 })
          .lean(),
        AdminReceipt.find({ merchantAddress })
          .select("_id total currency status paymentMethod paymentStatus createdAt")
          .sort({ createdAt: -1 })
          .limit(15)
          .lean(),
        AdminReceipt.aggregate<{
          _id: null;
          totalCount: number;
          issuedCount: number;
          voidedCount: number;
          totalGmv: number;
          voidedGmv: number;
        }>([
          { $match: { merchantAddress } },
          {
            $group: {
              _id: null,
              totalCount: { $sum: 1 },
              issuedCount: {
                $sum: {
                  $cond: [{ $in: ["$status", ["Issued", "issued"]] }, 1, 0],
                },
              },
              voidedCount: {
                $sum: {
                  $cond: [{ $in: ["$status", ["Voided", "voided"]] }, 1, 0],
                },
              },
              totalGmv: {
                $sum: {
                  $cond: [{ $in: ["$status", ["Issued", "issued"]] }, "$total", 0],
                },
              },
              voidedGmv: {
                $sum: {
                  $cond: [{ $in: ["$status", ["Voided", "voided"]] }, "$total", 0],
                },
              },
            },
          },
        ]),
        AdminShipment.find({ shipperAddress: merchantAddress })
          .select("_id trackingCode status isDisputed createdAt")
          .sort({ createdAt: -1 })
          .limit(15)
          .lean(),
        AdminShipment.countDocuments({ shipperAddress: merchantAddress }),
      ]);

    const stats = receiptStats[0] || {
      totalCount: 0,
      issuedCount: 0,
      voidedCount: 0,
      totalGmv: 0,
      voidedGmv: 0,
    };

    return NextResponse.json({
      merchant: {
        id: user._id,
        merchantAddress,
        fullName: user.fullName,
        companyName: user.companyName || user.fullName || "Unnamed Store",
        businessEmail: user.businessEmail,
        businessPhone: user.businessPhone,
        businessHandle: user.businessHandle,
        businessAddress: user.businessAddress,
        country: user.country || "NG",
        currency: user.currency || "NGN",
        plan: user.plan || "free",
        operatingMode: user.operatingMode || "hybrid",
        subscriptionActive: Boolean(user.subscriptionActive),
        isSuspended: Boolean(user.isSuspended),
        createdAt: user.createdAt,
      },
      stats: {
        receipts: {
          total: stats.totalCount,
          issued: stats.issuedCount,
          voided: stats.voidedCount,
          gmv: stats.totalGmv,
          voidedGmv: stats.voidedGmv,
        },
        shipments: {
          total: shipmentCount,
        },
        branchesCount: branches.length,
        teamCount: teamMembers.length,
      },
      branches: branches.map((b) => ({
        id: b._id,
        name: b.name,
        location: b.location,
        phone: b.phone,
        managerName: b.managerName,
        managerAddress: b.managerAddress,
        isDefault: Boolean(b.isDefault),
        createdAt: b.createdAt,
      })),
      teamMembers: teamMembers.map((t) => ({
        id: t._id,
        memberName: t.memberName,
        memberEmail: t.memberEmail,
        memberPhone: t.memberPhone,
        branchId: t.branchId,
        branchName: t.branchName,
        role: t.role,
        status: t.status,
        invitedAt: t.invitedAt,
      })),
      recentReceipts: recentReceipts.map((r) => ({
        id: r._id,
        total: r.total,
        currency: r.currency || "NGN",
        status: r.status,
        paymentMethod: r.paymentMethod,
        paymentStatus: r.paymentStatus,
        createdAt: r.createdAt,
      })),
      recentShipments: recentShipments.map((s) => ({
        id: s._id,
        trackingCode: s.trackingCode,
        status: s.status,
        isDisputed: Boolean(s.isDisputed),
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectAdminDb();
    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();

    const body = (await req.json()) as { isSuspended?: boolean };
    if (typeof body.isSuspended !== "boolean") {
      return NextResponse.json(
        { error: "Field 'isSuspended' must be a boolean" },
        { status: 400 }
      );
    }

    const updatedUser = await AdminUser.findOneAndUpdate(
      {
        $or: [
          { _id: decodedId },
          { eoaAddress: decodedId.toLowerCase() },
        ],
      },
      { $set: { isSuspended: body.isSuspended } },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      isSuspended: Boolean(updatedUser.isSuspended),
      message: `Merchant status updated to ${updatedUser.isSuspended ? "Suspended" : "Active"}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
