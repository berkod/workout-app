# Plate Calculator — Shaping Notes

## Scope

Plate calculator feature for the 531 workout tracker. For each exercise set, show which plates to load. Plate inventory is stored in a Google Sheets `Equipment` tab and synced to localStorage via a "Refresh Equipment" button in the bottom nav.

## Decisions

- **Equipment type** added as column G to the Config sheet (`barbell` | `dumbbell` | `cable` | `machine` | `bodyweight`). Defaults to `barbell` if blank.
- **Plate inventory storage**: Google Sheets `Equipment` tab as source of truth, localStorage as cache. One-way sync (sheet → device) via a manual button. No timestamp polling — user taps "Equipment" in nav after editing the sheet.
- **Barbell math**: `(targetWeight - barWeight) / 2` per side, greedy descending, symmetric pairs only.
- **Dumbbell math**: `targetWeight - handleWeight` total plates, pairs preferred, singles allowed.
- **UI**: Small plate icon button in SetRow next to target weight. Opens a bottom-sheet modal. "Refresh Equipment" button in existing BottomNav (third tab, action not navigation).
- **No plate calculator shown** for: BW exercises, cable/machine, non-numeric weights, or when equipment not yet synced.

## Context

- **Visuals:** None
- **References:** SetRow.tsx (icon button placement), BottomNav.tsx (button style), deload modal in workout page (modal pattern)
- **Product alignment:** Mobile-first UX; Google Sheet as sole data source
