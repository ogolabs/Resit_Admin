import React from "react";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DailyItem {
  date: string;
  label: string;
  receiptsCount: number;
  shipmentsCount: number;
  gmvNgn: number;
}

interface ActivityVolumeChartProps {
  data: DailyItem[];
  isLoading?: boolean;
}

export function ActivityVolumeChart({ data = [], isLoading = false }: ActivityVolumeChartProps) {
  const maxVolume = Math.max(
    ...data.map((d) => Math.max(d.receiptsCount, d.shipmentsCount)),
    1
  );

  const totalReceipts = data.reduce((acc, d) => acc + d.receiptsCount, 0);
  const totalShipments = data.reduce((acc, d) => acc + d.shipmentsCount, 0);

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-4 border-b border-slate-800">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="truncate">Activity &amp; Volume Summary</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            Daily throughput: sales receipts vs package dispatches.
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-mono shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 shrink-0" />
            <span className="text-slate-300">Receipts ({totalReceipts})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 shrink-0" />
            <span className="text-slate-300">Dispatches ({totalShipments})</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="pt-6 pb-2">
        {isLoading ? (
          <div className="h-52 sm:h-56 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-blue-500 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-52 sm:h-56 flex items-center justify-center text-xs text-slate-500">
            No activity recorded in the selected 7-day window.
          </div>
        ) : (
          <div className="h-52 sm:h-56 flex flex-col justify-between">
            {/* Grid Bars */}
            <div className="flex-1 flex items-end justify-between gap-1.5 sm:gap-4 md:gap-6 px-1 sm:px-2">
              {data.map((day) => {
                const receiptPct = day.receiptsCount > 0 ? Math.round((day.receiptsCount / maxVolume) * 100) : 0;
                const shipmentPct = day.shipmentsCount > 0 ? Math.round((day.shipmentsCount / maxVolume) * 100) : 0;

                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-0"
                  >
                    {/* Hover Tooltip */}
                    <div className="absolute -top-12 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-slate-800 rounded-lg p-2 shadow-xl text-[10px] sm:text-[11px] whitespace-nowrap space-y-0.5">
                      <div className="font-semibold text-slate-200">{day.label}</div>
                      <div className="text-blue-400 font-mono">
                        {day.receiptsCount} {day.receiptsCount === 1 ? "receipt" : "receipts"} (₦
                        {day.gmvNgn.toLocaleString()})
                      </div>
                      <div className="text-indigo-400 font-mono">
                        {day.shipmentsCount} {day.shipmentsCount === 1 ? "dispatch" : "dispatches"}
                      </div>
                    </div>

                    {/* Dual Bars Pair */}
                    <div className="w-full max-w-[28px] sm:max-w-[40px] flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                      {/* Receipts Bar */}
                      <div
                        className="flex-1 rounded-t-xs bg-blue-500/80 hover:bg-blue-400 transition-all"
                        style={{ height: receiptPct > 0 ? `${receiptPct}%` : "2px" }}
                        title={`${day.receiptsCount} receipts`}
                      />
                      {/* Shipments Bar */}
                      <div
                        className="flex-1 rounded-t-xs bg-indigo-500/80 hover:bg-indigo-400 transition-all"
                        style={{ height: shipmentPct > 0 ? `${shipmentPct}%` : "2px" }}
                        title={`${day.shipmentsCount} dispatches`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Date Labels */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-4 md:gap-6 px-1 sm:px-2 pt-3 border-t border-slate-800 text-[10px] sm:text-[11px] text-slate-400 font-mono">
              {data.map((day) => (
                <div key={day.date} className="flex-1 text-center truncate">
                  {day.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400">
        <span>Continuous Real-Time Telemetry</span>
        <span className="font-mono text-emerald-400">Database Grounded</span>
      </div>
    </Card>
  );
}
