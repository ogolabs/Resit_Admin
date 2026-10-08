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
  Layers,
  RefreshCw,
  Package,
  ShieldCheck,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricSparklineCard } from "@/components/dashboard/MetricSparklineCard";
import { ActivityVolumeChart } from "@/components/dashboard/ActivityVolumeChart";
import { LocationsDistributionCard } from "@/components/dashboard/LocationsDistributionCard";
import { RelayerQuotaCard } from "@/components/dashboard/RelayerQuotaCard";
import { CustodyDistributionCard } from "@/components/dashboard/CustodyDistributionCard";
import { RecentAuditFeed } from "@/components/dashboard/RecentAuditFeed";

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
    network: "mainnet" | "testnet";
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
  dailyActivity: Array<{
    date: string;
    label: string;
    receiptsCount: number;
    shipmentsCount: number;
    gmvNgn: number;
  }>;
  countryDistribution: Array<{
    code: string;
    name: string;
    count: number;
    percentage: number;
    currency: string;
  }>;
  recentEvents: Array<{
    id: string;
    rawId?: string;
    recordType: "receipt" | "shipment";
    merchantName?: string;
    detail: string;
    status: string;
    createdAt: string;
  }>;
}

async function fetchPlatformMetrics(): Promise<MetricsResponse> {
  const res = await fetch("/api/metrics");
  if (!res.ok) {
    throw new Error("Failed to fetch platform metrics");
  }
  return res.json();
}

export default function AdminDashboardPage() {
  const { data, isLoading, isFetching, refetch } = useQuery<MetricsResponse>({
    queryKey: ["admin-metrics"],
    queryFn: fetchPlatformMetrics,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const totalDispatches =
    (data?.custody.Created || 0) +
    (data?.custody.InTransit || 0) +
    (data?.custody.Delivered || 0) +
    (data?.custody.Verified || 0) +
    (data?.custody.Disputed || 0);

  // Sparkline data sequences strictly derived from actual database records
  const gmvSparkline = data?.dailyActivity?.map((d) => d.gmvNgn) || [];
  const receiptsSparkline = data?.dailyActivity?.map((d) => d.receiptsCount) || [];
  const shipmentsSparkline = data?.dailyActivity?.map((d) => d.shipmentsCount) || [];

  const weeklyGmvNgn = data?.dailyActivity?.reduce((acc, d) => acc + d.gmvNgn, 0) || 0;
  const isMainnet = data?.relayer?.network === "mainnet";
  const networkLabel = isMainnet ? "ETN Mainnet" : "ETN Testnet";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-1 sm:px-0">
      {/* Page Header & Global Responsive Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Executive Pulse</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono font-normal">
              {networkLabel}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time platform metrics, blockchain relayer telemetry, and merchant operations.
          </p>
        </div>

        {/* 2x2 Action Grid on Mobile, Flex Inline on Tablet/Desktop */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/records"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            <span>Ledger</span>
          </Link>

          <Link
            href="/incidents"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>Incidents</span>
            {(data?.incidents.activeCount || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-400 text-[10px] font-mono border border-rose-800">
                {data?.incidents.activeCount}
              </span>
            )}
          </Link>

          <Link
            href="/infrastructure"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
          >
            <Server className="w-3.5 h-3.5" />
            <span>Infra</span>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Cards with Responsive Typography & Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Active GMV */}
        <MetricSparklineCard
          title="Active GMV (Sales)"
          value={data?.gmv.formattedNgn || "₦0"}
          subValue={data?.gmv.formattedUsd !== "$0" ? data?.gmv.formattedUsd : undefined}
          badgeText={`₦${weeklyGmvNgn.toLocaleString()} 7-day throughput`}
          badgeType="positive"
          icon={Activity}
          iconColor="text-blue-400"
          sparklineType="line"
          sparklineData={gmvSparkline}
          isLoading={isLoading}
        />

        {/* Card 2: Finalized Receipts */}
        <MetricSparklineCard
          title="Total Finalized Receipts"
          value={(data?.counts.totalReceipts || 0).toLocaleString()}
          subValue={`${data?.counts.issuedReceipts || 0} Issued • ${data?.counts.voidedReceipts || 0} Voided`}
          badgeText={`${data?.voided.ratePercent || "0.0"}% void rate`}
          badgeType={parseFloat(data?.voided.ratePercent || "0") > 15 ? "danger" : "neutral"}
          icon={Layers}
          iconColor="text-emerald-400"
          sparklineType="bars"
          sparklineData={receiptsSparkline}
          isLoading={isLoading}
        />

        {/* Card 3: Tracked Logistics Dispatches */}
        <MetricSparklineCard
          title="Tracked Dispatches"
          value={totalDispatches.toLocaleString()}
          subValue={`${data?.custody.Verified || 0} Verified • ${data?.custody.Disputed || 0} Disputed`}
          badgeText={`${data?.custody.Disputed || 0} flagged dispute`}
          badgeType={(data?.custody.Disputed || 0) > 0 ? "danger" : "positive"}
          icon={Package}
          iconColor="text-indigo-400"
          sparklineType="line"
          sparklineData={shipmentsSparkline}
          isLoading={isLoading}
        />

        {/* Card 4: Registered Merchants */}
        <MetricSparklineCard
          title="Registered Merchants"
          value={(data?.counts.merchants || 0).toLocaleString()}
          subValue="Active store accounts"
          badgeText={`${data?.counts.merchants || 0} organizations`}
          badgeType="positive"
          icon={Building2}
          iconColor="text-blue-400"
          sparklineType="line"
          isLoading={isLoading}
        />
      </div>

      {/* Secondary KPI Strip: 4 Compact Telemetry Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tile 1: Sales Receipts Summary */}
        <Card className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-950/70 border border-blue-800/60 text-blue-400 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {data?.counts.issuedReceipts || 0} Sales Issued
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {(data?.counts.voidedReceipts || 0) === 0 ? "0 Voided items" : `${data?.counts.voidedReceipts} Voided records`}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50 shrink-0 ml-2">
            Active
          </span>
        </Card>

        {/* Tile 2: Custody Handover */}
        <Card className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-indigo-400 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {totalDispatches} Packages Handled
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {data?.custody.Disputed || 0} Flagged Discrepancy
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50 shrink-0 ml-2">
            Logistics
          </span>
        </Card>

        {/* Tile 3: Relayer Fuel Reserve */}
        <Card className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white font-mono truncate">
                {parseFloat(data?.relayer.balanceEtn || "0").toFixed(2)} ETN
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {data?.relayer.isLowBalance ? "Low fuel notice" : "Fuel reserve healthy"}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50 shrink-0 ml-2">
            {networkLabel}
          </span>
        </Card>

        {/* Tile 4: System Signals & Quota */}
        <Card className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {(data?.incidents.activeCount || 0) === 0 ? "All Systems Green" : `${data?.incidents.activeCount} Active Signals`}
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                {data?.relayer.unanchoredQueue || 0} Pending queue
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/50 shrink-0 ml-2">
            Live SLA
          </span>
        </Card>
      </div>

      {/* Middle Section: 7-Day Activity Summary (Left) & Locations (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <div className="lg:col-span-7">
          <ActivityVolumeChart
            data={data?.dailyActivity || []}
            isLoading={isLoading}
          />
        </div>

        <div className="lg:col-span-5">
          <LocationsDistributionCard
            countries={data?.countryDistribution || []}
            totalMerchants={data?.counts.merchants}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Bottom Section: Relayer Quota Capacity (Left) & Custody State Machine (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <div className="lg:col-span-6">
          <RelayerQuotaCard
            address={data?.relayer.address || ""}
            balanceEtn={data?.relayer.balanceEtn || "0"}
            unanchoredQueue={data?.relayer.unanchoredQueue || 0}
            isLowBalance={Boolean(data?.relayer.isLowBalance)}
            network={data?.relayer.network}
            isLoading={isLoading}
          />
        </div>

        <div className="lg:col-span-6">
          <CustodyDistributionCard
            custody={
              data?.custody || {
                Created: 0,
                InTransit: 0,
                Delivered: 0,
                Verified: 0,
                Disputed: 0,
              }
            }
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Live Activity Stream */}
      <div>
        <RecentAuditFeed
          events={data?.recentEvents || []}
          isLoading={isLoading}
        />
      </div>

      {/* Security & Access Policy Bar */}
      <Card className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="leading-relaxed">
            Resit Institutional Ledger &bull; Electroneum SHA-256 Immutable Proofs &bull; Off-Chain PII Zero-Storage Policy
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500 shrink-0">
          Operator Session Active &bull; 8-Hour Lease Life
        </div>
      </Card>
    </div>
  );
}
