# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Expo SDK version notice

This project targets **Expo SDK 57**, which changed significantly from prior versions. Read the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code that touches Expo APIs, config, or routing.

## What this app is

A hair-regrowth treatment tracker: log daily AM/PM doses, keep an angle-matched photo timeline, and see consistency stats — jargon-free, non-punishing tone (never guilt-inducing copy, streaks freeze rather than reset during a pause). **v1 is fully local-first — no backend, no auth.** All data lives on-device in SQLite; a sync/auth layer may be layered on later, which is why local IDs are UUIDs shaped like they'd already work as remote primary keys.

## Commands

```bash
npm install            # install dependencies
npm run start           # start the Expo dev server (expo start)
npm run ios             # start dev server and open iOS simulator
npm run android          # start dev server and open Android emulator
npm run web             # start dev server for web (see Known limitation below)
npm run lint            # expo lint (ESLint via eslint-config-expo)
npm test                # jest (jest-expo preset)
npx tsc --noEmit         # type-check the project
npm run db:generate      # regenerate src/db/migrations/ after editing src/db/schema.ts
npm run reset-project     # moves current app/ to app-example/ and creates a blank app/ (irreversible without git)
```

`expo-env.d.ts`, `.expo/`, and the typed-routes declarations (`.expo/types/router.d.ts`) are generated on first `expo start` and are gitignored — if `tsc` complains about missing `expo/types` or an unrecognized route string passed to `router.push`/`href`, run `npx expo start` once (even briefly, Ctrl-C after it says "Waiting on...") to regenerate them.

**No data-changing schema migration has ever shipped yet** — the single migration in `src/db/migrations/` has never reached a real user, so when the schema changes, delete `src/db/migrations/` and run `npm run db:generate` fresh rather than adding a second migration. Once this ships, switch to always adding a new migration instead.

## Architecture

### Routing & onboarding gate
- Entry point is `expo-router/entry`; routes live under `src/app/` (not the default `app/`).
- `src/app/_layout.tsx` is the only place that runs DB migrations (`useMigrations` from `drizzle-orm/expo-sqlite/migrator`) and sets up `QueryClientProvider` + `ThemeProvider`. It renders a bare `Stack` with two groups: `(onboarding)` and `(tabs)`.
- `src/app/index.tsx` is the gate: it queries whether a `profiles` row exists and `<Redirect>`s to `/(onboarding)/welcome` or `/(tabs)`. It also runs the missed-dose reconciliation pass (see below) once per cold start before hiding the splash screen.
- Onboarding is a fixed linear flow under `src/app/(onboarding)/`: `welcome → profile → treatment-select [→ treatment-custom] → reminder-times → baseline-photos`. Draft state across these screens (name, age, chosen drugs, reminder times) lives in a Zustand store (`src/features/onboarding/draft-store.ts`) and is only persisted to SQLite on the final "Finish" tap in `baseline-photos.tsx` — that one screen creates the profile, the first treatment period, app settings, and schedules notifications, then routes to `/(tabs)`.
- Path aliases (`tsconfig.json`): `@/*` → `src/*`, `@/assets/*` → `assets/*`.

### Local data layer
- `src/db/schema.ts` is the drizzle-orm SQLite schema — source of truth for the data model. Edit it, then `npm run db:generate` to produce a new migration in `src/db/migrations/`.
- `src/db/client.ts` opens the SQLite DB (`expo-sqlite`) and wraps it with drizzle. It's constructed at module scope — fine on native, but see the web limitation below.
- Core tables: `profiles` (single row), `treatmentPeriods`, `treatmentPeriodDrugs` (a period can bundle multiple drugs, e.g. Dut+Min+Fin), `treatmentPausePeriods` (a period can be paused/resumed multiple times — each cycle is its own row so the future Timeline screen can render every pause as a distinct segment), `doseLogs` (one row per AM/PM slot per day, unique on `(treatmentPeriodId, date, slot)`), `photos`, `appSettings`.

### Dose tracking domain logic
This is the part of the app most worth understanding before touching it — it's pure, unit-tested, and everything else (Home screen, Consistency/streak stats, notification scheduling) is built on top of it.
- `src/features/dose-log/doseState.ts` — pure functions, no I/O: `getRequiredSlots` (which AM/PM slots were actually required on a date, given treatment period history + pause windows), `resolveDayStatus` (rolls a day's slots into `no-treatment | in-progress | complete | incomplete`), `computeEffectiveState` (a stale unresolved `pending` row from a past day reads as `missed` **without needing a background job** — see reconciliation below), `computeRepromptTime` (the "No" response 6-hour reprompt, dropped if it would land outside 10:00–24:00 or cross midnight).
- `src/features/consistency/streak.ts` — `computeCurrentStreak`, `computeBestStreak`, `computeMonthRatio`, `computeSlotBreakdown`, all built on `resolveDayStatus`. Key behavior: a paused/no-treatment day is skipped (neutral), not treated as a break — pausing freezes the streak instead of punishing it. An in-progress "today" doesn't zero out yesterday's streak.
- `src/features/dose-log/doseState.test.ts` and `src/features/consistency/streak.test.ts` cover the non-obvious edge cases (pause freezing, in-progress-today, the reprompt window). Run these first after touching either file.
- `src/features/dose-log/api.ts` is the SQLite-backed layer: `logDose` (Taken/Skipped — locks immediately), `recordDoseNoResponse` (stays unlocked so it can still resolve to Taken), `reconcileMissedDoses(fromDate)` — walks forward from a date and persists `missed` for any unresolved slot before today. This runs once per app launch from `src/app/index.tsx` instead of a server-side cron, since there's no backend.
- `src/features/consistency/hooks.ts`'s `useConsistencyStats` builds one `DayStatusResolver` from all dose logs/periods/pauses and feeds it to every `streak.ts` function at once (current streak, best streak, month ratio, AM/PM breakdown) plus a day-status map for the calendar heatmap — backs `src/app/consistency.tsx`, pushed from a tap on Home's streak badge.
- `src/features/timeline/build-timeline.ts` is a pure merge-and-sort of treatment-period starts, pause/resume events, and photo-capture dates into one feed (unit tested) — backs `src/app/timeline.tsx`, pushed from the Routine tab.

### Notifications
- `src/lib/notifications.ts` schedules local daily AM/PM reminders (`expo-notifications`, no push server) for whichever slots the active treatment requires, tagged with a `dose-response` notification category carrying Yes/No/Skip action buttons. Called from onboarding's finish step and Start New Treatment's confirm step; re-call `rescheduleDailyReminders` whenever the regimen changes.
- `src/features/dose-log/notification-responder.tsx` (`<DoseNotificationResponder />`, mounted once in the root layout) handles the action button taps: Yes/Skip call `logDose` and lock immediately; No calls `recordDoseNoResponse` and, if `computeRepromptTime` returns a time, schedules a one-off reprompt (`scheduleReprompt`) that reuses the same category. A body tap (not a button) is a no-op — it just opens the app.

### Screens/features not yet built
`Photos`, `Learn`, and `Me` tabs are intentionally stubbed with `src/components/coming-soon-screen.tsx` — not half-implemented, just not started (Me is where notification-preference editing and PDF export will eventually live). Everything else in the PRD's v1 scope — Home, Routine (including Start New Treatment and pause/resume), Timeline, and Consistency — is built.

### Theming & UI primitives
- `Colors`, `Fonts`, `Spacing`, `BottomTabInset`, `MaxContentWidth` live in `src/constants/theme.ts` — use these tokens instead of hardcoding values in `StyleSheet.create`. Dose-state colors (`taken`, `missed` — the latter used for both Skipped and Missed, since the PRD treats them identically in the UI) are also there.
- `useTheme()` (`src/hooks/use-theme.ts`) returns the resolved `Colors[light|dark]` object. `ThemedText`/`ThemedView` (`src/components/`) read from it so screens shouldn't need manual light/dark branching.
- `src/components/app-tabs.tsx` is a **single** cross-platform tab bar (`expo-router/ui` + `expo-symbols` for icons) — unlike the original starter template, there's no separate `.web.tsx` variant; `expo-router/ui`'s `Tabs`/`TabList`/`TabTrigger`/`TabSlot` work on both native and web.
- No styling library (no NativeWind/Tamagui/Unistyles) — plain `StyleSheet.create` plus the theme tokens.

### Known limitation: web + expo-sqlite
`expo-sqlite`'s web backend runs SQLite compiled to WASM inside a Worker, synchronized with the main thread via `SharedArrayBuffer`/`Atomics` — this requires cross-origin isolation (COOP/COEP headers, set in `metro.config.js`) and is fragile in headless/sandboxed browser environments. If `npm run web` throws `Sync operation timeout` from `src/db/client.ts`, that's this — it has not been reproduced as a real device/browser issue, only in a sandboxed headless-Chromium test session. Native (iOS/Android) doesn't hit this at all since it uses the real native SQLite binding, which is the actual target platform. Don't sink time re-debugging this without first checking if it reproduces in an actual browser.
