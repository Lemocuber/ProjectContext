# Risks and Open Questions (V1)

Date: 2026-03-06

## Risks
- File ASR final pass introduces additional latency before finalized transcript becomes available.
- Async file ASR jobs can fail (upload/network errors, queue delays, task failures).
- Zero-backend BYOK COS mode can expose long-lived credentials on device if permanent keys are used.
- Signed URL expiry can happen before async recognition completes.
- Diarization quality may vary by environment and speaker overlap.
- Vocabulary misconfiguration can degrade recognition quality.
- LLM title latency can delay replacement of fallback title.
- Auto-export behavior to `Downloads` can vary across Android versions and permissions.
- Highlight taps near sentence boundaries may anchor to user-unexpected lines.
- Realtime transcript and final-pass transcript may differ, which can confuse users without clear state messaging.

## Mitigations
- Persist raw realtime transcript for every session as explicit fallback.
- Treat file ASR transcript as source of truth only when final pass succeeds.
- Expose final-pass status (`pending/completed/failed`) in history/detail.
- Prefer temporary credentials and least-privilege COS permissions when possible.
- Default to longer signed URL TTL and map expiry to explicit recoverable failure state.
- Keep fallback title always available; treat LLM title as optional enhancement.
- Validate vocabulary textarea input (trim/dedupe/empty-line handling) and fail safely when sync API errors occur.
- Keep in-app markdown copy as source-of-truth even if export fails, plus manual export path.
- Use deterministic highlight anchoring rules and test boundary cases.
- Add manual retry path for failed final-pass sessions in follow-up iteration.

## Open Questions
- Should failed file ASR sessions auto-retry once under good connectivity, or remain manual-retry only in v1?
- Should fallback markdown explicitly include a warning header when generated without file ASR timestamps/speakers?
- What is the maximum acceptable wait time for final-pass recognition before surfacing a timeout state?
- For zero-backend mode, do we allow permanent COS keys in-app or require user-provided temporary credentials only?

## Resolved Decisions (2026-03-06)
- Realtime ASR is display-only for v1; it is not used for finalized timestamp/speaker metadata.
- Final timestamps/speaker labels/highlight anchoring come from post-record file ASR output.
- Raw realtime transcript is persisted as unprocessed fallback when final pass fails.
- Zero-backend staging via Tencent COS BYOK is allowed for v1.
- LLM title generation uses DeepSeek via BYOK for v1.
- Vocabulary configuration is global in Settings for v1 (no per-session override).
- Auto-export does not retry automatically on next launch after failure; manual export remains the retry path.
- Auto-export shows toast feedback for success/failure.
- V1 storage remains a clean schema break from v0 (no migration/backward compatibility path required).
- Android `Downloads` export uses Expo SAF permission with cached directory URI.
