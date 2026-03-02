# Product Definition (V0)

## Goal
Ship an Android-first prototype to record conversations and produce:
1. Fast, real-time transcript while recording.
2. Persisted session artifacts (transcript + recorded audio) after stop.

## In Scope
- Android app built with React Native + Expo prebuild.
- BYOK flow: user manually enters DashScope API key in app.
- Recording screen with a large Start/Stop button.
- Single transcript area that updates during recording and remains after stop.
- Local persistence for transcript artifacts and recorded audio (minimum viable session history).

## Out of Scope (V0)
- Highlight button while recording.
- Ask AI analysis button.
- LLM cleanup/summarization pass.
- Multi-platform support (iOS/web).
- Team/workspace sync and account system.

## UX Requirements
- Primary action must be obvious and thumb-friendly.
- Show one transcript surface (no live/final split in v0).
- Error states:
  - Missing/invalid API key
  - Network interruption
  - Microphone permission denied

## Non-Goals
- Perfect diarization/speaker labeling in v0.
- Enterprise-grade key governance.
- Multi-stage transcript post-processing pipeline in v0.
