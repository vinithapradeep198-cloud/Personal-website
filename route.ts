import { NextResponse, type NextRequest } from "next/server";
import {
  CryptoApiError,
  fetchTopMarkets,
} from "@/lib/crypto/coingecko-service";
import type { ApiErrorPayload } from "@/lib/crypto/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const perPageParam = searchParams.get("per_page");
    const pageParam = searchParams.get("page");
    const forceParam = searchParams.get("force");

    const perPage = perPageParam ? Number.parseInt(perPageParam, 10) : 50;
    const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
    const forceRefresh = forceParam === "true" || forceParam === "1";

    const data = await fetchTopMarkets({
      perPage: Number.isFinite(perPage) ? perPage : 50,
      page: Number.isFinite(page) ? page : 1,
      forceRefresh,
    });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    if (err instanceof CryptoApiError) {
      const payload: ApiErrorPayload = {
        error: err.message,
        code: err.code,
        retryAfterSeconds: err.retryAfterSeconds,
        provider: "CoinGecko Public API",
      };
      return NextResponse.json(payload, { status: err.status });
    }

    const fallback: ApiErrorPayload = {
      error:
        "An unexpected error occurred while fetching cryptocurrency market data.",
      code: "UPSTREAM_ERROR",
      provider: "CoinGecko Public API",
    };
    return NextResponse.json(fallback, { status: 500 });
  }
}
