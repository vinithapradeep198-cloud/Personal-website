export type ChartTimeRange = "24h" | "7d" | "30d" | "90d" | "1y";

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  fully_diluted_valuation: number | null;
  total_volume: number | null;
  high_24h: number | null;
  low_24h: number | null;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_change_percentage: number | null;
  atl_date: string | null;
  last_updated: string | null;
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number | null;
  current_price: number | null;
  high_24h: number | null;
  low_24h: number | null;
  market_cap: number | null;
  fully_diluted_valuation: number | null;
  total_volume: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_date: string | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d: number | null;
  price_change_percentage_30d: number | null;
  price_change_percentage_1y: number | null;
  homepage_url: string | null;
  blockchain_site_url: string | null;
  description_summary: string | null;
  categories: string[];
  genesis_date: string | null;
  last_updated: string | null;
}

export interface ChartDataPoint {
  timestamp: number;
  price: number;
}

export interface CoinChartResponse {
  coinId: string;
  range: ChartTimeRange;
  days: number;
  currency: "USD";
  points: ChartDataPoint[];
  startPrice: number | null;
  endPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  percentageChange: number | null;
  fetchedAt: string;
  provider: string;
  fromCache: boolean;
  stale: boolean;
  notice?: string;
}

export interface MarketsApiResponse {
  coins: CoinMarket[];
  fetchedAt: string;
  provider: string;
  fromCache: boolean;
  stale: boolean;
  notice?: string;
}

export interface CoinDetailApiResponse {
  coin: CoinDetail;
  fetchedAt: string;
  provider: string;
  fromCache: boolean;
  stale: boolean;
  notice?: string;
}

export interface ApiErrorPayload {
  error: string;
  code:
    | "RATE_LIMIT"
    | "UPSTREAM_ERROR"
    | "NETWORK_ERROR"
    | "VALIDATION_ERROR"
    | "NOT_FOUND";
  retryAfterSeconds?: number;
  provider: string;
}

export type SortField =
  | "rank"
  | "price"
  | "market_cap"
  | "change_24h"
  | "change_7d"
  | "volume"
  | "name";

export type SortOrder = "asc" | "desc";

export type AlertCondition = "above" | "below";

export interface PriceAlert {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  coinImage: string;
  condition: AlertCondition;
  targetPrice: number;
  enabled: boolean;
  /**
   * `armed` prevents repeated notifications for the same alert while the price
   * remains beyond the target threshold. Once triggered, `armed` becomes `false`
   * and only resets to `true` after the price moves back across the threshold.
   */
  armed: boolean;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt: string | null;
  lastTriggeredPrice: number | null;
  triggerCount: number;
}

export interface TriggeredAlertEvent {
  id: string;
  alertId: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  coinImage: string;
  condition: AlertCondition;
  targetPrice: number;
  triggeredPrice: number;
  triggeredAt: string;
}
