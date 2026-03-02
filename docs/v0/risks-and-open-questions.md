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
- Which final-pass ASR model/version to standardize on for cleanup?
- How much local session history is needed in v0 (single latest vs list)?
- Do we need export/share of transcript in v0 or v1?
