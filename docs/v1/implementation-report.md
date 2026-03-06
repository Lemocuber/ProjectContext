# V1 Implementation Report

Date: 2026-03-06

## Summary
V1 code was migrated to the corrected architecture where final transcript metadata is produced only from post-record file ASR.

## Implemented In This Pass
- Session model/storage updates:
  - added `realtimeTranscriptRaw` fallback field,
  - added final-pass metadata fields (`finalPassStatus`, `finalPassTaskId`, `finalPassFailureReason`, `sourceAudioRemoteUrl`, `sourceAudioObjectKey`).
- Settings updates:
  - added Tencent COS BYOK configuration UI and secure persistence (`bucket/region/credentials/prefix/url-expiry/timeout/cleanup`).
- Realtime ASR handoff updates:
  - realtime session final event now returns transcript + audio only,
  - realtime sentence timing/speaker output is no longer consumed as finalized metadata.
- Zero-backend staging and final pass:
  - added COS signing utilities,
  - added audio upload to COS with signed URL generation,
  - added optional best-effort staged object cleanup,
  - added DashScope recorded-recognition submit + poll + transcription fetch.
- Final transcript assembly:
  - parse sentence timing/speaker labels from file-ASR output,
  - anchor highlight taps only after successful file ASR,
  - fallback safely to raw realtime transcript when final pass fails/timeouts.
- Markdown/title/export flow updates:
  - success markdown path uses sentence-level timestamp/speaker/highlight markers,
  - fallback markdown path writes plain transcript lines without synthetic timestamp/speaker tags,
  - title generation uses best available transcript source.
- History/detail updates:
  - surfaced final-pass status and failure reason in session details.
- Default settings and Settings UX updates:
  - added `mobile/assets/config.json` preload contract with lowercase keys (`dashscopeKey`, `deepseekKey`),
  - added section-level validation/discard behavior (invalid or partial section ignored),
  - hidden settings sections when complete defaults are present,
  - hidden Settings tab when all four sections are prefilled,
  - removed optional COS user-edit fields from Settings (`session token`, `credential expiry`, `key prefix`, per-user TTL/timeout/cleanup),
  - moved COS runtime policy knobs to `config.internal` (`signedUrlTtl`, `finalPassTimeout`, `cosCleanupEnabled`) with timeout in seconds.

## Root Cause Coverage
- Root cause: finalized transcript metadata previously came from realtime ASR, which is insufficient for diarization.
- Follow-through checks:
  - removed finalized metadata consumption from realtime event shape,
  - moved finalized sentence derivation to recorded/file ASR service path,
  - updated markdown generation to avoid fabricated metadata in fallback mode.

## Post-Implementation Fixes
- Adjusted file-ASR parsing to use sentence containers only (`sentences` -> `segments` -> `utterances`) and avoid word-level token lines being rendered as transcript sentences.
- Changed completed-session transcript persistence so History displays the same markdown content as the exported transcript artifact.
- Moved markdown auto-export to run after final-pass completion and title-generation attempt, so exported filenames/content use the final chosen title.
- Updated filename sanitization to blacklist-only filtering so non-Latin titles are preserved.
- Updated record-screen controls and review UX:
  - replaced start/stop text with icon-only record control,
  - changed post-stop flow to explicit split decision (`discard` or `continue`) before final-pass processing,
  - added two-tap confirmation arming for discard action.
- Added transcript auto-scroll behavior for active recording:
  - auto-scroll only when near bottom,
  - pause on user scroll-away,
  - resume automatically after >15s user scroll inactivity.

## Validation Snapshot
- `npm run typecheck` in `mobile/`: passed after record-screen UI tweak pass.
- Manual Android phone validation and CI/APK gates: pending.

## Current Status
- Spec/docs: aligned to file-ASR final-pass model.
- Code: migrated to final-pass architecture.
- Release readiness: pending manual E2E validation and CI/APK gate confirmation.
