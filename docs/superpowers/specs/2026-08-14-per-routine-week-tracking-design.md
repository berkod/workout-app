# Per-Routine Week Tracking Design

**Date:** 2026-08-14  
**Status:** Approved

## Problem

The global `currentWeek` counter in State advances after every completed workout regardless of routine. With 4 routines, by the time Squat is done, the week has already advanced 3 times — so each routine lands on a semi-random week in the wave. This causes:
- Incorrect main lift percentages (e.g., Squat stuck at 130 lbs for weeks)
- Accessory weight increments that compound every session instead of once per week
- Skipping or reordering routines breaks the entire wave progression

## Solution

Each routine independently tracks its own week and cycle via a new `Sessions` Google Sheet tab. Week and cycle are derived per-routine from session history, not from shared global state.

---

## 1. Sessions Sheet

**Tab name:** `Sessions`  
**Columns:** `Date | Routine | Week | Cycle`  
**One row per completed workout session.**

The tab already exists and has been seeded with week=2, cycle=1 for all routines (so the first workout after implementation starts at week 3, cycle 1).

### New types

```typescript
export interface SessionEntry {
  date: string    // ISO date, e.g. '2026-08-14'
  routine: string
  week: number    // 1–4
  cycle: number   // 1+
}
```

### New functions in `sheets.ts`

- `getSessions(): Promise<SessionEntry[]>` — reads Sessions tab; returns `[]` gracefully if tab missing
- `appendSession(entry: SessionEntry): Promise<void>` — appends one row

---

## 2. Per-Routine Week/Cycle Derivation

Week is no longer read from global State for workout generation. Instead:

```
lastSession = most recent session for this routine (by date)
if no lastSession:
  → week 1, cycle 1
elif lastSession.week < waveLength:
  → week lastSession.week + 1, cycle lastSession.cycle
else:  # lastSession.week === waveLength
  → week 1, cycle lastSession.cycle + 1
```

Where `waveLength` = `state.cyclesBeforeIncrease` (3 or 4).

This logic lives in a helper `deriveNextWeekCycle(sessions, routine, waveLength)` in `progression.ts`.

---

## 3. Wave Length Semantics

`cyclesBeforeIncrease` now means **weeks per wave** (not cycles before TM bump):
- `3` → 3-week wave: weeks 1 → 2 → 3 → TM bump → week 1 (no deload)
- `4` → 4-week wave: weeks 1 → 2 → 3 → 4 (deload) → TM bump → week 1

TM now bumps **every cycle**, not after N cycles. This matches standard 5/3/1.

### Settings UI label change
- Section label: "Progression" → unchanged
- Description: "Cycles before TM increase" → "Weeks per cycle"
- Buttons: "3 cycles" / "4 cycles" → "3 weeks" / "4 weeks"

---

## 4. Deload Is Just Week 4

When `waveLength = 4`, week 4 workouts are generated automatically using `WEEK_SPEC[4]` (already has deload percentages). No modal, no prompt — the heading shows "Week 4 · Cycle N" and the user completes it normally.

**Removed:** deload prompt modal from workout page, `advance-week` API route.

---

## 5. Per-Routine TM Increment

When completing a session at week = waveLength:
- Identify main exercises for this routine from Sheet1 historical rows (`setType === 'main'`)
- Increment each one's TM by its `increment` value in Config

Accessory TM updates are **removed** from the complete route entirely — accessory progression is handled by history-based +5/week in `generateWorkoutRows`.

---

## 6. Accessory Per-Week Increment

`generateWorkoutRows` gains two new parameters:
- `sessions: SessionEntry[]` — all session history for this routine
- `currentCycle: number` — the cycle number of the workout being generated

For each accessory exercise, find the most recent session where `(cycle, week) < (currentCycle, currentWeek)` — the previous wave week. Look up that session's date in `allHistoricalRows` to get the previous `targetWeight`, then add 5.

Falls back to `config.trainingMax` if no prior-week session exists.

---

## 7. WorkoutData Type

```typescript
export interface WorkoutData {
  routine: string
  groups: SetGroup[]
  isPreview: boolean
  week: number    // NEW
  cycle: number   // NEW
}
```

Both GET (preview) and POST (start) include week and cycle in the response.

---

## 8. Workout Page UI

Below the routine name heading, render:

```
Week {week} · Cycle {cycle}
```

Small muted subtitle, shown in both preview and active modes.

---

## 9. History Page

Filter bodyweight exercises in the history API:

```typescript
if (!config || config.type === 'bodyweight') continue
```

BW exercises no longer appear on the Progress page.

---

## 10. Deprecated / Removed

| Item | Action |
|------|--------|
| `currentWeek` in State | No longer written; reads during transition return old value but are ignored |
| `currentCycle` in State | Same — deprecated, not removed from sheet |
| Deload prompt modal | Removed from workout page |
| `advance-week` API route | Deleted |
| Accessory TM update in complete route | Removed |

---

## Migration Notes

- Sessions tab seeded with week=2, cycle=1 for all routines on 2026-08-14
- First workout after implementation → week 3, cycle 1 for all routines
- Existing Sheet1 history is used as-is for accessory weight lookups
- Seed migration files deleted after use
