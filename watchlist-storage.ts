"use client";

import { useCallback, useEffect, useState } from "react";

export const WATCHLIST_STORAGE_KEY = "crypto_tracker_watchlist_v1";

/**
 * Reads watchlisted coin IDs from browser localStorage safely.
 */
export function readWatchlistFromStorage(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return Array.from(
      new Set(
        parsed.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0
        )
      )
    );
  } catch {
    return [];
  }
}

/**
 * Writes watchlisted coin IDs to browser localStorage safely.
 */
export function writeWatchlistToStorage(ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const unique = Array.from(new Set(ids));
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(unique));
  } catch {
    // Ignore storage quota errors in restricted browsing modes
  }
}

/**
 * React hook for managing the user's cryptocurrency watchlist in localStorage.
 */
export function useWatchlist() {
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setWatchlistIds(readWatchlistFromStorage());
    setIsHydrated(true);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === WATCHLIST_STORAGE_KEY) {
        setWatchlistIds(readWatchlistFromStorage());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const isWatchlisted = useCallback(
    (coinId: string) => watchlistIds.includes(coinId),
    [watchlistIds]
  );

  const addToWatchlist = useCallback((coinId: string) => {
    setWatchlistIds((prev) => {
      if (prev.includes(coinId)) return prev;
      const next = [...prev, coinId];
      writeWatchlistToStorage(next);
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((coinId: string) => {
    setWatchlistIds((prev) => {
      const next = prev.filter((id) => id !== coinId);
      writeWatchlistToStorage(next);
      return next;
    });
  }, []);

  const toggleWatchlist = useCallback((coinId: string) => {
    setWatchlistIds((prev) => {
      const exists = prev.includes(coinId);
      const next = exists
        ? prev.filter((id) => id !== coinId)
        : [...prev, coinId];
      writeWatchlistToStorage(next);
      return next;
    });
  }, []);

  const clearWatchlist = useCallback(() => {
    setWatchlistIds([]);
    writeWatchlistToStorage([]);
  }, []);

  return {
    watchlistIds,
    isHydrated,
    isWatchlisted,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    clearWatchlist,
  };
}
