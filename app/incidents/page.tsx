"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  Receipt,
  Package,
  Server,
  Building2,
  CheckCircle2,
  X,
} from "lucide-react";
import { QUERY_TIMINGS } from "@/lib/query-config";

interface IncidentItem {
  id: string;
  category: "relayer" | "receipt_anchor" | "shipment_dispute";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  entityId?: string;
  merchantAddress?: string;
  merchantName?: string;
  amountOrTracking?: string;
  createdAt: string;
  canRetry?: boolean;
  canResolve?: boolean;
}

interface IncidentsResponse {
  incidents: IncidentItem[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    stalledReceipts: number;
    disputedShipments: number;
    relayerGas: string;
    relayerStatus: string;
  };
}

export default function IncidentsPage() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<"all" | "relayer" | "receipt_anchor" | "shipment_dispute">("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resolveModalItem, setResolveModalItem] = useState<IncidentItem | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery<IncidentsResponse>({
    queryKey: ["admin-incidents"],
    queryFn: async () => {
      const res = await fetch("/api/incidents");
      if (!res.ok) throw new Error("Failed to load incidents");
      return res.json();
    },
    staleTime: QUERY_TIMINGS.INCIDENTS_STALE_MS,
  });

  const retryMutation = useMutation({
    mutationFn: async ({ entityId, category }: { entityId: string; category: string }) => {
      const res = await fetch("/api/incidents/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, category }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || "Retry failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["admin-universal-records"] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({
      entityId,
      category,
      notes,
    }: {
      entityId: string;
      category: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/incidents/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, category, notes }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || "Resolution failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["admin-universal-records"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      setResolveModalItem(null);
      setResolveNotes("");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const incidents = data?.incidents || [];
  const summary = data?.summary || {
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    stalledReceipts: 0,
    disputedShipments: 0,
    relayerGas: "",
    relayerStatus: "Operational",
  };

  const relayerGasNum = summary.relayerGas ? parseFloat(summary.relayerGas) : Number.NaN;

  const filteredIncidents = incidents.filter((item) => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (severityFilter !== "all" && item.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-rose-500" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Incidents & Error Quarantine
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time anomaly quarantine across relayer gas, unanchored ledger sales, and disputed shipments.
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

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Active Incidents</span>
          <div className="text-lg sm:text-xl font-bold text-white font-mono">
            {isLoading ? "..." : summary.total}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Critical Blockers</span>
          <div className="text-lg sm:text-xl font-bold text-rose-400 font-mono">
            {isLoading ? "..." : summary.critical}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Stalled Receipts</span>
          <div className="text-lg sm:text-xl font-bold text-blue-400 font-mono">
            {isLoading ? "..." : summary.stalledReceipts}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Disputed Packages</span>
          <div className="text-lg sm:text-xl font-bold text-purple-400 font-mono">
            {isLoading ? "..." : summary.disputedShipments}
          </div>
        </div>
      </div>

      {/* Relayer Fuel Health Alert Banner */}
      {!isLoading && data && Number.isFinite(relayerGasNum) && relayerGasNum < 10 ? (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong className="text-white">CRITICAL RELAYER FUEL:</strong> Current balance is{" "}
              <strong className="font-mono text-white">{summary.relayerGas} ETN</strong> (&lt; 10 ETN threshold).
              Risk of immediate transaction revert!
            </span>
          </div>
          <Link
            href="/infrastructure"
            className="px-2.5 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-white font-medium text-[11px] whitespace-nowrap transition-colors"
          >
            Inspect Infrastructure
          </Link>
        </div>
      ) : !isLoading && data && Number.isFinite(relayerGasNum) && relayerGasNum < 50 ? (
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-blue-900/60 text-slate-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong className="text-white">Relayer Fuel Warning:</strong> Current balance is{" "}
              <strong className="font-mono text-white">{summary.relayerGas} ETN</strong> (&lt; 50 ETN threshold).
              Fuel top-up advised to maintain smooth transaction throughput.
            </span>
          </div>
          <Link
            href="/infrastructure"
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] whitespace-nowrap transition-colors"
          >
            Inspect Infrastructure
          </Link>
        </div>
      ) : null}

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800 text-xs">
        {/* Category Filter */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto">
          {(
            [
              { id: "all", label: "All Items" },
              { id: "receipt_anchor", label: "Stalled Receipts" },
              { id: "shipment_dispute", label: "Disputes" },
              { id: "relayer", label: "Relayer Gas" },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat.id
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[11px] text-slate-500">Severity:</span>
          {(["all", "critical", "warning"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize transition-colors border ${
                severityFilter === sev
                  ? "bg-slate-800 text-white border-blue-500/80"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List Content */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
            <p className="text-xs">Evaluating incident telemetry from MongoDB & Electroneum node...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">System Enclave Healthy</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No active error quarantine items. All issued ledger receipts are anchored and zero custody disputes are pending.
              </p>
            </div>
          </div>
        ) : (
          filteredIncidents.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border bg-slate-900/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                item.severity === "critical"
                  ? "border-rose-900/60 hover:border-rose-700/80"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Severity Badge */}
                  {item.severity === "critical" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-800/80">
                      <ShieldAlert className="w-3 h-3" />
                      CRITICAL
                    </span>
                  ) : item.severity === "warning" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-800/80">
                      <AlertCircle className="w-3 h-3" />
                      WARNING
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      INFO
                    </span>
                  )}

                  {/* Category Pill */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 bg-slate-800/80">
                    {item.category === "relayer" && <Server className="w-3 h-3 text-emerald-400" />}
                    {item.category === "receipt_anchor" && <Receipt className="w-3 h-3 text-blue-400" />}
                    {item.category === "shipment_dispute" && <Package className="w-3 h-3 text-purple-400" />}
                    <span className="capitalize">{item.category.replace("_", " ")}</span>
                  </span>

                  <span className="text-xs font-semibold text-white truncate">{item.title}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>

                {/* Entity Details Row */}
                <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap pt-0.5">
                  {item.entityId && (
                    <div className="flex items-center gap-1 font-mono">
                      <span>ID:</span>
                      <span className="text-slate-200 select-all font-semibold">
                        {item.amountOrTracking?.startsWith("SHPT-")
                          ? item.amountOrTracking
                          : item.entityId.length > 24
                          ? `${item.entityId.slice(0, 10)}...${item.entityId.slice(-6)}`
                          : item.entityId}
                      </span>
                      <button
                        onClick={() => copyToClipboard(item.entityId!)}
                        className="p-0.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                        title="Copy Raw Identifier"
                      >
                        {copiedId === item.entityId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}

                  {item.merchantName && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-300 font-medium">{item.merchantName}</span>
                    </div>
                  )}

                  {item.amountOrTracking && !item.amountOrTracking.startsWith("SHPT-") && (
                    <span className="font-mono text-slate-300">({item.amountOrTracking})</span>
                  )}

                  <span className="text-slate-500">
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {item.canRetry && item.entityId && (
                  <button
                    disabled={retryMutation.isPending}
                    onClick={() =>
                      retryMutation.mutate({
                        entityId: item.entityId!,
                        category: item.category,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${retryMutation.isPending ? "animate-spin" : ""}`}
                    />
                    <span>Re-queue Anchor</span>
                  </button>
                )}

                {item.canResolve && item.entityId && (
                  <button
                    onClick={() => {
                      setResolveModalItem(item);
                      setResolveNotes("");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                )}

                {item.category === "relayer" ? (
                  <Link
                    href="/infrastructure"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
                  >
                    <span>Inspect Infrastructure</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : item.entityId ? (
                  <Link
                    href={`/records?q=${encodeURIComponent(item.amountOrTracking?.startsWith("SHPT-") ? item.amountOrTracking : item.entityId)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Incident Resolution Modal */}
      {resolveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white truncate">Resolve Incident Alert</h3>
                  <p
                    className="text-[11px] text-slate-400 font-mono truncate max-w-full"
                    title={resolveModalItem.entityId}
                  >
                    {resolveModalItem.entityId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolveModalItem(null)}
                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Dismissing this incident marks it as reviewed and removes it from the active operator quarantine feed. The package retains its Disputed status for both merchant and customer, as the merchant may need to dispatch a replacement shipment.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400 block">
                Platform Action & Merchant Outreach Notes (Optional)
              </label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="e.g. Merchant contacted by platform regarding handover discrepancy; merchant advised to re-dispatch replacement..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors resize-none"
              />
            </div>

            {resolveMutation.isError && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="truncate">{resolveMutation.error?.message || "Failed to resolve incident"}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setResolveModalItem(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resolveMutation.isPending}
                onClick={() =>
                  resolveMutation.mutate({
                    entityId: resolveModalItem.entityId!,
                    category: resolveModalItem.category,
                    notes: resolveNotes,
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {resolveMutation.isPending ? "Processing..." : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
