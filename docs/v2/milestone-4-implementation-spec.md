# Milestone 4 Implementation Spec

Date: 2026-03-13
Status: current.

## Goal
Add privacy-safe remote diagnostics for V2 so crashes and high-value operational failures are debuggable in the field, while also making Settings a permanent support surface with a small manual report section.

## Why This Slice
- V2 added more failure-prone runtime paths: keepalive recording, cross-device cloud sync, and in-session AI.
- Current error handling is mostly local UI state, which is not enough for diagnosing device-specific failures after the fact.
- Hiding the entire Settings tab conflicts with having a stable diagnostics/support entry point.

## Scope for This Slice
- Integrate a remote diagnostics provider, with Sentry as the default target unless blocked during implementation.
- Add a small app-local diagnostics service that wraps provider initialization, tagging, breadcrumbs, and manual capture helpers.
- Instrument the highest-value service boundaries:
  - app startup sync,
  - recording lifecycle,
  - keepalive events,
  - realtime ASR lifecycle,
  - cloud sync,
  - finalize pipeline,
  - title generation,
  - live suggestions,
  - export,
  - manual report action.
- Keep Settings tab always visible.
- Keep per-section hiding for config-managed inputs.
- Add a small Settings diagnostics section with app/release info, manual report action, support-info display/share access, and optional short user note.

## Locked Decisions
- Settings tab is no longer hidden as a whole.
- Diagnostics provider calls are centralized behind an app-local adapter.
- Diagnostics submission is best effort and must never block core recording/finalize flows.
- Transcript text, prompt content, credentials, signed URLs, and raw audio payloads are excluded from diagnostics events.
- Raw `cloudUserId` is not sent to the provider.

## Explicitly Deferred Within Milestone 4
- Full transcript-safe remote log streaming.
- Session replay.
- Performance tracing beyond minimal release tagging and breadcrumbs.
- Screenshot/file attachments in manual reports.
- Rich in-app diagnostics viewer.

## Provider and Build Rules
- Release builds must include release/environment metadata that matches uploaded source maps.
- The initial target is Sentry because it provides React Native crash capture, breadcrumbs, and release/source-map tooling that fit the current app shape.
- If Sentry setup proves incompatible with the current Expo/prebuild workflow, document the blocker before switching providers.

## Manual Report Contract
- User enters an optional short note.
- App submits a manual diagnostics event tagged as user-triggered support action.
- Event includes:
  - app version/release,
  - current screen/feature context if cheaply available,
  - recent sanitized breadcrumbs,
  - optional short user note.
- Event excludes all transcript, prompt, key, secret, signed URL, and audio payload content.

## Implementation Plan
1. Add diagnostics service wrapper and provider bootstrap.
2. Remove whole-tab Settings hiding and keep section-level hiding only.
3. Add Settings diagnostics/manual report section.
4. Instrument the agreed high-value service boundaries with sanitized breadcrumbs and captures.
5. Configure release/source-map handling for actionable reports.

## Validation Targets
- Unhandled crashes appear remotely with symbolicated stack traces.
- Startup sync, recording, ASR, cloud sync, finalize, suggestion, and export failures can be reported with actionable metadata.
- Diagnostics payloads contain no transcript text, prompt context, secrets, signed URLs, or raw audio.
- Settings stays visible even when all other settings inputs are config-managed.
- Manual report flow works from Settings and remains non-blocking.
