---
name: Exercise Naming
description: Canonical vs. display name for exercises; which to use where
type: standard
---

# Exercise Naming

Exercise names have two forms:

| Form | Field | Source | Used for |
|------|-------|--------|---------|
| Canonical | `exercise` | Lowercase in sheet (Sheet1 col D, Config col A) | Map keys, comparisons, storage |
| Display | `humanReadable` / `displayName` | Config col E | UI labels only |

## Rules
- Always compare/store exercise names in lowercase
- Never use `humanReadable`/`displayName` as a map key or in sheet writes
- `SetGroup.exercise` is lowercase canonical; `SetGroup.displayName` is for rendering only
- When reading from the sheet, values in col D are already lowercase — do not re-transform unless normalizing user input
