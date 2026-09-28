"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";

interface MetricTooltipProps {
  label: string;
  explanation: string;
  isLight?: boolean;
}

export function MetricTooltip({
  label,
  explanation,
  isLight = false,
}: MetricTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={`What is ${label}? ${explanation}`}
        className={`inline-flex rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 ${
          isLight
            ? "text-slate-500 hover:text-slate-800"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-60 -translate-x-1/2 rounded-xl border p-2.5 text-left text-xs font-normal leading-relaxed shadow-xl ${
            isLight
              ? "border-slate-200 bg-white text-slate-700"
              : "border-slate-700 bg-slate-900 text-slate-200"
          }`}
        >
          <strong className="mb-0.5 block font-semibold">{label}</strong>
          {explanation}
        </span>
      )}
    </span>
  );
}
