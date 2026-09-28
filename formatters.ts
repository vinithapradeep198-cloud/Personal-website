import type { ChartTimeRange } from "./types";

export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Formats a USD price with appropriate decimal precision based on magnitude.
 * Safely returns "N/A" when the value is null, undefined, or non-finite.
 */
export function formatUsdPrice(value: number | null | undefined): string {
  if (!isValidNumber(value)) {
    return "N/A";
  }

  const abs = Math.abs(value);

  if (abs === 0) {
    return "$0.00";
  }

  if (abs >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (abs >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  }

  if (abs >= 0.01) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  }

  if (abs >= 0.0001) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  }).format(value);
}

/**
 * Formats large USD amounts (market cap, volume, FDV) in compact notation
 * e.g., $1.66T, $324.95B, $42.10M, or full USD for smaller values.
 */
export function formatCompactUsd(value: number | null | undefined): string {
  if (!isValidNumber(value)) {
    return "N/A";
  }

  const abs = Math.abs(value);

  if (abs >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (abs >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }

  return formatUsdPrice(value);
}

/**
 * Formats full USD numbers with commas for tooltips and detailed metrics.
 */
export function formatFullUsd(value: number | null | undefined): string {
  if (!isValidNumber(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1 ? 0 : 4,
  }).format(value);
}

/**
 * Formats token supply amounts with symbol.
 */
export function formatSupply(
  value: number | null | undefined,
  symbol?: string
): string {
  if (!isValidNumber(value)) {
    return "N/A";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(value);

  return symbol ? `${formatted} ${symbol.toUpperCase()}` : formatted;
}

/**
 * Formats percentage changes with explicit + or - sign.
 */
export function formatPercentage(value: number | null | undefined): string {
  if (!isValidNumber(value)) {
    return "N/A";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Formats an ISO timestamp into an exact, human-readable date & time string.
 */
export function formatExactTimestamp(isoString: string | null | undefined): string {
  if (!isoString) {
    return "Not yet updated";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Formats a date string into a clean date (used for ATH dates, genesis dates).
 */
export function formatShortDate(isoString: string | null | undefined): string {
  if (!isoString) {
    return "N/A";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Formats chart axis and tooltip dates according to the selected time range.
 */
export function formatChartTimestamp(
  timestampMs: number,
  range: ChartTimeRange,
  includeDetail = false
): string {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (includeDetail) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (range === "24h") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  if (range === "7d" || range === "30d" || range === "90d") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(date);
}
