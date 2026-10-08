import React from "react";
import { ArrowUpRight, LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MetricSparklineCardProps {
  title: string;
  value: string | number;
  subValue?: string;
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
  badgeText,
  badgeType = "positive",
  icon: Icon,
  iconColor,
  sparklineType = "line",
  sparklineData = [],
  isLoading = false,
}: MetricSparklineCardProps) {
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
    <Card className="p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2 gap-2">
        <span className="font-medium text-slate-300 truncate">{title}</span>
        <div className="flex items-center gap-1.5 shrink-0">
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
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{subValue}</div>
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
                        className="flex-1 max-w-[12px] rounded-xs bg-slate-800/80 transition-colors relative"
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
