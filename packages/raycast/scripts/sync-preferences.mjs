/**
 * Syncs the defaultTimezone preference options in package.json from
 * packages/core/src/timezones-data.json so there's a single source of truth.
 *
 * Runs automatically via the predev and prebuild npm scripts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const timezonesPath = resolve(__dirname, "../../core/src/timezones-data.json");
const pkgPath = resolve(__dirname, "../package.json");

const timezones = JSON.parse(readFileSync(timezonesPath, "utf8"));
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const pref = pkg.preferences.find((p) => p.name === "defaultTimezone");
pref.data = timezones.map((tz) => ({
  title: `${tz.title} (${tz.abbr})`,
  value: tz.value,
}));

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`✓ Synced ${timezones.length} timezones to package.json`);
