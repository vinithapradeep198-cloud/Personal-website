"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Clock,
  Code2,
  ExternalLink,
  Info,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Sun,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePriceAlerts } from "@/lib/crypto/alerts-storage";
import { getMarketCoins } from "@/lib/crypto/crypto-client";
import {
  formatCompactUsd,
  formatExactTimestamp,
  formatUsdPrice,
  isValidNumber,
} from "@/lib/crypto/formatters";
import type { CoinMarket, SortField, SortOrder } from "@/lib/crypto/types";
import { useWatchlist } from "@/lib/crypto/watchlist-storage";
import { ArchitectureGuideModal } from "./ArchitectureGuideModal";
import { CoinDetailModal } from "./CoinDetailModal";
import { MarketTable } from "./MarketTable";
import { PriceAlertsPanel } from "./PriceAlertsPanel";

type RefreshIntervalOption = 0 | 120_000 | 300_000; // 0 = Manual, 2 min, 5 min

const THEME_STORAGE_KEY = "crypto_tracker_theme_v1";

export function CryptoTrackerClient() {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiNotice, setApiNotice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string>(
    "CoinGecko Public API"
  );
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Theme state: default to dark navy ("dark"), allow switching to light slate ("light")
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Search, Filter & Sort state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showingWatchlistOnly, setShowingWatchlistOnly] =
    useState<boolean>(false);
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Conservative refresh interval (default 2 minutes = 120,000 ms)
  const [refreshIntervalMs, setRefreshIntervalMs] =
    useState<RefreshIntervalOption>(120_000);

  // Selected coin for Detail Modal
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);

  // Alerts panel visibility & preselected coin for alert creation
  const [showAlertsPanel, setShowAlertsPanel] = useState<boolean>(true);
  const [alertPreselectedCoin, setAlertPreselectedCoin] =
    useState<CoinMarket | null>(null);

  // Setup & API Architecture Modal
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  const alertsSectionRef = useRef<HTMLDivElement | null>(null);

  // Watchlist localStorage hook
  const {
    watchlistIds,
    isWatchlisted,
    toggleWatchlist,
    clearWatchlist,
  } = useWatchlist();

  // Browser Price Alerts localStorage hook
  const {
    alerts,
    triggeredQueue,
    notificationsOptIn,
    notificationPermission,
    requestAndEnableNotifications,
    disableBrowserNotifications,
    createAlert,
    updateAlert,
    toggleAlertEnabled,
    deleteAlert,
    evaluateAlerts,
    dismissTriggeredEvent,
    clearTriggeredEvents,
  } = usePriceAlerts();

  const isLight = theme === "light";

  // Load persisted theme preference
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  // Online / Offline detection
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchMarkets = useCallback(
    async (options?: { isManual?: boolean }) => {
      if (options?.isManual) {
        setRefreshing(true);
      } else if (coins.length === 0) {
        setLoading(true);
      }

      setError(null);

      try {
        const res = await getMarketCoins({
          perPage: 50,
          page: 1,
          forceRefresh: Boolean(options?.isManual),
        });

        setCoins(res.coins);
        setLastUpdated(res.fetchedAt);
        setProviderName(res.provider || "CoinGecko Public API");
        setApiNotice(res.notice ?? null);

        // Evaluate browser price alerts against newly fetched market prices
        evaluateAlerts(res.coins);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to fetch cryptocurrency market data.";
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [coins.length, evaluateAlerts]
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchMarkets({ isManual: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conservative auto-refresh timer (2 minutes or 5 minutes, or disabled)
  useEffect(() => {
    if (refreshIntervalMs <= 0) return;

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        return; // Do not waste API quota while tab is hidden in background
      }
      fetchMarkets({ isManual: false });
    }, refreshIntervalMs);

    return () => clearInterval(timer);
  }, [refreshIntervalMs, fetchMarkets]);

  // Re-evaluate alerts immediately when a user creates/updates an alert and coins are already loaded
  useEffect(() => {
    if (coins.length > 0 && alerts.length > 0) {
      evaluateAlerts(coins);
    }
  }, [alerts.length, coins, evaluateAlerts]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      // Default sort direction: rank & name ascending, numerical metrics descending
      setSortOrder(field === "rank" || field === "name" ? "asc" : "desc");
    }
  };

  // Filtered and sorted coins list
  const filteredAndSortedCoins = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = coins.filter((coin) => {
      if (showingWatchlistOnly && !watchlistIds.includes(coin.id)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        coin.name.toLowerCase().includes(query) ||
        coin.symbol.toLowerCase().includes(query) ||
        coin.id.toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;

      if (sortField === "name") {
        return a.name.localeCompare(b.name) * dir;
      }

      const readNumeric = (c: CoinMarket): number | null => {
        switch (sortField) {
          case "rank":
            return c.market_cap_rank;
          case "price":
            return c.current_price;
          case "market_cap":
            return c.market_cap;
          case "change_24h":
            return c.price_change_percentage_24h;
          case "change_7d":
            return c.price_change_percentage_7d_in_currency;
          case "volume":
            return c.total_volume;
          default:
            return c.market_cap_rank;
        }
      };

      const valA = readNumeric(a);
      const valB = readNumeric(b);

      // Push null values to the bottom regardless of sort direction
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;

      if (valA === valB) return 0;
      return valA > valB ? dir : -dir;
    });

    return sorted;
  }, [coins, showingWatchlistOnly, watchlistIds, searchQuery, sortField, sortOrder]);

  // Summary statistics computed from loaded top coins
  const marketSummary = useMemo(() => {
    let totalCap = 0;
    let totalVol = 0;
    let gainers = 0;
    let losers = 0;

    for (const c of coins) {
      if (isValidNumber(c.market_cap)) totalCap += c.market_cap;
      if (isValidNumber(c.total_volume)) totalVol += c.total_volume;
      if (isValidNumber(c.price_change_percentage_24h)) {
        if (c.price_change_percentage_24h >= 0) gainers++;
        else losers++;
      }
    }

    const topCoin = coins[0] ?? null;
    return { totalCap, totalVol, gainers, losers, topCoin };
  }, [coins]);

  const selectedCoin = useMemo(
    () => coins.find((c) => c.id === selectedCoinId) ?? null,
    [coins, selectedCoinId]
  );

  const handleOpenAlertForCoin = (coin: CoinMarket) => {
    setAlertPreselectedCoin(coin);
    setShowAlertsPanel(true);
    setTimeout(() => {
      alertsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const activeAlertsCount = alerts.filter((a) => a.enabled).length;

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isLight
          ? "bg-slate-100 text-slate-900"
          : "bg-[#070d19] text-slate-100"
      }`}
    >
      {/* Top Site Navigation Bar */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md ${
          isLight
            ? "border-slate-200/90 bg-white/90"
            : "border-slate-800/80 bg-[#070d19]/90"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isLight
                  ? "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                  : "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
              }`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back to Homepage</span>
            </Link>

            <div className="hidden h-5 w-px bg-slate-700/50 sm:block" />

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <Activity className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-bold tracking-tight">
                Personal Website &bull; Crypto Tracker
              </span>
            </div>
          </div>

          {/* Right Header Controls: API Info, Theme Toggle, Manual Refresh */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isLight
                  ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Code2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              <span className="hidden sm:inline">API &amp; Setup Info</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                isLight
                  ? "Switch to Dark Navy dashboard theme"
                  : "Switch to Light Slate theme"
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isLight
                  ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {isLight ? (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-700" aria-hidden="true" />
                  <span className="hidden sm:inline">Dark Navy</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  <span className="hidden sm:inline">Light Theme</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {/* Page Title, Subtitle & Refresh Metadata */}
        <section
          className={`rounded-3xl border p-6 shadow-xl sm:p-8 ${
            isLight
              ? "border-slate-200 bg-white"
              : "border-slate-800/90 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950"
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Informational Market Data &bull; Keyless Public API</span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
                Cryptocurrency Tracker
              </h1>
              <p
                className={`mt-2 text-sm leading-relaxed sm:text-base ${
                  isLight ? "text-slate-600" : "text-slate-300"
                }`}
              >
                Informational market dashboard tracking top cryptocurrencies by
                market capitalization in USD. All data is provided for general
                informational purposes only—prices may be delayed and can vary
                between exchanges.
              </p>
            </div>

            {/* Refresh Controls & Last Updated Box */}
            <div
              className={`flex flex-col gap-3 rounded-2xl border p-4 sm:min-w-[320px] ${
                isLight
                  ? "border-slate-200 bg-slate-50"
                  : "border-slate-800 bg-slate-950/70"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 font-medium ${
                    isLight ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  <span>Last Updated:</span>
                </span>
                <span className="font-bold tabular-nums">
                  {formatExactTimestamp(lastUpdated)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="refresh-interval-select"
                    className={`text-xs font-medium ${
                      isLight ? "text-slate-600" : "text-slate-400"
                    }`}
                  >
                    Auto-refresh:
                  </label>
                  <select
                    id="refresh-interval-select"
                    value={refreshIntervalMs}
                    onChange={(e) =>
                      setRefreshIntervalMs(
                        Number(e.target.value) as RefreshIntervalOption
                      )
                    }
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isLight
                        ? "border-slate-300 bg-white text-slate-800"
                        : "border-slate-700 bg-slate-900 text-slate-200"
                    }`}
                  >
                    <option value={120_000}>Every 2 mins</option>
                    <option value={300_000}>Every 5 mins</option>
                    <option value={0}>Manual only</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => fetchMarkets({ isManual: true })}
                  disabled={refreshing || loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-sky-400 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      refreshing || loading ? "animate-spin" : ""
                    }`}
                    aria-hidden="true"
                  />
                  <span>{refreshing ? "Refreshing…" : "Refresh Now"}</span>
                </button>
              </div>

              {/* API Attribution Line */}
              <div
                className={`flex items-center justify-between border-t pt-2.5 text-[11px] ${
                  isLight
                    ? "border-slate-200 text-slate-500"
                    : "border-slate-800/80 text-slate-400"
                }`}
              >
                <span>Source: {providerName}</span>
                <a
                  href="https://www.coingecko.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-sky-400 hover:underline"
                >
                  <span>Powered by CoinGecko</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          {/* Market Delay & Exchange Variance Notice */}
          <div
            className={`mt-5 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs ${
              isLight
                ? "border-slate-200 bg-slate-50 text-slate-700"
                : "border-slate-800/80 bg-slate-950/60 text-slate-300"
            }`}
          >
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-sky-400"
              aria-hidden="true"
            />
            <p>
              <strong>Market Data Notice:</strong> Displayed USD prices are
              aggregated across global markets by CoinGecko, may be delayed by
              1–5 minutes due to public API caching, and can vary between
              individual cryptocurrency exchanges.
            </p>
          </div>
        </section>

        {/* Offline / Rate-Limit / Non-Fatal Refresh Error Notices */}
        {isOffline && (
          <div
            role="alert"
            className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-xs text-amber-200"
          >
            <div className="flex items-center gap-2.5">
              <WifiOff className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>
                You are currently offline. Displaying the most recently loaded
                market data until your connection returns.
              </span>
            </div>
          </div>
        )}

        {apiNotice && (
          <div
            role="status"
            className={`mt-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs ${
              isLight
                ? "border-sky-200 bg-sky-50 text-sky-900"
                : "border-sky-500/30 bg-sky-500/10 text-sky-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
              <span>{apiNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setApiNotice(null)}
              aria-label="Dismiss notice"
              className="rounded p-1 opacity-70 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {error && coins.length > 0 && (
          <div
            role="alert"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-xs text-rose-200"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-rose-400"
                aria-hidden="true"
              />
              <span>
                Refresh error: {error} (Showing previously loaded market data
                from {formatExactTimestamp(lastUpdated)}).
              </span>
            </div>
            <button
              type="button"
              onClick={() => fetchMarkets({ isManual: true })}
              className="inline-flex items-center gap-1 rounded-xl bg-rose-500 px-3 py-1.5 font-semibold text-white hover:bg-rose-600"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Triggered Price Alert Notification Banners */}
        {triggeredQueue.length > 0 && (
          <section
            aria-live="assertive"
            aria-label="Triggered price alerts"
            className="mt-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Triggered Price Alerts ({triggeredQueue.length})
              </span>
              {triggeredQueue.length > 1 && (
                <button
                  type="button"
                  onClick={clearTriggeredEvents}
                  className="text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Dismiss All
                </button>
              )}
            </div>
            {triggeredQueue.map((ev) => (
              <div
                key={ev.id}
                role="alert"
                className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/50 bg-amber-500/15 px-4 py-3 text-xs text-amber-100 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <Bell
                    className="h-4 w-4 shrink-0 text-amber-400"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="font-bold">
                      {ev.coinName} ({ev.coinSymbol})
                    </span>{" "}
                    {ev.condition === "above" ? "rose above" : "fell below"}{" "}
                    your target of{" "}
                    <span className="font-bold underline">
                      {formatUsdPrice(ev.targetPrice)}
                    </span>
                    ! Current market price:{" "}
                    <span className="font-bold">
                      {formatUsdPrice(ev.triggeredPrice)}
                    </span>{" "}
                    <span className="opacity-75">
                      ({formatExactTimestamp(ev.triggeredAt)})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissTriggeredEvent(ev.id)}
                  aria-label="Dismiss triggered alert notification"
                  className="rounded-lg p-1 text-amber-200 hover:bg-amber-500/20"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Quick Market Summary Strip */}
        {coins.length > 0 && (
          <section
            aria-label="Market overview summary"
            className="mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4"
          >
            <div
              className={`rounded-2xl border p-4 ${
                isLight
                  ? "border-slate-200 bg-white"
                  : "border-slate-800/80 bg-slate-900/70"
              }`}
            >
              <span
                className={`text-xs font-medium ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}
              >
                #1 Market Cap Leader
              </span>
              {marketSummary.topCoin ? (
                <div className="mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-base font-bold">
                    {marketSummary.topCoin.name} (
                    {marketSummary.topCoin.symbol})
                  </span>
                  <span className="text-sm font-extrabold tabular-nums text-sky-400">
                    {formatUsdPrice(marketSummary.topCoin.current_price)}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-sm font-bold">—</p>
              )}
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                isLight
                  ? "border-slate-200 bg-white"
                  : "border-slate-800/80 bg-slate-900/70"
              }`}
            >
              <span
                className={`text-xs font-medium ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Top {coins.length} Market Cap (USD)
              </span>
              <p className="mt-1.5 text-lg font-extrabold tabular-nums">
                {formatCompactUsd(marketSummary.totalCap)}
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                isLight
                  ? "border-slate-200 bg-white"
                  : "border-slate-800/80 bg-slate-900/70"
              }`}
            >
              <span
                className={`text-xs font-medium ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Top {coins.length} 24h Volume
              </span>
              <p className="mt-1.5 text-lg font-extrabold tabular-nums">
                {formatCompactUsd(marketSummary.totalVol)}
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                isLight
                  ? "border-slate-200 bg-white"
                  : "border-slate-800/80 bg-slate-900/70"
              }`}
            >
              <span
                className={`text-xs font-medium ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}
              >
                24h Market Sentiment (Top {coins.length})
              </span>
              <div className="mt-1.5 flex items-center gap-3 text-sm font-bold">
                <span className="text-emerald-400">
                  {marketSummary.gainers} Up
                </span>
                <span className="text-slate-600">/</span>
                <span className="text-rose-400">
                  {marketSummary.losers} Down
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Search, Watchlist Filter Tabs, and Sort Bar */}
        <section
          aria-label="Search, filter, and sort controls"
          className={`mt-6 flex flex-col gap-3.5 rounded-3xl border p-4 shadow-md sm:flex-row sm:items-center sm:justify-between ${
            isLight
              ? "border-slate-200 bg-white"
              : "border-slate-800/90 bg-slate-900/80"
          }`}
        >
          {/* Left: View Filter Tabs (All Coins, Watchlist, Price Alerts toggle) */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filter cryptocurrencies"
              className={`inline-flex rounded-2xl border p-1 ${
                isLight
                  ? "border-slate-200 bg-slate-100"
                  : "border-slate-800 bg-slate-950"
              }`}
            >
              <button
                type="button"
                onClick={() => setShowingWatchlistOnly(false)}
                aria-pressed={!showingWatchlistOnly}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  !showingWatchlistOnly
                    ? "bg-sky-500 text-slate-950 shadow-sm"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Coins ({coins.length})
              </button>

              <button
                type="button"
                onClick={() => setShowingWatchlistOnly(true)}
                aria-pressed={showingWatchlistOnly}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  showingWatchlistOnly
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    showingWatchlistOnly
                      ? "fill-slate-950 text-slate-950"
                      : watchlistIds.length > 0
                      ? "fill-amber-400 text-amber-400"
                      : ""
                  }`}
                  aria-hidden="true"
                />
                <span>Watchlist ({watchlistIds.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAlertsPanel(true);
                alertsSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                activeAlertsCount > 0
                  ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                  : isLight
                  ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  : "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Bell className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              <span>Price Alerts ({activeAlertsCount})</span>
            </button>
          </div>

          {/* Right: Search Input + Quick Sort Select */}
          <div className="flex flex-1 flex-col gap-2.5 sm:max-w-md sm:flex-row sm:items-center sm:justify-end">
            <div className="relative flex-1">
              <Search
                className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  isLight ? "text-slate-400" : "text-slate-500"
                }`}
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by coin name or symbol (e.g. Bitcoin, BTC)…"
                aria-label="Search cryptocurrencies by name or symbol"
                className={`w-full rounded-2xl border py-2 pl-9 pr-8 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm ${
                  isLight
                    ? "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white"
                    : "border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-sky-500"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Main Cryptocurrency Market Dashboard Table / Cards */}
        <section aria-label="Cryptocurrency market dashboard" className="mt-5">
          <MarketTable
            coins={filteredAndSortedCoins}
            loading={loading}
            error={error}
            onRetry={() => fetchMarkets({ isManual: true })}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            isWatchlisted={isWatchlisted}
            onToggleWatchlist={toggleWatchlist}
            onSelectCoin={(coin) => setSelectedCoinId(coin.id)}
            onOpenAlertForCoin={handleOpenAlertForCoin}
            showingWatchlistOnly={showingWatchlistOnly}
            watchlistCount={watchlistIds.length}
            onSwitchToAllCoins={() => setShowingWatchlistOnly(false)}
            onClearWatchlist={clearWatchlist}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
            isLight={isLight}
          />
        </section>

        {/* Browser Price Alerts Section */}
        <div ref={alertsSectionRef} className="mt-8 scroll-mt-20">
          {showAlertsPanel && (
            <PriceAlertsPanel
              coins={coins}
              alerts={alerts}
              preselectedCoin={alertPreselectedCoin}
              onClearPreselectedCoin={() => setAlertPreselectedCoin(null)}
              onCreateAlert={createAlert}
              onUpdateAlert={updateAlert}
              onToggleAlertEnabled={toggleAlertEnabled}
              onDeleteAlert={deleteAlert}
              notificationsOptIn={notificationsOptIn}
              notificationPermission={notificationPermission}
              onRequestNotifications={requestAndEnableNotifications}
              onDisableNotifications={disableBrowserNotifications}
              isLight={isLight}
            />
          )}
        </div>
      </main>

      {/* Footer with Mandatory Disclaimer & Attribution */}
      <footer
        className={`mt-14 border-t py-8 ${
          isLight
            ? "border-slate-200 bg-white text-slate-600"
            : "border-slate-800/80 bg-slate-950 text-slate-400"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="max-w-3xl">
              <p
                className={`text-xs font-semibold leading-relaxed sm:text-sm ${
                  isLight ? "text-slate-800" : "text-slate-200"
                }`}
              >
                Cryptocurrency prices are volatile and may be delayed or vary
                between exchanges. This tracker is for informational purposes
                only and is not financial advice.
              </p>
              <p className="mt-1.5 text-xs">
                Watchlists and price alerts are stored locally in your browser
                via <code>localStorage</code>. No personal financial data,
                wallet keys, or user credentials are collected.
              </p>
            </div>

            <div className="flex flex-col items-start gap-1.5 text-xs sm:items-end">
              <a
                href="https://www.coingecko.com/en/api"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-sky-400 hover:underline"
              >
                <span>Market Data Provided by CoinGecko API</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <Link
                href="/"
                className="font-medium hover:underline"
              >
                &larr; Return to Personal Website Homepage
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Coin Details & Historical Price Chart Modal */}
      <CoinDetailModal
        coin={selectedCoin}
        onClose={() => setSelectedCoinId(null)}
        isWatchlisted={
          selectedCoin ? isWatchlisted(selectedCoin.id) : false
        }
        onToggleWatchlist={toggleWatchlist}
        onOpenAlertForCoin={handleOpenAlertForCoin}
        isLight={isLight}
      />

      {/* Setup, Testing & Provider Replacement Guide Modal */}
      <ArchitectureGuideModal
        open={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isLight={isLight}
      />
    </div>
  );
}
