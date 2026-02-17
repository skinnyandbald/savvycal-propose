"use client";

import { useState, useEffect } from "react";
import { DurationPicker } from "./DurationPicker";
import { DaysStepper } from "./DaysStepper";
import { TimezonePicker } from "./TimezonePicker";
import { ResultCard } from "./ResultCard";
import { loadPreferences, savePreferences } from "@/lib/config";

interface ProposalFormProps {
  linkSlugs: string[];
}

export function ProposalForm({ linkSlugs }: ProposalFormProps) {
  const [duration, setDuration] = useState(30);
  const [timezone, setTimezone] = useState("America/New_York");
  const [daysAhead, setDaysAhead] = useState(5);
  const [linkSlug, setLinkSlug] = useState(linkSlugs[0] || "");
  const [durations, setDurations] = useState<number[]>([30]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved preferences on mount
  useEffect(() => {
    const prefs = loadPreferences();
    setTimezone(prefs.timezone);
    setDaysAhead(prefs.daysAhead);
    setDuration(prefs.duration);
    if (prefs.linkSlug && linkSlugs.includes(prefs.linkSlug)) {
      setLinkSlug(prefs.linkSlug);
    }
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
            daysAhead: 1,
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
        // Non-critical — durations stay at default
      }
    }

    fetchLinkInfo();
  }, [linkSlug]);

  const handleSubmit = async () => {
    if (!linkSlug) {
      setError("Select a link first.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    // Save preferences
    savePreferences({ timezone, daysAhead, duration, linkSlug });

    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration,
          timezone,
          daysAhead,
          maxDaysToShow: 3,
          maxSlotsPerDay: 4,
          linkSlug,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch times");
      }

      const data = await res.json();
      setMessage(data.message);
    } catch (e) {
      console.error("Failed to fetch slots:", e);
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
      <DaysStepper value={daysAhead} onChange={setDaysAhead} />
      <TimezonePicker value={timezone} onChange={setTimezone} />

      <button
        onClick={handleSubmit}
        disabled={loading || !linkSlug}
        className="rounded-lg bg-white px-6 py-3 text-base font-medium text-zinc-900 shadow-sm active:bg-zinc-100 disabled:opacity-50"
      >
        {loading ? "Finding times\u2026" : "Propose Times"}
      </button>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      {message && <ResultCard message={message} />}
    </div>
  );
}
