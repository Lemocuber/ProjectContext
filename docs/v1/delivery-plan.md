# Delivery Plan (V1)

Date: 2026-03-06

## Implementation Status (Correction)
- Previous v1 implementation plan assumed realtime ASR sentence metadata as final transcript source.
- This is invalid for diarization requirements.
- v1 is re-scoped to use post-record file ASR final pass for all final transcript metadata.
- Architecture rework is implemented in code.
- Acceptance and release gates are completed (manual Android validation + CI/APK confirmation).

## Milestone 1: Capture and Fallback Baseline
- Keep realtime transcript for in-session display.
- Persist raw realtime transcript as unprocessed fallback artifact.
- Persist highlight tap timestamps with session metadata.
- Keep vocabulary configuration UI in Settings (multiline textarea, one term per line).
- Keep vocabulary sync wiring (`create_vocabulary`/`update_vocabulary`).
- Add build-time settings preload from `assets/ProjectContext.config.json` with section-level hide/discard behavior.

## Milestone 2: Post-Record Recognition Final Pass
- Stage audio to COS after recording finalize.
- Add pre-record speaker-mode selector to control final-pass diarization behavior.
- Submit recorded audio to file ASR at finalize.
- Poll/query async task until terminal state.
- Parse finalized sentence-level timing and diarization output from file ASR results.
- Persist `finalPassStatus` and sentence-level finalized transcript structure.
- Anchor highlight taps to sentence lines only after file ASR success.

## Milestone 3: Artifact, Title, and Export
- Generate finalized markdown transcript from file ASR sentence results.
- Fallback to raw realtime transcript artifact when file ASR fails.
- Apply title fallback strategy (`Record YY-MM-DD hh:mm`) at finalize.
- Run asynchronous LLM title generation and replacement logic.
- Auto-export markdown transcript to `Downloads`.
- Keep manual markdown/audio export actions for completed sessions.

## Acceptance Criteria (V1)
- User can place highlights while recording.
- Live transcript remains clean (no timestamp/speaker/highlight tags).
- Raw realtime transcript is persisted for every session as fallback.
- Session final pass uses an accessible COS HTTPS signed URL generated for app-uploaded audio.
- Before recording starts, user can select final-pass speaker mode: auto (default), 1-person no diarization, 2-person hint, 3-person hint.
- File ASR request parameters reflect selected speaker mode exactly.
- Realtime ASR path remains unchanged by speaker-mode selection.
- Signed URL validity is handled explicitly (no silent success assumptions when URL expires).
- Finalized markdown transcript uses file ASR output for sentence timestamps and speaker labels.
- Highlight taps resolve to sentence-level `[!IMPORTANT]` markers only when file ASR succeeds.
- Completed sessions include inline `[Speaker N]` labels when diarization data exists; omit labels when absent.
- If file ASR fails, session remains usable with realtime fallback transcript and no fabricated speaker/timestamp tags.
- User can set/update/clear vocabulary terms in Settings UI via multiline textarea (one term per line).
- Vocabulary settings apply globally (no per-session override in v1).
- Any section fully supplied in `assets/ProjectContext.config.json` is hidden from Settings.
- Incomplete config sections are discarded and fall back to editable Settings storage.
- If all four sections are complete in config, Settings tab is hidden.
- Each completed session has immediate fallback title, later replaced by LLM title when generation succeeds.
- Markdown auto-export runs after finalize to `Downloads`.
- Markdown auto-export runs after final-pass completion and title-generation attempt to ensure final title/content are exported.
- Auto-export failure does not retry automatically on next app launch.
- Auto-export emits toast feedback for success/failure.
- Manual markdown/audio export actions are available in history/detail.
- Core capture persistence remains intact even if file ASR/title generation/export fail.

## Validation Gates
- Typecheck and CI pass.
- Android APK build passes on GitHub Actions.
- Manual phone validation confirms:
  - highlight capture during active recording,
  - realtime transcript display remains clean while speaking,
  - raw realtime transcript fallback is persisted,
  - COS upload path validates successfully,
  - signed URL remains valid through recognition completion in normal latency cases,
  - expired/invalid URL path fails safely and records failure reason,
  - post-record file ASR task submission/polling succeeds,
  - pre-record speaker-mode UI shows a one-line inline chip row (`Auto/1/2/3`) with badge+icon only (no text labels),
  - selected speaker mode maps correctly to final-pass request parameters (`diarization_enabled`, optional `speaker_count`),
  - diarization visibility/fallback behavior matches spec,
  - fallback behavior when file ASR fails is safe and visible,
  - fallback title then LLM-title replacement behavior,
  - markdown content formatting contract for success and fallback paths,
  - markdown auto-export to `Downloads`,
  - manual markdown export success,
  - manual audio export success.
