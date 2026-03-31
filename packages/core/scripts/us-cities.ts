export interface USCity {
  city: string;
  ianaTimezone: string;
  state: string;
  stateAbbr: string;
  extraKeywords?: string[];
}

export const US_CITIES: USCity[] = [
  // Eastern Time — America/New_York
  { city: "New York", ianaTimezone: "America/New_York", state: "New York", stateAbbr: "NY", extraKeywords: ["NYC", "New York City"] },
  { city: "Boston", ianaTimezone: "America/New_York", state: "Massachusetts", stateAbbr: "MA" },
  { city: "Philadelphia", ianaTimezone: "America/New_York", state: "Pennsylvania", stateAbbr: "PA" },
  { city: "Washington DC", ianaTimezone: "America/New_York", state: "District of Columbia", stateAbbr: "DC", extraKeywords: ["Washington", "Washington, DC", "District of Columbia"] },
  { city: "Atlanta", ianaTimezone: "America/New_York", state: "Georgia", stateAbbr: "GA" },
  { city: "Miami", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  { city: "Orlando", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  { city: "Tampa", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  { city: "Charlotte", ianaTimezone: "America/New_York", state: "North Carolina", stateAbbr: "NC" },
  { city: "Raleigh", ianaTimezone: "America/New_York", state: "North Carolina", stateAbbr: "NC" },
  { city: "Pittsburgh", ianaTimezone: "America/New_York", state: "Pennsylvania", stateAbbr: "PA" },
  { city: "Baltimore", ianaTimezone: "America/New_York", state: "Maryland", stateAbbr: "MD" },
  { city: "Cleveland", ianaTimezone: "America/New_York", state: "Ohio", stateAbbr: "OH" },
  { city: "Columbus", ianaTimezone: "America/New_York", state: "Ohio", stateAbbr: "OH" },
  { city: "Cincinnati", ianaTimezone: "America/New_York", state: "Ohio", stateAbbr: "OH" },
  { city: "Richmond", ianaTimezone: "America/New_York", state: "Virginia", stateAbbr: "VA" },
  { city: "Buffalo", ianaTimezone: "America/New_York", state: "New York", stateAbbr: "NY" },
  { city: "Jacksonville", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  // Eastern Time — America/Detroit
  { city: "Detroit", ianaTimezone: "America/Detroit", state: "Michigan", stateAbbr: "MI" },
  // Eastern Time — America/Indiana/Indianapolis
  { city: "Indianapolis", ianaTimezone: "America/Indiana/Indianapolis", state: "Indiana", stateAbbr: "IN" },
  // Eastern Time — America/Kentucky/Louisville
  { city: "Louisville", ianaTimezone: "America/Kentucky/Louisville", state: "Kentucky", stateAbbr: "KY" },
  // Central Time — America/Chicago
  { city: "Chicago", ianaTimezone: "America/Chicago", state: "Illinois", stateAbbr: "IL" },
  { city: "Dallas", ianaTimezone: "America/Chicago", state: "Texas", stateAbbr: "TX" },
  { city: "Houston", ianaTimezone: "America/Chicago", state: "Texas", stateAbbr: "TX" },
  { city: "Austin", ianaTimezone: "America/Chicago", state: "Texas", stateAbbr: "TX" },
  { city: "San Antonio", ianaTimezone: "America/Chicago", state: "Texas", stateAbbr: "TX" },
  { city: "Nashville", ianaTimezone: "America/Chicago", state: "Tennessee", stateAbbr: "TN" },
  { city: "Memphis", ianaTimezone: "America/Chicago", state: "Tennessee", stateAbbr: "TN" },
  { city: "Minneapolis", ianaTimezone: "America/Chicago", state: "Minnesota", stateAbbr: "MN" },
  { city: "Milwaukee", ianaTimezone: "America/Chicago", state: "Wisconsin", stateAbbr: "WI" },
  { city: "Kansas City", ianaTimezone: "America/Chicago", state: "Missouri", stateAbbr: "MO" },
  { city: "St. Louis", ianaTimezone: "America/Chicago", state: "Missouri", stateAbbr: "MO" },
  { city: "New Orleans", ianaTimezone: "America/Chicago", state: "Louisiana", stateAbbr: "LA" },
  { city: "Oklahoma City", ianaTimezone: "America/Chicago", state: "Oklahoma", stateAbbr: "OK" },
  { city: "Omaha", ianaTimezone: "America/Chicago", state: "Nebraska", stateAbbr: "NE" },
  { city: "Des Moines", ianaTimezone: "America/Chicago", state: "Iowa", stateAbbr: "IA" },
  { city: "Tulsa", ianaTimezone: "America/Chicago", state: "Oklahoma", stateAbbr: "OK" },
  { city: "Wichita", ianaTimezone: "America/Chicago", state: "Kansas", stateAbbr: "KS" },
  // Mountain Time — America/Denver
  { city: "Denver", ianaTimezone: "America/Denver", state: "Colorado", stateAbbr: "CO" },
  { city: "Salt Lake City", ianaTimezone: "America/Denver", state: "Utah", stateAbbr: "UT" },
  { city: "Albuquerque", ianaTimezone: "America/Denver", state: "New Mexico", stateAbbr: "NM" },
  { city: "Boise", ianaTimezone: "America/Denver", state: "Idaho", stateAbbr: "ID" },
  { city: "Colorado Springs", ianaTimezone: "America/Denver", state: "Colorado", stateAbbr: "CO" },
  { city: "Billings", ianaTimezone: "America/Denver", state: "Montana", stateAbbr: "MT" },
  // Arizona (no DST) — America/Phoenix
  { city: "Phoenix", ianaTimezone: "America/Phoenix", state: "Arizona", stateAbbr: "AZ" },
  { city: "Tucson", ianaTimezone: "America/Phoenix", state: "Arizona", stateAbbr: "AZ" },
  { city: "Scottsdale", ianaTimezone: "America/Phoenix", state: "Arizona", stateAbbr: "AZ" },
  // Pacific Time — America/Los_Angeles
  { city: "Los Angeles", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA", extraKeywords: ["LA", "Hollywood"] },
  { city: "San Francisco", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA", extraKeywords: ["SF", "Silicon Valley"] },
  { city: "Seattle", ianaTimezone: "America/Los_Angeles", state: "Washington", stateAbbr: "WA" },
  { city: "Portland", ianaTimezone: "America/Los_Angeles", state: "Oregon", stateAbbr: "OR", extraKeywords: ["Portland OR", "Portland Oregon"] },
  { city: "San Diego", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA" },
  { city: "San Jose", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA" },
  { city: "Sacramento", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA" },
  { city: "Las Vegas", ianaTimezone: "America/Los_Angeles", state: "Nevada", stateAbbr: "NV" },
  // Alaska — America/Anchorage
  { city: "Anchorage", ianaTimezone: "America/Anchorage", state: "Alaska", stateAbbr: "AK" },
  { city: "Fairbanks", ianaTimezone: "America/Anchorage", state: "Alaska", stateAbbr: "AK" },
  { city: "Juneau", ianaTimezone: "America/Anchorage", state: "Alaska", stateAbbr: "AK" },
  // Hawaii — Pacific/Honolulu
  { city: "Honolulu", ianaTimezone: "Pacific/Honolulu", state: "Hawaii", stateAbbr: "HI" },
  { city: "Kahului", ianaTimezone: "Pacific/Honolulu", state: "Hawaii", stateAbbr: "HI", extraKeywords: ["Maui"] },
];
