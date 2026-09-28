"use client";

import {
  BellPlus,
  ExternalLink,
  Globe,
  Star,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  getCoinChartById,
  getCoinDetailById,
} from "@/lib/crypto/crypto-client";
import {
  formatCompactUsd,
  formatExactTimestamp,
  formatFullUsd,
  formatPercentage,
  formatShortDate,
  formatSupply,
  formatUsdPrice,
  isValidNumber,
} from "@/lib/crypto/formatters";
import type {
  ChartTimeRange,
  CoinChartResponse,
  CoinDetail,
  CoinMarket,
} from "@/lib/crypto/types";
import { CoinLogo } from "./CoinLogo";
import { MetricTooltip } from "./MetricTooltip";
import { PriceChangeBadge } from "./PriceChangeBadge";
import { PriceHistoryChart } from "./PriceHistoryChart";

interface CoinDetailModalProps {
  coin: CoinMarket | null;
  onClose: () => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (coinId: string) => void;
  onOpenAlertForCoin: (coin: CoinMarket) => void;
  isLight?: boolean;
}

export function CoinDetailModal({
  coin,
  onClose,
  isWatchlisted,
  onToggleWatchlist,
  onOpenAlertForCoin,
  isLight = false,
}: CoinDetailModalProps) {
  const [selectedRange, setSelectedRange] = useState<ChartTimeRange>("7d");
  const [chartData, setChartData] = useState<CoinChartResponse | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const [detailData, setDetailData] = useState<CoinDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const loadChart = useCallback(
    async (coinId: string, range: ChartTimeRange, force = false) => {
      setChartLoading(true);
      setChartError(null);
      try {
        const res = await getCoinChartById(coinId, range, force);
        setChartData(res);
      } catch (err) {
        setChartError(
          err instanceof Error
            ? err.message
            : "Unable to load historical price chart."
        );
      } finally {
        setChartLoading(false);
      }
    },
    []
  );

  const loadDetail = useCallback(async (coinId: string) => {
    setDetailLoading(true);
    try {
      const res = await getCoinDetailById(coinId);
      setDetailData(res.coin);
    } catch {
      // Fallback gracefully to the market summary fields already present on `coin`
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!coin) {
      setChartData(null);
      setDetailData(null);
      return;
    }
    loadChart(coin.id, selectedRange, false);
  }, [coin, selectedRange, loadChart]);

  useEffect(() => {
    if (!coin) return;
    setDetailData(null);
    loadDetail(coin.id);
  }, [coin, loadDetail]);

  useEffect(() => {
    if (!coin) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [coin, onClose]);

  if (!coin) {
    return null;
  }

  const currentPrice = detailData?.current_price ?? coin.current_price;
  const high24h = detailData?.high_24h ?? coin.high_24h;
  const low24h = detailData?.low_24h ?? coin.low_24h;
  const marketCap = detailData?.market_cap ?? coin.market_cap;
  const volume24h = detailData?.total_volume ?? coin.total_volume;
  const circulatingSupply =
    detailData?.circulating_supply ?? coin.circulating_supply;
  const maxSupply = detailData?.max_supply ?? coin.max_supply;
  const ath = detailData?.ath ?? coin.ath;
  const athChangePct =
    detailData?.ath_change_percentage ?? coin.ath_change_percentage;
  const athDate = detailData?.ath_date ?? coin.ath_date;
  const rank = detailData?.market_cap_rank ?? coin.market_cap_rank;
  const change24h =
    detailData?.price_change_percentage_24h ?? coin.price_change_percentage_24h;

  // Calculate 24h range position percentage for visual range bar
  let rangePercent: number | null = null;
  if (
    isValidNumber(currentPrice) &&
    isValidNumber(low24h) &&
    isValidNumber(high24h) &&
    high24h > low24h
  ) {
    rangePercent = Math.min(
      100,
      Math.max(0, ((currentPrice - low24h) / (high24h - low24h)) * 100)
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coin-detail-modal-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border p-5 shadow-2xl sm:p-7 ${
          isLight
            ? "border-slate-200 bg-white text-slate-900"
            : "border-slate-800 bg-slate-950 text-slate-100"
        }`}
      >
        {/* Top Modal Header */}
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between border-slate-800/60">
          <div className="flex items-center gap-3.5">
            <CoinLogo
              src={detailData?.image || coin.image}
              name={coin.name}
              symbol={coin.symbol}
              size="lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="coin-detail-modal-title"
                  className="text-xl font-bold tracking-tight sm:text-2xl"
                >
                  {coin.name}
                </h2>
                <span
                  className={`rounded-lg px-2 py-0.5 text-xs font-bold uppercase ${
                    isLight
                      ? "bg-slate-100 text-slate-700"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {coin.symbol.toUpperCase()}
                </span>
                <span
                  className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                    isLight
                      ? "bg-sky-50 text-sky-800 border border-sky-200"
                      : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                  }`}
                >
                  Rank #{rank ?? "N/A"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-extrabold tabular-nums sm:text-3xl">
                  {formatUsdPrice(currentPrice)}
                </span>
                <span
                  className={`text-xs font-semibold uppercase ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  USD
                </span>
                <PriceChangeBadge
                  value={change24h}
                  size="md"
                  isLight={isLight}
                  labelPrefix="24h price change"
                />
              </div>
            </div>
          </div>

          {/* Action buttons: Watchlist, Alert, Close */}
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-start">
            <button
              type="button"
              onClick={() => onToggleWatchlist(coin.id)}
              aria-pressed={isWatchlisted}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isWatchlisted
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                  : isLight
                  ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Star
                className={`h-4 w-4 ${
                  isWatchlisted ? "fill-amber-400 text-amber-400" : ""
                }`}
                aria-hidden="true"
              />
              <span>{isWatchlisted ? "Watchlisted" : "Add to Watchlist"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenAlertForCoin(coin);
                onClose();
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isLight
                  ? "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                  : "border-sky-500/30 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"
              }`}
            >
              <BellPlus className="h-4 w-4" aria-hidden="true" />
              <span>Set Price Alert</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close coin details"
              className={`inline-flex rounded-xl border p-2 transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isLight
                  ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* 24-Hour Price Range Bar */}
        <div
          className={`mt-5 rounded-2xl border p-4 ${
            isLight
              ? "border-slate-200 bg-slate-50"
              : "border-slate-800/90 bg-slate-900/50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
            <div>
              <span
                className={isLight ? "text-slate-500" : "text-slate-400"}
              >
                24-Hour Low:{" "}
              </span>
              <span className="font-bold tabular-nums">
                {formatUsdPrice(low24h)}
              </span>
            </div>
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              24-Hour USD Price Range
            </span>
            <div>
              <span
                className={isLight ? "text-slate-500" : "text-slate-400"}
              >
                24-Hour High:{" "}
              </span>
              <span className="font-bold tabular-nums">
                {formatUsdPrice(high24h)}
              </span>
            </div>
          </div>

          <div
            className={`mt-2.5 h-2 w-full overflow-hidden rounded-full ${
              isLight ? "bg-slate-200" : "bg-slate-800"
            }`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 transition-all duration-300"
              style={{
                width: `${rangePercent !== null ? rangePercent : 50}%`,
              }}
            />
          </div>
        </div>

        {/* Historical Price Chart */}
        <div className="mt-5">
          <PriceHistoryChart
            coinName={coin.name}
            coinSymbol={coin.symbol}
            selectedRange={selectedRange}
            onSelectRange={setSelectedRange}
            chartData={chartData}
            loading={chartLoading}
            error={chartError}
            onRetry={() => loadChart(coin.id, selectedRange, true)}
            isLight={isLight}
          />
        </div>

        {/* Key Market Statistics Grid */}
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Market Capitalization */}
          <div
            className={`rounded-2xl border p-4 ${
              isLight
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-800/80 bg-slate-900/60"
            }`}
          >
            <div
              className={`text-xs font-medium ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              <MetricTooltip
                label="Market Capitalization"
                explanation="Total market value of a cryptocurrency's circulating supply (Current Price × Circulating Supply)."
                isLight={isLight}
              />
            </div>
            <p className="mt-1.5 text-lg font-bold tabular-nums">
              {formatCompactUsd(marketCap)}
            </p>
            <p
              className={`mt-0.5 text-xs tabular-nums ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {formatFullUsd(marketCap)}
            </p>
          </div>

          {/* 24h Trading Volume */}
          <div
            className={`rounded-2xl border p-4 ${
              isLight
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-800/80 bg-slate-900/60"
            }`}
          >
            <div
              className={`text-xs font-medium ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              <MetricTooltip
                label="24-Hour Trading Volume"
                explanation="Total USD value of this cryptocurrency traded across tracked exchanges in the last 24 hours."
                isLight={isLight}
              />
            </div>
            <p className="mt-1.5 text-lg font-bold tabular-nums">
              {formatCompactUsd(volume24h)}
            </p>
            <p
              className={`mt-0.5 text-xs tabular-nums ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {formatFullUsd(volume24h)}
            </p>
          </div>

          {/* Circulating Supply */}
          <div
            className={`rounded-2xl border p-4 ${
              isLight
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-800/80 bg-slate-900/60"
            }`}
          >
            <div
              className={`text-xs font-medium ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              <MetricTooltip
                label="Circulating Supply"
                explanation="The number of coins or tokens that are publicly circulating in the market and in the general public's hands."
                isLight={isLight}
              />
            </div>
            <p className="mt-1.5 text-lg font-bold tabular-nums">
              {formatSupply(circulatingSupply, coin.symbol)}
            </p>
            <p
              className={`mt-0.5 text-xs tabular-nums ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Max Supply:{" "}
              {maxSupply ? formatSupply(maxSupply, coin.symbol) : "Unlimited / N/A"}
            </p>
          </div>

          {/* All-Time High (ATH) */}
          <div
            className={`rounded-2xl border p-4 ${
              isLight
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-800/80 bg-slate-900/60"
            }`}
          >
            <div
              className={`text-xs font-medium ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              <MetricTooltip
                label="All-Time High (ATH)"
                explanation="The highest USD price ever recorded for this asset across tracked market history."
                isLight={isLight}
              />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <p className="text-lg font-bold tabular-nums">
                {formatUsdPrice(ath)}
              </p>
              {isValidNumber(athChangePct) && (
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    athChangePct >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  ({formatPercentage(athChangePct)})
                </span>
              )}
            </div>
            <p
              className={`mt-0.5 text-xs ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Recorded: {formatShortDate(athDate)}
            </p>
          </div>

          {/* 24h High / Low Summary */}
          <div
            className={`rounded-2xl border p-4 ${
              isLight
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-800/80 bg-slate-900/60"
            }`}
          >
            <div
              className={`text-xs font-medium ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              <MetricTooltip
                label="24-Hour High / Low"
                explanation="The highest and lowest USD trading prices recorded during the past 24 hours."
                isLight={isLight}
              />
            </div>
            <p className="mt-1.5 text-sm font-bold tabular-nums">
              High: {formatUsdPrice(high24h)}
            </p>
            <p
              className={`mt-0.5 text-sm font-bold tabular-nums ${
                isLight ? "text-slate-600" : "text-slate-300"
              }`}
            >
              Low: {formatUsdPrice(low24h)}
            </p>
          </div>

          {/* Official Project Website & Links */}
          <div
            className={`rounded-2xl border p-4 ${
              isLight
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-800/80 bg-slate-900/60"
            }`}
          >
            <div
              className={`text-xs font-medium ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Official Project Resources
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {detailLoading && !detailData ? (
                <div className="h-7 w-36 animate-pulse rounded-lg bg-slate-700/40" />
              ) : detailData?.homepage_url ? (
                <a
                  href={detailData.homepage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-400 border border-sky-500/30 transition hover:bg-sky-500/25 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Official Website</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : (
                <span
                  className={`text-xs ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Official website link not reported
                </span>
              )}

              {detailData?.blockchain_site_url && (
                <a
                  href={detailData.blockchain_site_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                    isLight
                      ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span>Explorer</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Optional Project Overview Description */}
        {detailData?.description_summary && (
          <div
            className={`mt-4 rounded-2xl border p-4 text-xs leading-relaxed ${
              isLight
                ? "border-slate-200 bg-slate-50/70 text-slate-700"
                : "border-slate-800/80 bg-slate-900/50 text-slate-300"
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5 font-semibold">
              <TrendingUp className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              <span>About {coin.name}</span>
            </div>
            <p>{detailData.description_summary}</p>
          </div>
        )}

        {/* Footer Timestamp & Attribution inside Modal */}
        <div
          className={`mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs ${
            isLight
              ? "border-slate-200 text-slate-500"
              : "border-slate-800 text-slate-400"
          }`}
        >
          <span>
            Last coin update:{" "}
            {formatExactTimestamp(
              detailData?.last_updated ?? coin.last_updated
            )}
          </span>
          <span>Data source: CoinGecko Public API (USD)</span>
        </div>
      </div>
    </div>
  );
}
