# V1 Implementation Report

Date: 2026-03-06

## Summary
A major architecture correction was identified in v1.
- Previous implementation used realtime ASR metadata for finalized sentence timestamps/speakers.
- Realtime ASR does not satisfy v1 diarization requirements.
- V1 must switch to post-record file ASR final pass for finalized transcript metadata.

Result: previous "implementation complete" status is no longer valid for v1 acceptance.

## Still Valid From Prior Implementation
- Recording flow:
  - highlight button during active recording,
  - `tapMs` capture and persistence,
  - live transcript remains clean (no timestamps/speaker/highlight tags).
- Title generation:
  - fallback title at finalize (`Record YY-MM-DD hh:mm`),
  - async DeepSeek title generation and persisted replacement path,
  - failure-safe behavior (fallback retained, `titleStatus=failed`).
- Export:
  - markdown auto-export to Android `Downloads`,
  - manual markdown export in history/detail,
  - manual audio export in history/detail,
  - SAF directory permission caching and re-request fallback.
- Settings:
  - DashScope and DeepSeek BYOK key paths,
  - vocabulary textarea (one term per line),
  - vocabulary validation/sync/update/clear behavior.
- Storage baseline:
  - v1 schema (`session_history_v2`),
  - persisted export metadata and title status.

## Invalidated/Needs Rework
- Finalized sentence construction from realtime `sentence_end=true`.
- Timestamp extraction from realtime payload.
- Any speaker-label derivation from realtime payload fields.
- Highlight anchoring that depends on realtime-derived sentence timing.
- Any claim that v1 transcript metadata correctness is complete.

## Required Rework for V1 Acceptance
- Persist raw realtime transcript as unprocessed fallback artifact.
- Add post-record file ASR submission and async task polling.
- Build finalized sentence list (timestamps/speakers) from file ASR result only.
- Anchor highlights using file ASR sentence timing.
- Add explicit final-pass status handling (`pending/completed/failed`).
- Ensure markdown generation supports:
  - success path (file ASR enriched transcript),
  - fallback path (raw realtime transcript without fake speaker/timestamp tags).
- Re-run manual Android validation and CI/APK gates after rework.

## Validation Snapshot
- `npm run typecheck` in `mobile/`: passed (latest local run).
- End-to-end v1 acceptance: blocked until file-ASR final-pass rework is implemented and validated.

## Current Status
- Spec/docs: corrected to file-ASR final-pass model.
- Code: partially aligned, rework required.
- Release readiness: not ready.
