# RiffMaker

RiffMaker is a mobile app built to help musicians quickly capture, organize and revisit riff ideas â€” without losing inspiration.

Designed to be fast, offline-first and distraction-free.

## Features

- Create and store riffs
- BPM, tuning and notes
- Edit riffs
- Swipe to delete
- Offline-first (no account needed)
- Clean, dark-themed UI

## Tech Stack

- Expo
- React Native
- TypeScript
- AsyncStorage
- Expo Router
- Sentry
- PostHog
- Expo Updates

## Status

**v1.4.0** â€” MVP complete  
Future versions will include audio recording and playback.

## Motivation

Musicians often lose ideas because opening a DAW is slow and distracting.  
RiffMaker focuses on capturing the idea first â€” production comes later.

---

Built with METAL

## Android Commands (Reliable)

- `npm run android:debug`: run Expo Android debug flow (may ask for Metro port if already in use).
- `npm run android:build`: build debug APK via Gradle only (non-interactive, CI-friendly).
- `npm run android:install`: install debug APK via Gradle.
- `npm run test:critical`: runs critical storage tests only.
- `npm run release:check`: runs Android debug build + critical tests in one command.

## Release Checklist

- Phase 1 release checklist: `docs/release-phase1-checklist.md`

## Observability & Release

- Create `.env` from `.env.example` and set `EXPO_PUBLIC_SENTRY_DSN` plus `EXPO_PUBLIC_POSTHOG_KEY`.
- If your PostHog project is not in the US region, change `EXPO_PUBLIC_POSTHOG_HOST`.
- Set `EXPO_PUBLIC_PRIVACY_POLICY_URL` when you have a public policy URL outside the app.
- OTA channels are configured in `eas.json` as `development`, `preview`, and `production`.
- If you change update configuration and keep `android/` committed, run `npm run updates:sync:android`.

