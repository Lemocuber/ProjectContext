# Risks and Open Questions (V1)

Date: 2026-03-02

## Risks
- Diarization quality may vary significantly by environment and overlap.
- Vocabulary misconfiguration can degrade recognition quality.
- LLM latency/cost can impact post-session turnaround and user trust.
- Export behavior can vary across Android versions and share targets.

## Mitigations
- Preserve non-diarized transcript as baseline fallback.
- Validate vocabulary ID format and allow opt-out per user/session.
- Keep LLM outputs optional with explicit failure states.
- Add export error handling and retry path without data loss.

## Open Questions
- Which LLM model and prompt budget are acceptable for title + markdown summary?
- Should title/summary generation run automatically or require a user-triggered action?
- Should markdown export include full transcript by default or summary-first with optional appendix?
- Do we need per-session vocabulary override, or is a global setting enough for v1?
