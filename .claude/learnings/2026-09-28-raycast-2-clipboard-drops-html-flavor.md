# Learning: Raycast 2's Clipboard.copy({ html }) silently drops the HTML flavor on macOS

**Date:** Monday, September 28, 2026

---

## 🎭 The Full Story

### The Problem We Encountered

"Generate & Copy Message" in the Raycast extension stopped producing clickable times. Pasting into email gave plain-text times with no booking links, even with "Clickable time slots" checked.

### What We Initially Thought

That the paste target was choosing the plain-text flavor, or that the same-day SavvyCal link config change (adding `anytime-secret-workdays`) was involved.

### What We Discovered Was Actually True

The extension still called `Clipboard.copy({ text, html })` with correct `<a>` links, but on Raycast 2.5.1 the clipboard held **only** plain text: no `«class HTML»` at all. The extension code hadn't changed, so Raycast 2 is silently dropping the HTML part of the copy. Neither the call nor anything else throws, so the success HUD still appears. The same symptom is reported for Windows in raycast/extensions#31348.

### The Journey: Troubleshooting Steps We Took

1. Checked the installed bundle (`~/.config/raycast/extensions/propose-times/propose-times.js`). It still passed `html` to `Clipboard.copy`.
2. Right after a copy, ran `osascript -e 'clipboard info'`. It showed only `utf8`/`ut16`, no `HTML`. That ruled out the paste target.
3. Wrote HTML directly to `NSPasteboard` via JXA. The `HTML` flavor stuck, which proved a native write works.

### The Solution That Worked

`packages/raycast/src/copyRichText.ts` writes `public.html` and `public.utf8-plain-text` to `NSPasteboard` via `/usr/bin/osascript -l JavaScript`:
- The payload is JSON over stdin, which avoids argv's ~1MB `E2BIG` limit.
- The script checks that each `setStringForType` succeeded.
- The call has a 3s timeout.
- If the native write fails, it falls back to Raycast's `Clipboard.copy` and returns `false`. `propose-times.tsx` then shows a warning HUD instead of the success HUD.

Shipped in #45.

---

## 🎯 The Lesson Learned

**So now we know:** don't trust Raycast's `Clipboard.copy({ html })` on Raycast 2. When rich text "doesn't paste", inspect the clipboard flavors before blaming the target app. Pasting into Claude/chat always gives plain text, so it's not a valid test.

---

## 📋 Quick Reference

**Check what's on the clipboard:**
```bash
osascript -e 'clipboard info'
```

**Decode the HTML flavor:**
```bash
osascript -e 'the clipboard as «class HTML»' | python3 -c "import sys,binascii,re; m=re.search(r'«data HTML([0-9A-F]+)»',sys.stdin.read()); print(binascii.unhexlify(m.group(1)).decode() if m else 'NO HTML')"
```

**Related files:** `packages/raycast/src/copyRichText.ts` and `packages/raycast/src/propose-times.tsx`

**If Raycast fixes it upstream:** `copyRichText` can go back to plain `Clipboard.copy`. Re-verify with `clipboard info` first.
