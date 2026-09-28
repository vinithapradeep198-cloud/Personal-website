"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  BellOff,
  BellRing,
  Check,
  Edit3,
  Info,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatExactTimestamp,
  formatUsdPrice,
  isValidNumber,
} from "@/lib/crypto/formatters";
import type {
  AlertCondition,
  CoinMarket,
  PriceAlert,
} from "@/lib/crypto/types";
import { CoinLogo } from "./CoinLogo";

interface PriceAlertsPanelProps {
  coins: CoinMarket[];
  alerts: PriceAlert[];
  preselectedCoin: CoinMarket | null;
  onClearPreselectedCoin: () => void;
  onCreateAlert: (input: {
    coinId: string;
    coinName: string;
    coinSymbol: string;
    coinImage: string;
    condition: AlertCondition;
    targetPrice: number;
  }) => void;
  onUpdateAlert: (
    alertId: string,
    updates: {
      condition?: AlertCondition;
      targetPrice?: number;
      enabled?: boolean;
    }
  ) => void;
  onToggleAlertEnabled: (alertId: string) => void;
  onDeleteAlert: (alertId: string) => void;
  notificationsOptIn: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  onRequestNotifications: () => Promise<NotificationPermission | "unsupported">;
  onDisableNotifications: () => void;
  isLight?: boolean;
}

export function PriceAlertsPanel({
  coins,
  alerts,
  preselectedCoin,
  onClearPreselectedCoin,
  onCreateAlert,
  onUpdateAlert,
  onToggleAlertEnabled,
  onDeleteAlert,
  notificationsOptIn,
  notificationPermission,
  onRequestNotifications,
  onDisableNotifications,
  isLight = false,
}: PriceAlertsPanelProps) {
  const [selectedCoinId, setSelectedCoinId] = useState<string>(
    preselectedCoin?.id || coins[0]?.id || "bitcoin"
  );
  const [condition, setCondition] = useState<AlertCondition>("above");
  const [targetPriceInput, setTargetPriceInput] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Inline editing state
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [editCondition, setEditCondition] = useState<AlertCondition>("above");
  const [editTargetInput, setEditTargetInput] = useState<string>("");

  const coinMap = useMemo(() => {
    const map = new Map<string, CoinMarket>();
    for (const c of coins) {
      map.set(c.id, c);
    }
    return map;
  }, [coins]);

  useEffect(() => {
    if (preselectedCoin) {
      setSelectedCoinId(preselectedCoin.id);
      if (isValidNumber(preselectedCoin.current_price)) {
        const suggested = Number(
          (preselectedCoin.current_price * 1.05).toPrecision(6)
        );
        setTargetPriceInput(String(suggested));
        setCondition("above");
      }
      onClearPreselectedCoin();
    } else if (coins.length > 0 && !coinMap.has(selectedCoinId)) {
      setSelectedCoinId(coins[0].id);
    }
  }, [
    preselectedCoin,
    coins,
    coinMap,
    selectedCoinId,
    onClearPreselectedCoin,
  ]);

  const selectedCoin = coinMap.get(selectedCoinId) ?? coins[0] ?? null;

  const applyPercentagePreset = (pctOffset: number) => {
    if (!selectedCoin || !isValidNumber(selectedCoin.current_price)) return;
    const rawTarget = selectedCoin.current_price * (1 + pctOffset / 100);
    const precision = rawTarget >= 100 ? 2 : rawTarget >= 1 ? 4 : 6;
    setTargetPriceInput(rawTarget.toFixed(precision));
    setCondition(pctOffset >= 0 ? "above" : "below");
    setFormError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedCoin) {
      setFormError("Please select a cryptocurrency first.");
      return;
    }

    const parsedPrice = Number.parseFloat(targetPriceInput);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setFormError("Please enter a valid target USD price greater than 0.");
      return;
    }

    onCreateAlert({
      coinId: selectedCoin.id,
      coinName: selectedCoin.name,
      coinSymbol: selectedCoin.symbol,
      coinImage: selectedCoin.image,
      condition,
      targetPrice: parsedPrice,
    });

    setFormSuccess(
      `Alert created for ${selectedCoin.name} (${
        condition === "above" ? "goes above" : "goes below"
      } ${formatUsdPrice(parsedPrice)}).`
    );
    setTargetPriceInput("");
  };

  const startEditing = (alert: PriceAlert) => {
    setEditingAlertId(alert.id);
    setEditCondition(alert.condition);
    setEditTargetInput(String(alert.targetPrice));
  };

  const saveEditing = (alertId: string) => {
    const parsed = Number.parseFloat(editTargetInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    onUpdateAlert(alertId, {
      condition: editCondition,
      targetPrice: parsed,
    });
    setEditingAlertId(null);
  };

  return (
    <section
      aria-label="Browser price alerts"
      className={`rounded-3xl border p-5 shadow-lg sm:p-6 ${
        isLight
          ? "border-slate-200 bg-white text-slate-900"
          : "border-slate-800 bg-slate-900/80 text-slate-100"
      }`}
    >
      {/* Header & Notification Opt-in Control */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-sky-400" aria-hidden="true" />
            <h2 className="text-lg font-bold tracking-tight">
              Browser Price Alerts
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isLight
                  ? "bg-slate-100 text-slate-700"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {alerts.filter((a) => a.enabled).length} active
            </span>
          </div>
          <p
            className={`mt-1 text-xs ${
              isLight ? "text-slate-600" : "text-slate-400"
            }`}
          >
            Stored privately in your browser&apos;s localStorage. No account or
            server storage required.
          </p>
        </div>

        {/* Explicit Browser Notification Opt-In Button */}
        <div className="flex flex-wrap items-center gap-2">
          {notificationPermission === "unsupported" ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs ${
                isLight
                  ? "border-slate-200 bg-slate-100 text-slate-600"
                  : "border-slate-800 bg-slate-950 text-slate-400"
              }`}
            >
              <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Browser notifications unsupported</span>
            </span>
          ) : notificationsOptIn && notificationPermission === "granted" ? (
            <button
              type="button"
              onClick={onDisableNotifications}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Browser Notifications On (Click to Mute)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequestNotifications}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Enable Browser Notifications</span>
            </button>
          )}
        </div>
      </div>

      {/* Mandatory Disclosure Banner */}
      <div
        role="note"
        className={`mt-4 flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs leading-relaxed ${
          isLight
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
        }`}
      >
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold">
            Alerts work only while this page is open and may not trigger when
            the browser is closed.
          </p>
          <p
            className={`mt-0.5 ${
              isLight ? "text-amber-800" : "text-amber-200/80"
            }`}
          >
            Alerts are evaluated whenever market prices refresh and are not
            guaranteed. Once an alert triggers, it automatically pauses repeated
            notifications until the coin&apos;s price moves back across your
            target price and crosses it again.
          </p>
        </div>
      </div>

      {/* Create New Alert Form */}
      <form
        onSubmit={handleCreateSubmit}
        className={`mt-5 rounded-2xl border p-4 ${
          isLight
            ? "border-slate-200 bg-slate-50/80"
            : "border-slate-800/90 bg-slate-950/60"
        }`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">
          Create a New Price Alert
        </h3>

        <div className="mt-3 grid grid-cols-1 gap-3.5 md:grid-cols-12">
          {/* 1. Select Coin */}
          <div className="md:col-span-4">
            <label
              htmlFor="alert-coin-select"
              className={`block text-xs font-semibold ${
                isLight ? "text-slate-700" : "text-slate-300"
              }`}
            >
              Select Cryptocurrency
            </label>
            <select
              id="alert-coin-select"
              value={selectedCoinId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedCoinId(nextId);
                const nextCoin = coinMap.get(nextId);
                if (nextCoin && isValidNumber(nextCoin.current_price)) {
                  setTargetPriceInput(String(nextCoin.current_price));
                }
              }}
              className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isLight
                  ? "border-slate-300 bg-white text-slate-900"
                  : "border-slate-700 bg-slate-900 text-slate-100"
              }`}
            >
              {coins.map((coin) => (
                <option key={coin.id} value={coin.id}>
                  {coin.name} ({coin.symbol.toUpperCase()}) —{" "}
                  {formatUsdPrice(coin.current_price)}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Choose Condition: Price goes above / Price goes below */}
          <div className="md:col-span-4">
            <span
              className={`block text-xs font-semibold ${
                isLight ? "text-slate-700" : "text-slate-300"
              }`}
            >
              Alert Condition
            </span>
            <div
              role="group"
              aria-label="Alert condition"
              className="mt-1.5 grid grid-cols-2 gap-2"
            >
              <button
                type="button"
                onClick={() => setCondition("above")}
                aria-pressed={condition === "above"}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  condition === "above"
                    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                    : isLight
                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Price goes above</span>
              </button>

              <button
                type="button"
                onClick={() => setCondition("below")}
                aria-pressed={condition === "below"}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  condition === "below"
                    ? "border-rose-500/50 bg-rose-500/20 text-rose-300"
                    : isLight
                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <ArrowDownCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Price goes below</span>
              </button>
            </div>
          </div>

          {/* 3. Target Price (USD) */}
          <div className="md:col-span-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="alert-target-price"
                className={`block text-xs font-semibold ${
                  isLight ? "text-slate-700" : "text-slate-300"
                }`}
              >
                Target Price (USD)
              </label>
              {selectedCoin && isValidNumber(selectedCoin.current_price) && (
                <span
                  className={`text-[11px] tabular-nums ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Now: {formatUsdPrice(selectedCoin.current_price)}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex gap-2">
              <input
                id="alert-target-price"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 90000"
                value={targetPriceInput}
                onChange={(e) => {
                  setTargetPriceInput(e.target.value);
                  setFormError(null);
                }}
                className={`w-full rounded-xl border px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-900"
                    : "border-slate-700 bg-slate-900 text-slate-100"
                }`}
              />
              <button
                type="submit"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add Alert</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Offset Helper Buttons */}
        {selectedCoin && isValidNumber(selectedCoin.current_price) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span
              className={`mr-1 text-[11px] font-medium ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Quick target presets from current price:
            </span>
            {[-10, -5, -2, 2, 5, 10].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => applyPercentagePreset(pct)}
                className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition ${
                  pct > 0
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                }`}
              >
                {pct > 0 ? `+${pct}%` : `${pct}%`}
              </button>
            ))}
          </div>
        )}

        {formError && (
          <p role="alert" className="mt-2 text-xs font-medium text-rose-400">
            {formError}
          </p>
        )}
        {formSuccess && (
          <p role="status" className="mt-2 text-xs font-medium text-emerald-400">
            {formSuccess}
          </p>
        )}
      </form>

      {/* Active & Saved Alerts List */}
      <div className="mt-5">
        <h3
          className={`text-xs font-bold uppercase tracking-wider ${
            isLight ? "text-slate-600" : "text-slate-400"
          }`}
        >
          Your Configured Alerts ({alerts.length})
        </h3>

        {alerts.length === 0 ? (
          <div
            className={`mt-3 rounded-2xl border border-dashed p-6 text-center ${
              isLight
                ? "border-slate-200 text-slate-600"
                : "border-slate-800 text-slate-400"
            }`}
          >
            <Bell className="mx-auto h-7 w-7 opacity-50" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold">
              No price alerts configured yet
            </p>
            <p className="mt-1 text-xs">
              Select a coin above, choose whether to watch for a price going
              above or below your target USD level, and click &ldquo;Add
              Alert&rdquo;.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {alerts.map((alert) => {
              const liveCoin = coinMap.get(alert.coinId);
              const livePrice = liveCoin?.current_price ?? null;
              const isEditing = editingAlertId === alert.id;

              return (
                <li
                  key={alert.id}
                  className={`flex flex-col gap-3 rounded-2xl border p-3.5 transition sm:flex-row sm:items-center sm:justify-between ${
                    !alert.enabled
                      ? isLight
                        ? "border-slate-200 bg-slate-100/70 opacity-70"
                        : "border-slate-800/60 bg-slate-950/40 opacity-65"
                      : isLight
                      ? "border-slate-200 bg-slate-50/70"
                      : "border-slate-800 bg-slate-950/80"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CoinLogo
                      src={liveCoin?.image || alert.coinImage}
                      name={alert.coinName}
                      symbol={alert.coinSymbol}
                      size="sm"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold">
                          {alert.coinName}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${
                            isLight
                              ? "bg-slate-200 text-slate-700"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {alert.coinSymbol}
                        </span>

                        {/* Status Badge */}
                        {!alert.enabled ? (
                          <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                            Disabled
                          </span>
                        ) : alert.armed ? (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                            Active &amp; Armed
                          </span>
                        ) : (
                          <span
                            title="Alert triggered. Waiting for price to move back across target before re-arming."
                            className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300"
                          >
                            Triggered (Waiting for price reset)
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <select
                            aria-label="Edit alert condition"
                            value={editCondition}
                            onChange={(e) =>
                              setEditCondition(e.target.value as AlertCondition)
                            }
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                              isLight
                                ? "border-slate-300 bg-white text-slate-900"
                                : "border-slate-700 bg-slate-900 text-slate-100"
                            }`}
                          >
                            <option value="above">Price goes above</option>
                            <option value="below">Price goes below</option>
                          </select>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            aria-label="Edit target price in USD"
                            value={editTargetInput}
                            onChange={(e) => setEditTargetInput(e.target.value)}
                            className={`w-32 rounded-lg border px-2.5 py-1 text-xs tabular-nums ${
                              isLight
                                ? "border-slate-300 bg-white text-slate-900"
                                : "border-slate-700 bg-slate-900 text-slate-100"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => saveEditing(alert.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAlertId(null)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="font-semibold">
                            Condition:{" "}
                            <span
                              className={
                                alert.condition === "above"
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }
                            >
                              Price goes {alert.condition}{" "}
                              {formatUsdPrice(alert.targetPrice)}
                            </span>
                          </span>
                          {livePrice !== null && (
                            <span
                              className={`tabular-nums ${
                                isLight ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              Current: {formatUsdPrice(livePrice)}
                            </span>
                          )}
                          {alert.lastTriggeredAt && (
                            <span
                              className={`text-[11px] ${
                                isLight ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              Last triggered:{" "}
                              {formatExactTimestamp(alert.lastTriggeredAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alert Row Action Controls: Enable/Disable, Edit, Delete */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onToggleAlertEnabled(alert.id)}
                      aria-pressed={alert.enabled}
                      className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        alert.enabled
                          ? isLight
                            ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                          : "border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"
                      }`}
                    >
                      {alert.enabled ? "Disable" : "Enable"}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditing(alert)}
                      aria-label={`Edit alert for ${alert.coinName}`}
                      className={`inline-flex items-center gap-1 rounded-xl border p-2 text-xs transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        isLight
                          ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteAlert(alert.id)}
                      aria-label={`Delete alert for ${alert.coinName}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-400 transition hover:bg-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
