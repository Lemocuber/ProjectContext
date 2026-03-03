# Product Definition (V1)

Date: 2026-03-03

## Goal
Extend v0 capture into a review-and-export workflow with clear separation between live transcript and finalized markdown transcript artifacts.

## In Scope
- Live transcript remains raw/clean during recording.
- Highlight marking during recording (single tap, timestamped as `tapMs`).
- Final markdown transcript generated after finalize using ASR finalized sentence boundaries (`sentence_end=true`).
- Timestamp marker on every finalized sentence line.
- Inline diarization label when available (`[Speaker N]`); omit label if unavailable.
- Inline highlight marker on anchored lines (`[!IMPORTANT]`).
- Custom vocabulary configuration UI for ASR sessions:
  - multiline textarea in Settings,
  - one vocabulary term per line,
  - applied to new recordings after save,
  - global setting for all sessions in v1 (no per-session override).
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
- Record flow remains primary; highlight action is single tap while recording.
- Live transcript surface is clean text only (no timestamps, speaker labels, or highlight tags).
- History/detail view surfaces:
  - finalized transcript content,
  - generated title with fallback while pending,
  - export actions for markdown and audio.
- Settings includes a dedicated vocabulary configuration area:
  - multiline textarea input (one term per line),
  - save/update and clear actions,
  - success/error feedback for vocabulary sync.
- Auto-export status to `Downloads` must provide clear success/failure feedback.
- Auto-export flow provides toast feedback for success/failure.
- Manual export remains available after failures and after app restart.

## Non-Goals
- Perfect diarization accuracy in noisy multi-speaker environments.
- Automatic vocabulary creation from transcript content.
- Multi-artifact summary generation per session.
