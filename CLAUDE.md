# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Expo SDK version notice

This project targets **Expo SDK 57**, which changed significantly from prior versions. Read the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code that touches Expo APIs, config, or routing.

## What this app is

A hair-regrowth treatment tracker: log each thing you take or do on its own schedule, keep an angle-matched photo timeline, and see consistency stats — jargon-free, non-punishing tone (never guilt-inducing copy, streaks freeze rather than reset during a pause). **v1 is fully local-first — no backend, no auth.** All data lives on-device in SQLite; a sync/auth layer may be layered on later, which is why local IDs are UUIDs shaped like they'd already work as remote primary keys.

`knowledge/` holds research that informs product decisions (the seeded treatment catalog, Learn content, milestone copy). It is **not** read at runtime — content there gets distilled into code by hand. See its README before adding to it.

## Commands

```bash
npm install            # install dependencies
npm run start           # start the Expo dev server (expo start)
npm run ios             # start dev server and open iOS simulator
npm run android          # start dev server and open Android emulator
npm run web             # start dev server for web (broken — see Known limitation below)
npm run lint            # expo lint (ESLint via eslint-config-expo)
npm test                # jest (jest-expo preset)
npm test -- streak      # run one suite by filename substring
npx tsc --noEmit         # type-check the project
npm run db:generate      # regenerate src/db/migrations/ after editing src/db/schema.ts
npm run reset-project     # moves current app/ to app-example/ and creates a blank app/ (irreversible without git)
```

**To test the app as a first-time user**, don't delete the database file — use the `__DEV__`-only "Reset all app data" action at the bottom of the Me tab. `features/dev/reset-data.ts`'s `resetAllData()` clears DB rows child-to-parent, deletes the photo *files* under `Paths.document/progress-photos/`, and cancels every scheduled OS notification; the caller then clears the React Query cache before `router.replace('/')` — without that, the gate re-reads a cached profile and lands back on the tabs instead of onboarding. The `__DEV__` guard keeps it out of production builds.

`expo-env.d.ts`, `.expo/`, and the typed-routes declarations (`.expo/types/router.d.ts`) are generated on first `expo start` and are gitignored — **adding a new route file requires regenerating them before `tsc` will accept the route string** in `router.push`/`href`/`<Link>`. Run `npx expo start` once (Ctrl-C after "Waiting on...") to regenerate. Check this first if `tsc` rejects a route you just added; it trips people up constantly here.

### ⚠️ Schema changes: the rule changes completely at launch

**Right now (pre-release, no real users):** when `src/db/schema.ts` changes, delete `src/db/migrations/`, run `npm run db:generate`, and **bump the versioned filename** in `src/db/client.ts` (`hairlifecycle-v3.db` → `-v4`). A regenerated `0000` collides with an older database already on a test device; bumping the name sidesteps it with no manual "clear app data" step. The cost is that **every tester loses all their data** — that's an accepted trade only because the only data is disposable test data.

**The moment a real user installs this, both of those become destructive and must stop.** From then on:
- **Never delete or edit a migration that has shipped.** Add a new one (`0001`, `0002`, …). Drizzle tracks which have been applied; rewriting history makes an installed app either re-run DDL against existing tables or skip changes entirely.
- **Never change the database filename again.** It is not a version marker — it's the address of the user's data. Pointing at a new name silently abandons their entire history: every logged dose, every progress photo, months of tracking, with no error and no way back from inside the app.
- Adding a constraint to a table that already has violating rows will fail the migration on the user's device. Migrate the data first (dedupe/backfill in the same migration), then add the constraint.

Because a reset is currently free, it's the right moment to add any constraint that's been deferred — after launch, each one costs a data migration.

**Invariants currently enforced at the schema level** (rather than only in code, so no future code path can bypass them):
- `dose_logs_item_date_time` — one log per item per time per day.
- `photos_date_angle` — one photo per angle per day; a set is exactly one day's four angles, so a re-shoot is a replacement (`savePhoto` handles that; a blind insert now throws).
- `routines_single_active` — a *partial* unique index on `end_date WHERE end_date IS NULL`, so at most one routine can be open. `getActiveRoutine` assumes this; the index makes it true rather than merely intended.

## Architecture

### The routine model (read this first)

Everything downstream depends on this shape. A **routine** is a bundle of **routine items**, each carrying its own schedule — there are no fixed AM/PM slots anywhere in the model. That's what makes "Minoxidil twice daily + Finasteride each morning + an LLLT cap on Mon/Wed/Fri" expressible in one routine.

- `routines` — start/end date, `active | paused | ended`. Starting a new routine *ends* the previous one rather than editing it, so history stays intact (PRD §5.5).
- `routineItems` — `type` (`oral | topical | device`), name, optional dosage, `daysOfWeek` (JSON `number[]`, 0 = Sunday), `times` (JSON `string[]` of `'HH:MM'`). More than one time means the item is done multiple times per scheduled day, each logged independently.
- `doseLogs` — one row per **(item, date, time)**, unique on that triple. This is why "took the morning Minoxidil, skipped the evening one" and "took Finasteride but not Minoxidil" are both representable; a generic per-slot log couldn't express either.
- `routinePausePeriods` — a routine can be paused/resumed repeatedly, each cycle its own row, so the Timeline can render every pause as a distinct segment.
- `photos` — each linked to the `routineId` active when captured. That link, not a date-range recomputation, is what the compare screen uses to flag "treatment changed in between".
- `appSettings` — single row: `photoReminderIntervalDays`, `notificationsEnabled`, `lastPhotoSetDate`. Reminder **times** deliberately don't live here; they come from each item's own schedule.

### Routing & onboarding gate
- Entry point is `expo-router/entry`; routes live under `src/app/` (not the default `app/`). Path aliases (`tsconfig.json`): `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- `src/app/_layout.tsx` is the only place that runs DB migrations (`useMigrations` from `drizzle-orm/expo-sqlite/migrator`) and sets up `QueryClientProvider` + `ThemeProvider`. It renders a **bare** `<Stack screenOptions={{ headerShown: false }} />` — no `<Stack.Screen>` children.
- **Never add `<Stack.Screen name="..." options={{...}}>` children to the root `<Stack>`.** This previously hung the entire app on boot on a real Android device via Expo Go (SDK 57) — root-caused with trace logging: the root layout, migrations, and `DoseNotificationResponder` all rendered fine, but React Navigation never invoked the initial route's component at all (no crash, no error; the JS thread stayed responsive to native events like the dev-menu shake the whole time). Declaring ~10 explicit children (mixing route groups and deeply-nested leaf routes) triggered it; a bare `<Stack />` booted correctly. Presumed to be inside expo-router's/React Navigation's native-stack screen registration for that Expo Go build, not our code — but the fix must stay: **every screen sets its own header via an inline `<Stack.Screen options={{...}} />` in its own return**. If you're tempted to consolidate header options back into the root layout for tidiness, don't — test on-device first if you do.
- `src/app/index.tsx` is the gate: it checks whether a `profiles` row exists and `<Redirect>`s to `/(onboarding)/welcome` or `/(tabs)`. It also runs the missed-dose reconciliation pass once per cold start before hiding the splash screen.
- Onboarding is linear: `welcome → profile → routine → baseline-photos`. Profile answers live in `features/onboarding/draft-store.ts`; the routine being built lives in the shared `features/routine/draft-store.ts`. Nothing is persisted until the final "Finish" tap in `baseline-photos.tsx`, which creates the profile, the first routine, app settings, and schedules notifications in one go.
- **Onboarding and "Start new routine" build the same thing** via the shared `RoutineBuilder` component — they differ only in header copy and what the footer action does on save. `routine/new.tsx` seeds the draft from the current routine's items, since switching usually means tweaking an existing stack.
- Two traps in that shared builder, both of which shipped as real bugs:
  - **Seeding must never clobber a draft the user has already touched.** `routine/new.tsx` seeds asynchronously, so a plain `draft.reset(items)` on query-resolve wiped anything added while the query was in flight. It's guarded by `useRoutineDraft.getState().items.length > 0`, with the reset done explicitly on flow entry instead.
  - **Catalog defaults apply on every matching keystroke**, not only when a suggestion chip is tapped — typing a catalog name in full hides the chips, so a tap-only path silently skipped the defaults. A `scheduleTouched` ref keeps re-application from overwriting a schedule the user edited by hand.

### Dose tracking domain logic
The part most worth understanding before touching anything — pure, unit-tested, and everything else (Home, Consistency, notifications, export) is built on it.

- `features/dose-log/doseState.ts` — pure, no I/O. `getScheduledDoses` (everything actually due on a date, given routine history + pause windows + each item's days/times; empty on a day nothing is scheduled), `resolveDayProgress` (rolls a day into `{status, taken, total}` — `total` is what drives Home's "2 of 5 done"), `resolveDayStatus` (status only), `computeEffectiveState` (a stale unresolved `pending` row from a past day reads as `missed` **without needing a background job**), `computeRepromptTime` (the "No" 6-hour reprompt, dropped if it would land outside 10:00–24:00 or cross midnight), `findRoutineForDate`, `dayOfWeek`.
- **Routine date ranges are half-open: `[startDate, endDate)`.** `startRoutine` ends the outgoing routine by setting its `endDate` to the incoming one's `startDate`, so both name the switch day. Treating `endDate` as inclusive made both match it and the outgoing one win (it sorts first by `startDate`) — the visible symptom was that a newly started routine did nothing at all on the day it began. Any new date-range matching must follow the same convention.
- `features/consistency/streak.ts` — `computeCurrentStreak`, `computeBestStreak`, `computeRangeRatio`/`computeMonthRatio`, `computeItemConsistency` (per-item "LLLT: 3 of 3 this week"), `computeRecentDays` (Home's 7-day strip). Key behavior: a paused/no-treatment day is **skipped**, not treated as a break — pausing freezes the streak rather than punishing it, and an in-progress "today" doesn't zero out yesterday's.
- `features/dose-log/api.ts` — SQLite-backed: `logDose` (Taken/Skipped, locks immediately), `recordDoseNoResponse` (stays unlocked so it can still resolve to Taken), `reconcileMissedDoses(fromDate)` which walks forward and persists `missed` for anything unresolved before today. Runs once per launch from `src/app/index.tsx` instead of a server cron, since there's no backend.
- `features/consistency/hooks.ts`'s `loadConsistencyContext` builds a `dayStatus` resolver, `scheduledFor`, `effectiveStateFor`, and the earliest routine start from all logs/routines/pauses — the shared foundation for `useWeeklyProgress` (Home), `useConsistencyStats` (the Consistency screen), and the export PDF summary. Reuse it rather than re-querying if you need day-status data outside a component. `useWeeklyProgress` is deliberately separate so Home doesn't compute the month heatmap and per-item breakdown it never shows.
- **`loadDosingContext`/`loadConsistencyContext` return items from *every* routine ever created, not just the active one.** Anything presenting a per-item list must filter by the routine it means — `useConsistencyStats` does this via `findRoutineForDate(ctx.routines, ctx.currentDate)`. Without it, items from ended routines linger forever showing "nothing due", and a duplicate of every item appears each time the routine changes. The pure `getScheduledDoses` already filters internally; only the presentation layers have to do it themselves.
- The Consistency heatmap doubles as the PRD §4.2 "corrections" affordance: tapping a day opens `DayDetailCard`, listing every dose scheduled that day and letting a Missed one be marked Taken retroactively via the same `useLogDose` mutation Home uses. It resolves the routine for that date via `findRoutineForDate`/`getRoutineForDate` rather than assuming the active one, since a past date can fall under a routine that has since ended.
- `features/timeline/build-timeline.ts` — pure merge-and-sort of routine starts, pause/resume events, and photo dates. Labels each routine from its **live item list**, so a renamed or edited routine never shows a stale name.

### The bug that cost a day: bounded loops
`computeCurrentStreak` walks *backwards* day by day from today. Dates before the first routine resolve to `no-treatment`, and the loop **skips** those (so a pause doesn't break a streak) rather than stopping — so it only ever terminated on an `incomplete` day. For anyone without one (e.g. someone who logged every dose as taken), it walked into the infinite past: verified reaching **the year 1479** before a guard tripped.

A synchronous infinite loop inside a React Query `queryFn` pegs the JS thread, so it presented as a **totally black, completely unresponsive app** — no error, no red screen, nothing in Metro beyond the last successful render, unaffected by cache clears or a full phone restart. It looked exactly like a native mounting failure, and roughly a day was lost bisecting navigation code before the real cause was found. Every unit test passed the whole time, because every fixture happened to include an `incomplete` day.

Lessons that apply to anything added here:
- **Any backwards/unbounded walk over dates needs an explicit lower bound.** `computeCurrentStreak` takes `earliestDate` as a *required* third argument precisely so the compiler forces every call site to supply one — don't make it optional. `computeRecentDays` is bounded by construction.
- When the app freezes with clean JS logs, **suspect a synchronous loop in whatever runs right after the last log**, not the renderer.
- Fixture-based tests only prove the cases you thought of. `streak.test.ts`'s `computeCurrentStreak termination` block covers the "no `incomplete` day anywhere" shapes specifically — keep those.

### Notifications
- **`expo-notifications` must never be statically imported.** On Android inside Expo Go, importing it throws at module-evaluation time (a push-token auto-registration side effect in its entry file — unrelated to whether push is used; this app only schedules local notifications), which crashes the whole bundle before any of our code runs. `lib/notifications-safe.ts`'s `getNotificationsModule()` loads it lazily via `require()`, guarded by `isRunningInExpoGo() && Platform.OS === 'android'`, returning `null` there so callers no-op. Every function in `notifications.ts` and `notification-responder.tsx` goes through it — do the same for anything new (`const Notifications = getNotificationsModule(); if (!Notifications) return;`). Only affects Expo Go; a real dev/production build is unaffected.
- `lib/notifications.ts` derives reminders from each item's own schedule and **batches by (weekday, time)** — two items due at 8am send one "2 items due" prompt, not two competing pushes. `buildBatchedReminders` is pure and tested, including the JS-0-indexed → expo-1-indexed weekday conversion. Call `rescheduleRoutineReminders` whenever the routine changes.
- `features/dose-log/notification-responder.tsx` (mounted once in the root layout) handles the Yes/No/Skip action buttons. Because reminders are batched, one answer applies to **every item in that batch**. A body tap (not a button) is a no-op.
- `schedulePhotoReminder`/`cancelPhotoReminder` handle the separate "every 15 days" photo prompt — a one-off `DATE` trigger, rescheduled forward by `recordPhotoSetCompleted`. Home's banner (`isPhotoReminderDue`) is the in-app half, deliberately independent of pause status since photo reminders continue by default while dosing is paused (PRD §5.5).

### Photos
- `features/photos/api.ts`: `savePhoto`/`captureCurrentPhoto` copy the image into app-managed storage under `Paths.document/progress-photos/` (files must be copied out of the picker's temp location or they can vanish) before inserting the row. `recordPhotoSetCompleted` is the single place that both stamps `lastPhotoSetDate` and reschedules the photo reminder — call it, not `setLastPhotoSetDate`, when a full angle set finishes.
- `Directory`/`File` instances are constructed **lazily inside functions**, never at module scope — `expo-file-system` has no native module during `expo start --web`'s SSR pass (plain Node), so a module-scope `new Directory(...)` crashes the whole route tree at import time. Keep that pattern.
- `features/photos/photo-sets.ts` (pure/tested) groups photos into capture **sets**, keyed by date since the capture flow saves a session's angles under one date. It orders angles consistently, picks a stable cover angle so set cards look uniform, numbers days from the first routine start (baseline reads "Day 0"), and represents partial sets honestly. The Photos tab lists one card per set; `photos/set.tsx` shows one day's angles.
- `AngleCaptureFlow` is the shared 4-angle grid used by both onboarding's baseline photos and standalone "Add photos"; it swaps to a full-screen `GuidedCamera` (with front/back flip) when an angle is tapped, falling back to the library picker when there's no camera permission.
- **Simplification vs PRD §5.4**: the capture guide is plain dashed shapes, not silhouette artwork, and there's no ghost overlay of the previous shot — the alignment feature this category actually competes on. Both need design assets or real work, not a tweak.

### Learn & milestones
- `features/learn/milestones.ts` (pure/tested) decides which note Home shows for where the user is in treatment, from **inclusive day windows since the first routine's start**. It exists for one reason: results take 3–6 months, and the only thing that happens early — increased shedding around weeks 2–8 — looks exactly like the treatment failing, which is when people quit. Windows **must not overlap** (enforced by a test) so at most one note is ever due, and there's deliberately **no dismiss** — dismissal would need a settings column, and windows expire on their own.
- Milestone copy must not outrun the article it links to (`timelines-and-shedding`). A test rejects guilt-inducing and promissory wording; keep it, since the tone rule is a product constraint (PRD §5.5) rather than a style preference.
- Learn content lives in `features/learn/content/`. Article bodies are currently single ~300–500-char paragraphs; the reader splits on blank lines, so adding paragraphs needs no code change. Categories are a thin layer over 8 articles — folding them is an open simplification.

### Export
- `resolve-range.ts` turns a range option into concrete dates; `build-pdf.ts` renders HTML for `expo-print` (image `src`s are local `file://` paths — fine in `expo-print`'s native WebView, would need base64 in a browser); `api.ts` glues them together and hands off via `expo-sharing`, reusing `loadConsistencyContext`.

### Theming & UI primitives
- `Colors`, `Fonts`, `Spacing` live in `src/constants/theme.ts` — use these tokens rather than hardcoding in `StyleSheet.create`. Dose-state colors (`taken`, `missed`) are there too; `missed` is used for **both** Skipped and Missed, since the PRD renders them identically and keeps the distinction in data only. (`BottomTabInset`/`MaxContentWidth` are leftovers from the starter template and currently unused.)
- `useTheme()` returns the resolved `Colors[light|dark]`; `ThemedText`/`ThemedView` read from it, so screens shouldn't branch on color scheme manually.
- **Use `<LinkButton>` (`components/link-button.tsx`) for every tappable link — never `<Link asChild><Pressable/></Link>` directly.** `Link asChild` clones its child through expo-router's `Slot`, which throws a render-crashing on-device error if the child's `style` is an array rather than a flat object. The array form is the natural thing to write, so this broke the app three separate times before being wrapped. `LinkButton` flattens internally; it's the only place in `src/` allowed to use `asChild`, and `grep -rn "asChild" src` should return only that file.
- **Build time-of-day inputs with `TimePickerField`** (`components/time-picker-field.tsx`), never a raw `<DateTimePicker mode="time">`. `@react-native-community/datetimepicker` is inline on iOS but **dialog-only on Android** — an unconditionally-mounted one pops a clock dialog the instant the screen renders, with no tap. `TimePickerField` handles the split; `TimesEditor` (routine builder) follows the same rule. Date pickers elsewhere are already conditionally mounted via a `pickerTarget`-style state, which is the same fix by hand.
- **The tab bar is the standard `<Tabs>` from `'expo-router'`** (React Navigation bottom-tabs). `(tabs)/_layout.tsx` renders a bare `<Tabs screenOptions={{...}} />` and each of the 5 tab screens sets its own `title`/`tabBarIcon` via an inline `<Tabs.Screen options={{...}} />`. If a screen has multiple `return` branches, the `<Tabs.Screen>` must be in **every** branch — see `(tabs)/index.tsx`'s `HomeTabScreen` helper. (An earlier custom bar on `expo-router/ui` was replaced while chasing the streak freeze above; `expo-router/ui` was **not** at fault — the standard API is kept because it's simpler.)
- **The tabs' top safe-area inset is handled once in `(tabs)/_layout.tsx`**, not per screen. These tabs run `headerShown: false`, so without it content renders under the status bar and the topmost row becomes untappable. Bottom is left to the tab bar, which insets itself.
- No styling library (no NativeWind/Tamagui/Unistyles) — plain `StyleSheet.create` plus theme tokens.

### State and data-fetching conventions
- Server-ish state is TanStack Query over the local DB; UI/draft state is Zustand. Query keys are hierarchical so prefix invalidation works: invalidating `['photos']` covers `['photos','sets']`, `['photos','set',date]`, and `['photos','angle',angle]`; `['streak']` covers `['streak','weekly']`. Keep that shape when adding queries.

### What's built vs. simplified
Every PRD v1 screen exists: onboarding, Home (one card per item with a circle per dose, week strip, streak badge, photo banner), Routine (current routine, pause/resume, start new, weekly grid, Timeline), Consistency (streak/ratio/per-item stats, heatmap, tap-a-day corrections), Photos (guided capture, sets, compare), Learn, Me (notifications toggle, PDF export). Not PRD-complete: the capture guide and ghost overlay (see Photos), and Learn's content is a real but not exhaustive first pass. The seeded treatment catalog (`features/routine/catalog.ts`) is a first pass pending research in `knowledge/`.

Verified booting and navigable on a real Android device via Expo Go. **Several bugs here were only ever reproducible on real hardware** — the root-Stack hang, the `Slot`/`asChild` crash, the Android dialog-picker, the safe-area clipping. No simulator or emulator was available in this environment; treat that as a real gap, not something the test suite substitutes for. iOS is entirely untested.

### Known limitation: web + expo-sqlite (confirmed upstream bug, not a config issue)
`npm run web` reliably throws `Sync operation timeout` from `src/db/client.ts`'s `openDatabaseSync(...)` — reproduced both in headless Chromium and in a normal desktop Chrome, so it isn't an environment artifact.

Root-caused via Playwright instrumentation (worker script and `.wasm` both load, `crossOriginIsolated`/`SharedArrayBuffer` both true, COOP/COEP headers in `metro.config.js` working — the worker just never responds before the sync-wait spin loop times out) and cross-checked against [expo/expo#36392](https://github.com/expo/expo/issues/36392) and its fix [expo/expo#36669](https://github.com/expo/expo/pull/36669): **expo-sqlite's synchronous API — which `drizzle-orm/expo-sqlite` is built on, with no async variant — doesn't work reliably on web**, per Expo's own maintainers. #36669 fixed the kv-store's sync path; the direct `openDatabaseSync` path this project uses still hits it.

There's no cheap fix: making web work means bypassing drizzle's typed query builder there in favor of raw SQL over `openDatabaseAsync` — a real rearchitecture. Native is the actual target (real SQLite binding, no WASM/Worker involved), so that tradeoff isn't worth it unless web becomes a product requirement. Don't re-debug without a specific reason to prioritize web.
