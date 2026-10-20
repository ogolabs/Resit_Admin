import React, { useState, useRef, useEffect } from "react";
import { ArrowUpRight, ChevronDown, Coins, LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface CurrencyBreakdownItem {
  currency: string;
  total: number;
  formatted: string;
  count: number;
  usdValue: number;
}

interface MetricSparklineCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  currencyBreakdown?: CurrencyBreakdownItem[];
  badgeText?: string;
  badgeType?: "positive" | "neutral" | "danger";
  icon: LucideIcon;
  iconColor: string;
  sparklineType?: "line" | "bars";
  sparklineData?: number[];
  isLoading?: boolean;
}

export function MetricSparklineCard({
  title,
  value,
  subValue,
  currencyBreakdown,
  badgeText,
  badgeType = "positive",
  icon: Icon,
  iconColor,
  sparklineType = "line",
  sparklineData = [],
  isLoading = false,
}: MetricSparklineCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const badgeClasses = {
    positive: "bg-emerald-950/80 text-emerald-400 border-emerald-800/60",
    neutral: "bg-slate-800 text-slate-300 border-slate-700",
    danger: "bg-rose-950/80 text-rose-400 border-rose-800/60",
  }[badgeType];

  const hasData = sparklineData.length > 0;
  const maxVal = Math.max(...sparklineData, 1);
  const minVal = Math.min(...sparklineData, 0);
  const range = maxVal - minVal || 1;

  // Build SVG path coordinates for line sparkline
  const width = 110;
  const height = 34;
  const step = sparklineData.length > 1 ? width / (sparklineData.length - 1) : width;

  const points = sparklineData.map((v, i) => {
    const x = i * step;
    const y = height - ((v - minVal) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = points.length > 0 ? `M ${points.join(" L ")}` : `M 0,${height / 2} L ${width},${height / 2}`;

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between relative">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2 gap-2">
        <span className="font-medium text-slate-300 truncate">{title}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {currencyBreakdown && currencyBreakdown.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-800/90 hover:bg-slate-750 text-blue-400 border border-slate-700 transition-colors cursor-pointer"
                title="View sales breakdown by currency"
              >
                <Coins className="w-2.5 h-2.5" />
                <span>{currencyBreakdown.length} Currencies</span>
                <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-blue-400" />
                      <span>Volume by Currency</span>
                    </span>
                    <span className="font-mono text-slate-400 text-[10px]">
                      {currencyBreakdown.length} {currencyBreakdown.length === 1 ? "unit" : "units"}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {currencyBreakdown.map((item) => (
                      <div
                        key={item.currency}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-mono font-bold text-white flex items-center gap-1.5">
                            <span>{item.formatted}</span>
                            <span className="text-[10px] font-normal text-slate-400">{item.currency}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.count} {item.count === 1 ? "receipt" : "receipts"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-xs font-semibold text-blue-400">
                            ${item.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            USD Value
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 mt-1 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight truncate">
            {isLoading ? (
              <span className="inline-block w-24 h-7 bg-slate-800 animate-pulse rounded" />
            ) : (
              value
            )}
          </div>
          {subValue && (
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
              {subValue}
            </div>
          )}
        </div>

        {/* Micro-Chart Sparkline strictly driven by real data */}
        {!isLoading && (
          <div className="w-20 sm:w-28 h-9 shrink-0 flex items-end justify-end">
            {sparklineType === "line" && (
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <path
                  d={pathD}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={hasData ? iconColor : "text-slate-800"}
                />
              </svg>
            )}

            {sparklineType === "bars" && (
              <div className="flex items-end gap-1 w-full h-full pb-0.5 justify-end">
                {hasData ? (
                  sparklineData.map((val, idx) => {
                    const pct = Math.max(8, Math.round(((val - minVal) / range) * 100));
                    return (
                      <div
                        key={idx}
                        className="flex-1 max-w-3 rounded-xs bg-slate-800/80 transition-colors relative"
                        style={{ height: `${pct}%` }}
                      >
                        <div
                          className={`w-full h-full rounded-xs ${
                            val > 0 ? "bg-emerald-500" : "bg-slate-700"
                          }`}
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-1 bg-slate-800 rounded-full" />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {badgeText && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px] min-w-0">
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium inline-flex items-center gap-0.5 truncate ${badgeClasses}`}>
            {badgeType === "positive" && <ArrowUpRight className="w-2.5 h-2.5 shrink-0" />}
            <span className="truncate">{badgeText}</span>
          </span>
        </div>
      )}
    </Card>
  );
}
