"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Globe, CreditCard, ShieldCheck, Compass } from "lucide-react";
import * as Flags from "country-flag-icons/react/3x2";
import { Card } from "@/components/ui/card";

type FlagSvg = React.ComponentType<React.SVGProps<SVGSVGElement>>;

// Lazily load 3D cobe FlagGlobe client-side with ssr: false to prevent hydration/window errors
const FlagGlobe = dynamic(
  () => import("@/components/ui/flag-globe").then((m) => m.FlagGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-950/60 rounded-lg">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Rendering 3D Jurisdictional Globe...</span>
        </div>
      </div>
    ),
  }
);

interface CountryItem {
  code: string;
  name: string;
  count: number;
  percentage: number;
  currency: string;
}

interface LocationsDistributionCardProps {
  countries: CountryItem[];
  totalMerchants?: number;
  isLoading?: boolean;
}

export function LocationsDistributionCard({
  countries = [],
  totalMerchants = 0,
  isLoading = false,
}: LocationsDistributionCardProps) {
  const [showAll, setShowAll] = React.useState(false);

  // Strictly map active user jurisdictions with count > 0 — zero fallbacks, zero guess work
  const globeMarkers = useMemo(() => {
    return countries
      .filter((c) => Boolean(c.code) && c.count > 0)
      .map((c) => ({
        code: c.code.toUpperCase(),
        label: `${c.name} (${c.count} ${c.count === 1 ? "store" : "stores"})`,
      }));
  }, [countries]);

  const visibleCountries = showAll ? countries : countries.slice(0, 4);
  const remainingCountries = countries.slice(4);
  const remainingCount = remainingCountries.reduce((sum, c) => sum + c.count, 0);

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 truncate">
            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Locations &amp; Regional Reach</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            Verified merchant operating jurisdictions &amp; settlement channels.
          </p>
        </div>

        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono shrink-0 ml-2">
          {globeMarkers.length} {globeMarkers.length === 1 ? "Active Hub" : "Active Hubs"}
        </span>
      </div>

      {/* Redesigned Fintech 3D Geospatial Console */}
      <div className="relative my-3.5 rounded-xl border border-slate-800 bg-[#060913] p-3 sm:p-4 overflow-hidden shadow-xs">
        {/* Subtle HUD Corner Reticles */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 w-2 h-2 border-t border-l border-slate-700/70" />
        <div className="pointer-events-none absolute top-2.5 right-2.5 w-2 h-2 border-t border-r border-slate-700/70" />
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 w-2 h-2 border-b border-l border-slate-700/70" />
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 w-2 h-2 border-b border-r border-slate-700/70" />

        {/* Top HUD Telemetry Bar */}
        <div className="flex items-center justify-between pb-2.5 text-[11px] font-mono border-b border-slate-800/80">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-white font-semibold truncate tracking-wider text-[10px] uppercase">
              Real-time Jurisdictional Radar
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
              {globeMarkers.length} {globeMarkers.length === 1 ? "Active Nation" : "Active Nations"}
            </span>
          </div>
        </div>

        {/* 3D WebGL Globe Viewport */}
        <div className="relative w-full h-[320px] sm:h-[360px] flex items-center justify-center overflow-hidden my-2">
          <FlagGlobe
            markers={globeMarkers}
            autoRotate={true}
            rotationSpeed={0.12}
            altitude={0.16}
            markerDots={true}
            stars={true}
          />
        </div>

        {/* Bottom HUD Status & Controls Hint */}
        <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400 font-mono border-t border-slate-800/80">
          <span className="flex items-center gap-1.5 truncate text-slate-400">
            <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">Drag / Swipe to rotate &bull; Continents mapped to scale</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-400 shrink-0 ml-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">100% Real User Records</span>
          </span>
        </div>
      </div>

      {/* Verified Regional Breakdown Leaderboard */}
      <div className="space-y-2 pt-1">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 bg-slate-800 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : countries.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 font-mono">
            No merchant geographic records identified yet.
          </div>
        ) : (
          <>
            <div className={`space-y-2 ${showAll ? "max-h-72 overflow-y-auto pr-1" : ""}`}>
              {visibleCountries.map((c) => {
                const Flag = (Flags as unknown as Record<string, FlagSvg | undefined>)[c.code.toUpperCase()];

                return (
                  <div
                    key={c.code}
                    className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 hover:border-slate-700/80 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        {/* SVG Country Flag Badge */}
                        <div className="w-5 h-3.5 rounded-[2px] overflow-hidden border border-slate-700/80 shrink-0 shadow-xs">
                          {Flag ? (
                            <Flag width="100%" height="100%" className="block object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-950 text-[9px] font-mono font-bold text-blue-300 flex items-center justify-center">
                              {c.code}
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-white truncate">{c.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                        <span className="text-slate-200 font-semibold">{c.count}</span>
                        <span className="text-slate-400 text-[10px]">{c.count === 1 ? "store" : "stores"}</span>
                        <span className="text-emerald-400 font-medium">({c.percentage}%)</span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.max(6, c.percentage)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1 truncate">
                        <CreditCard className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>Settlement: {c.currency} Native</span>
                      </span>
                      <span className="text-emerald-400 font-mono shrink-0">Direct Clearing</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overflow Control: Expand / Collapse when > 4 countries */}
            {countries.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="text-slate-400">
                  {showAll
                    ? `Showing all ${countries.length} jurisdictions`
                    : `+${remainingCountries.length} more jurisdictions (${remainingCount} stores)`}
                </span>
                <span className="text-emerald-400 font-semibold hover:underline">
                  {showAll ? "Show Top 4" : "View All"}
                </span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 mt-2">
        <span className="flex items-center gap-1 truncate">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate">Active Merchants: {totalMerchants}</span>
        </span>
        <span className="text-slate-400 font-mono shrink-0">100% Verified Accounts</span>
      </div>
    </Card>
  );
}
