import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProvider,
  selectSmartSlots,
  filterSlotsByTime,
  getTimezoneAbbr,
} from "@propose/core";
import type { ProviderConfig, TimeSlot } from "@propose/core";
import { format, differenceInCalendarDays } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

interface SlotsRequestBody {
  duration: number;
  timezone: string;
  startDate: string;
  endDate: string;
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

/** Parse a yyyy-MM-dd string as a local-midnight Date */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
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
    startDate: startDateStr,
    endDate: endDateStr,
    maxDaysToShow,
    maxSlotsPerDay,
    linkSlug,
  } = body;

  // Validate date strings
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDateStr) || !dateRegex.test(endDateStr)) {
    return NextResponse.json(
      { error: "startDate and endDate must be in yyyy-MM-dd format" },
      { status: 400 },
    );
  }

  const startDate = parseLocalDate(startDateStr);
  const endDate = parseLocalDate(endDateStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date values" },
      { status: 400 },
    );
  }

  const daysAhead = differenceInCalendarDays(endDate, startDate);
  if (daysAhead < 1 || daysAhead > 60) {
    return NextResponse.json(
      { error: "Date range must be between 1 and 60 days" },
      { status: 400 },
    );
  }

  // Clamp maxDaysToShow to the available range instead of rejecting
  const effectiveMaxDays = Math.min(
    Math.max(1, Math.floor(maxDaysToShow || 3)),
    daysAhead,
  );

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
    const daysToShow = sortedDays.slice(0, effectiveMaxDays);

    // First pass: collect all selected slots across all days
    const selectedByDay = new Map<string, TimeSlot[]>();
    const allSelectedSlots: TimeSlot[] = [];
    for (const dayKey of daysToShow) {
      const daySlots = dayGroups[dayKey];
      const selected = selectSmartSlots(daySlots, timezone, maxSlotsPerDay);
      selectedByDay.set(dayKey, selected);
      allSelectedSlots.push(...selected);
    }

    // Second pass: build messages in both formats (matching Raycast output)
    const plainLines: string[] = [];
    const htmlLines: string[] = [];

    for (const dayKey of daysToShow) {
      const selected = selectedByDay.get(dayKey)!;

      const dayDate = utcToZonedTime(new Date(dayKey + "T12:00:00Z"), timezone);
      const dayLabel = format(dayDate, "EEE, MMM d");

      const plainTimes: string[] = [];
      const htmlTimes: string[] = [];

      for (const slot of selected) {
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
        plainTimes.push(time);
        htmlTimes.push(`<a href="${url}">${time}</a>`);
      }

      plainLines.push(`\u2022 ${dayLabel}: ${plainTimes.join(", ")}`);
      htmlLines.push(`\u2022 ${dayLabel}: ${htmlTimes.join(", ")}`);
    }

    const tzAbbr = getTimezoneAbbr(timezone);
    const fallbackUrl = provider.getFallbackUrl(config);
    const header = `Would any of these times work for a ${duration} min meeting (${tzAbbr})?`;
    const footer = `If none of those work, feel free to grab any open time here:\n${fallbackUrl}`;
    const noSlotsMsg = `I couldn't find available times in that range. Pick a time here: ${fallbackUrl}`;

    const plainText =
      plainLines.length > 0
        ? `${header}\n${plainLines.join("\n")}\n\n${footer}`
        : noSlotsMsg;

    // Build proper block-level HTML so inline links stay on one line
    // when pasted into rich text editors (LinkedIn, etc.)
    const html =
      htmlLines.length > 0
        ? [
            `<div>${header}</div>`,
            ...htmlLines.map((line) => `<div>${line}</div>`),
            `<div><br></div>`,
            `<div>If none of those work, feel free to grab any open time here:</div>`,
            `<div><a href="${fallbackUrl}">${fallbackUrl}</a></div>`,
          ].join("")
        : noSlotsMsg;

    return NextResponse.json({ message: plainText, html, linkInfo });
  } catch (error) {
    console.error("Slots API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch available times" },
      { status: 500 },
    );
  }
}
