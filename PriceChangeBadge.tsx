import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatPercentage, isValidNumber } from "@/lib/crypto/formatters";

interface PriceChangeBadgeProps {
  value: number | null | undefined;
  size?: "sm" | "md";
  isLight?: boolean;
  labelPrefix?: string;
}

export function PriceChangeBadge({
  value,
  size = "sm",
  isLight = false,
  labelPrefix,
}: PriceChangeBadgeProps) {
  const paddingClass =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  if (!isValidNumber(value)) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-lg font-medium ${paddingClass} ${
          isLight
            ? "bg-slate-100 text-slate-600"
            : "bg-slate-800/70 text-slate-400"
        }`}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        <span>N/A</span>
      </span>
    );
  }

  const isPositive = value > 0;
  const isNegative = value < 0;

  const colorClass = isPositive
    ? isLight
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
      : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
    : isNegative
    ? isLight
      ? "bg-rose-50 text-rose-700 border border-rose-200/80"
      : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
    : isLight
    ? "bg-slate-100 text-slate-700 border border-slate-200"
    : "bg-slate-800 text-slate-300 border border-slate-700";

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-lg font-semibold tabular-nums ${paddingClass} ${colorClass}`}
      aria-label={`${labelPrefix ? `${labelPrefix}: ` : ""}${
        isPositive ? "Up " : isNegative ? "Down " : ""
      }${formatPercentage(value)}`}
    >
      {isPositive ? (
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : isNegative ? (
        <ArrowDownRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{formatPercentage(value)}</span>
    </span>
  );
}
