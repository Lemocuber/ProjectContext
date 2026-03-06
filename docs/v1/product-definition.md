# Product Definition (V1)

Date: 2026-03-06

## Goal
Extend v0 capture into a review-and-export workflow with a strict two-stage transcript model:
- realtime transcript for live display only,
- post-record file recognition for final transcript artifacts.

## Core Principle (Corrected)
- Realtime ASR output is not the source of truth for final transcript metadata.
- Final timestamps, speaker labels, and highlight anchoring are produced only from post-record file ASR.
- The app still persists an unprocessed realtime transcript copy as a fallback artifact when file ASR fails.

## In Scope
- Live transcript remains raw/clean during recording.
- Build-time default settings asset (`mobile/assets/ProjectContext.config.txt`) with section-level preload/discard behavior.
- Persist raw realtime transcript (unprocessed) with the session.
- Highlight marking during recording (single tap, timestamped as `tapMs`).
- After stop, require an explicit post-record decision:
  - discard recording (two-tap confirmation),
  - continue to finalize (existing pipeline).
- Run file ASR recognition only after explicit continue on the post-record decision state.
- Build finalized sentence structure (timestamps + optional speaker labels) from file ASR results.
- Anchor highlights to finalized sentence lines using file ASR timestamps.
- Generate markdown transcript from finalized sentence structure.
- Inline diarization label when available (`[Speaker N]`); omit label if unavailable.
- Inline highlight marker on anchored lines (`[!IMPORTANT]`).
- Fallback behavior when file ASR fails/times out:
  - keep session and audio persisted,
  - keep raw realtime transcript available in history/detail,
  - allow retry/manual recovery path in later iteration.
- Zero-backend object staging for file ASR:
  - support BYOK Tencent COS configuration,
  - support app-uploaded COS object,
  - use signed/private URL flow by default.
- Custom vocabulary configuration UI in Settings (one term per line) and apply to recognition requests where supported.
- LLM-generated session title (one output per session, async replacement of fallback title).
- Markdown auto-export to `Downloads` after finalize.
- Manual export options for markdown and audio from history/detail.
- In-app transcript/artifact copy always retained regardless of export success.

## Out of Scope (V1)
- LLM markdown summary generation.
- Speaker name customization (future phase; V1 uses `[Speaker N]` labels only).
- Ask-AI recommendation/coach flow.
- Multi-user cloud sync and shared workspaces.
- Web/iOS parity.

## UX Requirements
- Record flow remains primary; record control uses start/stop icons.
- Highlight action is single tap while recording.
- After stop, replace highlight action area with split post-record controls:
  - left secondary discard icon button (narrower),
  - right primary continue icon button (wider).
- Discard requires two taps:
  - first tap arms confirmation and switches icon to an "are you sure" state,
  - second tap confirms discard.
- Live transcript surface is clean text only (no timestamps, speaker labels, or highlight tags).
- While recording, transcript view auto-scrolls to bottom when user is near bottom.
- If user scrolls away from bottom, auto-scroll pauses and resumes automatically after >15s scroll inactivity.
- Finalization flow includes a visible "post-record recognition" step before finalized markdown is marked complete.
- History/detail view surfaces:
  - finalized transcript content when file ASR succeeds,
  - raw realtime transcript fallback when file ASR fails,
  - generated title with fallback while pending,
  - export actions for markdown and audio.
- Settings includes a dedicated vocabulary configuration area:
  - multiline textarea input (one term per line),
  - save/update and clear actions,
  - success/error feedback for vocabulary sync.
- Settings includes a COS configuration area (BYOK path):
  - input/update credentials,
  - validation feedback for malformed config.
- Any settings section fully provided by `assets/ProjectContext.config.txt` is hidden from Settings UI.
- If all four sections are fully provided (`dashscope`, `deepseek`, `tencentCos`, `vocabulary`), the Settings tab is hidden.
- Auto-export status to `Downloads` must provide clear success/failure feedback.
- Auto-export flow provides toast feedback for success/failure.
- Manual export remains available after failures and after app restart.

## Non-Goals
- Perfect diarization accuracy in noisy multi-speaker environments.
- Automatic vocabulary creation from transcript content.
- Multi-artifact summary generation per session.
