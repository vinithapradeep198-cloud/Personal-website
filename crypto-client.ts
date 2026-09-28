import type {
  ApiErrorPayload,
  ChartTimeRange,
  CoinChartResponse,
  CoinDetailApiResponse,
  MarketsApiResponse,
} from "./types";

export class ClientCryptoError extends Error {
  public readonly code:
    | "RATE_LIMIT"
    | "UPSTREAM_ERROR"
    | "NETWORK_ERROR"
    | "VALIDATION_ERROR"
    | "NOT_FOUND"
    | "OFFLINE";
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    code:
      | "RATE_LIMIT"
      | "UPSTREAM_ERROR"
      | "NETWORK_ERROR"
      | "VALIDATION_ERROR"
      | "NOT_FOUND"
      | "OFFLINE",
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "ClientCryptoError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const CLIENT_CHART_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const CLIENT_DETAIL_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

const chartMemoryCache = new Map<
  string,
  { data: CoinChartResponse; timestamp: number }
>();
const detailMemoryCache = new Map<
  string,
  { data: CoinDetailApiResponse; timestamp: number }
>();

function checkBrowserOnline() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ClientCryptoError(
      "You appear to be offline. Please check your internet connection and click Retry.",
      "OFFLINE"
    );
  }
}

async function parseResponseOrThrow<T>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ClientCryptoError(
      `Received an unreadable response from server (HTTP ${response.status}).`,
      "UPSTREAM_ERROR"
    );
  }

  if (!response.ok) {
    const errPayload = body as Partial<ApiErrorPayload>;
    throw new ClientCryptoError(
      errPayload?.error ||
        `Market data request failed with HTTP ${response.status}.`,
      errPayload?.code || "UPSTREAM_ERROR",
      errPayload?.retryAfterSeconds
    );
  }

  return body as T;
}

/**
 * Fetches top cryptocurrencies by market capitalization via relative API route.
 */
export async function getMarketCoins(options?: {
  perPage?: number;
  page?: number;
  forceRefresh?: boolean;
}): Promise<MarketsApiResponse> {
  checkBrowserOnline();

  const params = new URLSearchParams();
  params.set("per_page", String(options?.perPage ?? 50));
  params.set("page", String(options?.page ?? 1));
  if (options?.forceRefresh) {
    params.set("force", "true");
  }

  try {
    const response = await fetch(`/api/crypto/markets?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return await parseResponseOrThrow<MarketsApiResponse>(response);
  } catch (err) {
    if (err instanceof ClientCryptoError) {
      throw err;
    }
    throw new ClientCryptoError(
      "Network request failed while loading cryptocurrency market prices. Please try again.",
      "NETWORK_ERROR"
    );
  }
}

/**
 * Fetches extended details for a specific cryptocurrency by ID.
 */
export async function getCoinDetailById(
  coinId: string,
  forceRefresh = false
): Promise<CoinDetailApiResponse> {
  const cleanId = coinId.trim().toLowerCase();
  const cached = detailMemoryCache.get(cleanId);
  const now = Date.now();

  if (
    cached &&
    !forceRefresh &&
    now - cached.timestamp < CLIENT_DETAIL_CACHE_TTL_MS
  ) {
    return cached.data;
  }

  checkBrowserOnline();

  try {
    const response = await fetch(
      `/api/crypto/coins/${encodeURIComponent(cleanId)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      }
    );
    const data = await parseResponseOrThrow<CoinDetailApiResponse>(response);
    detailMemoryCache.set(cleanId, { data, timestamp: now });
    return data;
  } catch (err) {
    if (err instanceof ClientCryptoError) {
      throw err;
    }
    throw new ClientCryptoError(
      "Unable to load detailed coin metrics right now. Please try again.",
      "NETWORK_ERROR"
    );
  }
}

/**
 * Fetches historical chart points for a specific coin and time range.
 */
export async function getCoinChartById(
  coinId: string,
  range: ChartTimeRange,
  forceRefresh = false
): Promise<CoinChartResponse> {
  const cleanId = coinId.trim().toLowerCase();
  const cacheKey = `${cleanId}:${range}`;
  const cached = chartMemoryCache.get(cacheKey);
  const now = Date.now();

  if (
    cached &&
    !forceRefresh &&
    now - cached.timestamp < CLIENT_CHART_CACHE_TTL_MS
  ) {
    return cached.data;
  }

  checkBrowserOnline();

  try {
    const response = await fetch(
      `/api/crypto/coins/${encodeURIComponent(
        cleanId
      )}/chart?range=${encodeURIComponent(range)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      }
    );
    const data = await parseResponseOrThrow<CoinChartResponse>(response);
    chartMemoryCache.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (err) {
    if (err instanceof ClientCryptoError) {
      throw err;
    }
    throw new ClientCryptoError(
      "Unable to load historical price chart right now. Please try again.",
      "NETWORK_ERROR"
    );
  }
}
