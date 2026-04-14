---
name: Exercise Key Lookup
description: Compound key pattern for exerciseConfigs map; common lookup mistakes
type: standard
---

# Exercise Key Lookup

`exerciseConfigs` (Map from `getExerciseConfig()`) uses compound keys.

## Key format
```
`${exercise.toLowerCase()}::${type}`
```
where `type` is `"main"` or `"accessory"` (`"bodyweight"` maps to `"accessory"`).

## Lookup pattern
```ts
const key = exercise.toLowerCase()
const config =
  exerciseConfigs.get(`${key}::${isAccessory ? 'accessory' : 'main'}`) ??
  exerciseConfigs.get(key)  // plain-name fallback for single-role exercises
```

## Common mistakes
- **Wrong case** — always `.toLowerCase()` before lookup; raw names from the sheet or UI are mixed-case
- **Name-only lookup** — exercises like deadlift appear as both main and accessory; skip the `::type` suffix and you get whichever was last written (non-deterministic)
- **bodyweight as type** — bodyweight exercises are keyed as `::accessory`, not `::bodyweight`
