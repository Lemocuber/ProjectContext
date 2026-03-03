# V1 Implementation Report

Date: 2026-03-03

## Summary
V1 core implementation is complete in the mobile app codebase and aligned to the locked v1 spec. Remaining work is validation on physical Android devices and CI/build confirmation.

## Implemented Scope
- Recording flow:
  - highlight button during active recording
  - `tapMs` highlight capture and persistence
  - live transcript remains clean (no timestamps/speaker/highlight tags)
- ASR/session pipeline:
  - sentence-level finalize metadata capture from `sentence_end=true`
  - timestamp extraction (`begin_time`/`end_time` with fallbacks)
  - optional `vocabulary_id` injection on ASR startup
  - best-effort speaker label extraction from optional payload fields
- Transcript artifact:
  - finalized markdown generation and local markdown storage per session
  - required markdown format (`# title`, range/duration line, separator, sentence lines)
  - highlight anchoring to finalized sentence lines (`[!IMPORTANT]`)
- Title generation:
  - fallback title at finalize (`Record YY-MM-DD hh:mm`)
  - async DeepSeek title generation and persisted replacement path
  - failure-safe behavior (fallback retained, `titleStatus=failed`)
- Export:
  - markdown auto-export to Android `Downloads` after finalize
  - manual markdown export in history/detail
  - manual audio export in history/detail
  - SAF directory permission caching for `Downloads`
  - graceful fallback to re-request directory permission when cached URI fails
- Settings:
  - DashScope key section (existing)
  - DeepSeek key section (same BYOK handling pattern)
  - vocabulary textarea (one term per line)
  - vocabulary validation/sync/update/clear behavior
- Data/storage:
  - v1 session history schema (`session_history_v2`)
  - no v0 -> v1 migration/backward compatibility path (intentional per decision)
  - persisted export metadata, title status, applied vocabulary snapshot

## Validation Performed
- `npm run typecheck` in `mobile/`: passed.

## Pending Validation
- Android phone manual validation for:
  - highlight behavior around sentence boundaries
  - vocabulary API sync behavior with real keys
  - DeepSeek title generation latency/failure cases
  - first-run and repeat-run `Downloads` export behavior via SAF
  - manual markdown/audio export success across app restarts
- CI and Android APK workflow run status for this implementation batch.

## Key Files Added/Updated
- `mobile/src/screens/RecordScreen.tsx`
- `mobile/src/screens/SettingsScreen.tsx`
- `mobile/src/screens/HistoryScreen.tsx`
- `mobile/src/services/asr/dashscopeRealtimeSession.ts`
- `mobile/src/services/asr/types.ts`
- `mobile/src/services/export/downloadsExportService.ts`
- `mobile/src/services/transcript/transcriptMarkdown.ts`
- `mobile/src/services/title/deepseekTitleService.ts`
- `mobile/src/services/vocabulary/dashscopeVocabularyService.ts`
- `mobile/src/services/vocabulary/vocabularyUtils.ts`
- `mobile/src/services/session/sessionFormatting.ts`
- `mobile/src/storage/sessionHistoryStore.ts`
- `mobile/src/storage/deepseekKeyStore.ts`
- `mobile/src/storage/vocabularySettingsStore.ts`
- `mobile/src/storage/exportSettingsStore.ts`
- `mobile/src/types/session.ts`

## Current Status
- Code: v1 implementation complete.
- Validation: partial (typecheck only).
- Release readiness: pending manual/CI gates.
