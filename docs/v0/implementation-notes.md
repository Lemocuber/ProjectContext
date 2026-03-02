# Implementation Notes

## 2026-03-02

### Completed
- Created Expo Android-first mobile app scaffold in `mobile/`.
- Added foundational app UI:
  - Record screen with large Start/Stop control.
  - Transcript sections for `Live Draft` and `Final Cleaned`.
  - Settings screen for BYOK DashScope API key input.
- Added secure key storage wrapper (`expo-secure-store`).
- Added GitHub Actions workflows for:
  - TypeScript typecheck CI.
  - Android APK build (Expo prebuild + Gradle release build).
- Replaced mock ASR path with real pipeline:
  - Live mic PCM capture via `react-native-live-audio-stream`.
  - Realtime WebSocket session to DashScope FunASR.
  - Live transcript updates from `result-generated` events.
  - Final transcript emission on `task-finished` or stop timeout fallback.
- Added Android phone trial runbook:
  - `docs/v0/android-phone-test-run.md`
- Validated real CI delivery path:
  - Non-`main` branch push auto-triggers Android APK workflow.
  - Build produces downloadable artifact `project-context-android-apk`.

### Pending (next)
- Add dedicated second-pass non-realtime ASR cleanup for stronger final transcript quality.
- Persist session history and transcript metadata.
- Stabilize reconnection/backoff and long-session behavior.
