"use client";

import { useState, useRef, useEffect } from "react";
import { TIMEZONES, searchTimezones } from "@/lib/config";

interface TimezonePickerProps {
  value: string;
  onChange: (tz: string) => void;
}

function formatTimeInZone(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function TimezonePicker({ value, onChange }: TimezonePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tick every minute to keep times fresh
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [open]);

  const filtered = searchTimezones(search);
  const selected = TIMEZONES.find((tz) => tz.value === value);
  // Use `now` to bust memoization on time strings
  void now;

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-400">
        Recipient timezone
      </legend>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full rounded-lg bg-zinc-800 px-4 py-3 text-left text-base text-zinc-100"
        >
          {selected
            ? `${selected.title} (${selected.abbr}) · ${formatTimeInZone(selected.value)}`
            : "Select timezone"}
        </button>

        {open && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
            <input
              type="text"
              placeholder="Search city, state, or timezone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border-b border-zinc-700 bg-transparent px-4 py-2 text-base text-zinc-100 outline-none placeholder:text-zinc-500"
              autoFocus
            />
            <ul className="max-h-60 overflow-y-auto py-1">
              {filtered.map((tz) => (
                <li key={tz.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(tz.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm active:bg-zinc-700 ${
                      tz.value === value
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-300"
                    }`}
                  >
                    <span>{tz.title} ({tz.abbr})</span>
                    <span className="text-zinc-500">{formatTimeInZone(tz.value)}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-2 text-sm text-zinc-500">
                  No timezones found
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </fieldset>
  );
}
