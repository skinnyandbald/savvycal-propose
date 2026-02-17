"use client";

import { useState, useEffect } from "react";
import { addDays, format, differenceInCalendarDays } from "date-fns";
import { DurationPicker } from "./DurationPicker";
import { DateRangePicker } from "./DateRangePicker";
import { TimezonePicker } from "./TimezonePicker";
import { ResultCard } from "./ResultCard";
import { loadPreferences, savePreferences } from "@/lib/config";

interface ProposalFormProps {
  linkSlugs: string[];
}

/** Today as yyyy-MM-dd in local time */
function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function ProposalForm({ linkSlugs }: ProposalFormProps) {
  const [duration, setDuration] = useState(30);
  const [timezone, setTimezone] = useState("America/New_York");
  const [startDate, setStartDate] = useState(() => todayISO());
  const [endDate, setEndDate] = useState(() =>
    format(addDays(new Date(), 5), "yyyy-MM-dd"),
  );
  const [linkSlug, setLinkSlug] = useState(linkSlugs[0] || "");
  const [durations, setDurations] = useState<number[]>([30]);
  const [message, setMessage] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved preferences on mount
  useEffect(() => {
    const prefs = loadPreferences();
    setTimezone(prefs.timezone);
    setDuration(prefs.duration);
    if (prefs.linkSlug && linkSlugs.includes(prefs.linkSlug)) {
      setLinkSlug(prefs.linkSlug);
    }
    // Compute fresh dates from saved daysAhead
    const today = new Date();
    setStartDate(format(today, "yyyy-MM-dd"));
    setEndDate(format(addDays(today, prefs.daysAhead), "yyyy-MM-dd"));
  }, [linkSlugs]);

  // Fetch link info to get available durations
  useEffect(() => {
    if (!linkSlug) return;

    async function fetchLinkInfo() {
      try {
        const res = await fetch("/api/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duration,
            timezone,
            startDate: todayISO(),
            endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
            maxDaysToShow: 1,
            maxSlotsPerDay: 1,
            linkSlug,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.linkInfo?.durations?.length) {
            setDurations(data.linkInfo.durations);
            setDuration((prev) =>
              data.linkInfo.durations.includes(prev)
                ? prev
                : data.linkInfo.durations[0],
            );
          }
        }
      } catch (e) {
        console.error("Failed to fetch link info:", e);
      }
    }

    fetchLinkInfo();
  }, [linkSlug]);

  // When start date changes, ensure end date stays after it
  const handleStartChange = (date: string) => {
    setStartDate(date);
    if (date > endDate) {
      const [y, m, d] = date.split("-").map(Number);
      setEndDate(format(addDays(new Date(y, m - 1, d), 5), "yyyy-MM-dd"));
    }
  };

  const handleSubmit = async () => {
    if (!linkSlug) {
      setError("Select a link first.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setHtml(null);

    // Save daysAhead preference (computed from selected range)
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const daysAhead = differenceInCalendarDays(
      new Date(ey, em - 1, ed),
      new Date(sy, sm - 1, sd),
    );
    savePreferences({ timezone, daysAhead, duration, linkSlug });

    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration,
          timezone,
          startDate,
          endDate,
          maxDaysToShow: 3,
          maxSlotsPerDay: 4,
          linkSlug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch times");
        return;
      }

      setMessage(data.message);
      setHtml(data.html);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {linkSlugs.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-400">Link</legend>
          <div className="flex gap-2">
            {linkSlugs.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => setLinkSlug(slug)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  slug === linkSlug
                    ? "bg-white text-zinc-900"
                    : "bg-zinc-800 text-zinc-300 active:bg-zinc-700"
                }`}
              >
                {slug}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <DurationPicker durations={durations} value={duration} onChange={setDuration} />
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartChange={handleStartChange}
        onEndChange={setEndDate}
      />
      <TimezonePicker value={timezone} onChange={setTimezone} />

      <button
        onClick={handleSubmit}
        disabled={loading || !linkSlug}
        className="rounded-lg bg-white px-6 py-3 text-base font-medium text-zinc-900 shadow-sm active:bg-zinc-100 disabled:opacity-50"
      >
        {loading ? "Finding times\u2026" : "Propose Times"}
      </button>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      {message && <ResultCard message={message} html={html ?? message} />}
    </div>
  );
}
