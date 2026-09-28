"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUsdPrice } from "./formatters";
import type {
  AlertCondition,
  CoinMarket,
  PriceAlert,
  TriggeredAlertEvent,
} from "./types";

export const ALERTS_STORAGE_KEY = "crypto_tracker_alerts_v1";
export const NOTIFICATIONS_OPT_IN_KEY = "crypto_tracker_notifications_opt_in_v1";

function isValidAlertRecord(raw: unknown): raw is PriceAlert {
  if (!raw || typeof raw !== "object") return false;
  const item = raw as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.coinId === "string" &&
    typeof item.coinName === "string" &&
    typeof item.coinSymbol === "string" &&
    (item.condition === "above" || item.condition === "below") &&
    typeof item.targetPrice === "number" &&
    Number.isFinite(item.targetPrice) &&
    item.targetPrice > 0 &&
    typeof item.enabled === "boolean"
  );
}

export function readAlertsFromStorage(): PriceAlert[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidAlertRecord).map((item) => ({
      ...item,
      coinImage: typeof item.coinImage === "string" ? item.coinImage : "",
      armed: typeof item.armed === "boolean" ? item.armed : true,
      lastTriggeredAt:
        typeof item.lastTriggeredAt === "string" ? item.lastTriggeredAt : null,
      lastTriggeredPrice:
        typeof item.lastTriggeredPrice === "number"
          ? item.lastTriggeredPrice
          : null,
      triggerCount:
        typeof item.triggerCount === "number" ? item.triggerCount : 0,
    }));
  } catch {
    return [];
  }
}

export function writeAlertsToStorage(alerts: PriceAlert[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // Ignore quota errors in private browsing
  }
}

export function readNotificationOptIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(NOTIFICATIONS_OPT_IN_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeNotificationOptIn(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      NOTIFICATIONS_OPT_IN_KEY,
      enabled ? "true" : "false"
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Evaluates all stored alerts against the latest market prices.
 *
 * Hysteresis / Crossing rule:
 * - An enabled alert only triggers when `armed === true` AND the current price
 *   crosses/reaches the target (`price >= target` for "above", `price <= target` for "below").
 * - Immediately upon triggering, `armed` is set to `false` so repeated polls at the
 *   same price will NOT spam the user with duplicate notifications.
 * - Once the coin's price moves back to the opposite side of the target
 *   (`price < target` for "above", or `price > target` for "below"), `armed` resets
 *   to `true` so it can trigger again if the price crosses the target again.
 */
export function evaluateAlertsAgainstMarkets(
  alerts: PriceAlert[],
  coins: CoinMarket[]
): {
  updatedAlerts: PriceAlert[];
  triggeredEvents: TriggeredAlertEvent[];
  didChange: boolean;
} {
  if (alerts.length === 0 || coins.length === 0) {
    return { updatedAlerts: alerts, triggeredEvents: [], didChange: false };
  }

  const priceByCoinId = new Map<string, number>();
  for (const coin of coins) {
    if (
      typeof coin.current_price === "number" &&
      Number.isFinite(coin.current_price)
    ) {
      priceByCoinId.set(coin.id, coin.current_price);
    }
  }

  let didChange = false;
  const triggeredEvents: TriggeredAlertEvent[] = [];
  const nowIso = new Date().toISOString();

  const updatedAlerts = alerts.map((alert) => {
    if (!alert.enabled) {
      return alert;
    }

    const currentPrice = priceByCoinId.get(alert.coinId);
    if (currentPrice === undefined) {
      return alert;
    }

    const isConditionMet =
      alert.condition === "above"
        ? currentPrice >= alert.targetPrice
        : currentPrice <= alert.targetPrice;

    if (isConditionMet && alert.armed) {
      didChange = true;
      triggeredEvents.push({
        id: `${alert.id}-${Date.now()}`,
        alertId: alert.id,
        coinId: alert.coinId,
        coinName: alert.coinName,
        coinSymbol: alert.coinSymbol,
        coinImage: alert.coinImage,
        condition: alert.condition,
        targetPrice: alert.targetPrice,
        triggeredPrice: currentPrice,
        triggeredAt: nowIso,
      });

      return {
        ...alert,
        armed: false,
        lastTriggeredAt: nowIso,
        lastTriggeredPrice: currentPrice,
        triggerCount: (alert.triggerCount ?? 0) + 1,
        updatedAt: nowIso,
      };
    }

    // Re-arm once the price moves away from the target threshold
    if (!isConditionMet && !alert.armed) {
      didChange = true;
      return {
        ...alert,
        armed: true,
        updatedAt: nowIso,
      };
    }

    return alert;
  });

  return { updatedAlerts, triggeredEvents, didChange };
}

/**
 * Dispatches a browser Notification if and only if the user has explicitly
 * opted in and granted browser Notification permission.
 */
export function dispatchBrowserNotification(event: TriggeredAlertEvent): void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const directionText =
    event.condition === "above" ? "rose above" : "fell below";
  const title = `Price Alert: ${event.coinName} (${event.coinSymbol.toUpperCase()})`;
  const body = `${event.coinName} ${directionText} your target of ${formatUsdPrice(
    event.targetPrice
  )}. Current price: ${formatUsdPrice(event.triggeredPrice)}.`;

  try {
    new Notification(title, {
      body,
      icon: event.coinImage || undefined,
      tag: `crypto-alert-${event.alertId}`,
    });
  } catch {
    // Some mobile browsers disallow `new Notification` directly without a ServiceWorker
  }
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [triggeredQueue, setTriggeredQueue] = useState<TriggeredAlertEvent[]>(
    []
  );
  const [notificationsOptIn, setNotificationsOptIn] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  useEffect(() => {
    setAlerts(readAlertsFromStorage());
    setNotificationsOptIn(readNotificationOptIn());

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission("unsupported");
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ALERTS_STORAGE_KEY) {
        setAlerts(readAlertsFromStorage());
      }
      if (event.key === NOTIFICATIONS_OPT_IN_KEY) {
        setNotificationsOptIn(readNotificationOptIn());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  /**
   * Explicitly requests browser notification permission ONLY when invoked by a
   * user action on the "Enable Browser Notifications" control.
   */
  const requestAndEnableNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return "unsupported" as const;
    }

    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      const granted = result === "granted";
      setNotificationsOptIn(granted);
      writeNotificationOptIn(granted);
      return result;
    } catch {
      return "denied" as const;
    }
  }, []);

  const disableBrowserNotifications = useCallback(() => {
    setNotificationsOptIn(false);
    writeNotificationOptIn(false);
  }, []);

  const createAlert = useCallback(
    (input: {
      coinId: string;
      coinName: string;
      coinSymbol: string;
      coinImage: string;
      condition: AlertCondition;
      targetPrice: number;
    }) => {
      const nowIso = new Date().toISOString();
      const newAlert: PriceAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        coinId: input.coinId,
        coinName: input.coinName,
        coinSymbol: input.coinSymbol.toUpperCase(),
        coinImage: input.coinImage,
        condition: input.condition,
        targetPrice: input.targetPrice,
        enabled: true,
        armed: true,
        createdAt: nowIso,
        updatedAt: nowIso,
        lastTriggeredAt: null,
        lastTriggeredPrice: null,
        triggerCount: 0,
      };

      setAlerts((prev) => {
        const next = [newAlert, ...prev];
        writeAlertsToStorage(next);
        return next;
      });

      return newAlert;
    },
    []
  );

  const updateAlert = useCallback(
    (
      alertId: string,
      updates: {
        condition?: AlertCondition;
        targetPrice?: number;
        enabled?: boolean;
      }
    ) => {
      const nowIso = new Date().toISOString();
      setAlerts((prev) => {
        const next = prev.map((item) => {
          if (item.id !== alertId) return item;
          const nextCondition = updates.condition ?? item.condition;
          const nextTarget =
            updates.targetPrice !== undefined &&
            Number.isFinite(updates.targetPrice) &&
            updates.targetPrice > 0
              ? updates.targetPrice
              : item.targetPrice;
          const nextEnabled =
            updates.enabled !== undefined ? updates.enabled : item.enabled;

          // Re-arm alert if target price, condition, or enabled state was changed
          const shouldReArm =
            nextCondition !== item.condition ||
            nextTarget !== item.targetPrice ||
            (nextEnabled && !item.enabled);

          return {
            ...item,
            condition: nextCondition,
            targetPrice: nextTarget,
            enabled: nextEnabled,
            armed: shouldReArm ? true : item.armed,
            updatedAt: nowIso,
          };
        });
        writeAlertsToStorage(next);
        return next;
      });
    },
    []
  );

  const toggleAlertEnabled = useCallback((alertId: string) => {
    const nowIso = new Date().toISOString();
    setAlerts((prev) => {
      const next = prev.map((item) => {
        if (item.id !== alertId) return item;
        const nextEnabled = !item.enabled;
        return {
          ...item,
          enabled: nextEnabled,
          armed: nextEnabled ? true : item.armed,
          updatedAt: nowIso,
        };
      });
      writeAlertsToStorage(next);
      return next;
    });
  }, []);

  const deleteAlert = useCallback((alertId: string) => {
    setAlerts((prev) => {
      const next = prev.filter((item) => item.id !== alertId);
      writeAlertsToStorage(next);
      return next;
    });
  }, []);

  const dismissTriggeredEvent = useCallback((eventId: string) => {
    setTriggeredQueue((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const clearTriggeredEvents = useCallback(() => {
    setTriggeredQueue([]);
  }, []);

  const evaluateAlerts = useCallback(
    (coins: CoinMarket[]) => {
      setAlerts((prevAlerts) => {
        const { updatedAlerts, triggeredEvents, didChange } =
          evaluateAlertsAgainstMarkets(prevAlerts, coins);

        if (didChange) {
          writeAlertsToStorage(updatedAlerts);
        }

        if (triggeredEvents.length > 0) {
          setTriggeredQueue((prevQueue) => [
            ...triggeredEvents,
            ...prevQueue.slice(0, 9),
          ]);

          if (notificationsOptIn) {
            for (const ev of triggeredEvents) {
              dispatchBrowserNotification(ev);
            }
          }
        }

        return didChange ? updatedAlerts : prevAlerts;
      });
    },
    [notificationsOptIn]
  );

  return {
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
  };
}
