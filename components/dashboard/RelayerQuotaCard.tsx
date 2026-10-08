import React from "react";
import Link from "next/link";
import { Server, ArrowUpRight, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RelayerQuotaCardProps {
  address: string;
  balanceEtn: string;
  unanchoredQueue: number;
  isLowBalance: boolean;
  network?: string;
  isLoading?: boolean;
}

export function RelayerQuotaCard({
  address,
  balanceEtn,
  unanchoredQueue,
  isLowBalance,
  network = "testnet",
  isLoading = false,
}: RelayerQuotaCardProps) {
  const balanceNum = parseFloat(balanceEtn || "0");
  const targetBuffer = 50; // 50 ETN warning threshold
  const fuelPercentage = Math.min(100, Math.round((balanceNum / targetBuffer) * 100));

  const shortenAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr || "—";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isMainnet = network.toLowerCase() === "mainnet";

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <span>Relayer Fuel &amp; Network Capacity</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Electroneum {isMainnet ? "Mainnet" : "Testnet"} transaction gas reserves and anchor queue.
          </p>
        </div>

        <Link
          href="/infrastructure"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 font-medium"
        >
          <span>Inspect</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Capacity Gauge Header */}
      <div className="py-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs">
          <div className="text-slate-300 font-medium">
            Available Fuel:{" "}
            <span className="text-white font-bold font-mono text-base">
              {isLoading ? "..." : `${balanceNum.toFixed(2)} ETN`}
            </span>{" "}
            <span className="text-slate-500">({isLowBalance ? "< 50 ETN threshold" : "healthy reserve"})</span>
          </div>
          <span
            className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border ${
              isLowBalance
                ? "bg-rose-950/80 text-rose-400 border-rose-800/60"
                : "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
            }`}
          >
            {isLowBalance ? "Low Fuel Warning" : "Fuel Operational"}
          </span>
        </div>

        {/* Dynamic Capacity Progress Bar */}
        <div className="w-full h-2.5 bg-slate-950 border border-slate-800 rounded-full overflow-hidden flex p-0.5 gap-1">
          <div
            className={`h-full rounded-full transition-all ${
              isLowBalance ? "bg-rose-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.max(4, Math.min(100, fuelPercentage))}%` }}
            title={`Relayer Gas: ${balanceNum.toFixed(2)} ETN`}
          />
        </div>

        {/* Real Status Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] pt-1">
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
            <span className="text-slate-400 block text-[10px]">Active Network</span>
            <span className="text-white font-mono font-medium mt-0.5 block">
              {isMainnet ? "ETN Mainnet" : "ETN Testnet"}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
            <span className="text-slate-400 block text-[10px]">Unanchored Queue</span>
            <span
              className={`font-mono font-medium mt-0.5 block ${
                unanchoredQueue > 0 ? "text-blue-400" : "text-emerald-400"
              }`}
            >
              {unanchoredQueue} {unanchoredQueue === 1 ? "receipt" : "receipts"}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5 col-span-2 sm:col-span-1">
            <span className="text-slate-400 block text-[10px]">Relayer Address</span>
            <span className="text-slate-300 font-mono text-[10px] mt-0.5 block truncate" title={address}>
              {shortenAddress(address)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-mono">
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span>Automated Gas Relaying</span>
        </div>
        <div className="flex items-center gap-1">
          {isLowBalance ? (
            <span className="text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Top-up Fuel Advised
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sufficient Fuel
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
