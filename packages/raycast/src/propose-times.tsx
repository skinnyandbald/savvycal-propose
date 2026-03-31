import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
  Form,
} from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { formatInTimeZone, utcToZonedTime } from "date-fns-tz";
import type { ProviderType, ProviderConfig, TimeSlot, LinkInfo } from "@propose/core";
import { getProvider, selectSmartSlots, filterSlotsByDuration, filterSlotsByTime, TIMEZONES, getTimezoneAbbr, parseNaturalDate } from "@propose/core";

interface Preferences {
  provider: ProviderType;
  // SavvyCal
  savvycalToken?: string;
  savvycalLink?: string;
  savvycalUsername?: string;
  // Cal.com
  calcomUsername?: string;
  calcomEventSlug?: string;
  // Common
  defaultTimezone: string;
  defaultDaysAhead: string;
  maxDaysToShow: string;
  maxSlotsPerDay: string;
  bookerUrl?: string;
}


function parseSlugs(raw: string | undefined): string[] {
  if (!raw) return [];
  const slugs = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(slugs)];
}

function getProviderConfig(
  preferences: Preferences,
  providerType: ProviderType,
  selectedSlug?: string,
): ProviderConfig {
  const savvycalSlugs = parseSlugs(preferences.savvycalLink);
  const calcomSlugs = parseSlugs(preferences.calcomEventSlug);

  return {
    savvycalToken: preferences.savvycalToken,
    savvycalLink:
      providerType === "savvycal"
        ? selectedSlug || savvycalSlugs[0]
        : undefined,
    savvycalUsername: preferences.savvycalUsername,
    calcomUsername: preferences.calcomUsername,
    calcomEventSlug:
      providerType === "calcom" ? selectedSlug || calcomSlugs[0] : undefined,
  };
}

function groupSlotsByDay(
  slots: TimeSlot[],
  timezone: string,
): Map<string, TimeSlot[]> {
  const grouped = new Map<string, TimeSlot[]>();

  for (const slot of slots) {
    if (!slot.start_at) continue;
    const slotDate = new Date(slot.start_at);
    if (isNaN(slotDate.getTime())) continue;

    const zonedDate = utcToZonedTime(slotDate, timezone);
    const dayKey = format(zonedDate, "yyyy-MM-dd");

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    grouped.get(dayKey)!.push(slot);
  }

  return grouped;
}

function formatSlotTime(slot: TimeSlot, timezone: string): string {
  return formatInTimeZone(
    new Date(slot.start_at),
    timezone,
    "h:mma",
  ).toLowerCase();
}

function generateMessage(
  slots: TimeSlot[],
  timezone: string,
  clickableSlots: boolean,
  providerType: ProviderType,
  config: ProviderConfig,
  linkInfo: LinkInfo,
  duration: number,
  maxDays: number,
  maxSlotsPerDay: number,
  bookerUrl?: string,
): string {
  const provider = getProvider(providerType);
  const tzAbbr = getTimezoneAbbr(timezone);
  const groupedSlots = groupSlotsByDay(slots, timezone);

  const lines: string[] = [
    `Would any of these times work for a ${duration} min meeting (${tzAbbr})?`,
  ];

  // Limit to configured number of days with availability
  const sortedDays = Array.from(groupedSlots.keys()).sort().slice(0, maxDays);

  for (const dayKey of sortedDays) {
    const daySlots = groupedSlots.get(dayKey)!;
    const zonedDate = utcToZonedTime(new Date(daySlots[0].start_at), timezone);
    const dayLabel = format(zonedDate, "EEE, MMM d");

    // Select slots to DISPLAY in the message
    // - Prioritizes slots adjacent to meetings (inferred from gaps)
    // - Ensures at least one slot from a different time bucket for diversity
    const displaySlots = selectSmartSlots(daySlots, timezone, maxSlotsPerDay);

    const slotStrings = displaySlots.map((slot) => {
      const timeStr = formatSlotTime(slot, timezone);
      if (clickableSlots) {
        // Pass all displayed slots for this day to enable dropdown in booker
        // This lets recipient choose any of the suggested times, not just the clicked one
        const link = provider.generateBookingUrl(
          config,
          linkInfo,
          slot,
          timezone,
          bookerUrl,
          duration,
          displaySlots,
        );
        return `<a href="${link}">${timeStr}</a>`;
      }
      return timeStr;
    });

    lines.push(`• ${dayLabel}: ${slotStrings.join(", ")}`);
  }

  lines.push("");
  lines.push(`If none of those work, feel free to grab any open time here:`);
  lines.push(provider.getFallbackUrl(config));

  return lines.join("\n");
}

interface DateSuggestion {
  id: string;
  label: string;
  date: Date;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function generateDateSuggestions(from: Date, selected?: Date | null, actualToday?: Date): DateSuggestion[] {
  const fmt = (d: Date) => format(d, "EEE, MMM d");
  const added = new Set<string>();
  const suggestions: DateSuggestion[] = [];
  const reference = actualToday ?? from;

  const relativeLabel = (date: Date): string => {
    const diff = differenceInCalendarDays(date, reference);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return DAY_NAMES[date.getDay()];
  };

  const add = (id: string, label: string, date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    if (added.has(key)) return;
    added.add(key);
    suggestions.push({ id, label: `${label}  ·  ${fmt(date)}`, date });
  };

  add("from", relativeLabel(from), from);
  add("from+1", relativeLabel(addDays(from, 1)), addDays(from, 1));

  // Next 5 days: show as plain weekday name ("Thursday")
  for (let offset = 2; offset <= 6; offset++) {
    const d = addDays(from, offset);
    add(`offset-${offset}`, DAY_NAMES[d.getDay()], d);
  }

  // Next week: "Next Monday" … "Next Friday"
  for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]) {
    const d = parseNaturalDate(`next ${day.toLowerCase()}`, from);
    if (d) add(`next-${day.toLowerCase()}`, `Next ${day}`, d);
  }

  // Two and three weeks out
  add("in-2-weeks", "In 2 weeks", addDays(from, 14));
  add("in-3-weeks", "In 3 weeks", addDays(from, 21));

  // If the currently selected date isn't already listed, add it
  if (selected) {
    const key = format(selected, "yyyy-MM-dd");
    if (!added.has(key)) {
      suggestions.push({ id: "current", label: fmt(selected), date: selected });
    }
  }

  // Keep the list in chronological order regardless of insertion order
  suggestions.sort((a, b) => a.date.getTime() - b.date.getTime());

  return suggestions;
}

function dateToVal(d: Date | null): string {
  return d ? format(d, "yyyy-MM-dd") : "";
}

function valToDate(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Normalize date for comparison (strip time component)
function normalizeDate(d: Date): Date {
  const normalized = new Date(d);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function formatTimeInZone(tzValue: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tzValue,
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// TIMEZONES is static — split once at module load to avoid per-render filtering.
const US_TZS = TIMEZONES.filter((tz) => tz.group === "US");
const WORLD_TZS = TIMEZONES.filter((tz) => tz.group === "World");

// Raycast requires unique values per item. We use "group:title" as the item value
// and resolve back to the IANA zone on selection.
function resolveTimezone(itemValue: string): string {
  const entry = TIMEZONES.find((tz) => `${tz.group}:${tz.title}` === itemValue);
  return entry?.value ?? itemValue;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const defaultDays = parseInt(preferences.defaultDaysAhead) || 10;
  const providerType = preferences.provider || "savvycal";
  const provider = getProvider(providerType);

  // Parse slugs for the active provider
  const allSlugs = useMemo(
    () =>
      providerType === "savvycal"
        ? parseSlugs(preferences.savvycalLink)
        : parseSlugs(preferences.calcomEventSlug),
    [providerType, preferences.savvycalLink, preferences.calcomEventSlug],
  );
  const hasMultipleSlugs = allSlugs.length > 1;

  const [selectedSlug, setSelectedSlug] = useState<string>(allSlugs[0] || "");
  const isInitialMount = useRef(true);

  // Reset selected slug when provider or slug preferences change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSelectedSlug(allSlugs[0] || "");
  }, [allSlugs]);

  const config = getProviderConfig(preferences, providerType, selectedSlug);

  // Fresh dates on every render
  const today = normalizeDate(new Date());
  const defaultEnd = addDays(today, defaultDays);

  const [startDate, setStartDate] = useState<Date | null>(today);
  const [endDate, setEndDate] = useState<Date | null>(defaultEnd);
  const [timezone, setTimezone] = useState(preferences.defaultTimezone);
  const [clickableSlots, setClickableSlots] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [durations, setDurations] = useState<number[]>([25, 30, 45, 60]);
  const [selectedDuration, setSelectedDuration] = useState<string>("25");
  const [, setLinkInfo] = useState<LinkInfo | null>(null);

  const startSuggestions = useMemo(() => generateDateSuggestions(today, startDate), [today, startDate]);
  const endSuggestions = useMemo(() => generateDateSuggestions(startDate ?? today, endDate, today), [startDate, today, endDate]);

  // Fetch link info to get available durations
  useEffect(() => {
    const currentProvider = getProvider(providerType);
    const currentConfig = getProviderConfig(
      preferences,
      providerType,
      selectedSlug,
    );
    const fetchDate = normalizeDate(new Date());

    const loadLinkInfo = async () => {
      try {
        const result = await currentProvider.fetchSlots(
          currentConfig,
          fetchDate,
          addDays(fetchDate, 1),
        );
        setLinkInfo(result.linkInfo);
        setDurations(result.linkInfo.durations);
        const defaultDur = result.linkInfo.durations.includes(25)
          ? 25
          : result.linkInfo.defaultDuration;
        setSelectedDuration(defaultDur.toString());
      } catch (error) {
        console.error("Failed to load link durations:", error);
      }
    };
    loadLinkInfo();
  }, [providerType, selectedSlug]);

  // Reset to fresh dates on mount
  useEffect(() => {
    const freshToday = normalizeDate(new Date());
    setStartDate(freshToday);
    setEndDate(addDays(freshToday, defaultDays));
  }, []);

  const handleSubmit = async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);

    try {
      const duration = parseInt(selectedDuration);
      if (isNaN(duration) || duration <= 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid duration",
          message: "Please select a valid meeting duration",
        });
        setIsLoading(false);
        return;
      }
      const result = await provider.fetchSlots(
        config,
        startDate,
        endDate,
        duration,
      );

      // Guard: ensure every slot can fit the full meeting duration,
      // regardless of what the provider already filtered.
      const durationFiltered = filterSlotsByDuration(result.slots, duration);

      // Remove slots starting at or after 7pm in the recipient's timezone.
      const validSlots = filterSlotsByTime(durationFiltered, timezone);

      if (validSlots.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No available slots",
          message: `No ${duration}-minute slots found before 7pm in the selected date range`,
        });
        setIsLoading(false);
        return;
      }

      const parsedMaxDays = parseInt(preferences.maxDaysToShow);
      const maxDays =
        !isNaN(parsedMaxDays) && parsedMaxDays > 0 ? parsedMaxDays : 3;
      const parsedMaxSlots = parseInt(preferences.maxSlotsPerDay);
      const maxSlotsPerDay =
        !isNaN(parsedMaxSlots) && parsedMaxSlots > 0 ? parsedMaxSlots : 3;

      const htmlMessage = generateMessage(
        validSlots,
        timezone,
        clickableSlots,
        providerType,
        config,
        result.linkInfo,
        duration,
        maxDays,
        maxSlotsPerDay,
        preferences.bookerUrl,
      );

      // Also generate plain text version (strip HTML tags)
      const plainTextMessage = generateMessage(
        validSlots,
        timezone,
        false, // No clickable slots for plain text
        providerType,
        config,
        result.linkInfo,
        duration,
        maxDays,
        maxSlotsPerDay,
        preferences.bookerUrl,
      );

      // Copy as rich text (HTML) with plain text fallback
      await Clipboard.copy({
        text: plainTextMessage,
        html: htmlMessage.replace(/\n/g, "<br>").replace(/• /g, "• "),
      });
      await showHUD("✓ Meeting times copied to clipboard!");
    } catch (error) {
      console.error("Error fetching slots:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch availability",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dateRangeText =
    startDate && endDate
      ? `${format(startDate, "EEE, MMM d")} → ${format(endDate, "EEE, MMM d, yyyy")}`
      : "Select dates";

  // Map the stored IANA zone back to the composite item value for the controlled dropdown.
  // If multiple cities share the zone, the first one in TIMEZONES is used.
  const firstMatch = TIMEZONES.find((tz) => tz.value === timezone);
  const timezoneItemValue = firstMatch
    ? `${firstMatch.group}:${firstMatch.title}`
    : timezone;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate & Copy Message"
            icon={Icon.Clipboard}
            onSubmit={handleSubmit}
          />
          <Action
            title="Copy Calendar Link"
            icon={Icon.Link}
            onAction={async () => {
              const link = provider.getFallbackUrl(config);
              await Clipboard.copy(link);
              await showHUD("✓ Calendar link copied!");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Propose Times" text={dateRangeText} />

      <Form.Dropdown
        id="startDate"
        title="Start Date"
        value={dateToVal(startDate)}
        onChange={(v) => {
          const d = valToDate(v);
          setStartDate(d);
          // Auto-advance end date if it's now before start
          if (d && endDate && endDate < d) {
            setEndDate(addDays(d, 5));
          }
        }}
      >
        {startSuggestions.map((s) => (
          <Form.Dropdown.Item
            key={s.id}
            value={format(s.date, "yyyy-MM-dd")}
            title={s.label}
            keywords={[format(s.date, "EEE, MMM d"), format(s.date, "MMM d"), s.label.split("  ·  ")[0]]}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="endDate"
        title="End Date"
        value={dateToVal(endDate)}
        onChange={(v) => setEndDate(valToDate(v))}
      >
        {endSuggestions.map((s) => (
          <Form.Dropdown.Item
            key={s.id}
            value={format(s.date, "yyyy-MM-dd")}
            title={s.label}
            keywords={[format(s.date, "EEE, MMM d"), format(s.date, "MMM d"), s.label.split("  ·  ")[0]]}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {hasMultipleSlugs && (
        <Form.Dropdown
          id="eventType"
          title="Event Type"
          value={selectedSlug}
          onChange={setSelectedSlug}
        >
          {allSlugs.map((slug) => (
            <Form.Dropdown.Item key={slug} value={slug} title={slug} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Dropdown
        id="duration"
        title="Meeting Duration"
        value={selectedDuration}
        onChange={setSelectedDuration}
      >
        {durations.map((d) => (
          <Form.Dropdown.Item
            key={d}
            value={d.toString()}
            title={`${d} minutes`}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="timezone"
        title="Recipient's Timezone"
        value={timezoneItemValue}
        onChange={(val) => setTimezone(resolveTimezone(val))}
      >
        <Form.Dropdown.Section title="United States">
          {US_TZS.map((tz) => (
            <Form.Dropdown.Item
              key={`${tz.group}-${tz.value}-${tz.title}`}
              value={`${tz.group}:${tz.title}`}
              title={`${tz.title}  ·  ${formatTimeInZone(tz.value)}`}
              keywords={[tz.title, tz.abbr, tz.badge, ...tz.keywords]}
            />
          ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="World">
          {WORLD_TZS.map((tz) => (
            <Form.Dropdown.Item
              key={`${tz.group}-${tz.value}-${tz.title}`}
              value={`${tz.group}:${tz.title}`}
              title={`${tz.title}  ·  ${formatTimeInZone(tz.value)}`}
              keywords={[tz.title, tz.abbr, tz.badge, ...tz.keywords]}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.Checkbox
        id="clickableSlots"
        label="Clickable time slots"
        value={clickableSlots}
        onChange={setClickableSlots}
        info="Each time slot becomes a link to book that specific time"
      />
    </Form>
  );
}
