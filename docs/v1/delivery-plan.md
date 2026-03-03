# Delivery Plan (V1)

Date: 2026-03-03

## Implementation Status (2026-03-03)
- Milestone 1 implementation: complete in code.
- Milestone 2 implementation: complete in code.
- Milestone 3 implementation: complete in code.
- Remaining for acceptance: manual Android phone validation and CI/APK gate confirmation.

## Milestone 1: Capture Enrichment
- Add highlight control during recording.
- Persist highlight tap timestamps with session metadata.
- Persist sentence-level finalized transcript segments from ASR `sentence_end=true` results.
- Add speaker diarization persistence path for finalized sentences.
- Add vocabulary configuration UI in Settings (multiline textarea, one term per line).
- Add vocabulary sync wiring (`create_vocabulary`/`update_vocabulary`) and ASR request wiring (`vocabulary_id` injection).

## Milestone 2: Final Transcript and Title
- Add finalized markdown transcript generation at stop/finalize.
- Anchor highlight taps to finalized sentence lines.
- Add title fallback strategy (`Record YY-MM-DD hh:mm`) at finalize.
- Add asynchronous LLM title generation pipeline and replacement logic.
- Persist title status/results and transcript markdown URI for history/detail UI.

## Milestone 3: Export
- Auto-export markdown transcript to `Downloads` after each finalized session.
- Add manual markdown export action for completed sessions.
- Add manual audio export action for completed sessions.
- Ensure export behavior survives app restart and repeated usage.

## Acceptance Criteria (V1)
- User can place highlights while recording.
- Live transcript remains clean (no timestamp/speaker/highlight tags).
- Finalized markdown transcript contains:
  - title line,
  - session time range/duration line with rounded minutes,
  - separator line,
  - sentence-level transcript lines with `[mm:ss]` timestamps.
- Highlight taps resolve to sentence-level `[!IMPORTANT]` markers.
- Completed sessions include inline `[Speaker N]` labels when diarization data exists; omit labels when absent.
- User can set/update/clear vocabulary terms in Settings UI via multiline textarea (one term per line).
- Vocabulary settings apply globally (no per-session override in v1).
- Save/update action syncs terms to vocabulary service and stores internal `vocabularyId`.
- Session startup request includes internal `vocabulary_id` when synced and omits it when cleared/unsynced.
- Completed session metadata stores the applied vocabulary snapshot (`appliedVocabularyId`, `appliedVocabularyTerms`).
- Each completed session has immediate fallback title, later replaced by LLM title when generation succeeds.
- Markdown auto-export runs after finalize to `Downloads`.
- Auto-export failure does not retry automatically on next app launch.
- Auto-export emits toast feedback for success/failure.
- Manual markdown/audio export actions are available in history/detail.
- Core capture persistence remains intact even if title generation or export fails.

## Validation Gates
- Typecheck and CI pass.
- Android APK build passes on GitHub Actions.
- Manual phone validation confirms:
  - highlight capture during active recording,
  - diarization visibility/fallback behavior,
  - vocabulary terms can be edited in multiline Settings textarea,
  - save/update triggers vocabulary sync API and stores internal `vocabulary_id`,
  - vocabulary-enabled ASR startup payload includes `vocabulary_id`,
  - cleared vocabulary removes `vocabulary_id` from startup payload,
  - fallback title then LLM-title replacement behavior,
  - markdown content formatting contract,
  - markdown auto-export to `Downloads`,
  - manual markdown export success,
  - manual audio export success.
