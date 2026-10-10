"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  Search,
  RefreshCw,
  Receipt,
  Package,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { QUERY_TIMINGS } from "@/lib/query-config";

interface UnifiedRecord {
  id: string;
  rawId?: string;
  recordType: "receipt" | "shipment";
  merchantOrShipper: string;
  merchantName?: string;
  detail: string;
  status: string;
  isVoidedOrDisputed: boolean;
  onChainStatus: string;
  createdAt: string;
}

interface RecordsResponse {
  records: UnifiedRecord[];
  total: number;
  receiptCount: number;
  shipmentCount: number;
  anchoredCount: number;
  voidedOrDisputedCount: number;
  page: number;
  totalPages: number;
}

export default function UniversalLedgerPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "receipts" | "shipments">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "voided" | "delivered" | "disputed">("all");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery<RecordsResponse>({
    queryKey: ["admin-universal-records", searchTerm, typeFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("q", searchTerm);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/records?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load ledger records");
      return res.json();
    },
    staleTime: QUERY_TIMINGS.RECORDS_STALE_MS,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setPage(1);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const records = data?.records || [];
  const total = data?.total || 0;
  const receiptCount = data?.receiptCount || 0;
  const shipmentCount = data?.shipmentCount || 0;
  const anchoredCount = data?.anchoredCount || 0;
  const voidedOrDisputedCount = data?.voidedOrDisputedCount || 0;
  const totalPages = data?.totalPages || 1;

  const anchorRate = total > 0 ? ((anchoredCount / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Universal Ledger & Custody Inspector
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time audit across digital sales receipts and physical custody package labels.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Total Indexed Ledger Units</span>
          <div className="text-lg sm:text-xl font-bold text-white font-mono">
            {isLoading ? "..." : total}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Sales Receipts</span>
          <div className="text-lg sm:text-xl font-bold text-blue-400 font-mono">
            {isLoading ? "..." : receiptCount}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Logistics Dispatches</span>
          <div className="text-lg sm:text-xl font-bold text-purple-400 font-mono">
            {isLoading ? "..." : shipmentCount}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Anchored Proof Rate</span>
          <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isLoading ? "..." : `${anchoredCount} (${anchorRate}%)`}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by REC-2026-..., PKG-..., tracking code, or merchant address..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-24 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium transition-colors"
            >
              Search
            </button>
          </form>

          {/* Type Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
            {(["all", "receipts", "shipments"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTypeFilter(t);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                  typeFilter === t
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Status Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-slate-500 mr-1 shrink-0">Status:</span>
          {(["all", "issued", "voided", "delivered", "disputed"] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize shrink-0 transition-colors border ${
                statusFilter === st
                  ? "bg-slate-800 text-white border-blue-500/80"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
          {voidedOrDisputedCount > 0 && (
            <span className="text-[11px] text-rose-400 ml-auto shrink-0">
              {voidedOrDisputedCount} flagged items
            </span>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
            <p className="text-xs">Querying unified records from MongoDB...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">No records found</p>
            <p className="text-xs text-slate-500">
              {searchTerm
                ? "Try searching with a different keyword or resetting filters."
                : "No matching records recorded in ledger."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Record Identifier</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Merchant / Issuer</th>
                  <th className="py-3 px-4">Financial / Tracking</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4">Anchored Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Identifier */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-white select-all">{r.id}</span>
                        <button
                          onClick={() => copyToClipboard(r.id)}
                          className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                          title="Copy ID"
                        >
                          {copiedId === r.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {r.rawId && r.rawId !== r.id && (
                        <div
                          className="font-mono text-[10px] text-slate-500 truncate max-w-[150px] mt-0.5"
                          title={`On-chain Hash: ${r.rawId}`}
                        >
                          {r.rawId.slice(0, 8)}...{r.rawId.slice(-6)}
                        </div>
                      )}
                    </td>

                    {/* Record Type */}
                    <td className="py-3.5 px-4">
                      {r.recordType === "receipt" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-950/80 text-blue-300 border border-blue-800/60">
                          <Receipt className="w-3 h-3" />
                          Receipt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-950/80 text-purple-300 border border-purple-800/60">
                          <Package className="w-3 h-3" />
                          Dispatch
                        </span>
                      )}
                    </td>

                    {/* Merchant / Issuer */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white truncate max-w-[160px]" title={r.merchantName || undefined}>
                        {r.merchantName || "Merchant Store"}
                      </div>
                      <div
                        className="font-mono text-[11px] text-slate-400 truncate max-w-[140px] mt-0.5"
                        title={r.merchantOrShipper}
                      >
                        {r.merchantOrShipper}
                      </div>
                    </td>

                    {/* Financial / Tracking detail */}
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <span className={r.recordType === "receipt" ? "font-mono" : ""}>{r.detail}</span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {r.isVoidedOrDisputed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/80 text-rose-300 border border-rose-800/60">
                          <ShieldAlert className="w-3 h-3" />
                          {r.status.toUpperCase()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                          <ShieldCheck className="w-3 h-3" />
                          {r.status.toUpperCase()}
                        </span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page <span className="text-white font-medium">{page}</span> of{" "}
              <span className="text-white font-medium">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
