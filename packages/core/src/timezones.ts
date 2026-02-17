export interface TimezoneEntry {
  title: string;
  value: string;
  abbr: string;
  keywords: string[];
}

// Ordered east to west (UTC+12 → UTC-10)
export const TIMEZONES: TimezoneEntry[] = [
  // UTC+12
  {
    title: "Auckland",
    value: "Pacific/Auckland",
    abbr: "NZST",
    keywords: ["Wellington", "New Zealand", "NZ", "NZST", "NZDT"],
  },
  // UTC+10/+11
  {
    title: "Sydney",
    value: "Australia/Sydney",
    abbr: "AEST",
    keywords: [
      "Melbourne", "Brisbane", "Canberra", "Australia",
      "AEST", "AEDT",
    ],
  },
  // UTC+9
  {
    title: "Tokyo",
    value: "Asia/Tokyo",
    abbr: "JST",
    keywords: [
      "Osaka", "Japan", "Seoul", "South Korea", "Korea",
      "JST", "KST",
    ],
  },
  // UTC+8
  {
    title: "Singapore",
    value: "Asia/Singapore",
    abbr: "SGT",
    keywords: [
      "Kuala Lumpur", "Malaysia", "Hong Kong", "Beijing",
      "Shanghai", "Taipei", "Perth", "Shenzhen",
      "China", "Taiwan", "SGT", "HKT",
    ],
  },
  // UTC+7
  {
    title: "Bangkok",
    value: "Asia/Bangkok",
    abbr: "ICT",
    keywords: [
      "Thailand", "Vietnam", "Ho Chi Minh City", "Hanoi", "Jakarta",
      "Indonesia", "ICT",
    ],
  },
  // UTC+5:30
  {
    title: "Mumbai",
    value: "Asia/Kolkata",
    abbr: "IST",
    keywords: [
      "Bombay", "Delhi", "Bangalore", "Bengaluru", "Hyderabad",
      "Chennai", "Kolkata", "Calcutta", "Pune", "India", "IST",
    ],
  },
  // UTC+4
  {
    title: "Dubai",
    value: "Asia/Dubai",
    abbr: "GST",
    keywords: [
      "Abu Dhabi", "UAE", "United Arab Emirates", "Muscat",
      "Oman", "GST", "Gulf",
    ],
  },
  // UTC+3
  {
    title: "Moscow",
    value: "Europe/Moscow",
    abbr: "MSK",
    keywords: ["Russia", "St. Petersburg", "Saint Petersburg", "MSK"],
  },
  {
    title: "Istanbul",
    value: "Europe/Istanbul",
    abbr: "TRT",
    keywords: ["Turkey", "Ankara", "TRT"],
  },
  // UTC+2/+3
  {
    title: "Tel Aviv",
    value: "Asia/Jerusalem",
    abbr: "IST",
    keywords: ["Jerusalem", "Israel", "IST", "IDT"],
  },
  {
    title: "Athens",
    value: "Europe/Athens",
    abbr: "EET",
    keywords: [
      "Helsinki", "Bucharest", "Sofia", "Kyiv", "Tallinn",
      "Riga", "Vilnius",
      "Romania", "Greece", "Finland", "Bulgaria", "Ukraine", "Estonia",
      "Latvia", "Lithuania",
      "EET", "EEST", "Eastern Europe",
    ],
  },
  {
    title: "Cairo",
    value: "Africa/Cairo",
    abbr: "EET",
    keywords: ["Egypt", "Alexandria", "EET"],
  },
  {
    title: "Johannesburg",
    value: "Africa/Johannesburg",
    abbr: "SAST",
    keywords: ["South Africa", "Cape Town", "Pretoria", "SAST", "Nairobi", "Kenya"],
  },
  // UTC+1/+2
  {
    title: "Paris",
    value: "Europe/Paris",
    abbr: "CET",
    keywords: [
      "Berlin", "Amsterdam", "Madrid", "Barcelona", "Rome",
      "Munich", "Brussels", "Vienna", "Zurich", "Milan", "Stockholm",
      "Oslo", "Copenhagen", "Prague", "Warsaw", "Budapest",
      "France", "Germany", "Netherlands", "Spain", "Italy", "Belgium",
      "Austria", "Switzerland", "Sweden", "Norway", "Denmark",
      "Poland", "Czech Republic", "Hungary",
      "CET", "CEST", "Central Europe", "Western Europe",
    ],
  },
  {
    title: "Lagos",
    value: "Africa/Lagos",
    abbr: "WAT",
    keywords: ["Nigeria", "Accra", "Ghana", "West Africa", "WAT"],
  },
  // UTC+0/+1
  {
    title: "London",
    value: "Europe/London",
    abbr: "GMT",
    keywords: [
      "Edinburgh", "Manchester", "UK", "United Kingdom",
      "England", "Scotland", "Wales", "Ireland", "Dublin", "Lisbon",
      "GMT", "BST", "Britain", "Portugal",
    ],
  },
  {
    title: "UTC",
    value: "UTC",
    abbr: "UTC",
    keywords: ["Coordinated Universal Time", "Greenwich", "Zulu"],
  },
  // UTC-3
  {
    title: "Sao Paulo",
    value: "America/Sao_Paulo",
    abbr: "BRT",
    keywords: [
      "Rio de Janeiro", "Rio", "Brazil", "Brasilia", "BRT", "BRST",
    ],
  },
  {
    title: "Buenos Aires",
    value: "America/Argentina/Buenos_Aires",
    abbr: "ART",
    keywords: ["Argentina", "ART"],
  },
  // UTC-4/-3
  {
    title: "Santiago",
    value: "America/Santiago",
    abbr: "CLT",
    keywords: ["Chile", "CLT", "CLST"],
  },
  // UTC-5/-4
  {
    title: "Bogota",
    value: "America/Bogota",
    abbr: "COT",
    keywords: [
      "Colombia", "Medellin", "Lima", "Peru", "Quito", "Ecuador", "COT",
    ],
  },
  {
    title: "New York",
    value: "America/New_York",
    abbr: "ET",
    keywords: [
      "NYC", "Boston", "Philadelphia", "Miami", "Atlanta",
      "Washington", "DC", "Charlotte", "Pittsburgh", "Detroit", "Orlando",
      "Tampa", "Raleigh", "Baltimore", "Richmond",
      "Connecticut", "Delaware", "Florida", "Georgia", "Indiana", "Kentucky",
      "Maine", "Maryland", "Massachusetts", "Michigan", "New Hampshire",
      "New Jersey", "North Carolina", "Ohio", "Pennsylvania",
      "Rhode Island", "South Carolina", "Tennessee", "Vermont", "Virginia",
      "West Virginia",
      "EST", "EDT", "Eastern",
    ],
  },
  {
    title: "Toronto",
    value: "America/Toronto",
    abbr: "ET",
    keywords: [
      "Ottawa", "Montreal", "Quebec", "Ontario", "Canada Eastern",
    ],
  },
  // UTC-6/-5
  {
    title: "Chicago",
    value: "America/Chicago",
    abbr: "CT",
    keywords: [
      "Dallas", "Houston", "Austin", "San Antonio", "Nashville",
      "Memphis", "Milwaukee", "Minneapolis", "St. Louis", "Kansas City",
      "New Orleans", "Oklahoma City", "Omaha", "Tulsa", "Des Moines",
      "Alabama", "Arkansas", "Illinois", "Iowa", "Kansas", "Louisiana",
      "Minnesota", "Mississippi", "Missouri", "Nebraska", "North Dakota",
      "Oklahoma", "South Dakota", "Texas", "Wisconsin",
      "CST", "CDT", "Central",
    ],
  },
  {
    title: "Mexico City",
    value: "America/Mexico_City",
    abbr: "CST",
    keywords: ["Mexico", "Guadalajara", "Monterrey", "CDMX"],
  },
  // UTC-7/-6
  {
    title: "Denver",
    value: "America/Denver",
    abbr: "MT",
    keywords: [
      "Salt Lake City", "Boise", "Albuquerque", "El Paso",
      "Colorado Springs", "Boulder", "Santa Fe", "Billings", "Cheyenne",
      "Colorado", "Idaho", "Montana", "New Mexico", "Utah", "Wyoming",
      "MST", "MDT", "Mountain",
    ],
  },
  {
    title: "Phoenix",
    value: "America/Phoenix",
    abbr: "MST",
    keywords: [
      "Tucson", "Scottsdale", "Mesa", "Tempe", "Flagstaff",
      "Arizona", "AZ",
    ],
  },
  // UTC-8/-7
  {
    title: "Los Angeles",
    value: "America/Los_Angeles",
    abbr: "PT",
    keywords: [
      "LA", "San Francisco", "SF", "Seattle", "Portland", "San Diego",
      "San Jose", "Sacramento", "Las Vegas", "Oakland",
      "California", "Nevada", "Oregon", "Washington",
      "PST", "PDT", "Pacific", "Silicon Valley", "Hollywood",
    ],
  },
  {
    title: "Vancouver",
    value: "America/Vancouver",
    abbr: "PT",
    keywords: [
      "British Columbia", "BC", "Canada Pacific", "Victoria", "Calgary",
    ],
  },
  // UTC-9/-8
  {
    title: "Anchorage",
    value: "America/Anchorage",
    abbr: "AKT",
    keywords: ["Alaska", "Juneau", "Fairbanks", "AKST", "AKDT"],
  },
  // UTC-10
  {
    title: "Honolulu",
    value: "Pacific/Honolulu",
    abbr: "HT",
    keywords: ["Hawaii", "Maui", "HST", "Hawaiian"],
  },
];

export function getTimezoneAbbr(timezone: string): string {
  const entry = TIMEZONES.find((tz) => tz.value === timezone);
  return entry?.abbr ?? timezone;
}

export function searchTimezones(query: string): TimezoneEntry[] {
  if (!query.trim()) return TIMEZONES;

  const q = query.toLowerCase();
  return TIMEZONES.filter(
    (tz) =>
      tz.title.toLowerCase().includes(q) ||
      tz.abbr.toLowerCase().includes(q) ||
      tz.value.toLowerCase().includes(q) ||
      tz.keywords.some((kw) => kw.toLowerCase().includes(q)),
  );
}
