# Product Mission

## Problem

Tracking 5/3/1 weightlifting workouts is tedious when done manually in a spreadsheet. Navigating a Google Sheet on mobile during a workout is clunky — it's hard to find the right cells, enter data quickly between sets, and maintain focus on training. There's no streamlined mobile-first interface that uses an existing Google Sheet as the source of truth.

## Target Users

Single user (the developer) — a weightlifter running the 5/3/1 program who already tracks workouts in a Google Sheet and wants a faster, mobile-optimized way to log sets during training sessions.

## Solution

A mobile-first web app that reads and writes directly to an existing Google Sheet. It provides a purpose-built workout interface with collapsible sections by set type, inline editing, and auto-save — turning the spreadsheet into a real training tool without abandoning it as the data source.

Key differentiators:
- **Google Sheet as the database** — no migration, no new system to learn, data stays accessible in the sheet
- **Hybrid target weight generation** — can auto-calculate 5/3/1 percentages but the user always reviews and approves before saving
- **Configurable program settings** — supports FSL, BBB, cycle/deload scheduling, plate rounding, and accessory percentage progression
- **Mobile-first UX** — collapsible set sections, tap-to-edit fields, auto-advance between sections
