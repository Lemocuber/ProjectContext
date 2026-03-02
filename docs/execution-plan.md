# Execution Plan

## Current Sprint Focus
1. Lock v1 scope and acceptance criteria in docs.
2. Implement v1 in dependency order: capture features -> LLM outputs -> export.

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
- Resolve each timestamp to transcript windows after session finalization.
- Status: planned.

### 3) Workstream B: Speaker and Vocabulary (v1)
- Add speaker diarization in finalized transcript structure.
- Expose vocabulary configuration path (BYOK-compatible) and apply it to ASR session start.
- Persist speaker-attributed transcript and vocabulary metadata in history item.
- Status: planned.

### 4) Workstream C: LLM Session Outputs (v1)
- Generate one concise session title from finalized transcript + highlights.
- Generate one markdown session summary document.
- Persist generated outputs with source-session linkage and generation status.
- Status: planned.

### 5) Workstream D: Export Features (v1)
- Add markdown export action from history/detail.
- Add audio export action from history/detail.
- Ensure export works for completed sessions even after app restart.
- Status: planned.

## Validation Gates
- Typecheck and CI pass.
- Android APK build passes on GitHub Actions.
- Manual phone test confirms end-to-end v1 flow:
  - save API key and optional vocabulary setting
  - start recording and place highlights
  - transcript updates while speaking
  - stop recording and finalize session
  - session appears in History with speaker-attributed transcript
  - generated title and markdown summary are available
  - markdown and audio export both succeed
- Gate target: pending (v1 in progress).

## References
- `docs/v1/delivery-plan.md`
- `docs/v1/technical-specification.md`
