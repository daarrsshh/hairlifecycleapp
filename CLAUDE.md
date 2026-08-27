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

### Auth (anonymous-first)

The app is still local-first: **no user data is uploaded, and the local SQLite schema has no `user_id` column** — it doesn't need one, since the database belongs to the one person holding the phone. Only future server-side tables need ownership.

- `lib/supabase.ts` exports `supabase`, which is **`null` when `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` are unset** (see `.env.example`). Every caller checks for null, exactly like `getNotificationsModule()`. An unconfigured or unreachable backend must degrade to "no account", never to a crash — the app has to stay fully usable with no network.
- Sessions go in `expo-secure-store` (Keystore/Keychain), not AsyncStorage: a Supabase session is a bearer token, and this app's data is medication history and scalp photos. Falling back to a plain readable file to avoid re-authenticating would trade a real security property for a small convenience, so the fallback is **memory** — a degraded session, never a weaker one. SecureStore rejects keys outside `[A-Za-z0-9._-]`, so supabase-js's URL-derived key names are sanitized in `safeKey`.
- **`expo-secure-store` is `require()`d lazily in `lib/secure-storage.ts`, never statically imported.** A static import throws at module evaluation (`Cannot find native module 'ExpoSecureStore'`) and takes down the whole bundle before any guard runs — this happens any time the JS is newer than the native build: a dev client compiled before the package was added, Expo Go, web's SSR pass. **This is the same rule as `expo-notifications`, and it was violated once already by importing SecureStore directly.** Treat every native module reached from a startup path this way: lazy `require()`, `null` on failure, callers degrade.
- `features/auth/api.ts`'s `ensureAnonymousSession()` is called **fire-and-forget from `src/app/index.tsx`, outside the splash path**. It must never be awaited before rendering: anonymous sign-in is a network round trip, and someone logging a dose offline can't be blocked by an account they never asked for. Failure resolves to `offline` and retries next launch.
- **Why anonymous now rather than a login screen later:** adding accounts to an app that already has users forces everyone through a signup wall on update. An anonymous id issued on first launch is *upgraded in place* by `linkEmail()` when there's finally something worth an account (sync, AI analysis) — same `userId`, nothing to migrate or reconcile. `linkEmail` is deliberately unused for now.
- The Me tab states the account's existence and that nothing is uploaded. Keep that honest as features land — an account discovered later, rather than disclosed, is the kind of thing that costs trust permanently in a health app.

### Builds: which one, and when Expo Go isn't enough

Three ways to run this, and they are not interchangeable:

- **Expo Go** — fine for most work, but **notifications are dead there by design** (`notifications-safe.ts` refuses to load `expo-notifications` on Android/Expo Go because importing it crashes the bundle). Every scheduling call silently no-ops, so a notification bug can't even be reproduced.
- **Development build** (`eas build --profile development --platform android`) — native shell with **no JS inside**; Metro serves the bundle over Wi-Fi, so it shows a blank screen if opened without a dev server, or if the Mac's LAN IP has changed since it last connected. Start Metro with `npx expo start --dev-client`. This is the build to use when iterating, since it keeps Fast Refresh and console logs.
- **Preview build** (`eas build --profile preview --platform android`) — release APK with the JS bundled in; runs standalone with no computer. The right one for testing notifications over hours or days (scheduled times, the 6-hour reprompt). Costs ~25 min per change and `__DEV__` is false, so **the Me tab's "Reset all app data" button is absent** — clear data through Android settings instead.

**Android ignores importance changes to a notification channel that already exists.** After changing anything in `ensureDoseChannel`, clear app data or reinstall, or the old channel silently persists and the change appears to do nothing.

`eas.json` holds three profiles (`development`, `preview`, `production`); the project is linked to EAS and `android.package` / `ios.bundleIdentifier` are set. **`EXPO_PUBLIC_*` values are inlined at build time, and `.env.local` is gitignored while EAS builds from git** — so anything the app needs at runtime must also exist as an EAS environment variable (`eas env:list` to check), or the build ships unconfigured and silently degrades. The Supabase URL and anon key are already registered across all three environments. Restart Metro after editing `.env.local`; a running bundler keeps serving the old values.

### 🔒 Schema changes: the pre-release rules have EXPIRED

**The old workflow — delete `src/db/migrations/`, regenerate `0000`, bump the database filename — is gone. Do not do it, and do not reintroduce it.** It was only ever safe because the sole data was disposable test data. The database was renamed from `hairlifecycle-v3.db` to **`hairlifecycle.db`** before launch specifically so there is no version number left to increment.

From now on, every schema change is a **new migration**:

```bash
# edit src/db/schema.ts, then:
npm run db:generate      # emits 0001, 0002, … alongside the existing 0000
```

Three rules, all of which have been verified rather than assumed:

- **Never delete or edit a migration that has shipped.** Drizzle records which have been applied; rewriting history makes an installed app either re-run DDL against existing tables or skip changes entirely.
- **Never change the database filename.** It is the address of the user's data, not a version marker. Pointing at a new name silently abandons every logged dose and progress photo — no error, no crash, no way back from inside the app.
- **A constraint added to a table that already holds violating rows fails the migration on the user's device**, and there is no rollback and no backup — the app simply won't start. *Fix the data first, add the constraint second, in the same migration.* This was demonstrated: creating a unique index on `routine_items (routine_id, name)` against a database holding two items both named "Minoxidil" aborts with `UNIQUE constraint failed`; prefixing it with a `DELETE … WHERE rowid NOT IN (SELECT MIN(rowid) … GROUP BY …)` applies cleanly.

**Rehearse every migration against a database with real rows in it** before shipping. Apply `0000`, insert representative data, apply the new migration, and check the row counts on every table. Additive changes (`ALTER TABLE … ADD COLUMN`, new indexes) were confirmed to preserve all data; constraint-tightening changes are the ones that bite.

**There is still no backup or restore.** Until there is, a migration failure on a user's device is unrecoverable for that user. That's the strongest argument for building backup early.

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
- The root layout is wrapped in **`GestureHandlerRootView` (with `flex: 1`)** from `react-native-gesture-handler`. Every `GestureDetector` needs it as an ancestor or it throws on render — which is exactly what the photo comparison slider did, the app's only gesture consumer, so nothing else surfaced the omission. Note expo-router *exports* a `GestureHandlerRootView`, but it's a plain `View` stub for its own stack views and does **not** satisfy this. The `flex: 1` is load-bearing: unstyled, the view collapses to zero height and the whole app renders blank.
- **The root layout never `throw`s and never renders `null` indefinitely.** Both used to produce an identical blank screen carrying no information: a release build has no error overlay, so a thrown migration error was just white — and `null` keeps the splash up, which since the splash went near-white looks the same. A migration error now renders its message; a boot still unfinished after a grace period says so. The splash must be hidden for either to be visible, since `index.tsx` is the only thing that hides it and it never mounts while the layout is showing a fallback. The grace period is why a healthy launch still goes splash → app with no flash of intermediate UI.
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
- **Android needs the `dose-reminders` channel** (`ensureDoseChannel`), and every dose trigger carries its `channelId`. There was none originally, so reminders landed in the system default at default importance — which shows them collapsed, and Yes/No/Skip only render on the *expanded* notification, so the buttons were unreachable. The channel is `HIGH` importance and `PRIVATE` lockscreen visibility: "Did you take your meds?" is legible to anyone who picks up the phone, and this is a condition people treat privately.
- `features/dose-log/notification-responder.tsx` (mounted once in the root layout) handles the Yes/No/Skip action buttons. Because reminders are batched, one answer applies to **every item in that batch**. A body tap (not a button) is a no-op.
- **The action buttons use `opensAppToForeground: true`, changed from `false` after on-device testing.** Answering without opening the app is the nicer idea and doesn't work on Android: the notification just vanishes, and if the process was already killed the answer isn't applied until next launch. A tap that confirms nothing is indistinguishable from a dead button — that's exactly how it was reported. Opening the app guarantees the handler runs and the dose is visibly ticked off. Don't revert this without a way to confirm the tap.
- **A tapped action only reaches the live listener if the JS context is alive**, which for `opensAppToForeground: false` buttons it usually isn't — Android will have killed the process. The responder therefore also replays `getLastNotificationResponseAsync()` on mount. `logDose` upserts, so replaying what the listener already handled is harmless. Without that replay the tap is lost silently: notification dismissed, nothing logged.
- `import type { NotificationResponse } from 'expo-notifications'` in the responder is **safe and deliberate** — a type-only import is erased at compile time and never triggers the module evaluation that crashes Expo Go. Don't "fix" it into a value import.
- `schedulePhotoReminder`/`cancelPhotoReminder` handle the separate "every 15 days" photo prompt — a one-off `DATE` trigger, rescheduled forward by `recordPhotoSetCompleted`. Home's banner (`isPhotoReminderDue`) is the in-app half, deliberately independent of pause status since photo reminders continue by default while dosing is paused (PRD §5.5).

### Photos
- `features/photos/api.ts`: `savePhoto`/`captureCurrentPhoto` copy the image into app-managed storage under `Paths.document/progress-photos/` (files must be copied out of the picker's temp location or they can vanish) before inserting the row. `recordPhotoSetCompleted` is the single place that both stamps `lastPhotoSetDate` and reschedules the photo reminder — call it, not `setLastPhotoSetDate`, when a full angle set finishes.
- `Directory`/`File` instances are constructed **lazily inside functions**, never at module scope — `expo-file-system` has no native module during `expo start --web`'s SSR pass (plain Node), so a module-scope `new Directory(...)` crashes the whole route tree at import time. Keep that pattern.
- `features/photos/photo-sets.ts` (pure/tested) groups photos into capture **sets**, keyed by date since the capture flow saves a session's angles under one date. It orders angles consistently, picks a stable cover angle so set cards look uniform, numbers days from the first routine start (baseline reads "Day 0"), and represents partial sets honestly. The Photos tab lists one card per set; `photos/set.tsx` shows one day's angles.
- `AngleCaptureFlow` is the shared 4-angle grid used by both onboarding's baseline photos and standalone "Add photos"; it swaps to a full-screen `GuidedCamera` (with front/back flip) when an angle is tapped, falling back to the library picker when there's no camera permission.
- **No ghost overlay, and this was a deliberate reversal.** One was built (previous shot drawn over the live preview at 40% opacity, with a show/hide toggle) and removed after on-device use: overlaying a face on a live view of the same face reads as confusing rather than helpful. Don't rebuild the same thing assuming it was an oversight. Alignment is still a real, unsolved problem — a misaligned pair can't be meaningfully compared, and nothing on the Compare screen repairs one after the fact — so a future attempt should try a *different* mechanism (an outline traced from the previous shot, a framing indicator, capture-time guidance), not the same overlay again.
- Comparison has two modes, sharing one zoom transform via `usePhotoZoom` (`components/use-photo-zoom.ts`). `ComparisonSlider` wipes between the two; `ComparisonSideBySide` shows both whole, which is what you need to judge density since the slider always hides half of each photo. **Both images must share a single transform** — independently zoomable photos would manufacture differences that are really just differences in magnification. The slider separates gestures by pointer count: one finger drags the divider, two pinch or pan.
- Anything drawn *over* a photo (divider, knob, labels, ghost) uses fixed colors, never theme tokens — it sits on photographic content, not app chrome, and has to hold against dark hair and pale scalp in either theme.
- **Still simplified vs PRD §5.4**: the capture guide is plain dashed shapes, not silhouette artwork — that needs design assets, not a tweak.

### Learn & milestones
- `features/learn/milestones.ts` (pure/tested) decides which note Home shows for where the user is in treatment, from **inclusive day windows since the first routine's start**. It exists for one reason: results take 3–6 months, and the only thing that happens early — increased shedding around weeks 2–8 — looks exactly like the treatment failing, which is when people quit. Windows **must not overlap** (enforced by a test) so at most one note is ever due, and there's deliberately **no dismiss** — dismissal would need a settings column, and windows expire on their own.
- Milestone copy must not outrun the article it links to (`timelines-and-shedding`). A test rejects guilt-inducing and promissory wording; keep it, since the tone rule is a product constraint (PRD §5.5) rather than a style preference.
- Learn content lives in `features/learn/content/`. Article bodies are currently single ~300–500-char paragraphs; the reader splits on blank lines, so adding paragraphs needs no code change. Categories are a thin layer over 8 articles — folding them is an open simplification.

### Export
- `resolve-range.ts` turns a range option into concrete dates; `build-pdf.ts` renders HTML for `expo-print` (image `src`s are local `file://` paths — fine in `expo-print`'s native WebView, would need base64 in a browser); `api.ts` glues them together and hands off via `expo-sharing`, reusing `loadConsistencyContext`.

### Theming & UI primitives
- `Colors`, `Fonts`, `Spacing` live in `src/constants/theme.ts` — use these tokens rather than hardcoding in `StyleSheet.create`. (`BottomTabInset`/`MaxContentWidth` are leftovers from the starter template and currently unused.)
- `useTheme()` returns the resolved `Colors[light|dark]`; `ThemedText`/`ThemedView` read from it, so screens shouldn't branch on color scheme manually.
- **The palette is deep teal on warm paper neutrals, with moss green for a taken dose** — it replaced the Expo starter's system-blue-on-cold-grey. Three constraints hold it together, and each is load-bearing rather than taste:
  - Neutrals are **warm** (red/yellow bias). This is a bathroom-shelf app opened for thirty seconds by someone quietly anxious about their appearance; warm paper reads as a journal, cold grey reads as a form.
  - `primary` sits **~81° of hue from `taken`** (187° vs 106°). An unfilled dose circle is `primary` and a filled one is `taken`, and they sit adjacent on every card — neighbouring hues would make the app's core interaction ambiguous. Don't repalette one without checking the other.
  - `missed` is **grey and covers both Skipped and Missed**. Never red. The PRD renders them identically and keeps the distinction in data only, because an app about hair loss that scolds you gets deleted.
- **Every foreground clears WCAG AA against both grounds in both themes** — verified, not assumed. The first values chosen failed on `backgroundElement`, which is exactly where dose labels live. Re-check with a contrast calculation after any palette edit; `taken` and `missed` sit closest to the 4.5:1 line.
- **The type scale is 12 · 14 · 16 · 20 · 30 · 40** (`caption`, `small`/`smallBold`, `default`, `heading`, `subtitle`, `title`). `heading` (20) is the step that was missing: without it a card title and a dose time were both 14px `smallBold`, so every card carried identical weight and the screens read flat regardless of spacing. Use it for anything that titles a block. `linkPrimary` reads `theme.primary` — it used to hardcode `#3c87f7`, so links were subtly the wrong blue and never adapted to dark mode.
- **Anything drawn over a photograph uses fixed colors, never theme tokens** — the comparison divider, knob, and labels. It sits on photographic content rather than app chrome, so it has to hold against dark hair and pale scalp in either theme.
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
