# Design: Disabled Routines, Cycle Counter & Settings Page

**Date:** 2026-05-27
**Status:** Approved

## Problem

When a routine is skipped due to injury, two things break:

1. The skipped routine's training max (TM) still gets bumped at cycle end, even though it was never performed.
2. There is no way to prevent the routine from appearing on the home screen.

Additionally, TMs currently bump after every single 3-week cycle. The correct behavior is to bump TMs only after completing N cycles (3 or 4, user-configurable), which is the standard 5/3/1 multi-cycle progression model.

## How the Week Counter Works

Rows are generated lazily per routine when a routine is opened. The global `current_week` at generation time determines which percentage-based weights are used. Completing any routine advances the week counter. With 3 completions the counter goes 1→2→3→deload prompt, regardless of how many routines exist. Removing a routine from the active set does not change this cadence — it just means TMs bump more frequently relative to actual training.

## Data Model Changes

### `WorkoutState` type (src/lib/types.ts)

```typescript
export interface WorkoutState {
  currentWeek: number        // 1–4
  currentCycle: number       // 1 to cyclesBeforeIncrease
  cyclesBeforeIncrease: number  // 3 or 4
  disabledRoutines: string[] // routine names stored as disabled in State sheet
}
```

### State Sheet (Google Sheets — State tab)

New rows added alongside existing `current_week`:

| Key | Value |
|-----|-------|
| `current_week` | `1` (existing) |
| `current_cycle` | `1` (new) |
| `cycles_before_increase` | `3` (new) |
| `disabled:Day 2 - RDL` | `1` (new, one row per disabled routine) |

- Disabled routines use key pattern `disabled:<routine name>` with value `1` (disabled) or `0` (re-enabled).
- `getWorkoutState()` scans for all keys starting with `disabled:` with value `1` to populate `disabledRoutines`.

## Backend Changes

### `src/lib/sheets.ts`

- **`getWorkoutState()`** — parse `current_cycle`, `cycles_before_increase`, and all `disabled:*` keys from the State tab. Return updated `WorkoutState`.
- **`updateWorkoutState(week, cycle?)`** — extend to also write `current_cycle` when provided.
- **`setCyclesBeforeIncrease(n: 3 | 4)`** — write `cycles_before_increase` to State tab.
- **`setRoutineDisabled(routine: string, disabled: boolean)`** — find or append a `disabled:<routine>` row in the State tab and set value to `1` or `0`.

### `src/lib/progression.ts`

New helper:

```typescript
export function getExercisesToSkip(
  rows: SheetRow[],
  disabledRoutines: string[]
): Set<string>
```

Builds a set of exercise names (lowercase) that appear **only** in disabled routines. Exercises that appear in at least one active routine are not skipped. This handles the case where an exercise might theoretically appear in multiple routines.

### `src/app/api/complete/route.ts`

Updated week-3 logic:

```
if currentWeek === 3:
  if currentCycle < cyclesBeforeIncrease:
    reset week to 1, increment cycle — no deload prompt
  else:
    show deload prompt (cycle is at its limit)

if currentWeek === 4 (deload completed):
  bump TMs for non-skipped main exercises
  reset week to 1, reset cycle to 1
```

TM increments use `getExercisesToSkip()` to exclude exercises that belong only to disabled routines.

### `src/app/api/advance-week/route.ts`

Updated skip-deload path:

- Load `disabledRoutines` and all historical rows
- Use `getExercisesToSkip()` to exclude disabled exercises from TM increments
- Reset both `currentWeek` to 1 and `currentCycle` to 1 after bumping TMs

### `src/app/api/routines/route.ts`

- Load `disabledRoutines` from `getWorkoutState()`
- Filter out disabled routines before returning the list to the home screen

### `src/app/api/settings/route.ts` (new)

**GET** — returns:
```json
{
  "allRoutines": [{ "name": "...", "lastCompleted": "..." }],
  "disabledRoutines": ["Day 2 - RDL"],
  "cyclesBeforeIncrease": 3
}
```
`allRoutines` is unfiltered (includes disabled ones, for the toggle list).

**PATCH** — accepts one of:
```json
{ "routine": "Day 2 - RDL", "disabled": true }
{ "cyclesBeforeIncrease": 4 }
```

## UI Changes

### `src/app/settings/page.tsx` (new)

Three sections:

1. **Routines** — list of all routines with enabled/disabled toggle. Disabled routines are visually greyed out. A note under each disabled routine: "Training max frozen — update in sheet to resume progression."
2. **Progression** — "Cycles before TM increase" selector: `3` or `4`. Tappable chips.
3. **Equipment** — "Sync Equipment from Sheet" button (same behavior as the current BottomNav button).

Toggling a routine calls `PATCH /api/settings` and updates local state immediately (optimistic update).

### `src/components/BottomNav.tsx`

- Remove the Equipment sync button and its `syncState` logic entirely.
- Add a third tab: Settings, linking to `/settings`, with a gear icon.
- Nav becomes: Workouts | History | Settings.

### `src/lib/equipment.ts`

No changes — equipment sync logic stays as-is, called from the settings page instead of BottomNav.

## Re-enabling a Disabled Routine

When a routine is re-enabled:
- Its `disabled:<name>` State row is set to `0`
- It reappears on the home screen immediately
- Its TM is whatever it was when it was disabled (frozen). The user updates it manually in the Config sheet if needed.
- No automatic catch-up or recalculation.

## What Is Not Changing

- The lazy row-generation model (rows generated per routine on first open)
- The deload week (week 4) mechanic — it remains the only path between week 3 and TM bump, just gated behind the cycle counter now
- The equipment API route (`/api/equipment`) — unchanged
- The Config sheet structure — unchanged
- History page — unchanged

## Testing Scope

- `getExercisesToSkip` — unit tests for the boundary case (exercise in both disabled and active routine should not be skipped)
- `getWorkoutState` — unit test parsing of `disabled:*` keys
- `complete` route integration — verify TM is not bumped for a disabled routine's exercise; verify cycle increments correctly across N cycles; verify deload prompt only fires on cycle N
- Settings page — toggle disabled/enabled round-trip; cycle selector persists
