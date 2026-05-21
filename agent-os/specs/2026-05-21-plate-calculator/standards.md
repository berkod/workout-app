# Standards for Plate Calculator

## google-sheets/sheet-structure

Google Sheet is the sole data source. Three tabs:

### Sheet1 (workout log) — columns A:G
| Col | Field | Notes |
|-----|-------|-------|
| A | date | ISO date string |
| B | routine | e.g. "Press" |
| C | setType | "warm-up", "main", "fsl", "accessory" |
| D | exercise | lowercase canonical |
| E | targetReps | string (may include "+", e.g. "5+") |
| F | targetWeight | string ("45", "135", "BW") |
| G | actualReps | string, empty until completed |

### Config tab — columns A:G (extended from A:F)
| Col | Field |
|-----|-------|
| A | exercise (raw) |
| B | trainingMax |
| C | increment |
| D | type ("main"/"accessory"/"bodyweight") |
| E | humanReadable display name |
| F | roundTo (default 2.5) |
| G | **equipment** ("barbell"/"dumbbell"/"cable"/"machine"/"bodyweight") — NEW |

### State tab — columns A:B
Key–value rows. Currently: `current_week` → 1–4.

### Equipment tab (NEW) — columns A:B
Key–value rows:
- `bar_weight` → e.g. 45
- `dumbbell_handle_weight` → e.g. 0
- Numeric keys → plate weight:count (e.g. `45` → `4`)
