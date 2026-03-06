# V1 Changelog

This file tracks dated scope corrections and UI/doc updates for the v1 spec pack.

## 2026-03-07
- Device compatibility update: app root safe-area handling uses `react-native-safe-area-context` to honor camera/cutout insets across devices.
- Android status-bar update: status bar runs translucent/transparent for edge-to-edge background continuity.
- UI tuning update: speaker-mode selector chip widths are weighted for faster scanning (`Auto` wider, numbered chips narrower).

## 2026-03-06
- Correction: finalized transcript metadata in v1 is sourced from post-record file ASR, not realtime ASR.
- Launch hardening: v1 supports build-time defaults from `mobile/assets/ProjectContext.config.json` with section hide/discard behavior and internal COS runtime policy knobs.
- UI polish: record controls use icons, post-stop review uses discard/continue split actions with two-tap discard confirmation, and recording transcript auto-scroll resumes after 15s inactivity.
- Scope change: pre-record speaker-mode selector (`auto`, `1 person no diarization`, `2 person`, `3 person`) controls file-ASR final-pass diarization parameters.
