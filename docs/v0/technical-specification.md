# Technical Specification (V0)

## Stack
- React Native with Expo (prebuild + custom dev client)
- TypeScript
- Android target only
- DashScope FunASR WebSocket API for real-time ASR

## Architecture
- JS/UI layer: screens, state, session display.
- Native-backed audio stream layer:
  - `react-native-live-audio-stream` captures low-latency PCM chunks.
  - JS service streams PCM frames to DashScope WebSocket.
  - Service emits partial/final transcript events to UI.
- Transcript processing:
  - Phase 1: live partial transcript from realtime model (`result-generated` events).
  - Phase 2: v0 currently composes final text from server sentence-end events and task-finished completion.

## API Key Handling (BYOK)
- User enters API key in Settings.
- Store in platform secure storage.
- Never print key in logs.
- Validate key format on save.

## Session Data Model (Draft)
- Session: id, startedAt, endedAt, status
- LiveSegment: sessionId, seq, text, ts
- FinalTranscript: sessionId, text, metadata

## Build and CI
- GitHub Actions for:
  - lint/typecheck
  - Android APK build via Expo prebuild + Gradle
- No local Android environment required for initial cloud builds.

## Initial Directory Plan
- `mobile/` for app code
- `docs/` for product/engineering docs
- `.github/workflows/` for CI and Android builds
