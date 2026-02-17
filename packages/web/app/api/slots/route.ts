import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProvider,
  selectSmartSlots,
  filterSlotsByTime,
} from "@propose/core";
import type { ProviderConfig, TimeSlot } from "@propose/core";
import { format, addDays } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

interface SlotsRequestBody {
  duration: number;
  timezone: string;
  daysAhead: number;
  maxDaysToShow: number;
  maxSlotsPerDay: number;
  linkSlug: string;
}

function groupSlotsByDay(
  slots: TimeSlot[],
  timezone: string,
): Record<string, TimeSlot[]> {
  const groups: Record<string, TimeSlot[]> = {};

  for (const slot of slots) {
    const zonedDate = utcToZonedTime(new Date(slot.start_at), timezone);
    const dayKey = format(zonedDate, "yyyy-MM-dd");
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(slot);
  }

  return groups;
}

function formatSlotTime(slot: TimeSlot, timezone: string): string {
  const zonedDate = utcToZonedTime(new Date(slot.start_at), timezone);
  return format(zonedDate, "h:mma").toLowerCase();
}

function getTimezoneAbbr(timezone: string): string {
  const ABBRS: Record<string, string> = {
    "America/New_York": "ET",
    "America/Chicago": "CT",
    "America/Denver": "MT",
    "America/Los_Angeles": "PT",
    "America/Phoenix": "AZ",
    "Pacific/Honolulu": "HT",
    "America/Anchorage": "AKT",
    "Europe/London": "GMT",
    "Europe/Paris": "CET",
    "Asia/Tokyo": "JST",
    "Australia/Sydney": "AEST",
  };
  return ABBRS[timezone] || timezone;
}

export async function POST(request: Request) {
  // Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user ||
    user.email?.toLowerCase() !== process.env.ALLOWED_EMAIL?.toLowerCase()
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SlotsRequestBody;
  try {
    body = (await request.json()) as SlotsRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const {
    duration,
    timezone,
    daysAhead,
    maxDaysToShow,
    maxSlotsPerDay,
    linkSlug,
  } = body;

  // Validate and clamp input parameters
  if (
    typeof daysAhead !== "number" ||
    daysAhead < 1 ||
    daysAhead > 30 ||
    !Number.isInteger(daysAhead)
  ) {
    return NextResponse.json(
      { error: "daysAhead must be an integer between 1 and 30" },
      { status: 400 },
    );
  }

  if (
    typeof maxDaysToShow !== "number" ||
    maxDaysToShow < 1 ||
    maxDaysToShow > daysAhead ||
    !Number.isInteger(maxDaysToShow)
  ) {
    return NextResponse.json(
      { error: `maxDaysToShow must be an integer between 1 and ${daysAhead}` },
      { status: 400 },
    );
  }

  if (
    typeof maxSlotsPerDay !== "number" ||
    maxSlotsPerDay < 1 ||
    maxSlotsPerDay > 10 ||
    !Number.isInteger(maxSlotsPerDay)
  ) {
    return NextResponse.json(
      { error: "maxSlotsPerDay must be an integer between 1 and 10" },
      { status: 400 },
    );
  }

  // Build provider config from env vars
  const config: ProviderConfig = {
    savvycalToken: process.env.SAVVYCAL_TOKEN,
    savvycalLink: linkSlug,
    savvycalUsername: process.env.SAVVYCAL_USERNAME,
  };

  const bookerUrl = process.env.BOOKER_URL;
  const provider = getProvider("savvycal");

  try {
    const startDate = new Date();
    const endDate = addDays(startDate, daysAhead);

    const { slots: rawSlots, linkInfo } = await provider.fetchSlots(
      config,
      startDate,
      endDate,
      duration,
    );

    // Filter out evening slots in recipient timezone
    const filteredSlots = filterSlotsByTime(rawSlots, timezone);

    // Group by day and select smart slots per day
    const dayGroups = groupSlotsByDay(filteredSlots, timezone);
    const sortedDays = Object.keys(dayGroups).sort();
    const daysToShow = sortedDays.slice(0, maxDaysToShow);

    // First pass: collect all selected slots across all days
    const allSelectedSlots: TimeSlot[] = [];
    for (const dayKey of daysToShow) {
      const daySlots = dayGroups[dayKey];
      const selected = selectSmartSlots(daySlots, timezone, maxSlotsPerDay);
      allSelectedSlots.push(...selected);
    }

    // Second pass: build day messages with complete allSelectedSlots array
    const dayMessages: string[] = [];

    for (const dayKey of daysToShow) {
      const daySlots = dayGroups[dayKey];
      const selected = selectSmartSlots(daySlots, timezone, maxSlotsPerDay);

      const dayDate = utcToZonedTime(new Date(dayKey + "T12:00:00Z"), timezone);
      const dayLabel = format(dayDate, "EEEE M/d");

      const slotLines = selected.map((slot) => {
        const time = formatSlotTime(slot, timezone);
        const url = provider.generateBookingUrl(
          config,
          linkInfo,
          slot,
          timezone,
          bookerUrl,
          duration,
          allSelectedSlots,
        );
        return `  \u2022 ${time} \u2014 ${url}`;
      });

      dayMessages.push(`${dayLabel}\n${slotLines.join("\n")}`);

    }

    const tzAbbr = getTimezoneAbbr(timezone);
    const message =
      dayMessages.length > 0
        ? `Here are some times that work (${tzAbbr}):\n\n${dayMessages.join("\n\n")}\n\nOr pick another time: ${provider.getFallbackUrl(config)}`
        : `I couldn't find available times in the next ${daysAhead} days. Pick a time here: ${provider.getFallbackUrl(config)}`;

    return NextResponse.json({ message, linkInfo });
  } catch (error) {
    console.error("Slots API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch available times" },
      { status: 500 },
    );
  }
}
