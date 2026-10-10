import { NextRequest, NextResponse } from "next/server";
import { connectAdminDb, AdminUser, AdminReceipt, AdminBranch, AdminTeamMember, AdminShipment } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectAdminDb();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    // Filter base
    const baseFilter: Record<string, unknown> = {
      $or: [
        { role: "merchant" },
        { hasMerchantProfile: true },
        { companyName: { $exists: true, $ne: null } },
      ],
    };

    if (status === "active") {
      baseFilter.isSuspended = { $ne: true };
    } else if (status === "suspended") {
      baseFilter.isSuspended = true;
    }

    if (q) {
      const regex = new RegExp(q, "i");
      baseFilter.$and = [
        {
          $or: [
            { companyName: regex },
            { fullName: regex },
            { businessEmail: regex },
            { businessHandle: regex },
            { eoaAddress: regex },
            { _id: regex },
          ],
        },
      ];
    }

    const [total, totalActive, totalSuspended, totalBranches, userDocs] = await Promise.all([
      AdminUser.countDocuments(baseFilter),
      AdminUser.countDocuments({ role: "merchant", isSuspended: { $ne: true } }),
      AdminUser.countDocuments({ role: "merchant", isSuspended: true }),
      AdminBranch.countDocuments(),
      AdminUser.find(baseFilter)
        .select("_id eoaAddress fullName companyName businessEmail businessPhone businessHandle country currency plan operatingMode subscriptionActive isSuspended createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Gather merchant addresses for batch metrics aggregation
    const merchantAddresses = userDocs.map((u) => {
      const eoa = (u.eoaAddress || u._id || "").toLowerCase();
      return eoa;
    });

    const [branchCounts, teamCounts, receiptStats, shipmentCounts] = await Promise.all([
      AdminBranch.aggregate<{ _id: string; count: number }>([
        { $match: { merchantAddress: { $in: merchantAddresses } } },
        { $group: { _id: { $toLower: "$merchantAddress" }, count: { $sum: 1 } } },
      ]),
      AdminTeamMember.aggregate<{ _id: string; count: number }>([
        { $match: { merchantAddress: { $in: merchantAddresses } } },
        { $group: { _id: { $toLower: "$merchantAddress" }, count: { $sum: 1 } } },
      ]),
      AdminReceipt.aggregate<{ _id: string; totalReceipts: number; totalGmv: number; voidedReceipts: number }>([
        { $match: { merchantAddress: { $in: merchantAddresses } } },
        {
          $group: {
            _id: { $toLower: "$merchantAddress" },
            totalReceipts: { $sum: 1 },
            totalGmv: {
              $sum: {
                $cond: [{ $in: ["$status", ["Issued", "issued"]] }, "$total", 0],
              },
            },
            voidedReceipts: {
              $sum: {
                $cond: [{ $in: ["$status", ["Voided", "voided"]] }, 1, 0],
              },
            },
          },
        },
      ]),
      AdminShipment.aggregate<{ _id: string; count: number }>([
        { $match: { shipperAddress: { $in: merchantAddresses } } },
        { $group: { _id: { $toLower: "$shipperAddress" }, count: { $sum: 1 } } },
      ]),
    ]);

    const branchMap = new Map<string, number>();
    for (const b of branchCounts) branchMap.set(b._id, b.count);

    const teamMap = new Map<string, number>();
    for (const t of teamCounts) teamMap.set(t._id, t.count);

    const receiptMap = new Map<string, { totalReceipts: number; totalGmv: number; voidedReceipts: number }>();
    for (const r of receiptStats) receiptMap.set(r._id, r);

    const shipmentMap = new Map<string, number>();
    for (const s of shipmentCounts) shipmentMap.set(s._id, s.count);

    const merchants = userDocs.map((u) => {
      const addr = (u.eoaAddress || u._id || "").toLowerCase();
      const rStats = receiptMap.get(addr) || { totalReceipts: 0, totalGmv: 0, voidedReceipts: 0 };

      return {
        id: u._id,
        merchantAddress: addr,
        fullName: u.fullName || "Unknown",
        companyName: u.companyName || u.fullName || "Unnamed Store",
        businessEmail: u.businessEmail || null,
        businessPhone: u.businessPhone || null,
        businessHandle: u.businessHandle || null,
        country: u.country || "NG",
        currency: u.currency || "NGN",
        plan: u.plan || "free",
        operatingMode: u.operatingMode || "hybrid",
        subscriptionActive: Boolean(u.subscriptionActive),
        isSuspended: Boolean(u.isSuspended),
        branchCount: branchMap.get(addr) || 0,
        teamCount: teamMap.get(addr) || 0,
        receiptCount: rStats.totalReceipts,
        voidedCount: rStats.voidedReceipts,
        gmv: rStats.totalGmv,
        shipmentCount: shipmentMap.get(addr) || 0,
        createdAt: u.createdAt,
      };
    });

    return NextResponse.json({
      merchants,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalActive,
        totalSuspended,
        totalBranches,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
