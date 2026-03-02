# Risks and Open Questions (V0)

## Risks
- BYOK client-side key exposure risk remains (prototype accepted risk).
- Real-time quality depends on chunking strategy and network variability.
- Expo managed workflow alone is insufficient for low-level audio streaming; native bridge required.

## Mitigations
- Use secure storage + no key logging.
- Keep streaming parameters configurable for tuning.
- Use Expo prebuild and maintain native Android module in-repo.

## Open Questions
- Should v0 history keep only recent local sessions or also include delete/export controls?
- What v1 LLM cleanup/summarization quality bar and cost budget are acceptable per session?
- Do we need export/share of transcript in v1?

## Status Update (2026-03-02)
- v1 scope now includes markdown/audio export and LLM-generated session title + markdown summary.
- Remaining decision: acceptable quality/cost bar and default generation trigger behavior.
