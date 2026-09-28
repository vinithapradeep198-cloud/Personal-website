import { db } from "@/db";
import { sql } from "drizzle-orm";
import { Activity, ArrowRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await db.execute(sql`select 1`);

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-2xl rounded-3xl bg-white p-10 shadow-[0_24px_60px_rgba(16,24,40,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="m-0 text-sm uppercase tracking-[0.08em] text-slate-600">
            Starter template
          </p>
          <nav aria-label="Primary navigation">
            <Link
              href="/crypto-tracker"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              <Activity className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <span>Crypto Tracker</span>
              <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </Link>
          </nav>
        </div>

        <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.05] text-slate-950">
          Arena Next.js PostgreSQL Starter
        </h1>
        <p className="mt-4 text-base text-slate-700">
          Server-rendered with Next.js after a successful PostgreSQL query through Drizzle.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Live Cryptocurrency Market Dashboard
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Track top coins by market cap, view multi-range USD price charts,
                manage your local watchlist, and configure browser price alerts.
              </p>
            </div>
            <Link
              href="/crypto-tracker"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              <span>Crypto Tracker</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
