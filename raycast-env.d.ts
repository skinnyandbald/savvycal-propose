/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Calendar Provider - Which scheduling service to use */
  "provider": "savvycal" | "calcom",
  /** SavvyCal API Token - Your SavvyCal Personal Access Token (starts with pt_secret_). Required if using SavvyCal. */
  "savvycalToken"?: string,
  /** SavvyCal Link Slug - Comma-separated slugs from your SavvyCal URLs (e.g., 'chat' or 'chat, interview'). First slug is the default. Required if using SavvyCal. */
  "savvycalLink": string,
  /** SavvyCal Username - Your SavvyCal username (e.g., 'skinnyandbald'). Required if using SavvyCal. */
  "savvycalUsername"?: string,
  /** Cal.com Username - Your Cal.com username (e.g., 'skinnyandbald' from cal.com/skinnyandbald/...). Required if using Cal.com. */
  "calcomUsername"?: string,
  /** Cal.com Event Slug - Comma-separated event type slugs (e.g., 'pow-wow' or 'pow-wow, 30min'). First slug is the default. Required if using Cal.com. */
  "calcomEventSlug"?: string,
  /** Default Recipient Timezone - Default timezone for the person you're proposing times to */
  "defaultTimezone": "America/New_York" | "America/Chicago" | "America/Denver" | "America/Los_Angeles" | "UTC" | "Europe/London" | "Europe/Paris" | "Asia/Tokyo" | "Australia/Sydney",
  /** Default Days Ahead - Default number of days to look ahead for availability */
  "defaultDaysAhead": string,
  /** Max Days to Show - Maximum number of days to include in the message */
  "maxDaysToShow": string,
  /** Max Slots Per Day - Maximum number of time slots to show per day */
  "maxSlotsPerDay": string,
  /** Booker URL - URL of your booker Vercel deployment (enables one-click booking for both providers). Leave empty to link directly to the calendar provider. */
  "bookerUrl"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `propose-times` command */
  export type ProposeTimes = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `propose-times` command */
  export type ProposeTimes = {}
}

