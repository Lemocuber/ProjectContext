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

### Phase 2: V1 Capture Intelligence (Completed)
- Add highlight button during recording.
- Save highlight timestamps.
- Persist an unprocessed realtime transcript copy for fallback.
- Run post-record file ASR after finalize to produce sentence-level timing metadata.
- Add pre-record speaker-mode selector for file-ASR final pass (`auto`, `1 person no diarization`, `2 person`, `3 person`).
- Map highlights to finalized sentence lines from file ASR results.
- Add speaker diarization in finalized transcript output from file ASR only.
- Add custom vocabulary textarea UI (one term per line), sync to vocabulary service, and apply internal `vocabulary_id` to recognition requests.
- Support zero-backend COS staging (BYOK upload) for post-record file ASR.
- Support build-time default settings preload from bundled `assets/ProjectContext.config.json` with section-level hide/discard behavior.

### Phase 3: V1 Title and Export (Completed)
- Add LLM-generated session title after finalization.
- Add finalized markdown transcript artifact with timestamped sentence lines.
- Add markdown auto-export to `Downloads` after finalize.
- Add manual markdown and audio export from session history/detail.
- Keep fallback title until LLM title generation completes.
- If file ASR fails, keep a fallback transcript artifact sourced from stored raw realtime transcript.

### Phase 4: V2 Resilience + Cloud Sync + Live AI Assist (Completed 2026-03-13, Alpha 1.2.0)
- Add recording keepalive on Android so active sessions survive screen lock, app backgrounding, and in-app tab changes.
- Move recording/session lifecycle ownership from screen scope to persistent app-level service orchestration.
- Add cloud-backed remote artifact storage (audio + transcript markdown + session metadata) with cross-device history sync.
- Keep discard behavior local-only (no upload for discarded recordings).
- Add in-session "What do you think" action during recording using realtime transcript context for immediate suggestions.
- Add privacy-safe remote diagnostics and manual report support so field failures are debuggable.

### Phase 5: Product Hardening (Future)
- Deeper observability and diagnostics beyond the V2 baseline.
- Improved offline/retry behavior.
- Privacy controls and data governance.

## Success Criteria By Stage
- Phase 1: v0 accepted on-device with reliable realtime final transcripts and browseable local history.
- Phase 2: users can mark key moments, complete post-record file ASR, and view speaker-attributed finalized transcripts with fallback when final pass fails.
- Phase 3: users get fallback-to-LLM title behavior, finalized markdown transcripts, and reliable export flows.
- Phase 4: users keep recording continuity under lock/background/tab-switch, get cloud-synced history across devices, can request useful in-session AI suggestions, and expose actionable remote diagnostics without leaking transcript, prompt, or credential material.
- Phase 5: stable enough for wider pilot use.
