# Milestone 1 Implementation Spec

Date: 2026-03-11

## Goal
Complete the architectural prerequisite for V2 keepalive by moving recording ownership out of `RecordScreen` and into an app-level orchestrator that survives tab switches.

## Scope for This Slice
- Introduce an app-level `RecordingProvider` mounted above tab content.
- Move live recording state, review state, and finalize/discard actions into the provider.
- Keep `RecordScreen` as a view/controller over provider state.
- Preserve existing V1 finalize behavior after the recording stops.
- Verify that switching between Record, History, and Settings does not reset an active session or pending review state.

## Explicitly Deferred Within Milestone 1
- Android foreground service implementation.
- Ongoing recording notification.
- Notification action handling.
- Guaranteed continuity under screen lock or app backgrounding.

## Why This Order
- Current root cause is screen ownership of recording state.
- Fixing tab-switch continuity first removes a known architectural blocker for the rest of V2.
- Foreground service work should attach to the orchestrator, not to `RecordScreen`.

## Planned Changes

## 1. App-Level Recording Orchestrator
- Add `RecordingProvider` and `useRecording()` hook.
- Provider owns:
  - status (`idle | recording | review | finalizing | failed`),
  - transcript text,
  - info and error text,
  - highlight taps/count,
  - pending finalize event,
  - discard confirmation state,
  - selected speaker mode,
  - active ASR session ref and draft session metadata refs.

## 2. RecordScreen Refactor
- Remove business logic for:
  - start/stop recording,
  - review/discard/continue finalize flow,
  - session persistence and finalization pipeline,
  - highlight state.
- Keep screen-local UI behavior only:
  - transcript scroll behavior,
  - button rendering,
  - display of provider state.

## 3. App Wiring
- Mount `RecordingProvider` in `App.tsx` above the tab body so provider state remains alive while tabs switch.
- Keep History refresh callback flowing from provider finalization/persistence events.

## Validation Targets
- Start recording, switch to History, return to Record: recording is still active and transcript continues.
- Stop recording, switch tabs, return to Record: review state is still present.
- Continue finalize still persists history as before.
- Discard still removes local draft artifacts and does not create a history item.
- Typecheck passes.

## Implementation Status
- 2026-03-11: app-level orchestrator/provider refactor completed.
- `RecordScreen` now renders provider state instead of owning session lifecycle.
- Typecheck passed after the refactor.
- 2026-03-11: Android keepalive service/plugin integration added for foreground notification, wake lock, and notification stop action event wiring.
- 2026-03-12: on-device validation completed for screen lock, app backgrounding, and tab-switch continuity.
- 2026-03-12: milestone accepted as complete; keepalive notification behavior verified on device.

## Follow-Up After This Slice
- Milestone 1 is closed as of 2026-03-12.
- Move to Milestone 2 cloud session model and sync implementation.
