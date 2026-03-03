# Execution Plan

## Current Sprint Focus
1. Lock v1 scope and acceptance criteria in docs.
2. Implement v1 in dependency order: capture features -> final markdown transcript -> title generation -> export.

## Detailed Work Items

### 1) Baseline (as of 2026-03-02)
- Session persistence: implemented (bounded recent list, completed/failed entries).
- Session audio persistence: implemented (WAV saved locally and linked from history).
- Realtime reliability guardrails: implemented (timeouts + reconnect/backoff + finalize fallback).
- Final transcript path: realtime-derived, single transcript surface (no live/final split in v0).
- History UX: implemented (History tab + detail card + in-app player with scrubber/timestamps).
- Status: complete and accepted as v0 baseline.

### 2) Workstream A: Highlight Marking (v1)
- Add in-session highlight action during recording.
- Persist highlight timestamps per session.
- Resolve each timestamp to finalized sentence lines after session finalization.
- Status: implemented in code; pending manual phone validation.

### 3) Workstream B: Speaker and Vocabulary (v1)
- Add speaker diarization in finalized transcript structure.
- Expose vocabulary configuration UI in Settings (multiline textarea, one term per line).
- Sync textarea terms to customization API (`create_vocabulary`/`update_vocabulary`) and apply internal `vocabulary_id` to ASR session start payload.
- Persist speaker-attributed transcript and vocabulary metadata in history item.
- Status: implemented in code; pending manual phone validation.

### 4) Workstream C: Transcript Artifact and Title (v1)
- Generate finalized markdown transcript from sentence-level ASR results.
- Generate one concise session title from finalized transcript + highlights.
- Apply fallback title immediately and replace with LLM title on completion.
- Persist markdown URI, title, and generation status.
- Status: implemented in code; pending manual phone validation.

### 5) Workstream D: Export Features (v1)
- Auto-export markdown to `Downloads` after each finalized session.
- Add manual markdown export action from history/detail.
- Add manual audio export action from history/detail.
- Ensure export works for completed sessions even after app restart.
- Status: implemented in code; pending manual phone validation.

## Validation Gates
- Typecheck and CI pass.
- Android APK build passes on GitHub Actions.
- Manual phone test confirms end-to-end v1 flow:
  - save API key and edit/clear multiline vocabulary setting in Settings
  - start recording and place highlights
  - transcript updates while speaking
  - stop recording and finalize session
  - session appears in History with speaker-attributed transcript
  - fallback title appears, then LLM title replacement status is handled correctly
  - finalized markdown format matches spec (header/time range/separator/sentence lines)
  - markdown auto-export succeeds
  - manual markdown and audio export both succeed
- Gate target: in progress (implementation complete, validation pending).

## References
- `docs/v1/delivery-plan.md`
- `docs/v1/technical-specification.md`
- `docs/v1/implementation-report.md`
