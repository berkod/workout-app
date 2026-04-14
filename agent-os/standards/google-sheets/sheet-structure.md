---
name: Google Sheet Structure
description: Column layout for Sheet1, Config, and State tabs; rowIndex convention
type: standard
---

# Google Sheet Structure

Google Sheet is the sole data source. Three tabs:

## Sheet1 (workout log) — columns A:G
| Col | Field | Notes |
|-----|-------|-------|
| A | date | ISO date string |
| B | routine | e.g. "Press" |
| C | setType | "warm-up", "main", "fsl", "accessory" |
| D | exercise | lowercase canonical |
| E | targetReps | string (may include "+", e.g. "5+") |
| F | targetWeight | string ("45", "135", "BW") |
| G | actualReps | string, empty until completed |

- `rowIndex` in `SheetRow` = 1-based Google Sheets row (header = row 1, first data = row 2)
- Use `rowIndex` directly in range strings: `Sheet1!E${rowIndex}`

## Config tab — columns A:F
| Col | Field |
|-----|-------|
| A | exercise (raw, used as key after `.toLowerCase()`) |
| B | trainingMax |
| C | increment |
| D | type ("main"/"accessory"/"bodyweight") |
| E | humanReadable display name |
| F | roundTo (default 2.5) |

## State tab — columns A:B
Key–value rows. Currently: `current_week` → 1–4.

These layouts may grow — add new columns to the right, new key–value rows to State.
