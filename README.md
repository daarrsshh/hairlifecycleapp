# HairLifecycle

A hair-regrowth treatment tracker for Android. Log each thing you take or do on its own
schedule, keep an angle-matched photo timeline, and see your consistency build up over months.

Built with Expo SDK 57, React Native and expo-router. All user data lives on the device in
SQLite — routines, dose logs and photos are never uploaded.

## Getting started

```bash
npm install
npx expo start          # dev server (needs a development build, see below)
```

**Expo Go is not enough for this project.** Notifications are disabled there by design, so a
notification bug can't even be reproduced. Use a development build:

```bash
npx eas-cli build --profile development --platform android
npx expo start --dev-client
```

For testing over hours or days — scheduled reminders, the photo prompt — use a `preview` build
instead, which runs standalone with no computer attached.

## Configuration

Copy `.env.example` to `.env.local` and fill in the Supabase values. Both are optional: with
them unset the app runs exactly as it does with them, minus the anonymous account.

`EXPO_PUBLIC_*` values are inlined at build time and `.env.local` is gitignored, so anything
needed at runtime must also exist as an EAS environment variable (`eas env:list`).

## Commands

```bash
npm test                # jest
npm test -- streak      # one suite by filename substring
npx tsc --noEmit        # type-check
npm run lint            # eslint
npm run db:generate     # new migration after editing src/db/schema.ts
```

## A warning about the database

`src/db/client.ts` opens `hairlifecycle.db`. **Never rename that file.** It is the address of
the user's data, not a version marker — pointing at a new name silently abandons every logged
dose and progress photo with no error and no way back. Schema changes ship as new migrations
(`0001`, `0002`, …), never by regenerating `0000`.

## Where things are

- `src/app/` — routes (expo-router). Four tabs: Home, Routine, Photos, Learn.
- `src/features/*/` — one folder per feature; the pure, tested logic lives here alongside a
  thin `api.ts` that is the only place SQL is written.
- `src/components/`, `src/hooks/`, `src/lib/` — shared primitives.
- `knowledge/` — research that informs product decisions. Not read at runtime.

**`CLAUDE.md` is the real documentation.** It covers the routine model everything depends on,
and a long list of rules that exist because something broke on real hardware. Read it before
changing anything non-obvious.
