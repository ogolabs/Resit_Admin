"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  RefreshCw,
  GitBranch,
  Users,
  Receipt,
  Package,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Phone,
  Wallet,
  Calendar,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";
import { QUERY_TIMINGS } from "@/lib/query-config";

interface MerchantDetailResponse {
  merchant: {
    id: string;
    merchantAddress: string;
    fullName: string;
    companyName: string;
    businessEmail?: string;
    businessPhone?: string;
    businessHandle?: string;
    businessAddress?: string;
    country: string;
    currency: string;
    plan: string;
    operatingMode: string;
    subscriptionActive: boolean;
    isSuspended: boolean;
    createdAt: string;
  };
  stats: {
    receipts: {
      total: number;
      issued: number;
      voided: number;
      gmv: number;
      voidedGmv: number;
    };
    shipments: {
      total: number;
    };
    branchesCount: number;
    teamCount: number;
  };
  branches: Array<{
    id: string;
    name: string;
    location?: string;
    phone?: string;
    managerName?: string;
    managerAddress?: string;
    isDefault: boolean;
    createdAt: string;
  }>;
  teamMembers: Array<{
    id: string;
    memberName: string;
    memberEmail: string;
    memberPhone?: string;
    branchId: string;
    branchName: string;
    role: string;
    status: string;
    invitedAt: string;
  }>;
  recentReceipts: Array<{
    id: string;
    total: number;
    currency: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    createdAt: string;
  }>;
  recentShipments: Array<{
    id: string;
    trackingCode?: string;
    status: string;
    isDisputed: boolean;
    createdAt: string;
  }>;
}

export default function MerchantDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const merchantId = params.id as string;

  const [activeTab, setActiveTab] = useState<"branches" | "team" | "receipts" | "shipments">("branches");
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery<MerchantDetailResponse>({
    queryKey: ["admin-merchant-detail", merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/merchants/${encodeURIComponent(merchantId)}`);
      if (!res.ok) throw new Error("Failed to load merchant details");
      return res.json();
    },
    staleTime: QUERY_TIMINGS.DETAIL_STALE_MS,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const toggleSuspensionMutation = useMutation({
    mutationFn: async (newStatus: boolean) => {
      const res = await fetch(`/api/merchants/${encodeURIComponent(merchantId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: newStatus }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || "Failed to update suspension status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-merchant-detail", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
      setSuspendModalOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
        <p className="text-sm text-slate-400">Loading store telemetry from MongoDB...</p>
      </div>
    );
  }

  if (!data?.merchant) {
    return (
      <div className="py-20 text-center space-y-4">
        <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
        <h2 className="text-lg font-bold text-white">Merchant Record Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          The requested merchant identifier could not be resolved in the primary database.
        </p>
        <Link
          href="/merchants"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </Link>
      </div>
    );
  }

  const { merchant, stats, branches, teamMembers, recentReceipts, recentShipments } = data;
  const isSuspended = merchant.isSuspended;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/merchants"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Merchant Directory</span>
          </Link>
          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {merchant.companyName}
            </h1>
            {isSuspended ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950/80 text-rose-300 border border-rose-800/60">
                <ShieldAlert className="w-3.5 h-3.5" />
                Suspended
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5" />
                Active Store
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Owner: <span className="text-slate-200 font-medium">{merchant.fullName}</span> • Mode:{" "}
            <span className="capitalize text-slate-200">{merchant.operatingMode}</span> • Plan:{" "}
            <span className="uppercase text-slate-200">{merchant.plan}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setSuspendModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
              isSuspended
                ? "bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800/80"
                : "bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-800/80"
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{isSuspended ? "Reinstate Merchant" : "Suspend Merchant"}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Active GMV (Issued)</span>
          <div className="text-xl font-bold text-white font-mono">
            {merchant.currency === "USD" ? "$" : "₦"}
            {stats.receipts.gmv.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {stats.receipts.issued} of {stats.receipts.total} receipts
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Voided Sales Rate</span>
          <div className="text-xl font-bold text-slate-200 font-mono">
            {stats.receipts.total > 0
              ? `${((stats.receipts.voided / stats.receipts.total) * 100).toFixed(1)}%`
              : "0.0%"}
          </div>
          <span className="text-[10px] text-rose-400 mt-0.5 block">
            {stats.receipts.voided} voided (₦{stats.receipts.voidedGmv.toLocaleString()})
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Physical Branches</span>
          <div className="text-xl font-bold text-blue-400 font-mono">{branches.length}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Storefront locations</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Staff Roster</span>
          <div className="text-xl font-bold text-purple-400 font-mono">{teamMembers.length}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Managers & Cashiers</span>
        </div>
      </div>

      {/* Identity & Metadata Strip */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">
            Blockchain EOA Identifier
          </span>
          <div className="flex items-center gap-1.5 font-mono text-slate-300 break-all">
            <Wallet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{merchant.merchantAddress}</span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">
            Contact & Support
          </span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{merchant.businessEmail || "No business email"}</span>
          </div>
          {merchant.businessPhone && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{merchant.businessPhone}</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">
            Store Registration
          </span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{new Date(merchant.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Country: {merchant.country} • Currency: {merchant.currency}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center gap-2">
        <button
          onClick={() => setActiveTab("branches")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "branches"
              ? "border-blue-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Branches ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "team"
              ? "border-blue-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff Roster ({teamMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("receipts")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "receipts"
              ? "border-blue-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Recent Receipts ({recentReceipts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("shipments")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "shipments"
              ? "border-blue-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Dispatches ({stats.shipments.total})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
        {/* Branches Tab */}
        {activeTab === "branches" && (
          <div className="p-4">
            {branches.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No physical branches configured for this merchant.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {branches.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs">{b.name}</span>
                      {b.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                          Primary
                        </span>
                      )}
                    </div>
                    {b.location && (
                      <p className="text-[11px] text-slate-400 truncate">{b.location}</p>
                    )}
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 space-y-0.5">
                      <div>Manager: {b.managerName || "Unassigned"}</div>
                      {b.phone && <div>Phone: {b.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Staff & Team Tab */}
        {activeTab === "team" && (
          <div className="overflow-x-auto">
            {teamMembers.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No staff members currently registered in this merchant workspace.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Branch</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Invited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teamMembers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{t.memberName}</div>
                        <div className="text-[11px] text-slate-400">{t.memberEmail}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                          {t.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{t.branchName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] ${
                            t.status === "active" ? "text-emerald-400" : "text-slate-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              t.status === "active" ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                          />
                          <span className="capitalize">{t.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(t.invitedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Recent Receipts Tab */}
        {activeTab === "receipts" && (
          <div className="overflow-x-auto">
            {recentReceipts.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No receipts issued by this merchant yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="py-3 px-4">Receipt Number</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Issued At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-medium text-white">{r.id}</td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        {r.currency === "USD" ? "$" : "₦"}
                        {r.total.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{r.paymentMethod}</td>
                      <td className="py-3 px-4">
                        {r.status.toLowerCase() === "voided" ? (
                          <span className="px-2 py-0.5 rounded text-[11px] bg-rose-950/80 text-rose-300 border border-rose-800/60">
                            VOIDED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                            ISSUED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Recent Shipments Tab */}
        {activeTab === "shipments" && (
          <div className="overflow-x-auto">
            {recentShipments.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No dispatch shipments created by this merchant yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="py-3 px-4">Package ID</th>
                    <th className="py-3 px-4">Tracking Code</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Disputed</th>
                    <th className="py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentShipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-medium text-white">{s.id}</td>
                      <td className="py-3 px-4 font-mono text-blue-400">{s.trackingCode || "N/A"}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 capitalize">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {s.isDisputed ? (
                          <span className="text-rose-400 font-medium">Yes</span>
                        ) : (
                          <span className="text-slate-500">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Emergency Suspend / Reinstate Modal */}
      {suspendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isSuspended ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                }`}
              >
                {isSuspended ? <CheckCircle2 className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isSuspended ? "Reinstate Merchant Store?" : "Suspend Merchant Store?"}
                </h3>
                <p className="text-xs text-slate-400">{merchant.companyName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isSuspended
                ? "Reinstating will restore the merchant's ability to issue receipts, manage team members, and process dispatches."
                : "Suspending will immediately lock this merchant account. Cashiers and managers will be blocked from issuing new sales records or package dispatches."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={toggleSuspensionMutation.isPending}
                onClick={() => toggleSuspensionMutation.mutate(!isSuspended)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer disabled:opacity-50 ${
                  isSuspended ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {toggleSuspensionMutation.isPending
                  ? "Processing..."
                  : isSuspended
                  ? "Confirm Reinstatement"
                  : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
