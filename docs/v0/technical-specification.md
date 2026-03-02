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
  - Service persists PCM as per-session WAV file.
  - Service emits transcript/status events to UI.
- Transcript processing:
  - Single transcript stream in UI.
  - Realtime text updates from `result-generated` events.
  - Transcript remains on screen after stop completion.
  - No dedicated non-realtime ASR cleanup pass in v0.
- Stability guardrails:
  - websocket open timeout + task-start timeout
  - inactivity timeout during active session
  - bounded reconnect retry with backoff on transient disconnects
  - finish fallback timeout on stop path

## API Key Handling (BYOK)
- User enters API key in Settings.
- Store in platform secure storage.
- Never print key in logs.
- Validate key format on save.

## Session Data Model (Draft)
- SessionHistoryItem:
  - id
  - startedAt
  - endedAt
  - status (`completed` | `failed`)
  - transcript
  - audioFileUri (optional)
  - errorText (optional)
- Local storage:
  - Persist bounded recent history list in secure local storage.
  - Most-recent-first ordering.

## Endpoint
- Current websocket endpoint: `wss://dashscope.aliyuncs.com/api-ws/v1/inference/` (China mainland/Beijing).
- International/Singapore endpoint remains configurable future work if cross-region keys are needed.

## V1 Direction
- Optional LLM cleanup and summarization layer on top of persisted transcript text.

## Build and CI
- GitHub Actions for:
  - lint/typecheck
  - Android APK build via Expo prebuild + Gradle
- No local Android environment required for initial cloud builds.

## Initial Directory Plan
- `mobile/` for app code
- `docs/` for product/engineering docs
- `.github/workflows/` for CI and Android builds
