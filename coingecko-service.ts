import type {
  ChartDataPoint,
  ChartTimeRange,
  CoinChartResponse,
  CoinDetail,
  CoinDetailApiResponse,
  CoinMarket,
  MarketsApiResponse,
} from "./types";

/**
 * ============================================================================
 * CRYPTOCURRENCY MARKET DATA PROVIDER CONFIGURATION (SERVER-SIDE ONLY)
 * ============================================================================
 *
 * Current Mode: Keyless Public API (No API key required)
 * Provider: CoinGecko Public API v3 (`https://api.coingecko.com/api/v3`)
 * Documentation: https://docs.coingecko.com/docs/keyless-public-api
 *
 * HOW TO ADD A SERVER-SIDE API KEY LATER (IF NEEDED):
 * 1. Obtain a Demo or Pro API key from CoinGecko (or your chosen market provider).
 * 2. Add it to your server environment (`.env` or hosting provider secrets):
 *      COINGECKO_DEMO_API_KEY= your_demo_key_here
 *    OR for paid Pro tier:
 *      COINGECKO_PRO_API_KEY= your_pro_key_here
 * 3. NEVER prefix secret keys with `NEXT_PUBLIC_`. Keeping them here in
 *    `src/lib/crypto/coingecko-service.ts` ensures keys are only read on the
 *    server via Next.js Route Handlers (`/api/crypto/*`).
 *
 * HOW TO REPLACE THE DATA PROVIDER ENTIRELY:
 * If you decide to switch from CoinGecko to another provider (e.g., CoinCap,
 * CoinPaprika, CryptoCompare, or CoinMarketCap), replace the fetch & mapper
 * functions (`fetchTopMarkets`, `fetchCoinDetail`, `fetchCoinMarketChart`)
 * in this file while returning the same normalized `MarketsApiResponse`,
 * `CoinDetailApiResponse`, and `CoinChartResponse` interfaces.
 * The UI components and `/api/crypto/*` route handlers will continue to work
 * without any frontend changes.
 * ============================================================================
 */

const PUBLIC_COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const PRO_COINGECKO_BASE_URL = "https://pro-api.coingecko.com/api/v3";

const PROVIDER_ATTRIBUTION = "CoinGecko Public API";

const MARKETS_CACHE_TTL_MS = 90 * 1000; // 90 seconds fresh cache
const DETAIL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh cache
const CHART_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes fresh cache
const MAX_STALE_FALLBACK_MS = 30 * 60 * 1000; // 30 minutes max stale real cache on 429

export class CryptoApiError extends Error {
  public readonly status: number;
  public readonly code:
    | "RATE_LIMIT"
    | "UPSTREAM_ERROR"
    | "NETWORK_ERROR"
    | "VALIDATION_ERROR"
    | "NOT_FOUND";
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    code:
      | "RATE_LIMIT"
      | "UPSTREAM_ERROR"
      | "NETWORK_ERROR"
      | "VALIDATION_ERROR"
      | "NOT_FOUND",
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "CryptoApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface CacheEntry<T> {
  data: T;
  fetchedAtMs: number;
  fetchedAtIso: string;
}

interface CryptoCacheStore {
  markets: Map<string, CacheEntry<CoinMarket[]>>;
  details: Map<string, CacheEntry<CoinDetail>>;
  charts: Map<string, CacheEntry<Omit<CoinChartResponse, "fromCache" | "stale">>>;
}

const globalForCryptoCache = globalThis as typeof globalThis & {
  __cryptoTrackerCacheStore?: CryptoCacheStore;
};

const cacheStore: CryptoCacheStore =
  globalForCryptoCache.__cryptoTrackerCacheStore ?? {
    markets: new Map(),
    details: new Map(),
    charts: new Map(),
  };

globalForCryptoCache.__cryptoTrackerCacheStore = cacheStore;

/**
 * Resolves the upstream base URL and optional authentication headers.
 * Uses unauthenticated CoinGecko Keyless Public API by default.
 */
function getProviderConfig(): {
  baseUrl: string;
  headers: Record<string, string>;
  providerName: string;
} {
  const proKey = process.env.COINGECKO_PRO_API_KEY?.trim();
  const demoKey = process.env.COINGECKO_DEMO_API_KEY?.trim();

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "PersonalWebsite-CryptoTracker/1.0",
  };

  if (proKey) {
    headers["x-cg-pro-api-key"] = proKey;
    return {
      baseUrl: PRO_COINGECKO_BASE_URL,
      headers,
      providerName: "CoinGecko Pro API",
    };
  }

  if (demoKey) {
    headers["x-cg-demo-api-key"] = demoKey;
    return {
      baseUrl: PUBLIC_COINGECKO_BASE_URL,
      headers,
      providerName: "CoinGecko Demo API",
    };
  }

  return {
    baseUrl: PUBLIC_COINGECKO_BASE_URL,
    headers,
    providerName: PROVIDER_ATTRIBUTION,
  };
}

function toFiniteNumberOrNull(val: unknown): number | null {
  if (typeof val === "number" && Number.isFinite(val)) {
    return val;
  }
  if (typeof val === "string" && val.trim() !== "") {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function toSafeString(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val.trim() : fallback;
}

function toSafeHttpUrl(val: unknown): string | null {
  if (typeof val !== "string" || !val.trim()) {
    return null;
  }
  try {
    const parsed = new URL(val.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function stripHtmlAndTruncate(raw: unknown, maxLength = 420): string | null {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  const plain = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) {
    return null;
  }
  if (plain.length <= maxLength) {
    return plain;
  }
  return `${plain.slice(0, maxLength).trim()}…`;
}

/**
 * Performs an HTTP GET against the configured CoinGecko endpoint with timeout
 * and structured error classification.
 */
async function requestUpstreamJson(pathAndQuery: string): Promise<unknown> {
  const { baseUrl, headers } = getProviderConfig();
  const url = `${baseUrl}${pathAndQuery}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    throw new CryptoApiError(
      isAbort
        ? "The cryptocurrency data provider timed out. Please try again in a moment."
        : "Unable to connect to the cryptocurrency market data provider. Please check your network connection.",
      503,
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10) || 60
      : 60;
    throw new CryptoApiError(
      "Public API rate limit reached on CoinGecko. Please wait 1–2 minutes before refreshing again.",
      429,
      "RATE_LIMIT",
      retryAfterSeconds
    );
  }

  if (response.status === 404) {
    throw new CryptoApiError(
      "The requested cryptocurrency could not be found on the market data provider.",
      404,
      "NOT_FOUND"
    );
  }

  if (!response.ok) {
    throw new CryptoApiError(
      `Market data provider returned HTTP ${response.status}. Please try again shortly.`,
      response.status >= 500 ? 502 : response.status,
      "UPSTREAM_ERROR"
    );
  }

  try {
    return await response.json();
  } catch {
    throw new CryptoApiError(
      "Received an invalid JSON payload from the market data provider.",
      502,
      "VALIDATION_ERROR"
    );
  }
}

/**
 * Validates and normalizes a single coin item from CoinGecko `/coins/markets`.
 */
function normalizeMarketCoin(raw: unknown): CoinMarket | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const id = toSafeString(item.id);
  const symbol = toSafeString(item.symbol);
  const name = toSafeString(item.name);

  if (!id || !symbol || !name) {
    return null;
  }

  const change24h =
    toFiniteNumberOrNull(item.price_change_percentage_24h) ??
    toFiniteNumberOrNull(item.price_change_percentage_24h_in_currency);

  const change7d = toFiniteNumberOrNull(
    item.price_change_percentage_7d_in_currency
  );

  return {
    id,
    symbol: symbol.toUpperCase(),
    name,
    image: toSafeHttpUrl(item.image) ?? "",
    current_price: toFiniteNumberOrNull(item.current_price),
    market_cap: toFiniteNumberOrNull(item.market_cap),
    market_cap_rank: toFiniteNumberOrNull(item.market_cap_rank),
    fully_diluted_valuation: toFiniteNumberOrNull(item.fully_diluted_valuation),
    total_volume: toFiniteNumberOrNull(item.total_volume),
    high_24h: toFiniteNumberOrNull(item.high_24h),
    low_24h: toFiniteNumberOrNull(item.low_24h),
    price_change_24h: toFiniteNumberOrNull(item.price_change_24h),
    price_change_percentage_24h: change24h,
    price_change_percentage_7d_in_currency: change7d,
    circulating_supply: toFiniteNumberOrNull(item.circulating_supply),
    total_supply: toFiniteNumberOrNull(item.total_supply),
    max_supply: toFiniteNumberOrNull(item.max_supply),
    ath: toFiniteNumberOrNull(item.ath),
    ath_change_percentage: toFiniteNumberOrNull(item.ath_change_percentage),
    ath_date: toSafeString(item.ath_date) || null,
    atl: toFiniteNumberOrNull(item.atl),
    atl_change_percentage: toFiniteNumberOrNull(item.atl_change_percentage),
    atl_date: toSafeString(item.atl_date) || null,
    last_updated: toSafeString(item.last_updated) || null,
  };
}

/**
 * Fetches top cryptocurrencies by market capitalization in USD.
 * Uses server-side memory caching to protect the keyless public endpoint from
 * rate-limit exhaustion.
 */
export async function fetchTopMarkets(options?: {
  perPage?: number;
  page?: number;
  forceRefresh?: boolean;
}): Promise<MarketsApiResponse> {
  const perPage = Math.min(Math.max(options?.perPage ?? 50, 10), 100);
  const page = Math.max(options?.page ?? 1, 1);
  const cacheKey = `usd:${perPage}:${page}`;
  const now = Date.now();
  const { providerName } = getProviderConfig();

  const existing = cacheStore.markets.get(cacheKey);
  if (
    existing &&
    !options?.forceRefresh &&
    now - existing.fetchedAtMs < MARKETS_CACHE_TTL_MS
  ) {
    return {
      coins: existing.data,
      fetchedAt: existing.fetchedAtIso,
      provider: providerName,
      fromCache: true,
      stale: false,
    };
  }

  // Also enforce a minimum 30-second cooldown even on manual forceRefresh
  // so rapid button clicks cannot trigger an upstream 429 rate-limit ban.
  if (existing && options?.forceRefresh && now - existing.fetchedAtMs < 30_000) {
    return {
      coins: existing.data,
      fetchedAt: existing.fetchedAtIso,
      provider: providerName,
      fromCache: true,
      stale: false,
      notice:
        "Showing recently fetched market snapshot (refreshed less than 30 seconds ago) to respect public API rate limits.",
    };
  }

  try {
    const query = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=24h,7d`;
    const rawPayload = await requestUpstreamJson(query);

    if (!Array.isArray(rawPayload)) {
      throw new CryptoApiError(
        "Unexpected market data structure received from provider.",
        502,
        "VALIDATION_ERROR"
      );
    }

    const coins = rawPayload
      .map(normalizeMarketCoin)
      .filter((c): c is CoinMarket => c !== null);

    if (coins.length === 0) {
      throw new CryptoApiError(
        "No valid cryptocurrency market entries were returned by the provider.",
        502,
        "VALIDATION_ERROR"
      );
    }

    const fetchedAtIso = new Date(now).toISOString();
    cacheStore.markets.set(cacheKey, {
      data: coins,
      fetchedAtMs: now,
      fetchedAtIso,
    });

    return {
      coins,
      fetchedAt: fetchedAtIso,
      provider: providerName,
      fromCache: false,
      stale: false,
    };
  } catch (error) {
    // If we have a previously fetched REAL response within the stale window,
    // return it transparently marked as `stale: true` rather than failing hard.
    if (
      existing &&
      now - existing.fetchedAtMs < MAX_STALE_FALLBACK_MS &&
      error instanceof CryptoApiError
    ) {
      return {
        coins: existing.data,
        fetchedAt: existing.fetchedAtIso,
        provider: providerName,
        fromCache: true,
        stale: true,
        notice:
          error.code === "RATE_LIMIT"
            ? "Public API rate limit is temporarily active. Displaying the most recent verified market snapshot from cache."
            : "Live refresh encountered a temporary upstream issue. Displaying the most recent verified market snapshot from cache.",
      };
    }
    throw error;
  }
}

/**
 * Fetches extended metadata and market metrics for a single cryptocurrency.
 */
export async function fetchCoinDetail(
  coinId: string
): Promise<CoinDetailApiResponse> {
  const cleanId = coinId.trim().toLowerCase();
  if (!cleanId || !/^[a-z0-9-_]+$/.test(cleanId)) {
    throw new CryptoApiError(
      "Invalid cryptocurrency identifier.",
      400,
      "VALIDATION_ERROR"
    );
  }

  const now = Date.now();
  const { providerName } = getProviderConfig();
  const existing = cacheStore.details.get(cleanId);

  if (existing && now - existing.fetchedAtMs < DETAIL_CACHE_TTL_MS) {
    return {
      coin: existing.data,
      fetchedAt: existing.fetchedAtIso,
      provider: providerName,
      fromCache: true,
      stale: false,
    };
  }

  try {
    const query = `/coins/${encodeURIComponent(
      cleanId
    )}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const raw = await requestUpstreamJson(query);

    if (!raw || typeof raw !== "object") {
      throw new CryptoApiError(
        "Invalid coin detail payload received from provider.",
        502,
        "VALIDATION_ERROR"
      );
    }

    const record = raw as Record<string, unknown>;
    const id = toSafeString(record.id, cleanId);
    const symbol = toSafeString(record.symbol).toUpperCase();
    const name = toSafeString(record.name);

    const imageObj =
      record.image && typeof record.image === "object"
        ? (record.image as Record<string, unknown>)
        : {};
    const imageUrl =
      toSafeHttpUrl(imageObj.large) ??
      toSafeHttpUrl(imageObj.small) ??
      toSafeHttpUrl(imageObj.thumb) ??
      "";

    const marketData =
      record.market_data && typeof record.market_data === "object"
        ? (record.market_data as Record<string, unknown>)
        : {};

    const readUsdField = (fieldName: string): number | null => {
      const map = marketData[fieldName];
      if (map && typeof map === "object") {
        return toFiniteNumberOrNull((map as Record<string, unknown>).usd);
      }
      return null;
    };

    const readUsdDateField = (fieldName: string): string | null => {
      const map = marketData[fieldName];
      if (map && typeof map === "object") {
        return toSafeString((map as Record<string, unknown>).usd) || null;
      }
      return null;
    };

    const linksObj =
      record.links && typeof record.links === "object"
        ? (record.links as Record<string, unknown>)
        : {};

    const homepageList = Array.isArray(linksObj.homepage)
      ? linksObj.homepage
      : [];
    const homepageUrl =
      homepageList.map(toSafeHttpUrl).find((u): u is string => u !== null) ??
      null;

    const blockchainList = Array.isArray(linksObj.blockchain_site)
      ? linksObj.blockchain_site
      : [];
    const blockchainSiteUrl =
      blockchainList.map(toSafeHttpUrl).find((u): u is string => u !== null) ??
      null;

    const descObj =
      record.description && typeof record.description === "object"
        ? (record.description as Record<string, unknown>)
        : {};
    const descriptionSummary = stripHtmlAndTruncate(descObj.en, 450);

    const rawCategories = Array.isArray(record.categories)
      ? record.categories
      : [];
    const categories = rawCategories
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      .slice(0, 5);

    const detail: CoinDetail = {
      id,
      symbol,
      name,
      image: imageUrl,
      market_cap_rank:
        toFiniteNumberOrNull(record.market_cap_rank) ??
        toFiniteNumberOrNull(marketData.market_cap_rank),
      current_price: readUsdField("current_price"),
      high_24h: readUsdField("high_24h"),
      low_24h: readUsdField("low_24h"),
      market_cap: readUsdField("market_cap"),
      fully_diluted_valuation: readUsdField("fully_diluted_valuation"),
      total_volume: readUsdField("total_volume"),
      circulating_supply: toFiniteNumberOrNull(marketData.circulating_supply),
      total_supply: toFiniteNumberOrNull(marketData.total_supply),
      max_supply: toFiniteNumberOrNull(marketData.max_supply),
      ath: readUsdField("ath"),
      ath_change_percentage: readUsdField("ath_change_percentage"),
      ath_date: readUsdDateField("ath_date"),
      atl: readUsdField("atl"),
      atl_date: readUsdDateField("atl_date"),
      price_change_percentage_24h: toFiniteNumberOrNull(
        marketData.price_change_percentage_24h
      ),
      price_change_percentage_7d: toFiniteNumberOrNull(
        marketData.price_change_percentage_7d
      ),
      price_change_percentage_30d: toFiniteNumberOrNull(
        marketData.price_change_percentage_30d
      ),
      price_change_percentage_1y: toFiniteNumberOrNull(
        marketData.price_change_percentage_1y
      ),
      homepage_url: homepageUrl,
      blockchain_site_url: blockchainSiteUrl,
      description_summary: descriptionSummary,
      categories,
      genesis_date: toSafeString(record.genesis_date) || null,
      last_updated:
        toSafeString(marketData.last_updated) ||
        toSafeString(record.last_updated) ||
        null,
    };

    const fetchedAtIso = new Date(now).toISOString();
    cacheStore.details.set(cleanId, {
      data: detail,
      fetchedAtMs: now,
      fetchedAtIso,
    });

    return {
      coin: detail,
      fetchedAt: fetchedAtIso,
      provider: providerName,
      fromCache: false,
      stale: false,
    };
  } catch (error) {
    if (
      existing &&
      now - existing.fetchedAtMs < MAX_STALE_FALLBACK_MS &&
      error instanceof CryptoApiError
    ) {
      return {
        coin: existing.data,
        fetchedAt: existing.fetchedAtIso,
        provider: providerName,
        fromCache: true,
        stale: true,
        notice:
          "Displaying recently cached coin metadata due to temporary public API rate limiting.",
      };
    }
    throw error;
  }
}

const RANGE_TO_DAYS: Record<ChartTimeRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

/**
 * Fetches historical USD price series for a coin across the requested time range:
 * 24h (1 day), 7d (7 days), 30d (30 days), 90d (90 days), or 1y (365 days).
 */
export async function fetchCoinMarketChart(
  coinId: string,
  range: ChartTimeRange
): Promise<CoinChartResponse> {
  const cleanId = coinId.trim().toLowerCase();
  if (!cleanId || !/^[a-z0-9-_]+$/.test(cleanId)) {
    throw new CryptoApiError(
      "Invalid cryptocurrency identifier for chart request.",
      400,
      "VALIDATION_ERROR"
    );
  }

  const days = RANGE_TO_DAYS[range] ?? 7;
  const cacheKey = `${cleanId}:${range}`;
  const now = Date.now();
  const { providerName } = getProviderConfig();

  const existing = cacheStore.charts.get(cacheKey);
  if (existing && now - existing.fetchedAtMs < CHART_CACHE_TTL_MS) {
    return {
      ...existing.data,
      fromCache: true,
      stale: false,
    };
  }

  try {
    const query = `/coins/${encodeURIComponent(
      cleanId
    )}/market_chart?vs_currency=usd&days=${days}`;
    const raw = await requestUpstreamJson(query);

    if (!raw || typeof raw !== "object") {
      throw new CryptoApiError(
        "Invalid historical chart payload from provider.",
        502,
        "VALIDATION_ERROR"
      );
    }

    const record = raw as Record<string, unknown>;
    const rawPrices = Array.isArray(record.prices) ? record.prices : [];

    const points: ChartDataPoint[] = [];
    for (const pair of rawPrices) {
      if (Array.isArray(pair) && pair.length >= 2) {
        const timestamp = toFiniteNumberOrNull(pair[0]);
        const price = toFiniteNumberOrNull(pair[1]);
        if (timestamp !== null && price !== null && price >= 0) {
          points.push({ timestamp, price });
        }
      }
    }

    // Downsample if there are more than 180 points so SVG rendering is ultra-fast
    const maxPoints = 160;
    let sampledPoints = points;
    if (points.length > maxPoints) {
      const step = (points.length - 1) / (maxPoints - 1);
      sampledPoints = [];
      for (let i = 0; i < maxPoints - 1; i++) {
        sampledPoints.push(points[Math.round(i * step)]);
      }
      sampledPoints.push(points[points.length - 1]);
    }

    let minPrice: number | null = null;
    let maxPrice: number | null = null;
    for (const pt of sampledPoints) {
      if (minPrice === null || pt.price < minPrice) minPrice = pt.price;
      if (maxPrice === null || pt.price > maxPrice) maxPrice = pt.price;
    }

    const startPrice =
      sampledPoints.length > 0 ? sampledPoints[0].price : null;
    const endPrice =
      sampledPoints.length > 0
        ? sampledPoints[sampledPoints.length - 1].price
        : null;

    let percentageChange: number | null = null;
    if (startPrice !== null && endPrice !== null && startPrice > 0) {
      percentageChange = ((endPrice - startPrice) / startPrice) * 100;
    }

    const fetchedAtIso = new Date(now).toISOString();
    const chartPayload: Omit<CoinChartResponse, "fromCache" | "stale"> = {
      coinId: cleanId,
      range,
      days,
      currency: "USD",
      points: sampledPoints,
      startPrice,
      endPrice,
      minPrice,
      maxPrice,
      percentageChange,
      fetchedAt: fetchedAtIso,
      provider: providerName,
    };

    cacheStore.charts.set(cacheKey, {
      data: chartPayload,
      fetchedAtMs: now,
      fetchedAtIso,
    });

    return {
      ...chartPayload,
      fromCache: false,
      stale: false,
    };
  } catch (error) {
    if (
      existing &&
      now - existing.fetchedAtMs < MAX_STALE_FALLBACK_MS &&
      error instanceof CryptoApiError
    ) {
      return {
        ...existing.data,
        fromCache: true,
        stale: true,
        notice:
          "Showing recently cached chart series due to temporary public API rate limiting.",
      };
    }
    throw error;
  }
}
