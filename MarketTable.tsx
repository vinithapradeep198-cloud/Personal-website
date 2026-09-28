"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BellPlus,
  ChevronRight,
  RefreshCw,
  SearchX,
  Star,
  Trash2,
} from "lucide-react";
import {
  formatCompactUsd,
  formatFullUsd,
  formatUsdPrice,
} from "@/lib/crypto/formatters";
import type { CoinMarket, SortField, SortOrder } from "@/lib/crypto/types";
import { CoinLogo } from "./CoinLogo";
import { MetricTooltip } from "./MetricTooltip";
import { PriceChangeBadge } from "./PriceChangeBadge";

interface MarketTableProps {
  coins: CoinMarket[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField) => void;
  isWatchlisted: (coinId: string) => boolean;
  onToggleWatchlist: (coinId: string) => void;
  onSelectCoin: (coin: CoinMarket) => void;
  onOpenAlertForCoin: (coin: CoinMarket) => void;
  showingWatchlistOnly: boolean;
  watchlistCount: number;
  onSwitchToAllCoins: () => void;
  onClearWatchlist: () => void;
  searchQuery: string;
  onClearSearch: () => void;
  isLight?: boolean;
}

export function MarketTable({
  coins,
  loading,
  error,
  onRetry,
  sortField,
  sortOrder,
  onSortChange,
  isWatchlisted,
  onToggleWatchlist,
  onSelectCoin,
  onOpenAlertForCoin,
  showingWatchlistOnly,
  watchlistCount,
  onSwitchToAllCoins,
  onClearWatchlist,
  searchQuery,
  onClearSearch,
  isLight = false,
}: MarketTableProps) {
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown
          className="h-3.5 w-3.5 opacity-45 group-hover:opacity-80"
          aria-hidden="true"
        />
      );
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
    );
  };

  const getAriaSort = (
    field: SortField
  ): "ascending" | "descending" | "none" => {
    if (sortField !== field) return "none";
    return sortOrder === "asc" ? "ascending" : "descending";
  };

  // 1. Error State (when no coins could be loaded)
  if (error && coins.length === 0 && !loading) {
    return (
      <div
        role="alert"
        className={`rounded-3xl border p-8 text-center shadow-lg ${
          isLight
            ? "border-rose-200 bg-rose-50/80 text-rose-950"
            : "border-rose-500/30 bg-rose-950/20 text-rose-100"
        }`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-bold">
          Unable to Load Cryptocurrency Market Data
        </h2>
        <p
          className={`mx-auto mt-2 max-w-lg text-sm leading-relaxed ${
            isLight ? "text-rose-800" : "text-rose-200/90"
          }`}
        >
          {error}
        </p>
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Retry Loading Market Data</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading Skeleton State
  if (loading && coins.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading cryptocurrency market data"
        className={`overflow-hidden rounded-3xl border shadow-lg ${
          isLight
            ? "border-slate-200 bg-white"
            : "border-slate-800/90 bg-slate-900/75"
        }`}
      >
        {/* Desktop table skeleton */}
        <div className="hidden lg:block">
          <div
            className={`grid grid-cols-12 gap-4 border-b px-6 py-4 text-xs font-semibold uppercase ${
              isLight
                ? "border-slate-200 bg-slate-50 text-slate-500"
                : "border-slate-800 bg-slate-950/60 text-slate-400"
            }`}
          >
            <div className="col-span-1">Rank</div>
            <div className="col-span-3">Asset</div>
            <div className="col-span-2 text-right">Price (USD)</div>
            <div className="col-span-1 text-right">24h %</div>
            <div className="col-span-1 text-right">7d %</div>
            <div className="col-span-2 text-right">Market Cap</div>
            <div className="col-span-2 text-right">24h Volume</div>
          </div>
          <div className="divide-y divide-slate-800/50">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 items-center gap-4 px-6 py-4"
              >
                <div className="col-span-1 flex items-center gap-2">
                  <div className="h-4 w-4 animate-pulse rounded bg-slate-700/50" />
                  <div className="h-4 w-6 animate-pulse rounded bg-slate-700/50" />
                </div>
                <div className="col-span-3 flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-slate-700/50" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-700/50" />
                    <div className="h-3 w-12 animate-pulse rounded bg-slate-700/40" />
                  </div>
                </div>
                <div className="col-span-2 flex justify-end">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-700/50" />
                </div>
                <div className="col-span-1 flex justify-end">
                  <div className="h-6 w-16 animate-pulse rounded-lg bg-slate-700/50" />
                </div>
                <div className="col-span-1 flex justify-end">
                  <div className="h-6 w-16 animate-pulse rounded-lg bg-slate-700/50" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-700/50" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-700/50" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile card skeleton */}
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:hidden">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border p-4 ${
                isLight
                  ? "border-slate-200 bg-slate-50"
                  : "border-slate-800 bg-slate-950/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-slate-700/50" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-700/50" />
                    <div className="h-3 w-12 animate-pulse rounded bg-slate-700/40" />
                  </div>
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-slate-700/50" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="h-10 animate-pulse rounded-xl bg-slate-700/40" />
                <div className="h-10 animate-pulse rounded-xl bg-slate-700/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Empty Watchlist State
  if (showingWatchlistOnly && watchlistCount === 0) {
    return (
      <div
        className={`rounded-3xl border p-10 text-center shadow-lg ${
          isLight
            ? "border-slate-200 bg-white text-slate-900"
            : "border-slate-800 bg-slate-900/75 text-slate-100"
        }`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <Star className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-bold">Your Watchlist is Empty</h2>
        <p
          className={`mx-auto mt-2 max-w-md text-sm leading-relaxed ${
            isLight ? "text-slate-600" : "text-slate-400"
          }`}
        >
          Click the star icon next to any cryptocurrency in the market dashboard
          to save it to your browser&apos;s watchlist. Your watchlist stays
          saved even after closing the browser—no account needed.
        </p>
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onSwitchToAllCoins}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            <span>Browse All Top Cryptocurrencies</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Empty Search / Filter Result State
  if (coins.length === 0) {
    return (
      <div
        className={`rounded-3xl border p-10 text-center shadow-lg ${
          isLight
            ? "border-slate-200 bg-white text-slate-900"
            : "border-slate-800 bg-slate-900/75 text-slate-100"
        }`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-bold">
          No Matching Cryptocurrencies Found
        </h2>
        <p
          className={`mx-auto mt-2 max-w-md text-sm ${
            isLight ? "text-slate-600" : "text-slate-400"
          }`}
        >
          No coins matched your search for &ldquo;{searchQuery}&rdquo;
          {showingWatchlistOnly ? " in your watchlist" : ""}. Try searching by a
          different coin name or ticker symbol (e.g., BTC, ETH, SOL).
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-sky-400"
            >
              Clear Search Filter
            </button>
          )}
          {showingWatchlistOnly && (
            <button
              type="button"
              onClick={onSwitchToAllCoins}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                isLight
                  ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              Show All Coins
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Watchlist View Header Bar with Clear Watchlist Button */}
      {showingWatchlistOnly && watchlistCount > 0 && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-xs ${
            isLight
              ? "border-amber-200 bg-amber-50/80 text-amber-900"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <Star
              className="h-4 w-4 fill-amber-400 text-amber-400"
              aria-hidden="true"
            />
            <span>
              Viewing your saved watchlist ({watchlistCount}{" "}
              {watchlistCount === 1 ? "coin" : "coins"} stored in browser
              localStorage).
            </span>
          </div>
          <button
            type="button"
            onClick={onClearWatchlist}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear Watchlist</span>
          </button>
        </div>
      )}

      {/* Mobile & Tablet Sort Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 lg:hidden ${
          isLight
            ? "border-slate-200 bg-white"
            : "border-slate-800/90 bg-slate-900/75"
        }`}
      >
        <span
          className={`text-xs font-semibold ${
            isLight ? "text-slate-600" : "text-slate-400"
          }`}
        >
          Sort cryptocurrencies by:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { field: "rank", label: "Rank" },
              { field: "price", label: "Price" },
              { field: "market_cap", label: "Market Cap" },
              { field: "change_24h", label: "24h %" },
              { field: "change_7d", label: "7d %" },
            ] as const
          ).map((item) => {
            const active = sortField === item.field;
            return (
              <button
                key={item.field}
                type="button"
                onClick={() => onSortChange(item.field)}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-sky-500/50 bg-sky-500/20 text-sky-300"
                    : isLight
                    ? "border-slate-200 bg-slate-50 text-slate-700"
                    : "border-slate-800 bg-slate-950 text-slate-300"
                }`}
              >
                <span>{item.label}</span>
                {active &&
                  (sortOrder === "asc" ? (
                    <ArrowUp className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <ArrowDown className="h-3 w-3" aria-hidden="true" />
                  ))}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Responsive Table (lg and above) */}
      <div
        className={`hidden overflow-x-auto rounded-3xl border shadow-xl lg:block ${
          isLight
            ? "border-slate-200 bg-white"
            : "border-slate-800/90 bg-slate-900/80"
        }`}
      >
        <table
          className="w-full border-collapse text-left"
          aria-label="Top cryptocurrencies by market capitalization"
        >
          <thead>
            <tr
              className={`border-b text-xs font-semibold uppercase tracking-wider ${
                isLight
                  ? "border-slate-200 bg-slate-50/90 text-slate-600"
                  : "border-slate-800 bg-slate-950/70 text-slate-400"
              }`}
            >
              <th scope="col" className="w-12 py-4 pl-5 pr-2 text-center">
                <span className="sr-only">Favorite</span>
                <Star className="mx-auto h-3.5 w-3.5 opacity-60" aria-hidden="true" />
              </th>

              <th
                scope="col"
                aria-sort={getAriaSort("rank")}
                className="w-20 px-3 py-4"
              >
                <button
                  type="button"
                  onClick={() => onSortChange("rank")}
                  className="group inline-flex items-center gap-1 font-semibold uppercase tracking-wider focus:outline-none focus:text-sky-400"
                >
                  <span>Rank</span>
                  {renderSortIcon("rank")}
                </button>
              </th>

              <th
                scope="col"
                aria-sort={getAriaSort("name")}
                className="px-4 py-4"
              >
                <button
                  type="button"
                  onClick={() => onSortChange("name")}
                  className="group inline-flex items-center gap-1 font-semibold uppercase tracking-wider focus:outline-none focus:text-sky-400"
                >
                  <span>Coin</span>
                  {renderSortIcon("name")}
                </button>
              </th>

              <th
                scope="col"
                aria-sort={getAriaSort("price")}
                className="px-4 py-4 text-right"
              >
                <button
                  type="button"
                  onClick={() => onSortChange("price")}
                  className="group inline-flex items-center justify-end gap-1 font-semibold uppercase tracking-wider focus:outline-none focus:text-sky-400"
                >
                  <span>Price (USD)</span>
                  {renderSortIcon("price")}
                </button>
              </th>

              <th
                scope="col"
                aria-sort={getAriaSort("change_24h")}
                className="px-4 py-4 text-right"
              >
                <button
                  type="button"
                  onClick={() => onSortChange("change_24h")}
                  className="group inline-flex items-center justify-end gap-1 font-semibold uppercase tracking-wider focus:outline-none focus:text-sky-400"
                >
                  <span>24h Change</span>
                  {renderSortIcon("change_24h")}
                </button>
              </th>

              <th
                scope="col"
                aria-sort={getAriaSort("change_7d")}
                className="px-4 py-4 text-right"
              >
                <button
                  type="button"
                  onClick={() => onSortChange("change_7d")}
                  className="group inline-flex items-center justify-end gap-1 font-semibold uppercase tracking-wider focus:outline-none focus:text-sky-400"
                >
                  <span>7d Change</span>
                  {renderSortIcon("change_7d")}
                </button>
              </th>

              <th
                scope="col"
                aria-sort={getAriaSort("market_cap")}
                className="px-4 py-4 text-right"
              >
                <div className="inline-flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onSortChange("market_cap")}
                    className="group inline-flex items-center gap-1 font-semibold uppercase tracking-wider focus:outline-none focus:text-sky-400"
                  >
                    <span>Market Cap</span>
                    {renderSortIcon("market_cap")}
                  </button>
                  <MetricTooltip
                    label="Market Cap"
                    explanation="Current USD Price multiplied by Circulating Supply."
                    isLight={isLight}
                  />
                </div>
              </th>

              <th
                scope="col"
                aria-sort={getAriaSort("volume")}
                className="px-4 py-4 text-right"
              >
                <div className="inline-flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onSortChange("volume")}
                    className="group inline-flex items-center gap-1 font-semibold uppercase tracking-wider focus:outline-none focus:text-sky-400"
                  >
                    <span>24h Volume</span>
                    {renderSortIcon("volume")}
                  </button>
                  <MetricTooltip
                    label="24h Volume"
                    explanation="Total USD trading volume across exchanges over the past 24 hours."
                    isLight={isLight}
                  />
                </div>
              </th>

              <th scope="col" className="w-24 py-4 pl-2 pr-5 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody
            className={`divide-y text-sm ${
              isLight ? "divide-slate-200/80" : "divide-slate-800/70"
            }`}
          >
            {coins.map((coin) => {
              const favored = isWatchlisted(coin.id);
              return (
                <tr
                  key={coin.id}
                  onClick={() => onSelectCoin(coin)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectCoin(coin);
                    }
                  }}
                  aria-label={`View details and price chart for ${coin.name} (${coin.symbol.toUpperCase()})`}
                  className={`group cursor-pointer transition-colors focus:outline-none ${
                    isLight
                      ? "hover:bg-slate-50 focus:bg-sky-50/70"
                      : "hover:bg-slate-800/50 focus:bg-slate-800/70"
                  }`}
                >
                  {/* Favorite Star Control */}
                  <td
                    className="py-3.5 pl-5 pr-2 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleWatchlist(coin.id)}
                      aria-pressed={favored}
                      aria-label={
                        favored
                          ? `Remove ${coin.name} from watchlist`
                          : `Add ${coin.name} to watchlist`
                      }
                      className={`inline-flex rounded-lg p-1.5 transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        favored
                          ? "text-amber-400 hover:bg-amber-500/15"
                          : isLight
                          ? "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                          : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          favored ? "fill-amber-400 text-amber-400" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </td>

                  {/* Rank */}
                  <td className="px-3 py-3.5 font-semibold tabular-nums">
                    <span
                      className={`inline-flex min-w-7 items-center justify-center rounded-md px-2 py-0.5 text-xs ${
                        isLight
                          ? "bg-slate-100 text-slate-700"
                          : "bg-slate-800/90 text-slate-300"
                      }`}
                    >
                      {coin.market_cap_rank ?? "—"}
                    </span>
                  </td>

                  {/* Coin Logo, Name, Symbol */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <CoinLogo
                        src={coin.image}
                        name={coin.name}
                        symbol={coin.symbol}
                        size="md"
                      />
                      <div>
                        <div className="font-bold tracking-tight group-hover:text-sky-400 transition-colors">
                          {coin.name}
                        </div>
                        <div
                          className={`text-xs font-semibold uppercase ${
                            isLight ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          {coin.symbol}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Price in USD */}
                  <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                    {formatUsdPrice(coin.current_price)}
                  </td>

                  {/* 24h Percentage Change */}
                  <td className="px-4 py-3.5 text-right">
                    <PriceChangeBadge
                      value={coin.price_change_percentage_24h}
                      size="sm"
                      isLight={isLight}
                      labelPrefix="24h change"
                    />
                  </td>

                  {/* 7d Percentage Change */}
                  <td className="px-4 py-3.5 text-right">
                    <PriceChangeBadge
                      value={coin.price_change_percentage_7d_in_currency}
                      size="sm"
                      isLight={isLight}
                      labelPrefix="7d change"
                    />
                  </td>

                  {/* Market Cap */}
                  <td
                    className="px-4 py-3.5 text-right font-medium tabular-nums"
                    title={formatFullUsd(coin.market_cap)}
                  >
                    {formatCompactUsd(coin.market_cap)}
                  </td>

                  {/* 24h Trading Volume */}
                  <td
                    className={`px-4 py-3.5 text-right tabular-nums ${
                      isLight ? "text-slate-600" : "text-slate-300"
                    }`}
                    title={formatFullUsd(coin.total_volume)}
                  >
                    {formatCompactUsd(coin.total_volume)}
                  </td>

                  {/* Quick Actions: Alert + Details */}
                  <td
                    className="py-3.5 pl-2 pr-5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenAlertForCoin(coin)}
                        title={`Set price alert for ${coin.name}`}
                        aria-label={`Set price alert for ${coin.name}`}
                        className={`rounded-lg p-1.5 transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                          isLight
                            ? "text-slate-500 hover:bg-slate-100 hover:text-sky-600"
                            : "text-slate-400 hover:bg-slate-800 hover:text-sky-400"
                        }`}
                      >
                        <BellPlus className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectCoin(coin)}
                        title={`Open ${coin.name} details and chart`}
                        aria-label={`Open ${coin.name} details and chart`}
                        className={`rounded-lg p-1.5 transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                          isLight
                            ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile & Tablet Cards (< lg) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {coins.map((coin) => {
          const favored = isWatchlisted(coin.id);
          return (
            <article
              key={coin.id}
              onClick={() => onSelectCoin(coin)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectCoin(coin);
                }
              }}
              aria-label={`${coin.name} (${coin.symbol.toUpperCase()}) market card`}
              className={`cursor-pointer rounded-2xl border p-4 shadow-md transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isLight
                  ? "border-slate-200 bg-white hover:border-slate-300"
                  : "border-slate-800/90 bg-slate-900/80 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <CoinLogo
                    src={coin.image}
                    name={coin.name}
                    symbol={coin.symbol}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                          isLight
                            ? "bg-slate-100 text-slate-700"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        #{coin.market_cap_rank ?? "—"}
                      </span>
                      <h3 className="font-bold tracking-tight">{coin.name}</h3>
                    </div>
                    <p
                      className={`text-xs font-semibold uppercase ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {coin.symbol}
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onOpenAlertForCoin(coin)}
                    aria-label={`Set price alert for ${coin.name}`}
                    className={`rounded-lg p-1.5 ${
                      isLight
                        ? "text-slate-500 hover:bg-slate-100"
                        : "text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <BellPlus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleWatchlist(coin.id)}
                    aria-pressed={favored}
                    aria-label={
                      favored
                        ? `Remove ${coin.name} from watchlist`
                        : `Add ${coin.name} to watchlist`
                    }
                    className="rounded-lg p-1.5 text-amber-400"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        favored
                          ? "fill-amber-400 text-amber-400"
                          : isLight
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              {/* Price & Change Row */}
              <div className="mt-3.5 flex flex-wrap items-baseline justify-between gap-2 border-t pt-3 border-slate-800/40">
                <div>
                  <span
                    className={`block text-[11px] font-medium uppercase ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Current Price (USD)
                  </span>
                  <span className="text-lg font-extrabold tabular-nums">
                    {formatUsdPrice(coin.current_price)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="text-right">
                    <span
                      className={`block text-[10px] uppercase ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      24h
                    </span>
                    <PriceChangeBadge
                      value={coin.price_change_percentage_24h}
                      size="sm"
                      isLight={isLight}
                    />
                  </div>
                  <div className="text-right">
                    <span
                      className={`block text-[10px] uppercase ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      7d
                    </span>
                    <PriceChangeBadge
                      value={coin.price_change_percentage_7d_in_currency}
                      size="sm"
                      isLight={isLight}
                    />
                  </div>
                </div>
              </div>

              {/* Market Cap & Volume Row */}
              <div
                className={`mt-3 grid grid-cols-2 gap-2 rounded-xl p-2.5 text-xs ${
                  isLight ? "bg-slate-50" : "bg-slate-950/60"
                }`}
              >
                <div>
                  <span
                    className={`block text-[11px] ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Market Cap
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatCompactUsd(coin.market_cap)}
                  </span>
                </div>
                <div>
                  <span
                    className={`block text-[11px] ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    24h Volume
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatCompactUsd(coin.total_volume)}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
