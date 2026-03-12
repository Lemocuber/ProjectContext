# Delivery Plan (V2)

Date: 2026-03-11

## Milestone 1: Keepalive Recording Foundation
- Status: completed and validated on-device on 2026-03-12.
- Extract recording lifecycle from `RecordScreen` to app-level orchestrator.
- Keep recording state alive across tab switches.
- Add Android foreground service + ongoing notification for active recording.
- Ensure restore/reattach behavior when app returns to foreground.

## Milestone 2: Cloud Session Model and Sync
- Status: current.
- Define remote object layout (`index.json`, `recordings/{sessionId}.wav`, `transcripts/{sessionId}.md`).
- Generate a local 10-character cloud `userId` on first launch and expose it in Settings for cross-device pairing.
- Support bundled `cloudUserId` override in config asset and hide the Cloud User ID settings section when preset.
- Scope local metadata and local artifacts by `userId` so switching IDs swaps the visible local History namespace.
- Add cloud push pipeline on finalize and metadata changes.
- Add cloud pull pipeline for History tab and startup hydration.
- Implement local cache + sync status states (`pending/synced/failed`).
- Enforce discard rule: no remote writes when user discards session.

## Milestone 3: In-Session AI Suggestions
- Add "What do you think" action during active recording.
- Use rolling realtime transcript context window.
- Add cooldown and in-flight guard.
- Render suggestions inline without blocking capture.

## Milestone 4: Integration and Validation
- Validate end-to-end flows for:
  - lock screen recording continuity,
  - app background continuity,
  - tab-switch continuity,
  - discard-no-upload behavior,
  - continue-finalize upload behavior,
  - cross-device history visibility,
  - in-session suggestion reliability under active recording.

## Acceptance Criteria (V2)
- Recording continues through:
  - Android screen lock,
  - app backgrounding,
  - in-app tab changes.
- Android shows an ongoing recording notification while keepalive recording is active.
- Returning to Record tab reflects current live recording status/transcript.
- Stopping recording enters review state without uploading.
- Discard action performs local cleanup only and does not upload any artifact.
- Continue finalize uploads session artifacts and updates user cloud index.
- History tab can load cloud-synced sessions from another device using same `userId`.
- Offline launch still shows local cached history entries.
- During recording, user can request "What do you think" and get concise suggestions from realtime context.

## Validation Gates
- Typecheck and CI pass.
- Android release APK build pass.
- Manual on-device matrix pass:
  - lock/unlock continuity,
  - background/foreground continuity,
  - tab-switch continuity,
  - process-reopen reattach behavior (best effort),
  - discard-no-upload verification,
  - finalize-upload verification,
  - cloud history pull/push verification,
  - in-session suggestion cooldown/in-flight behavior.
