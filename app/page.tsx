"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Server,
  Building2,
  FileSpreadsheet,
  AlertOctagon,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  RefreshCw,
  Ban,
} from "lucide-react";

interface MetricsResponse {
  success: boolean;
  timestamp: string;
  gmv: {
    ngn: number;
    usd: number;
    formattedNgn: string;
    formattedUsd: string;
  };
  voided: {
    count: number;
    ratePercent: string;
    totalNgn: number;
    totalUsd: number;
    formattedNgn: string;
    formattedUsd: string;
  };
  counts: {
    totalReceipts: number;
    issuedReceipts: number;
    voidedReceipts: number;
    merchants: number;
  };
  relayer: {
    address: string;
    isLowBalance: boolean;
    balanceEtn: string;
    unanchoredQueue: number;
  };
  incidents: {
    activeCount: number;
    activeDisputes: number;
    unanchoredQueue: number;
  };
  custody: {
    Created: number;
    InTransit: number;
    Delivered: number;
    Verified: number;
    Disputed: number;
  };
}

async function fetchPlatformMetrics(): Promise<MetricsResponse> {
  const res = await fetch("/api/metrics");
  if (!res.ok) {
    throw new Error("Failed to fetch platform metrics");
  }
  return res.json();
}

export default function AdminDashboardPage() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: fetchPlatformMetrics,
    staleTime: 60 * 1000, // Cache for 60 seconds
    refetchOnWindowFocus: false, // Do not refetch on alt-tabbing
  });

  const shortenAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr || "—";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Executive Pulse</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono font-normal">
              Live Network
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time platform metrics, blockchain relayer status, and organization health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/infrastructure"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span>Infrastructure Health</span>
          </Link>
          <Link
            href="/records"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Universal Ledger</span>
          </Link>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: GMV */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Active GMV (Issued)</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading && !data ? (
              <span className="inline-block w-32 h-7 bg-slate-800 animate-pulse rounded" />
            ) : (
              data?.gmv.formattedNgn || "₦0"
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400">
            <ArrowUpRight className="w-3 h-3" />
            <span>Recorded sales across active merchants</span>
          </div>
        </div>

        {/* Metric 2: Total Receipts Finalized */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Finalized Receipts</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading && !data ? (
              <span className="inline-block w-24 h-7 bg-slate-800 animate-pulse rounded" />
            ) : (
              (data?.counts.totalReceipts || 0).toLocaleString()
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
            <span>
              {data?.counts.issuedReceipts || 0} issued &bull; {data?.counts.voidedReceipts || 0} voided
            </span>
          </div>
        </div>

        {/* Metric 3: Voided Receipts & Void Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Voided Receipts</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading && !data ? (
              <span className="inline-block w-20 h-7 bg-slate-800 animate-pulse rounded" />
            ) : (
              (data?.voided.count || 0).toLocaleString()
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
            <span className="text-slate-300 font-mono font-medium">{data?.voided.ratePercent || "0.0"}%</span>
            <span>void rate &bull; {data?.voided.formattedNgn || "₦0"} voided</span>
          </div>
        </div>

        {/* Metric 4: Registered Merchants */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Registered Merchants</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading && !data ? (
              <span className="inline-block w-16 h-7 bg-slate-800 animate-pulse rounded" />
            ) : (
              (data?.counts.merchants || 0).toLocaleString()
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Active merchant organizations</span>
          </div>
        </div>
      </div>

      {/* Operational Modules Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module Card: Infrastructure */}
        <Link
          href="/infrastructure"
          className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 transition-colors flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center mb-4">
              <Server className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors flex items-center justify-between">
              <span>Infrastructure Telemetry</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Supervise Electroneum relayer ETN reserves, EVM transaction nonces, MongoDB connection pool metrics, and automated background reconcile sweeps.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono">
              Relayer: {shortenAddress(data?.relayer.address || "")}
            </span>
            <span
              className={`font-medium ${
                (data?.relayer.unanchoredQueue || 0) === 0 ? "text-emerald-400" : "text-blue-400"
              }`}
            >
              {(data?.relayer.unanchoredQueue || 0) === 0
                ? "Queue Empty"
                : `${data?.relayer.unanchoredQueue} Pending`}
            </span>
          </div>
        </Link>

        {/* Module Card: Merchants */}
        <Link
          href="/merchants"
          className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 transition-colors flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center justify-between">
              <span>Merchant Directory</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Explore registered retail merchants, branch configurations, active cashier seats, plan quotas, and emergency account unlock/suspension controls.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Store Organizations</span>
            <span className="text-emerald-400 font-medium font-mono">
              {data?.counts.merchants || 0} Registered
            </span>
          </div>
        </Link>

        {/* Module Card: Universal Ledger */}
        <Link
          href="/records"
          className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 transition-colors flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white group-hover:text-indigo-400 transition-colors flex items-center justify-between">
              <span>Universal Ledger</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Universal audit search across every smart receipt and package dispatch label. Inspect item breakdowns, void stamps, and custody chains.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Audit Trail</span>
            <span className="text-blue-400 font-medium font-mono">
              {data?.counts.totalReceipts || 0} Records
            </span>
          </div>
        </Link>

        {/* Module Card: Incidents */}
        <Link
          href="/incidents"
          className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 transition-colors flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center mb-4">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white group-hover:text-rose-400 transition-colors flex items-center justify-between">
              <span>Incidents &amp; Diagnostics</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Real-time exception stream, webhook retry failures, PIN brute-force alerts, and cashier void spike anomaly detectors.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Active Signals</span>
            <span
              className={`font-medium ${
                (data?.incidents.activeCount || 0) === 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {data?.incidents.activeCount || 0} Active
            </span>
          </div>
        </Link>

        {/* Security & Access Banner */}
        <div className="md:col-span-2 lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Administrative Access Policy</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every administrative action, quota adjustment, and manual reconciler trigger is sealed into immutable audit records. Customer private data remains strictly off-chain with cryptographic hash integrity guaranteed by the Electroneum blockchain.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
            Security Protocol: Level 3 &bull; Role-Scoped HMAC Tokens &bull; 8-Hour Session Life
          </div>
        </div>
      </div>
    </div>
  );
}
