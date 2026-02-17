"use client";

import { useRef, useEffect } from "react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: DateRangePickerProps) {
  const endRef = useRef<HTMLInputElement>(null);

  // Imperatively set min to force iOS Safari to pick it up
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    el.setAttribute("min", startDate);
  }, [startDate]);

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-400">
        Date range
      </legend>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          aria-label="Start date"
          className="flex-1 rounded-lg border-none bg-zinc-800 px-4 py-3"
          style={{ fontSize: "16px", colorScheme: "dark" }}
        />

        <span className="text-zinc-500">→</span>

        <input
          ref={endRef}
          type="date"
          key={`end-${startDate}`}
          value={endDate}
          min={startDate}
          onChange={(e) => {
            const val = e.target.value;
            // Guard against iOS allowing selection before min
            onEndChange(val < startDate ? startDate : val);
          }}
          aria-label="End date"
          className="flex-1 rounded-lg border-none bg-zinc-800 px-4 py-3"
          style={{ fontSize: "16px", colorScheme: "dark" }}
        />
      </div>
    </fieldset>
  );
}
