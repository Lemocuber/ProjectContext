# Execution Plan

## Current Sprint Focus
1. Lock corrected v1 scope and acceptance criteria in docs (file-ASR final pass model).
2. Rework v1 in dependency order: capture/fallback persistence -> file ASR final pass -> markdown/title/export integration.

## Detailed Work Items

### 1) Baseline (as of 2026-03-02)
- Session persistence: implemented (bounded recent list, completed/failed entries).
- Session audio persistence: implemented (WAV saved locally and linked from history).
- Realtime reliability guardrails: implemented (timeouts + reconnect/backoff + finalize fallback).
- Final transcript path: realtime-derived, single transcript surface (no live/final split in v0).
- History UX: implemented (History tab + detail card + in-app player with scrubber/timestamps).
- Status: complete and accepted as v0 baseline.

### 2) Correction Note (as of 2026-03-06)
- Previous v1 design incorrectly treated realtime ASR metadata as final transcript source.
- Realtime ASR does not provide reliable diarization for v1 needs.
- Finalized transcript metadata (timestamps/speakers/highlight anchoring) now requires post-record file ASR.

### 3) Workstream A: Capture + Fallback (v1)
- Add in-session highlight action during recording.
- Persist highlight timestamps per session.
- Persist unprocessed realtime transcript copy as fallback artifact.
- Status: implemented in code; pending manual validation.

### 4) Workstream B: Post-Record Recognition + Vocabulary (v1)
- Add COS staging path (BYOK upload) for recorded audio.
- Add file ASR submission and async task polling after recording stops.
- Add speaker diarization in finalized transcript structure from file ASR output.
- Expose vocabulary configuration UI in Settings (multiline textarea, one term per line).
- Sync textarea terms to customization API (`create_vocabulary`/`update_vocabulary`) and apply internal `vocabulary_id` to recognition requests.
- Persist speaker-attributed transcript and vocabulary metadata in history item.
- Status: implemented in code (COS staging + file ASR submit/poll/parse + status persistence); pending manual validation.

### 5) Workstream C: Transcript Artifact and Title (v1)
- Generate finalized markdown transcript from post-record file ASR sentence results.
- Provide fallback markdown content from raw realtime transcript when final pass fails.
- Generate one concise session title from finalized transcript + highlights.
- Apply fallback title immediately and replace with LLM title on completion.
- Persist markdown URI, title, and generation status.
- Status: implemented in code (success/fallback markdown modes + best-source title generation); pending manual validation.

### 6) Workstream D: Export Features (v1)
- Auto-export markdown to `Downloads` after each finalized session.
- Add manual markdown export action from history/detail.
- Add manual audio export action from history/detail.
- Ensure export works for completed sessions even after app restart.
- Status: implemented and carried forward; validate behavior with both final-pass success and fallback transcript sessions.

## Validation Gates
- Typecheck and CI pass.
- Android APK build passes on GitHub Actions.
- Manual phone test confirms end-to-end v1 flow:
  - save API key and edit/clear multiline vocabulary setting in Settings
  - start recording and place highlights
  - transcript updates while speaking
  - stop recording and finalize session
  - raw realtime fallback transcript is persisted for the session
  - COS staging path works (upload mode)
  - signed URL expiry/fetch failure path is handled safely
  - file ASR final pass status transitions are visible (`pending` -> `completed|failed`)
  - session appears in History with speaker-attributed transcript when final pass succeeds
  - session fallback transcript remains usable when final pass fails
  - fallback title appears, then LLM title replacement status is handled correctly
  - finalized markdown format matches spec (header/time range/separator/sentence lines)
  - markdown auto-export succeeds
  - manual markdown and audio export both succeed
- Gate target: in progress (code rework completed; manual validation + CI/APK confirmation pending).

## References
- `docs/v1/delivery-plan.md`
- `docs/v1/technical-specification.md`
- `docs/v1/implementation-report.md`
