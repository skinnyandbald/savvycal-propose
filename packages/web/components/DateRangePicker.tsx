"use client";

import { useRef, useEffect, useState } from "react";
import { differenceInCalendarDays, addDays, format } from "date-fns";
import { parseNaturalDate } from "@propose/core";

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
  const [naturalInput, setNaturalInput] = useState("");
  const [parseError, setParseError] = useState(false);

  // Imperatively set min to force iOS Safari to pick it up
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    el.setAttribute("min", startDate);
  }, [startDate]);

  const applyNaturalDate = () => {
    const trimmed = naturalInput.trim();
    if (!trimmed) return;

    const parsed = parseNaturalDate(trimmed);
    if (!parsed) {
      setParseError(true);
      return;
    }

    // Preserve the current range duration when jumping to a new start date
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const rangeDays = differenceInCalendarDays(
      new Date(ey, em - 1, ed),
      new Date(sy, sm - 1, sd),
    );

    onStartChange(format(parsed, "yyyy-MM-dd"));
    onEndChange(format(addDays(parsed, rangeDays), "yyyy-MM-dd"));
    setNaturalInput("");
    setParseError(false);
  };

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

      <input
        type="text"
        value={naturalInput}
        onChange={(e) => {
          setNaturalInput(e.target.value);
          setParseError(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") applyNaturalDate();
        }}
        onBlur={applyNaturalDate}
        placeholder="Jump to… next Thursday, in 2 weeks"
        aria-label="Jump to date"
        className={`mt-2 w-full rounded-lg border-none px-4 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 ${
          parseError ? "bg-red-900/40" : "bg-zinc-800"
        }`}
        style={{ fontSize: "16px" }}
      />
    </fieldset>
  );
}
