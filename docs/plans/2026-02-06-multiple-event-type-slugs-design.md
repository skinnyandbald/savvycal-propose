# Multiple Event Type Slugs

Support multiple event type slugs for both SavvyCal and Cal.com providers. When multiple slugs are configured, show an "Event Type" dropdown in the form above "Meeting Duration."

## Settings Changes

Both `savvycalLink` and `calcomEventSlug` preferences become comma-separated. Descriptions updated to reflect this. Default values unchanged.

## UI Changes

New `selectedSlug` state initialized to the first parsed slug. A `Form.Dropdown` with title "Event Type" renders between the separator and "Meeting Duration" only when 2+ slugs are configured. Options display the raw slug text.

## Data Flow

`getProviderConfig()` parses the comma-separated string, takes the full list, and sets the active slug to `selectedSlug`. The existing `savvycalLink` / `calcomEventSlug` fields in `ProviderConfig` hold the selected slug. When the slug changes, the link info fetch re-runs (new `useEffect` dependency), updating durations and slot data.

No changes needed to the provider API layer or booking URL generation — they already work with a single slug passed through config.
