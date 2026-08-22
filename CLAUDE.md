# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Expo SDK version notice

This project targets **Expo SDK 57**, which changed significantly from prior versions. Read the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code that touches Expo APIs, config, or routing.

## Commands

```bash
npm install          # install dependencies
npm run start         # start the Expo dev server (expo start)
npm run ios           # start dev server and open iOS simulator
npm run android        # start dev server and open Android emulator
npm run web           # start dev server for web
npm run lint          # expo lint (ESLint via eslint-config-expo)
npx tsc --noEmit       # type-check the project
npm run reset-project   # moves current app/ to app-example/ and creates a blank app/ (irreversible without git)
```

There is no test runner configured yet.

`expo-env.d.ts` and `.expo/` are generated on first `expo start` and are gitignored — if `tsc` reports missing types for `expo/types` or CSS module imports, run `npx expo start` once (even briefly) to regenerate them.

## Architecture

- **Entry point**: `expo-router/entry` (set in `package.json` `main`). Routing is Expo Router's file-based system rooted at `src/app/` (not the default `app/` — see `expo-router` config below).
- **Path aliases** (`tsconfig.json`): `@/*` → `src/*`, `@/assets/*` → `assets/*`. Always import via `@/...` rather than relative paths across directories.
- **Layout & theme**: `src/app/_layout.tsx` wraps the app in Expo Router's `ThemeProvider` (light/dark from `react-native`'s `useColorScheme`) and renders `AppTabs`. `Colors`, `Fonts`, `Spacing`, `BottomTabInset`, and `MaxContentWidth` are centralized in `src/constants/theme.ts` — use these tokens instead of hardcoding values in `StyleSheet.create`.
- **Theming hook**: `src/hooks/use-theme.ts` (`useTheme()`) returns the resolved `Colors[light|dark]` object for the current scheme; `src/hooks/use-color-scheme.ts` has a `.web.ts` platform variant to handle SSR hydration on web (color scheme isn't known until after mount there).
- **Navigation**: `src/components/app-tabs.tsx` uses `expo-router/unstable-native-tabs` (native tab bar, not the JS-rendered `Tabs`). It has a `.web.tsx` counterpart since native tabs aren't available on web — when adding tabs/screens, update both variants and register the route file in `src/app/`.
- **Themed primitives**: `ThemedText` and `ThemedView` (`src/components/`) are the base building blocks for screens — they read from `useTheme()` so screens shouldn't need manual light/dark branching.
- **Platform-specific files**: several components/hooks ship `.web.tsx`/`.web.ts` variants alongside the native version (`app-tabs`, `animated-icon`, `use-color-scheme`) — Metro's platform extension resolution picks the right one automatically. When editing one, check whether the counterpart needs the same change.
- **Styling**: no styling library is installed (no NativeWind/Tamagui/Unistyles); components use `StyleSheet.create` plus the `theme.ts` tokens. `src/global.css` is imported once from `theme.ts` for web.
- **Native config**: `app.json` defines app identity, icons/splash, and Expo config plugins (`expo-router`, `expo-splash-screen`). `experiments.typedRoutes` and `experiments.reactCompiler` are both enabled.
