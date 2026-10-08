import React from "react";
import Link from "next/link";
import { Receipt, Package, ExternalLink, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RecentEventItem {
  id: string;
  rawId?: string;
  recordType: "receipt" | "shipment";
  merchantName?: string;
  detail: string;
  status: string;
  createdAt: Date | string;
}

interface RecentAuditFeedProps {
  events: RecentEventItem[];
  isLoading?: boolean;
}

export function RecentAuditFeed({ events = [], isLoading = false }: RecentAuditFeedProps) {
  const getStatusBadge = (status: string, type: "receipt" | "shipment") => {
    const s = (status || "").toLowerCase();
    if (s === "voided" || s === "disputed") {
      return "bg-rose-950/80 text-rose-300 border-rose-800/60";
    }
    if (s === "verified" || s === "delivered") {
      return "bg-emerald-950/80 text-emerald-300 border-emerald-800/60";
    }
    if (type === "receipt") {
      return "bg-blue-950/80 text-blue-300 border-blue-800/60";
    }
    return "bg-indigo-950/80 text-indigo-300 border-indigo-800/60";
  };

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">Live Platform Activity Feed</h2>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            Real-time audit stream of counter receipts, parcel dispatches, and ledger events.
          </p>
        </div>

        <Link
          href="/records"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 font-medium shrink-0"
        >
          <span>All Records</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Events List */}
      <div className="divide-y divide-slate-800/60 py-1">
        {isLoading ? (
          <div className="py-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-slate-800 animate-pulse rounded" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No recent transactions recorded on the network.
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="py-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-800/30 px-1 sm:px-2 rounded-lg transition-colors group min-w-0"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    ev.recordType === "receipt"
                      ? "bg-blue-950/70 border-blue-800/60 text-blue-400"
                      : "bg-indigo-950/70 border-indigo-800/60 text-indigo-400"
                  }`}
                >
                  {ev.recordType === "receipt" ? (
                    <Receipt className="w-3.5 h-3.5" />
                  ) : (
                    <Package className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-white truncate max-w-[130px] sm:max-w-none">
                      {ev.merchantName || (ev.recordType === "receipt" ? "Receipt Store" : "Parcel Shipper")}
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full border font-medium uppercase shrink-0 ${getStatusBadge(
                        ev.status,
                        ev.recordType
                      )}`}
                    >
                      {ev.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    <span className="font-mono text-slate-300 font-semibold">{ev.id}</span>
                    <span className="mx-1.5 text-slate-600">&bull;</span>
                    <span className="truncate">{ev.detail}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                  {new Date(ev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <Link
                  href={`/records?q=${encodeURIComponent(ev.id)}`}
                  className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Inspect Record"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <span>Continuous Real-Time Ingestion</span>
        <span className="text-slate-400 font-mono">MongoDB + Electroneum</span>
      </div>
    </Card>
  );
}
