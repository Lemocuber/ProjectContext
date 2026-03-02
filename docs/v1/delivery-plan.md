# Delivery Plan (V1)

Date: 2026-03-02

## Milestone 1: Capture Enrichment
- Add highlight control during recording.
- Persist highlight timestamps with session metadata.
- Map highlights to transcript windows after finalize.
- Add speaker diarization persistence path.
- Add optional vocabulary configuration and ASR request wiring.

## Milestone 2: LLM Outputs
- Add generation pipeline for session title.
- Add generation pipeline for markdown summary document.
- Persist generation state/results and expose in history/detail UI.

## Milestone 3: Export
- Add markdown export action for completed sessions.
- Add audio export action for completed sessions.
- Ensure export behavior survives app restart and repeated usage.

## Acceptance Criteria (V1)
- User can place highlights while recording and see resolved highlight snippets after finalization.
- Completed sessions store speaker-attributed transcript segments when available.
- Session can be recorded using configured vocabulary ID.
- Each completed session can produce:
  - one LLM-generated title,
  - one markdown summary document.
- User can export markdown summary and recorded audio from history/detail.
- Core capture persistence remains intact even if LLM output fails.

## Validation Gates
- Typecheck and CI pass.
- Android APK build passes on GitHub Actions.
- Manual phone validation confirms:
  - highlight capture during active recording,
  - diarization visibility/fallback behavior,
  - vocabulary-enabled ASR session startup,
  - title + summary generation status handling,
  - markdown export success,
  - audio export success.
