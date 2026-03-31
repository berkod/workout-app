# 531 Workout Tracker

## Project Context

Mobile-first web app for tracking 5/3/1 weightlifting workouts. Google Sheet is the sole data source.

See `agent-os/product/` for mission, roadmap, and tech stack docs.

## Implementation Plan

The active implementation plan is at `docs/superpowers/plans/2026-03-30-531-mvp-workout-tracker.md`. Follow it task-by-task using the `superpowers:subagent-driven-development` or `superpowers:executing-plans` skill.

## Tech Stack

- Next.js 16 (App Router), React, Tailwind CSS v4
- Google Sheets API via `googleapis` npm package
- Vitest + React Testing Library
- Node.js v24

## Key Conventions

- TDD: write failing tests first, then implement
- Use Context7 MCP to fetch current docs for Next.js, googleapis, Vitest before writing code
- Mobile-first: all UI should be optimized for phone use
- Fall color theme defined in `src/app/globals.css` via `@theme` block
- Google credentials are in `.env.local` (never commit this)
