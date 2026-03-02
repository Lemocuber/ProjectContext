# Product Definition (V1)

Date: 2026-03-02

## Goal
Extend v0 capture into a review-and-export workflow with richer session structure and post-session outputs.

## In Scope
- Highlight marking during recording.
- Highlight timestamp persistence and transcript-window mapping after finalization.
- Speaker diarization in finalized transcript output.
- Custom vocabulary support for ASR sessions.
- LLM-generated session title (one output per session).
- LLM-generated markdown summary document (one output per session).
- Markdown export and audio export from session history/detail.

## Out of Scope (V1)
- Ask-AI recommendation/coach flow.
- Multi-user cloud sync and shared workspaces.
- Web/iOS parity.

## UX Requirements
- Record flow remains primary; highlight action is single tap while recording.
- History/detail view surfaces:
  - speaker-attributed transcript,
  - generated title,
  - generated markdown summary availability,
  - export actions for markdown and audio.
- LLM outputs must be distinguishable from raw transcript text.
- Export actions must provide clear success/failure feedback.

## Non-Goals
- Perfect diarization accuracy in noisy multi-speaker environments.
- Automatic vocabulary creation from transcript content.
- Multi-document summary generation per session.
