"use client";

import { useState, useRef, useEffect } from "react";
import { TIMEZONES, searchTimezones } from "@/lib/config";
import type { TimezoneEntry } from "@/lib/config";

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
  const [now, setNow] = useState<number | null>(null);
  // Track the exact clicked entry so only one row highlights
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
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

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const filtered = searchTimezones(search);
  const usFiltered = filtered.filter((tz) => tz.group === "US");
  const worldFiltered = filtered.filter((tz) => tz.group === "World");

  // Find selected entry for trigger label: prefer selectedKey match, else first IANA match
  const selected: TimezoneEntry | undefined =
    selectedKey
      ? TIMEZONES.find(
          (tz) => `${tz.group}-${tz.value}-${tz.title}` === selectedKey,
        )
      : TIMEZONES.find((tz) => tz.value === value);

  const mounted = now !== null;

  function handleSelect(tz: TimezoneEntry) {
    setSelectedKey(`${tz.group}-${tz.value}-${tz.title}`);
    onChange(tz.value);
    setOpen(false);
    setSearch("");
  }

  function isHighlighted(tz: TimezoneEntry): boolean {
    if (selectedKey) {
      return `${tz.group}-${tz.value}-${tz.title}` === selectedKey;
    }
    // Fallback: highlight first entry with matching IANA zone (externally set value)
    return tz.value === value;
  }

  function renderEntry(tz: TimezoneEntry) {
    const highlighted = isHighlighted(tz);
    return (
      <li key={`${tz.group}-${tz.value}-${tz.title}`}>
        <button
          type="button"
          onClick={() => handleSelect(tz)}
          className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm active:bg-zinc-700 ${
            highlighted ? "bg-zinc-800 text-white" : "text-zinc-300"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>{tz.title}</span>
            <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {tz.badge}
            </span>
          </span>
          {mounted && (
            <span className="text-zinc-500 text-xs tabular-nums">
              {formatTimeInZone(tz.value)}
            </span>
          )}
        </button>
      </li>
    );
  }

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
            ? mounted
              ? `${selected.abbr} · ${formatTimeInZone(selected.value)}`
              : selected.abbr
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
            <ul className="max-h-72 overflow-y-auto py-1">
              {usFiltered.length > 0 && (
                <>
                  <li className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    United States
                  </li>
                  {usFiltered.map(renderEntry)}
                </>
              )}
              {worldFiltered.length > 0 && (
                <>
                  <li className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    World
                  </li>
                  {worldFiltered.map(renderEntry)}
                </>
              )}
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
