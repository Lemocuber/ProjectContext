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

### Phase 2: V1 Capture Intelligence (Planned)
- Add highlight button during recording.
- Save highlight timestamps.
- Persist an unprocessed realtime transcript copy for fallback.
- Run post-record file ASR after finalize to produce sentence-level timing metadata.
- Map highlights to finalized sentence lines from file ASR results.
- Add speaker diarization in finalized transcript output from file ASR only.
- Add custom vocabulary textarea UI (one term per line), sync to vocabulary service, and apply internal `vocabulary_id` to recognition requests.
- Support zero-backend COS staging (BYOK upload) for post-record file ASR.
- Support build-time default settings preload from bundled `assets/config.json` with section-level hide/discard behavior.

### Phase 3: V1 Title and Export (Planned)
- Add LLM-generated session title after finalization.
- Add finalized markdown transcript artifact with timestamped sentence lines.
- Add markdown auto-export to `Downloads` after finalize.
- Add manual markdown and audio export from session history/detail.
- Keep fallback title until LLM title generation completes.
- If file ASR fails, keep a fallback transcript artifact sourced from stored raw realtime transcript.

### Phase 4: Ask AI Insights (Planned)
- Add "What do you think" action after session finalization.
- Use transcript + highlights as prompt context.
- Return concise actionable insights.

### Phase 5: Product Hardening (Planned)
- Better observability and diagnostics.
- Improved offline/retry behavior.
- Privacy controls and data governance.

## Success Criteria By Stage
- Phase 1: v0 accepted on-device with reliable realtime final transcripts and browseable local history.
- Phase 2: users can mark key moments, complete post-record file ASR, and view speaker-attributed finalized transcripts with fallback when final pass fails.
- Phase 3: users get fallback-to-LLM title behavior, finalized markdown transcripts, and reliable export flows.
- Phase 4: users get useful context-aware AI feedback.
- Phase 5: stable enough for wider pilot use.
