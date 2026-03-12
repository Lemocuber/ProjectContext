# Milestone 3 Implementation Spec

Date: 2026-03-13
Status: completed and validated on 2026-03-13.

## Goal
Define and implement the in-session "What do you think" flow, while also fixing prompt-context shaping for title generation so both AI features use simple bounded transcript context rules.

## Why This Slice
- Live suggestions and title generation have the same core problem: raw transcripts can become too long, mixed-language sessions make character counts unreliable, and the current model of "important moments" is too weak for prompt construction.
- The existing title flow sends the full chosen transcript text to the model, which does not scale well for longer sessions.
- Trying to make highlights influence live AI would add unnecessary runtime complexity for V2.

## Scope for This Slice
- Add the in-session "What do you think" action during active recording.
- Replace the recording-time highlight counter UI with a visible recording timer.
- Keep highlight behavior unchanged for V2:
  - highlight taps are still only reflected in finalized output after final-pass anchoring,
  - highlights do not influence live AI prompt shaping.
- Introduce a shared prompt-truncation helper used by both title generation and live suggestions.
- Budget transcript context by estimated tokens, not characters.
- Enforce cooldown and single in-flight request behavior for live suggestions.
- Keep live suggestions UI-only and out of History persistence in V2.

## Locked Decisions
- Prompt budgets are token-based.
- Title prompt context is `first 200 estimated tokens + last 300 estimated tokens`.
- Live suggestion prompt context is `last 400 estimated tokens`.
- Highlights do not influence title or live suggestion prompt shaping in V2.
- The recording-time highlight counter is replaced by the recording timer.
- For V2, approximate token estimation is acceptable if all prompt shaping depends on one shared helper and keeps conservative headroom.

## Explicitly Deferred Within Milestone 3
- Exact provider-billed token parity guarantees.
- Persisting live suggestion results into History.
- Highlight-aware prompt shaping.
- Sophisticated semantic reranking beyond simple transcript truncation.
- User-facing prompt-debug UI.

## Storage and State Rules
- Milestone 3 must not extend persisted History/session storage.
- Continue using the existing persisted session model for finalized artifacts and metadata.
- Continue using the existing highlight tap behavior for post-record final-pass anchoring only.
- V2 live suggestions may depend on the existing live transcript text plus bounded prompt shaping; they do not require a richer persisted transcript/highlight model.

## Token Budgeting Model
- Introduce a shared `estimateTokens(text)` helper behind a small adapter boundary.
- Implementation direction for V2:
  - use a lightweight local weighted estimator rather than a bundled model tokenizer in the React Native runtime.
- Estimation rule:
  - CJK characters count as roughly `1`,
  - ASCII letters count as roughly `0.25`,
  - digits count as roughly `0.33`,
  - punctuation/symbols count lightly,
  - whitespace does not count.
- Callers must reserve budget for prompt instructions and model output; the transcript truncation budget applies only to transcript-derived content.
- Use direct front/back slicing against that estimated budget rather than loading a large tokenizer table into the mobile runtime.

## Prompt Context Rules

## Shared Helper Contract
- Input:
  - transcript text,
  - per-feature prompt mode (`title` or `liveSuggestion`).
- Output:
  - deterministic bounded transcript context text,
  - estimated token count for the returned context.

## "What Do You Think" Context
- Use the last 400 estimated tokens of transcript context only.
- Suggested formatting:
  - `Recent context:`
  - `{last 400 estimated tokens}`
- If the transcript is shorter than the budget, send it as-is with no synthetic ellipsis.
- Prompt framing should ask for concise, immediate, actionable guidance for the current conversation moment.

## Title Context
- Use the first 200 estimated tokens plus the last 300 estimated tokens.
- Suggested formatting:
  - `Beginning:`
  - `{first 200 estimated tokens}`
  - `...`
  - `Ending:`
  - `{last 300 estimated tokens}`
- If the transcript is short enough that the first and last ranges would overlap, collapse to a single deduplicated transcript block rather than repeating the middle.
- This replaces the current "send the whole transcript" behavior.

## Highlight and Transcript UI Behavior
- During recording, the current highlight counter text is removed.
- The freed UI space is used for the recording timer.
- Highlight behavior remains unchanged:
  - tapping highlight continues to record highlight taps for post-record anchoring,
  - finalized markdown still emits `[!IMPORTANT]` on anchored lines after final-pass,
  - live transcript display remains plain transcript text with no synthetic marker rows.

## Service and Integration Notes
- The live suggestion service should receive already-shaped bounded transcript context rather than rebuilding truncation rules itself.
- Title generation should switch from raw full-transcript input to the shared bounded-context helper output.
- Live suggestion cooldown and in-flight guards remain part of the recording orchestration layer, not the prompt helper.

## Implementation Plan
1. Add the shared transcript truncation helper and token estimation helper.
2. Update the Record screen to show the timer in the former highlight-counter slot.
3. Implement the live suggestion service and wire cooldown plus single in-flight protection.
4. Switch title generation to use bounded transcript context.
5. Run integrated validation for long sessions and mixed-language sessions.

## Validation Targets
- Long recordings do not send unbounded transcript context to either AI feature.
- Mixed-language sessions still stay within budget because prompt sizing is token-based rather than character-based.
- Finalized markdown still anchors highlights correctly from `tapMs`.
- Live suggestions use only the bounded recent transcript tail.
- Title generation uses bounded beginning-plus-ending transcript context instead of the full transcript.
- Cooldown and single in-flight rules prevent repeated live suggestion bursts during active recording.

## Implementation Status
- 2026-03-13: replaced the failed bundled-tokenizer approach with a lightweight weighted estimator for transcript truncation on mobile.
- 2026-03-13: title generation switched from full-transcript input to bounded beginning-plus-ending context.
- 2026-03-13: added live DeepSeek suggestion requests during recording with cooldown and single in-flight guards.
- 2026-03-13: replaced the recording-time highlight counter UI with a timer while leaving highlight behavior otherwise unchanged.
- 2026-03-13: mobile typecheck passed after the Milestone 3 implementation pass.

## Notes for Follow-Up
- If a future version needs exact model-token parity, move tokenization off the Hermes mobile runtime path rather than bundling a large tokenizer table directly into the app.
- If suggestion quality is noisy with partial transcript text, prefer trimming unstable trailing partials before truncation rather than widening the prompt budget.
