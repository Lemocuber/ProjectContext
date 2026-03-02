# V0 Addendum: History Persistence and Realtime Stability

Date: 2026-03-02

## Scope
- Persist transcript + audio session history locally on device.
- Improve realtime ASR reliability with timeouts and reconnect/backoff.

## History Persistence Spec
- Store recent sessions as a bounded list in local secure storage.
- Persist on session terminal states:
  - completed (final transcript emitted),
  - failed (terminal error after retries/stop error).
- Persisted fields per session:
  - `id`
  - `startedAt` (ISO string)
  - `endedAt` (ISO string)
  - `status` (`completed` | `failed`)
  - `transcript`
  - `audioFileUri` (optional)
  - `errorText` (optional)
- Keep most recent first and cap retained entries for v0.
- History UI contract:
  - separate `History` tab (not embedded in `Record` tab),
  - collapsed row shows timestamp, status, preview text, and audio-saved marker when available,
  - tapping a row expands inline details with full transcript and playback controls.
- Playback contract:
  - if `audioFileUri` exists, user can play/pause/stop on expanded row,
  - playback errors surface as inline row-level error text.

## Realtime Stability Spec
- Add connection guardrails:
  - websocket open timeout,
  - task-start handshake timeout,
  - result inactivity timeout during active recording.
- Add bounded reconnect recovery:
  - retry unexpected disconnect/failure with exponential backoff,
  - stop retrying after configured max attempts and fail session.
- Keep current UX contract:
  - single transcript view (no live/final section split),
  - transcript remains after stop completion.

## Non-Goals (This Change)
- No second-pass non-realtime cleanup model in v0.
- No export/share flow.
- No cloud sync for history.

## Follow-up (v1)
- Add optional LLM cleanup and summarization on top of persisted transcript text.
