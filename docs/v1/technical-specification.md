# Technical Specification (V1)

Date: 2026-03-02

## Scope Additions Over V0
- Highlight event capture and transcript alignment.
- Speaker diarization support in finalized transcript artifacts.
- Vocabulary integration for ASR requests.
- Post-session LLM generation:
  - session title
  - markdown summary document
- Session export actions:
  - markdown export
  - audio export

## Data Model Additions (Draft)
- SessionHistoryItem:
  - `highlights: number[]` (milliseconds from session start)
  - `highlightWindows?: Array<{ startMs: number; endMs: number; text: string }>`
  - `speakerSegments?: Array<{ speakerId: string; startMs: number; endMs: number; text: string }>`
  - `vocabularyId?: string`
  - `generatedTitle?: string`
  - `summaryMarkdownUri?: string`
  - `summaryStatus?: "pending" | "completed" | "failed"`
  - `exportMetadata?: { markdownExportedAt?: string; audioExportedAt?: string }`

## Recording and Finalization Pipeline
1. Start recording with selected ASR configuration (includes optional `vocabularyId`).
2. Capture highlight tap events as relative timestamps while recording.
3. On stop/finalize:
  - finalize transcript text,
  - resolve highlight timestamps to transcript windows,
  - persist enriched session artifact.
4. Trigger LLM generation jobs (title and markdown summary) against finalized transcript + highlights.
5. Persist LLM outputs and expose generation status in history/detail.

## Speaker Diarization
- Store speaker-attributed segments if provided by ASR stream/final response.
- If diarization is unavailable for a session, keep transcript usable and mark speaker data as unavailable.

## Vocabulary Support
- Add vocabulary configuration path in Settings (BYOK-compatible).
- Include configured `vocabularyId` in ASR task initialization payload.
- Persist the applied `vocabularyId` with session metadata.

## Markdown Summary Output
- Produce one markdown document per completed session.
- Include at minimum:
  - session title,
  - session metadata (date, duration),
  - concise summary sections,
  - highlight list,
  - optional speaker-attributed excerpt block.
- Save document to local app storage and reference via `summaryMarkdownUri`.

## Export
- Markdown export:
  - user action from history/detail exports generated markdown document.
- Audio export:
  - user action from history/detail exports recorded audio artifact.
- Export flow should work after app restart for previously completed sessions.

## Reliability and Failure Handling
- LLM generation failures do not invalidate core session persistence.
- Export failure must not mutate original stored artifacts.
- Missing optional artifacts (summary, diarization) should degrade gracefully in UI.
