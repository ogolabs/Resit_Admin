"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Server,
  Database,
  Radio,
  RefreshCw,
  Zap,
  CheckCircle2,
  Cpu,
  Loader2,
} from "lucide-react";
import { QUERY_TIMINGS } from "@/lib/query-config";

interface TelemetryData {
  status: string;
  timestamp: string;
  responseTimeMs: number;
  database: {
    readyState: number;
    statusText: string;
    pingLatencyMs: number;
    collections: {
      receipts: number;
      shipments: number;
      merchants: number;
      users: number;
    };
    queueDepth: {
      unanchoredReceipts: number;
      unanchoredShipments: number;
      totalPending: number;
    };
  };
  relayer: {
    address: string;
    balanceEtn: string;
    isLowBalance: boolean;
    evmNonce: number;
    blockNumber: number;
    rpcLatencyMs: number;
    network: string;
  };
  runtime: {
    nodeVersion: string;
    memoryHeapUsedMb: string;
    memoryRssMb: string;
    uptimeSeconds: number;
  };
}

async function fetchInfrastructureTelemetry(): Promise<TelemetryData> {
  const res = await fetch("/api/infrastructure");
  if (!res.ok) {
    throw new Error("Failed to fetch infrastructure telemetry");
  }
  return res.json();
}

export default function InfrastructurePage() {
  const queryClient = useQueryClient();
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-infrastructure"],
    queryFn: fetchInfrastructureTelemetry,
    staleTime: QUERY_TIMINGS.INFRA_STALE_MS,
    refetchInterval: 15000,
  });

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/infrastructure/reconcile", { method: "POST" });
      if (!res.ok) throw new Error("Sweep failed");
      return res.json();
    },
    onSuccess: (result: { identifiedUnanchored?: { total: number } }) => {
      setReconcileResult(
        `Reconciler sweep dispatched. ${result.identifiedUnanchored?.total || 0} unanchored items processed.`
      );
      // Immediately invalidate cache
      queryClient.invalidateQueries({ queryKey: ["admin-infrastructure"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
    onError: () => {
      setReconcileResult("Reconciler sweep could not complete.");
    },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Server className="w-6 h-6 text-blue-400" />
            <span>Infrastructure &amp; Telemetry</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time diagnostics for MongoDB Atlas, Electroneum Relayer, and background queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {reconcileResult && (
        <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-800/80 text-blue-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{reconcileResult}</span>
          </div>
          <button
            onClick={() => setReconcileResult(null)}
            className="text-slate-400 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading && !data ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-xs font-mono">Querying infrastructure telemetry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: MongoDB Atlas */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">MongoDB Atlas</h2>
                    <span className="text-[11px] text-slate-400">Primary Document Store</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {data?.database.statusText || "connected"}
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Ping Latency</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {data?.database.pingLatencyMs} ms
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Receipts Stored</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {data?.database.collections.receipts.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Shipments Stored</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {data?.database.collections.shipments.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Merchants Registered</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {data?.database.collections.merchants.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Pool Size: 10 connections</span>
              <span>Replica Set</span>
            </div>
          </div>

          {/* Card 2: Electroneum Relayer Wallet */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Electroneum Relayer</h2>
                    <span className="text-[11px] text-slate-400">On-Chain Witness &amp; Gas Tank</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-950/80 text-blue-400 border border-blue-800/60 uppercase">
                  {data?.relayer.network}
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
                  <span className="text-slate-400">ETN Gas Balance</span>
                  <span
                    className={`font-mono font-medium ${
                      data?.relayer.isLowBalance ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {data?.relayer.balanceEtn} ETN
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Account Nonce</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {data?.relayer.evmNonce}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Block Height</span>
                  <span className="text-slate-200 font-mono font-medium">
                    #{data?.relayer.blockNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">RPC Latency</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {data?.relayer.rpcLatencyMs} ms
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono truncate">
              {data?.relayer.address}
            </div>
          </div>

          {/* Card 3: Autonomous Reconciler & Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Relayer Queue Depth</h2>
                    <span className="text-[11px] text-slate-400">Background Anchor Sweeper</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    (data?.database.queueDepth.totalPending || 0) > 0
                      ? "bg-slate-800 text-blue-300 border border-blue-700/60"
                      : "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                  }`}
                >
                  {data?.database.queueDepth.totalPending === 0
                    ? "Fully Synced"
                    : `${data?.database.queueDepth.totalPending} Pending`}
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Pending Receipts</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {data?.database.queueDepth.unanchoredReceipts}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Pending Shipments</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {data?.database.queueDepth.unanchoredShipments}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Sweep Interval</span>
                  <span className="text-slate-200 font-mono font-medium">5 Minutes</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800/80">
              <button
                onClick={() => reconcileMutation.mutate()}
                disabled={reconcileMutation.isPending}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {reconcileMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sweeping Relayer Queue...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Run Manual Reconciler Sweep</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 4: Runtime & Node Diagnostics */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2.5 mb-4">
              <Cpu className="w-5 h-5 text-slate-400" />
              <h2 className="text-sm font-semibold text-white">Host Process Diagnostics</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block mb-1">Node Environment</span>
                <span className="font-mono text-xs text-white">{data?.runtime.nodeVersion}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block mb-1">Heap Used</span>
                <span className="font-mono text-xs text-white">{data?.runtime.memoryHeapUsedMb} MB</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block mb-1">Process RSS</span>
                <span className="font-mono text-xs text-white">{data?.runtime.memoryRssMb} MB</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block mb-1">Uptime</span>
                <span className="font-mono text-xs text-white">{data?.runtime.uptimeSeconds} seconds</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
