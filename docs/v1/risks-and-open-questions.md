# Risks and Open Questions (V1)

Date: 2026-03-03

## Risks
- Diarization quality may vary significantly by environment and overlap.
- Vocabulary misconfiguration can degrade recognition quality.
- LLM title latency can delay replacement of fallback title.
- Auto-export behavior to `Downloads` can vary across Android versions and permissions.
- Highlight taps near sentence boundaries may anchor to user-unexpected lines.

## Mitigations
- Preserve non-diarized transcript as baseline fallback (omit speaker labels when unavailable).
- Validate vocabulary textarea input (trim/dedupe/empty-line handling) and fail safely when sync API errors occur.
- Keep fallback title always available; treat LLM title as optional enhancement.
- Keep in-app markdown copy as source-of-truth even if export fails, plus manual export path.
- Use deterministic highlight anchoring rules and test boundary cases.

## Resolved Decisions (2026-03-03)
- LLM title generation uses DeepSeek via BYOK for v1.
- Vocabulary configuration is global in Settings for v1 (no per-session override).
- Auto-export does not retry automatically on next launch after failure; manual export remains the retry path.
- Auto-export shows toast feedback for success/failure.
- V1 storage is a clean schema break from v0 (no migration/backward compatibility path required).
- Android `Downloads` export uses Expo SAF permission with cached directory URI.
