# Learning: SavvyCal API slots endpoint only returned 1 day of availability for multi-day date ranges

**Date:** Tuesday, February 17, 2026

**Time:** 3:47:54 PM

---

## 🎭 The Full Story

### The Problem We Encountered

SavvyCal API slots endpoint only returned 1 day of availability for multi-day date ranges

### What We Initially Thought

We thought that We thought the API had a limited forward-scan window (~7 days), or that the ISO timestamp format was causing truncation, or that pagination was involved

This led us to believe the system worked in a certain way, and we approached the problem with these assumptions.

### What We Discovered Was Actually True

What we realized was that The API end-date parameter is called 'until', not 'to'. Using 'to' was silently ignored, causing the API to default to a ~7 day forward window. The 422 error body revealed the correct parameter: {"errors":{"until":["must be before the from time"]}}

This was different from our initial understanding and required us to rethink our approach.

### The Journey: Troubleshooting Steps We Took

1. Added diagnostic logging to see raw API response (bare array, no pagination metadata). 2. Tried plain YYYY-MM-DD dates instead of ISO timestamps (422 error). 3. Tried midnight UTC timestamps (same 1-day result). 4. Implemented per-day sequential fetching (revealed 422 errors for future dates). 5. Logged the 422 error body which contained the key clue: the parameter name is 'until' not 'to'.

These steps helped us uncover the real issue and guided us toward the solution.

### The Solution That Worked

Changed the slots API URL from '&to=...' to '&until=...' in packages/core/src/providers/savvycal.ts. Single parameter name fix.

This solution addressed the actual problem rather than what we initially thought was wrong.

---

## 🎯 The Lesson Learned

**So now we know:** Always log error response bodies during debugging — the 55-byte 422 body contained the entire answer. Also: SavvyCal API docs are incomplete; the slots endpoint uses 'from' and 'until' (not 'to'), returns all duration variants as a bare array, and silently ignores unknown parameters rather than erroring.

This changes how we approach similar problems in the future because we understand the underlying mechanism better.

---

## 📋 Quick Reference

**Before:** We thought We thought the API had a limited forward-scan window (~7 days), or that the ISO timestamp format was...

**After:** We know The API end-date parameter is called 'until', not 'to'. Using 'to' was silently ignored, causing the...

**Action:** Always log error response bodies during debugging — the 55-byte 422 body contained the entire answer. Also: SavvyCal API docs are incomplete; the slots endpoint uses 'from' and 'until' (not 'to'), returns all duration variants as a bare array, and silently ignores unknown parameters rather than erroring.

---

## 🔧 Technical Details

### Commands/Tools That Helped
- Document specific commands that were useful
- Note any MCP servers or tools that aided in debugging
- Include any error messages that were key indicators

### Related Files/Configurations
- List any files that were modified
- Note configuration changes made
- Document any dependencies involved

### Future Applications
This learning applies to:
- Similar error patterns involving these components
- Related debugging scenarios in this area
- Comparable system behaviors we might encounter

---

*This narrative learning was captured to help us remember not just the solution, but the entire problem-solving journey and the thinking that led us to the answer.*
