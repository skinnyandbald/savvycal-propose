# Any-Date Selection in Start/End Date Dropdowns

**Date:** 2026-07-22
**Status:** Approved

## Problem

The Raycast `propose-times` form limits Start/End date selection to a fixed suggestion list (today through ~3 weeks out). Raycast dropdowns only filter existing items, so a date like "Aug 10" (3+ weeks away) cannot be selected at all. Ben sometimes needs to propose periods 3+ weeks out.

## Design

Changes live in `packages/raycast/src/propose-times.tsx`: the suggestion list in `generateDateSuggestions()` and the type-to-filter keywords on the Start/End `Form.Dropdown.Item`s.

1. **Keep the curated suggestions unchanged:** Today/Tomorrow, weekday names for the next 5 days, Next Monday–Friday, In 2 weeks, In 3 weeks.
2. **Append every remaining day out to 90 days** from the `from` date, labeled `EEE, MMM d` (or `EEE, MMM d, yyyy` once a date crosses into the next calendar year), e.g. "Mon, Aug 10". The existing `added` set dedups so curated entries keep their friendly labels; the existing chronological sort keeps ordering correct.
3. **Type-to-filter keywords:** items already carry `"EEE, MMM d"` and `"MMM d"` keywords. Add `"yyyy-MM-dd"` and the bare day number so "aug 10", "2026-08-10", and "10" all match.
4. **End date** uses the same generator anchored at the start date, so it gets the same 90-day horizon automatically.
5. **No changes** to core, providers, or slot-search logic — the selected range already flows through; only the picker was the bottleneck.

## Trade-offs

- Dropdown grows from ~14 to ~90 items. Acceptable because type-to-filter is the primary interaction; cap can drop to 60 days if scrolling ever becomes annoying.
- Not chosen: native `Form.DatePicker` (loses quick "Next Monday" suggestions), free-text natural-language field (extra field, more parsing edge cases).

## Testing

- Run the existing test suite (`pnpm test`).
- Manual check via `ray develop`: type "aug 10" in Start Date, confirm it appears and is selectable; confirm End Date offers dates ≥ start out to 90 days.
