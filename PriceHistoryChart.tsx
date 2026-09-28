"use client";

import { AlertTriangle, BarChart3, RefreshCw } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  formatChartTimestamp,
  formatPercentage,
  formatUsdPrice,
} from "@/lib/crypto/formatters";
import type { ChartTimeRange, CoinChartResponse } from "@/lib/crypto/types";
import { PriceChangeBadge } from "./PriceChangeBadge";

interface PriceHistoryChartProps {
  coinName: string;
  coinSymbol: string;
  selectedRange: ChartTimeRange;
  onSelectRange: (range: ChartTimeRange) => void;
  chartData: CoinChartResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  isLight?: boolean;
}

const TIME_RANGES: Array<{ value: ChartTimeRange; label: string; fullLabel: string }> = [
  { value: "24h", label: "24H", fullLabel: "24 Hours" },
  { value: "7d", label: "7D", fullLabel: "7 Days" },
  { value: "30d", label: "30D", fullLabel: "30 Days" },
  { value: "90d", label: "90D", fullLabel: "90 Days" },
  { value: "1y", label: "1Y", fullLabel: "1 Year" },
];

export function PriceHistoryChart({
  coinName,
  coinSymbol,
  selectedRange,
  onSelectRange,
  chartData,
  loading,
  error,
  onRetry,
  isLight = false,
}: PriceHistoryChartProps) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const rangeMeta =
    TIME_RANGES.find((r) => r.value === selectedRange) ?? TIME_RANGES[1];

  const points = useMemo(() => chartData?.points ?? [], [chartData]);
  const isPositive = (chartData?.percentageChange ?? 0) >= 0;

  const strokeColor = isPositive ? "#10b981" : "#f43f5e";
  const areaStopColor = isPositive ? "#10b981" : "#f43f5e";

  const svgGeometry = useMemo(() => {
    if (points.length < 2) {
      return null;
    }

    const width = 760;
    const height = 260;
    const padLeft = 12;
    const padRight = 12;
    const padTop = 20;
    const padBottom = 32;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    let minP = Infinity;
    let maxP = -Infinity;
    for (const pt of points) {
      if (pt.price < minP) minP = pt.price;
      if (pt.price > maxP) maxP = pt.price;
    }

    const priceSpan = maxP - minP || Math.max(maxP * 0.01, 0.0001);

    const coords = points.map((pt, idx) => {
      const x =
        padLeft + (idx / Math.max(points.length - 1, 1)) * plotWidth;
      const y =
        padTop + (1 - (pt.price - minP) / priceSpan) * plotHeight;
      return { x, y, timestamp: pt.timestamp, price: pt.price };
    });

    const linePath = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
      .join(" ");

    const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(
      2
    )},${(padTop + plotHeight).toFixed(2)} L${coords[0].x.toFixed(2)},${(
      padTop + plotHeight
    ).toFixed(2)} Z`;

    const xTickIndices = [
      0,
      Math.floor((coords.length - 1) * 0.25),
      Math.floor((coords.length - 1) * 0.5),
      Math.floor((coords.length - 1) * 0.75),
      coords.length - 1,
    ];

    const xTicks = Array.from(new Set(xTickIndices)).map((i) => ({
      x: coords[i].x,
      label: formatChartTimestamp(coords[i].timestamp, selectedRange, false),
    }));

    const midP = (minP + maxP) / 2;

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotWidth,
      plotHeight,
      coords,
      linePath,
      areaPath,
      xTicks,
      minP,
      midP,
      maxP,
    };
  }, [points, selectedRange]);

  const activePoint =
    hoverIndex !== null &&
    svgGeometry &&
    svgGeometry.coords[hoverIndex] !== undefined
      ? svgGeometry.coords[hoverIndex]
      : null;

  return (
    <section
      aria-label={`${coinName} historical price chart`}
      className={`rounded-2xl border p-4 sm:p-5 ${
        isLight
          ? "border-slate-200 bg-slate-50/70"
          : "border-slate-800 bg-slate-900/70"
      }`}
    >
      {/* Header row: Title, Currency indicator, Selected range change, Time range buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-sm font-semibold uppercase tracking-wider ${
                isLight ? "text-slate-700" : "text-slate-300"
              }`}
            >
              Historical Price Chart ({rangeMeta.fullLabel})
            </h3>
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                isLight
                  ? "bg-sky-100 text-sky-800 border border-sky-200"
                  : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
              }`}
            >
              Currency: USD ($)
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            {activePoint ? (
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={`text-lg font-bold tabular-nums ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}
                >
                  {formatUsdPrice(activePoint.price)}
                </span>
                <span
                  className={`text-xs ${
                    isLight ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  {formatChartTimestamp(
                    activePoint.timestamp,
                    selectedRange,
                    true
                  )}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-medium ${
                    isLight ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  {rangeMeta.fullLabel} Change:
                </span>
                <PriceChangeBadge
                  value={chartData?.percentageChange}
                  size="sm"
                  isLight={isLight}
                  labelPrefix={`${rangeMeta.fullLabel} percentage change`}
                />
                {chartData?.minPrice !== null &&
                  chartData?.maxPrice !== null &&
                  chartData !== null && (
                    <span
                      className={`text-xs tabular-nums ${
                        isLight ? "text-slate-600" : "text-slate-400"
                      }`}
                    >
                      Range: {formatUsdPrice(chartData.minPrice)} –{" "}
                      {formatUsdPrice(chartData.maxPrice)}
                    </span>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Time range selector */}
        <div
          role="group"
          aria-label="Select chart time range"
          className={`inline-flex self-start rounded-xl border p-1 sm:self-auto ${
            isLight
              ? "border-slate-200 bg-white"
              : "border-slate-800 bg-slate-950/90"
          }`}
        >
          {TIME_RANGES.map((range) => {
            const active = selectedRange === range.value;
            return (
              <button
                key={range.value}
                type="button"
                onClick={() => {
                  setHoverIndex(null);
                  onSelectRange(range.value);
                }}
                aria-pressed={active}
                aria-label={`Show ${range.fullLabel} price chart`}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  active
                    ? "bg-sky-500 text-slate-950 shadow-sm"
                    : isLight
                    ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart body: Loading, Error, Empty, or SVG Chart */}
      <div className="mt-4">
        {loading ? (
          <div
            role="status"
            aria-live="polite"
            aria-label={`Loading ${rangeMeta.fullLabel} price chart for ${coinName}`}
            className="flex h-64 flex-col justify-between rounded-xl border border-dashed border-slate-700/50 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-700/50" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-700/50" />
            </div>
            <div className="flex h-40 items-end gap-2 pt-4">
              {[38, 52, 46, 65, 58, 74, 62, 80, 70, 85, 76, 92].map(
                (heightPct, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${heightPct}%` }}
                    className="flex-1 animate-pulse rounded-t bg-slate-700/40"
                  />
                )
              )}
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-14 animate-pulse rounded bg-slate-700/40" />
              <div className="h-3 w-14 animate-pulse rounded bg-slate-700/40" />
              <div className="h-3 w-14 animate-pulse rounded bg-slate-700/40" />
            </div>
          </div>
        ) : error ? (
          <div
            role="alert"
            className={`flex h-64 flex-col items-center justify-center rounded-xl border p-6 text-center ${
              isLight
                ? "border-rose-200 bg-rose-50/70 text-rose-900"
                : "border-rose-500/30 bg-rose-950/25 text-rose-200"
            }`}
          >
            <AlertTriangle
              className="h-8 w-8 text-rose-400"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-semibold">
              Unable to load {rangeMeta.fullLabel} chart data
            </p>
            <p
              className={`mt-1 max-w-md text-xs ${
                isLight ? "text-rose-700" : "text-rose-300/90"
              }`}
            >
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry Chart
            </button>
          </div>
        ) : !svgGeometry ? (
          <div
            className={`flex h-64 flex-col items-center justify-center rounded-xl border p-6 text-center ${
              isLight
                ? "border-slate-200 bg-white text-slate-600"
                : "border-slate-800 bg-slate-950/50 text-slate-400"
            }`}
          >
            <BarChart3 className="h-8 w-8 opacity-60" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold">
              No historical chart points available
            </p>
            <p className="mt-1 text-xs">
              Historical USD price data is currently unavailable for {coinName}{" "}
              ({coinSymbol.toUpperCase()}) in the {rangeMeta.fullLabel} window.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Screen reader summary */}
            <p className="sr-only">
              {coinName} ({coinSymbol.toUpperCase()}) price chart over{" "}
              {rangeMeta.fullLabel} in USD. Starting price{" "}
              {formatUsdPrice(chartData?.startPrice)}, ending price{" "}
              {formatUsdPrice(chartData?.endPrice)}, low{" "}
              {formatUsdPrice(chartData?.minPrice)}, high{" "}
              {formatUsdPrice(chartData?.maxPrice)}, change{" "}
              {formatPercentage(chartData?.percentageChange)}.
            </p>

            {/* Y-axis reference badges */}
            <div
              className={`mb-1 flex items-center justify-between text-[11px] tabular-nums ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              <span>High: {formatUsdPrice(svgGeometry.maxP)}</span>
              <span>Mid: {formatUsdPrice(svgGeometry.midP)}</span>
              <span>Low: {formatUsdPrice(svgGeometry.minP)}</span>
            </div>

            <svg
              role="img"
              aria-label={`${coinName} ${rangeMeta.fullLabel} USD price history chart`}
              viewBox={`0 0 ${svgGeometry.width} ${svgGeometry.height}`}
              className="h-60 w-full overflow-visible select-none"
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={areaStopColor}
                    stopOpacity={isLight ? 0.28 : 0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor={areaStopColor}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              {[0, 0.5, 1].map((ratio, idx) => {
                const y =
                  svgGeometry.padTop + ratio * svgGeometry.plotHeight;
                return (
                  <line
                    key={idx}
                    x1={svgGeometry.padLeft}
                    x2={svgGeometry.width - svgGeometry.padRight}
                    y1={y}
                    y2={y}
                    stroke={isLight ? "#e2e8f0" : "#1e293b"}
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Shaded area under curve */}
              <path d={svgGeometry.areaPath} fill={`url(#${gradientId})`} />

              {/* Main price curve */}
              <path
                d={svgGeometry.linePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Active hover crosshair & point */}
              {activePoint && (
                <>
                  <line
                    x1={activePoint.x}
                    x2={activePoint.x}
                    y1={svgGeometry.padTop}
                    y2={svgGeometry.padTop + svgGeometry.plotHeight}
                    stroke={isLight ? "#64748b" : "#94a3b8"}
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="5"
                    fill={strokeColor}
                    stroke={isLight ? "#ffffff" : "#0f172a"}
                    strokeWidth="2"
                  />
                </>
              )}

              {/* X-axis date/time labels */}
              {svgGeometry.xTicks.map((tick, idx) => (
                <text
                  key={idx}
                  x={tick.x}
                  y={svgGeometry.height - 8}
                  textAnchor={
                    idx === 0
                      ? "start"
                      : idx === svgGeometry.xTicks.length - 1
                      ? "end"
                      : "middle"
                  }
                  fill={isLight ? "#475569" : "#94a3b8"}
                  fontSize="11"
                  fontFamily="system-ui, sans-serif"
                >
                  {tick.label}
                </text>
              ))}

              {/* Invisible interactive overlay for smooth pointer tracking */}
              <rect
                x={svgGeometry.padLeft}
                y={svgGeometry.padTop}
                width={svgGeometry.plotWidth}
                height={svgGeometry.plotHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (rect.width <= 0) return;
                  const relX = Math.max(
                    0,
                    Math.min(1, (e.clientX - rect.left) / rect.width)
                  );
                  const idx = Math.round(
                    relX * (svgGeometry.coords.length - 1)
                  );
                  setHoverIndex(idx);
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (rect.width <= 0) return;
                  const relX = Math.max(
                    0,
                    Math.min(
                      1,
                      (e.touches[0].clientX - rect.left) / rect.width
                    )
                  );
                  const idx = Math.round(
                    relX * (svgGeometry.coords.length - 1)
                  );
                  setHoverIndex(idx);
                }}
              />
            </svg>
          </div>
        )}
      </div>
    </section>
  );
}
