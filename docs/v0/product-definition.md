# Product Definition (V0)

## Goal
Ship an Android-first prototype to record conversations and produce:
1. Fast, real-time transcript while recording.
2. Polished final transcript after recording stops.

## In Scope
- Android app built with React Native + Expo prebuild.
- BYOK flow: user manually enters DashScope API key in app.
- Recording screen with a large Start/Stop button.
- Live transcript area that updates during recording.
- Final cleaned transcript view after recording stops.
- Local persistence for transcript artifacts (minimum viable session history).

## Out of Scope (V0)
- Highlight button while recording.
- Ask AI analysis button.
- LLM cleanup/summarization pass.
- Multi-platform support (iOS/web).
- Team/workspace sync and account system.

## UX Requirements
- Primary action must be obvious and thumb-friendly.
- Distinguish transcript states clearly:
  - `Live Draft` (unstable, low latency)
  - `Final Cleaned` (post-processed result)
- Error states:
  - Missing/invalid API key
  - Network interruption
  - Microphone permission denied

## Non-Goals
- Perfect diarization/speaker labeling in v0.
- Enterprise-grade key governance.
- Multi-stage transcript post-processing pipeline in v0.
