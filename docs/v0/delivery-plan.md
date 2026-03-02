# Delivery Plan (V0)

## Milestone 1: Foundation
- Create Expo Android-first project structure.
- Add Settings and Record screens.
- Add secure API key storage service interface.
- Add GitHub Actions CI and Android build workflow.

## Milestone 2: Real-time Draft Transcript
- Implement native Android audio capture module.
- Connect to DashScope realtime WebSocket.
- Render low-latency live transcript updates.

## Milestone 3: Persisted Session Output
- Add stop-recording finalize path.
- Emit single transcript output from realtime task completion path.
- Persist session transcript output.
- Persist recorded audio file with session metadata.

## Acceptance Criteria (V0)
- User can save API key and start recording.
- Live transcript updates within practical latency budget.
- Stopping recording preserves transcript in session history.
- Session history entry includes saved local audio file reference.
- Android build artifact can be generated in GitHub Actions.

## Status Snapshot (2026-03-02)
- Milestone 1: complete.
- Milestone 2: complete.
- Milestone 3: in progress.
  - Stop/finalize path: done.
  - Local transcript persistence: done.
  - Recorded audio persistence: done.
  - Device stability validation + tuning: pending.
