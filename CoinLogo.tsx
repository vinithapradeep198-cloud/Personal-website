"use client";

import { useState } from "react";

interface CoinLogoProps {
  src: string | null | undefined;
  name: string;
  symbol: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

export function CoinLogo({
  src,
  name,
  symbol,
  size = "md",
}: CoinLogoProps) {
  const [failed, setFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-slate-600/50 bg-slate-800 font-bold uppercase text-slate-200 shadow-inner`}
      >
        {(symbol || name || "?").slice(0, 3)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name} (${symbol.toUpperCase()}) logo`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${sizeClass} shrink-0 rounded-full bg-slate-800/60 object-contain p-0.5 ring-1 ring-white/10`}
    />
  );
}
