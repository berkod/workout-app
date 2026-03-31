# Product Roadmap

## Phase 1: MVP — Core Workout Tracker

- **Routine selection screen** — choose from Day 1 (Press), Day 2 (RDL), Day 3 (Bench); show last completed date for each
- **Workout view** — load routine from Google Sheet, organized by SET TYPE and EXERCISE in collapsible sections
- **Set logging** — each row shows exercise, target weight, target reps, and an input field for actual reps; auto-save on input
- **Inline editing** — tap target weight or target reps to edit inline; saves to sheet on blur
- **Section auto-advance** — when all sets in a section are logged, collapse it and open the next
- **Complete workout button** — saves all data, fills empty actual reps with 0, writes today's date
- **Fall color scheme** — warm, autumn-inspired palette for the UI

## Phase 2: Program Configuration

- **5/3/1 program config** — settings for program variant (FSL, BBB), training maxes per lift
- **Cycle management** — number of cycles before deload, current cycle/week tracking
- **Generate Next Cycle** — auto-calculate target weights from training maxes using 5/3/1 percentages with plate rounding
- **Accessory progression** — configurable percentage changes for accessory exercises

## Phase 3: Post-Launch Enhancements

- **PR tracking** — track personal records and estimated 1RMs
- **Workout history** — browse and review past workout sessions from the sheet
- **Rest timer** — built-in timer between sets with configurable rest periods
