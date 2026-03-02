# Overall Roadmap

## Product Direction
Project Context starts as an Android-first voice capture tool with real-time transcript and grows into a context intelligence app.

## Milestones

### Phase 0: Prototype Foundation (Completed)
- Android app scaffold with React Native + Expo prebuild.
- BYOK (manual DashScope API key input and secure storage).
- Large record button and single transcript UI.
- Real-time ASR pipeline with DashScope WebSocket.
- GitHub Actions Android APK build for non-`main` branches.

### Phase 1: V0 Completion and Validation (Completed)
- Persist session history locally (record metadata + transcript + audio artifacts). (Done)
- Improve reliability for weak networks and long sessions. (Done)
- Complete Android phone stability matrix and finalize v0 acceptance. (Done)

### Phase 2: Context Controls (Planned)
- Add highlight button during recording.
- Save highlight timestamps.
- Map highlights to transcript windows after finalization.

### Phase 3: LLM Cleanup and Summary (Planned, v1)
- Add LLM-based transcript cleanup after session finalization.
- Add concise session summarization output.
- Keep cleanup/summarization optional and auditable against raw transcript text.

### Phase 4: Ask AI Insights (Planned)
- Add "What do you think" action after session finalization.
- Use transcript + highlights as prompt context.
- Return concise actionable insights.

### Phase 5: Product Hardening (Planned)
- Better observability and diagnostics.
- Improved offline/retry behavior.
- Privacy controls and data export.

## Success Criteria By Stage
- Phase 1: v0 accepted on-device with reliable realtime final transcripts and browseable local history.
- Phase 2: users can quickly mark and revisit key moments.
- Phase 3: users get cleaner transcripts plus useful concise summaries.
- Phase 4: users get useful context-aware AI feedback.
- Phase 5: stable enough for wider pilot use.
