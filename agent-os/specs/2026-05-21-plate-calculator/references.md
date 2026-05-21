# References for Plate Calculator

## SetRow — Icon button placement
- **Location:** `src/components/SetRow.tsx`
- **Relevance:** Plate icon button goes after the targetWeight EditableField
- **Key patterns:** Flex row with gap-3; existing ✓ button style for reference

## BottomNav — Action button pattern
- **Location:** `src/components/BottomNav.tsx`
- **Relevance:** Equipment sync button added as third item; already `'use client'`
- **Key patterns:** Inline SVG icons, fall color theme, flex-1 items

## WorkoutSection — Props passthrough
- **Location:** `src/components/WorkoutSection.tsx`
- **Relevance:** Passes equipment prop from SetGroup to SetRow
- **Key patterns:** group.sets.map → SetRow

## Deload modal (bottom sheet pattern)
- **Location:** `src/app/workout/[routine]/page.tsx` lines 149–172
- **Relevance:** Modal structure to reuse in PlateCalculatorModal
- **Key patterns:** `fixed inset-0 bg-black/60`, `bg-white rounded-2xl p-6`

## sheets.ts — getExerciseConfig
- **Location:** `src/lib/sheets.ts` lines 53–83
- **Relevance:** Config read pattern; extend A:F → A:G for equipment column
- **Key patterns:** Map with compound key `exercise::type`; numeric defaults pattern
