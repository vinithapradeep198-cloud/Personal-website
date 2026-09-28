"use client";

import { Code2, KeyRound, Server, Terminal, X } from "lucide-react";

interface ArchitectureGuideModalProps {
  open: boolean;
  onClose: () => void;
  isLight?: boolean;
}

export function ArchitectureGuideModal({
  open,
  onClose,
  isLight = false,
}: ArchitectureGuideModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="architecture-guide-title"
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border p-6 shadow-2xl ${
          isLight
            ? "border-slate-200 bg-white text-slate-900"
            : "border-slate-800 bg-slate-950 text-slate-100"
        }`}
      >
        <div className="flex items-start justify-between border-b pb-4 border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <Code2 className="h-5 w-5 text-sky-400" aria-hidden="true" />
            <h2
              id="architecture-guide-title"
              className="text-lg font-bold tracking-tight"
            >
              API Configuration, Setup &amp; Provider Guide
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className={`rounded-xl border p-2 transition ${
              isLight
                ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-xs leading-relaxed sm:text-sm">
          <div
            className={`rounded-2xl border p-4 ${
              isLight
                ? "border-slate-200 bg-slate-50"
                : "border-slate-800 bg-slate-900/60"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sky-400">
              <Server className="h-4 w-4" aria-hidden="true" />
              <h3>1. Current Keyless Public API Architecture</h3>
            </div>
            <p className="mt-1.5">
              This tracker uses the official{" "}
              <strong>CoinGecko Keyless Public API v3</strong> (
              <code>https://api.coingecko.com/api/v3</code>) via server-side
              Next.js Route Handlers (<code>/api/crypto/markets</code>,{" "}
              <code>/api/crypto/coins/[id]</code>, and{" "}
              <code>/api/crypto/coins/[id]/chart</code>). No API key, wallet
              connection, or user account is required. Server-side memory
              caching (90s–300s TTL) and conservative client refresh intervals
              (2–5 minutes or manual) protect against public rate limits.
            </p>
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              isLight
                ? "border-slate-200 bg-slate-50"
                : "border-slate-800 bg-slate-900/60"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              <h3>
                2. Adding a Server-Side API Key or Replacing the Provider Later
              </h3>
            </div>
            <p className="mt-1.5">
              All upstream provider logic is isolated in{" "}
              <code>src/lib/crypto/coingecko-service.ts</code>:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Optional CoinGecko API Key:</strong> Set{" "}
                <code>COINGECKO_DEMO_API_KEY</code> or{" "}
                <code>COINGECKO_PRO_API_KEY</code> in your server environment (
                <code>.env</code>). <code>getProviderConfig()</code>{" "}
                automatically attaches <code>x-cg-demo-api-key</code> or{" "}
                <code>x-cg-pro-api-key</code> on the server without ever
                exposing the secret to browser code.
              </li>
              <li>
                <strong>Swapping Providers:</strong> Update{" "}
                <code>fetchTopMarkets</code>, <code>fetchCoinDetail</code>, and{" "}
                <code>fetchCoinMarketChart</code> in{" "}
                <code>src/lib/crypto/coingecko-service.ts</code> to map your new
                provider&apos;s JSON into the normalized{" "}
                <code>CoinMarket</code>, <code>CoinDetail</code>, and{" "}
                <code>CoinChartResponse</code> types. No UI components need to
                change.
              </li>
            </ul>
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              isLight
                ? "border-slate-200 bg-slate-50"
                : "border-slate-800 bg-slate-900/60"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <Terminal className="h-4 w-4" aria-hidden="true" />
              <h3>3. Setup, Local Testing &amp; Deployment</h3>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Install &amp; Run Locally:</strong>{" "}
                <code>npm install &amp;&amp; npm run dev</code>, then open{" "}
                <code>http://localhost:3000</code> and click{" "}
                <strong>Crypto Tracker</strong> (or visit{" "}
                <code>/crypto-tracker</code>).
              </li>
              <li>
                <strong>Typecheck &amp; Production Build:</strong> Run{" "}
                <code>npx next typegen</code>,{" "}
                <code>npm exec tsc -- --noEmit</code>, and{" "}
                <code>npm run build</code>.
              </li>
              <li>
                <strong>Deployment:</strong> Deploy as a standard Next.js App
                Router application. Ensure outbound HTTPS access to{" "}
                <code>api.coingecko.com</code> is permitted.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
