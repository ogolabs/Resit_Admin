import React from "react";
import Link from "next/link";
import { Package, ArrowUpRight, ShieldCheck, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CustodyMap {
  Created: number;
  InTransit: number;
  Delivered: number;
  Verified: number;
  Disputed: number;
}

interface CustodyDistributionCardProps {
  custody: CustodyMap;
  isLoading?: boolean;
}

export function CustodyDistributionCard({
  custody,
  isLoading = false,
}: CustodyDistributionCardProps) {
  const safeCustody = custody || {
    Created: 0,
    InTransit: 0,
    Delivered: 0,
    Verified: 0,
    Disputed: 0,
  };

  const total =
    safeCustody.Created +
    safeCustody.InTransit +
    safeCustody.Delivered +
    safeCustody.Verified +
    safeCustody.Disputed || 1;

  const states = [
    { key: "Verified", label: "Handover Verified", count: safeCustody.Verified, color: "bg-emerald-500", text: "text-emerald-400" },
    { key: "InTransit", label: "In Active Transit", count: safeCustody.InTransit, color: "bg-blue-500", text: "text-blue-400" },
    { key: "Delivered", label: "Awaiting PIN Verification", count: safeCustody.Delivered, color: "bg-indigo-500", text: "text-indigo-400" },
    { key: "Created", label: "Created / Packing", count: safeCustody.Created, color: "bg-slate-600", text: "text-slate-400" },
    { key: "Disputed", label: "Custody Disputed", count: safeCustody.Disputed, color: "bg-rose-500", text: "text-rose-400" },
  ];

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" />
            <span>Custody State Machine &amp; Logistics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical package handover lifecycle and scratch-off PIN verification.
          </p>
        </div>

        <Link
          href="/records?type=shipments"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 font-medium"
        >
          <span>Ledger</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Custody States Progress Distribution */}
      <div className="space-y-3 py-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 bg-slate-800 animate-pulse rounded" />
            ))}
          </div>
        ) : (
          states.map((st) => {
            const pct = Math.round((st.count / total) * 100);
            return (
              <div key={st.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${st.color}`} />
                    <span className="text-slate-300 font-medium">{st.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className={`font-semibold ${st.text}`}>{st.count}</span>
                    <span className="text-slate-500">({pct}%)</span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${st.color}`}
                    style={{ width: `${st.count > 0 ? Math.max(4, pct) : 0}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Dual-Layer QR Security</span>
        </div>
        {safeCustody.Disputed > 0 ? (
          <Link
            href="/incidents"
            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors font-medium font-mono"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{safeCustody.Disputed} Flagged Discrepancy</span>
          </Link>
        ) : (
          <span className="text-emerald-400 font-mono">0 Handover Disputes</span>
        )}
      </div>
    </Card>
  );
}
