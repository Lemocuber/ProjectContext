# Technical Specification (V1)

Date: 2026-03-03

## Scope Additions Over V0
- Highlight tap capture and sentence-level transcript anchoring.
- Speaker diarization labels in finalized transcript lines when available.
- Vocabulary integration for ASR requests.
- Post-session LLM generation:
  - session title only
- Finalized markdown transcript artifact generation.
- Session export actions:
  - markdown auto-export to `Downloads` after finalize
  - manual markdown export
  - manual audio export

## Transcript Modes
- Live transcript:
  - in-session display only
  - raw/clean text
  - no timestamps, no speaker tags, no highlight markers
- Finalized transcript:
  - generated after stop/finalize
  - markdown artifact with sentence-level timestamps
  - includes inline speaker/highlight markers based on finalized sentence metadata

## Data Model Additions (Locked)
- `SessionHistoryItem`:
  - `highlightTapsMs: number[]` (milliseconds from session start)
  - `finalizedSentences?: Array<{ startMs: number; endMs: number; text: string; speakerLabel?: string; isHighlight?: boolean }>`
  - `appliedVocabularyId?: string`
  - `appliedVocabularyTerms?: string[]`
  - `generatedTitle?: string`
  - `titleStatus?: "pending" | "completed" | "failed"`
  - `fallbackTitle: string`
  - `transcriptMarkdownUri?: string`
  - `exportMetadata?: { markdownExportedAt?: string; markdownLastPath?: string; markdownAutoExportStatus?: "completed" | "failed"; audioExportedAt?: string; audioLastPath?: string }`
- `VocabularySettings`:
  - `rawText: string` (textarea content, one term per line)
  - `terms: string[]` (trimmed, non-empty, de-duplicated)
  - `vocabularyId?: string` (managed internally, not user-entered)
  - `syncStatus?: "idle" | "syncing" | "failed"`
- Storage versioning:
  - V1 uses a clean schema break (`session_history_v2` and dedicated v1 settings keys).
  - No backward compatibility/migration from v0 persisted session shape is required.

## Recording and Finalization Pipeline
1. Start recording with selected ASR configuration (includes optional internally-managed `vocabularyId`).
2. Capture highlight taps as `tapMs` relative timestamps while recording.
3. Continue live transcript updates as raw text from ASR stream.
4. On each `sentence_end=true` event, append a finalized sentence record with timing/text data.
5. On stop/finalize:
  - lock finalized sentence list,
  - anchor highlight taps to finalized sentences,
  - persist enriched session artifact,
  - generate markdown transcript,
  - trigger title generation (LLM),
  - auto-export markdown to `Downloads`.
6. Persist title updates and export statuses for history/detail rendering.

## Sentence Timestamp Rule
- Finalized sentence timestamps are sourced from ASR payload fields:
  - primary: `sentence.begin_time` -> `startMs`
  - fallback 1: first word `begin_time`
  - fallback 2: previous sentence `endMs`
  - fallback 3: `0`
- `endMs`:
  - primary: `sentence.end_time`
  - fallback: last word `end_time`
  - fallback: `startMs`
- Timestamp display format in markdown lines: `[mm:ss]` from `startMs`.

## Highlight Anchoring Rule
- Store taps only as `tapMs` during recording.
- At finalize, for each tap:
  - anchor to sentence containing tap (`startMs <= tapMs <= endMs`);
  - else anchor to first sentence with `startMs > tapMs`;
  - else anchor to final sentence in session.
- Anchored sentence line gets `[!IMPORTANT]` marker.
- Multiple taps anchored to one sentence still render a single marker on that line.

## Speaker Diarization Rule
- If speaker information is available for a finalized sentence, render inline as `[Speaker N]`.
- If speaker information is unavailable, omit the speaker label entirely.
- Parse speaker identity as best-effort from optional ASR fields when present (for example: `speaker_id`, `speaker`, or `spk_id`), otherwise treat as unavailable.

## Title Generation Rule
- Fallback title is available immediately at finalize:
  - `Record YY-MM-DD hh:mm` (session start local time).
- LLM title generation runs asynchronously after finalize.
- LLM provider for v1: DeepSeek (BYOK).
- DeepSeek key handling in v1 follows the same UX/storage pattern as DashScope BYOK key handling:
  - secure local storage key/value,
  - masked display in Settings,
  - simple format validation before save,
  - clear action removes stored key.
- Prompt/output budget for v1: no hard token-budget gate; keep prompt concise and return one short title.
- On success, replace fallback title with generated title.
- On failure, keep fallback title and mark `titleStatus="failed"`.

## Markdown Transcript Output
- One markdown document per completed session.
- File content format:
  - line 1: `# {Title}`
  - line 2: `YY-MM-DD hh:mm - hh:mm{ (+1d when cross-day) } ({rounded minutes} minutes)`
  - line 3: `---`
  - remaining lines: `[mm:ss] [Speaker N] [!IMPORTANT] {sentence text}` (speaker/highlight tokens omitted when not applicable)
- Duration in minutes is rounded to nearest minute.
- Store markdown artifact in local app storage and reference via `transcriptMarkdownUri`.

## Filename and Export
- Markdown filename: `YYMMDD-{Title}.md` (sanitized for filesystem safety).
- Destination: user `Downloads` directory.
- Auto-export markdown once after each recording finalizes.
- Auto-export failure does not trigger background retry on next launch.
- Manual export actions remain available for:
  - markdown
  - audio
- In-app stored artifact is always retained even if any export fails.
- Export flow must continue to work after app restart for previously completed sessions.
- Android/Expo implementation contract:
  - use Storage Access Framework (SAF) directory permission for `Downloads`,
  - cache granted `Downloads` directory URI in local settings,
  - when no cached permission exists, request one-time directory permission (seeded with `Downloads` root),
  - auto-export fails gracefully when permission is denied/unavailable and records status as failed,
  - manual export action can re-request permission and retry.

## Vocabulary Support
- Add a dedicated Settings UI path for vocabulary configuration (BYOK-compatible):
  - multiline textarea input (`one term per line`),
  - save/update action,
  - clear action to disable vocabulary injection.
- Vocabulary scope for v1 is global app settings (no per-session override).
- Validate vocabulary terms before sync:
  - max 500 terms per vocabulary list,
  - per-term text limit:
    - if term contains any non-ASCII character: max 15 characters total,
    - if term is pure ASCII: max 7 space-separated tokens.
- If validation fails, block save/update and show inline error with the first failing line.
- On save/update:
  - parse textarea into terms (trim, remove empty lines, de-duplicate),
  - sync with DashScope customization API:
    - if no existing `vocabularyId`, call `create_vocabulary`,
    - if existing `vocabularyId`, call `update_vocabulary`,
  - store returned/existing `vocabularyId` internally.
- DashScope vocabulary REST contract for v1:
  - endpoint: `POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization`,
  - headers: `Authorization: Bearer <DashScopeKey>`, `Content-Type: application/json`,
  - request envelope:
    - `model: "speech-biasing"`,
    - `input.action`: one of `create_vocabulary | update_vocabulary | delete_vocabulary`,
    - `input.target_model: "fun-asr-realtime"` for create,
    - `input.prefix`: deterministic app-managed prefix (`pcv1`),
    - `input.vocabulary`: `[{ text, weight: 4 }]` list for create/update,
    - `input.vocabulary_id` for update/delete.
  - create response reads `output.vocabulary_id` and persists it as `vocabularyId`.
  - update/delete success accepts empty `output` and treats HTTP non-2xx or explicit API error payload as sync failure.
- On clear:
  - clear local textarea and terms,
  - omit `vocabulary_id` from ASR startup payload,
  - optionally call `delete_vocabulary` as best-effort cleanup when prior `vocabularyId` exists.
- Persist vocabulary settings locally and load them at app start.
- Apply configured vocabulary to ASR task initialization payload for each new session:
  - when a synced `vocabularyId` exists, send `payload.parameters.vocabulary_id = vocabularyId`,
  - when not configured or sync failed, omit `vocabulary_id` from payload.
- Persist `appliedVocabularyId` and `appliedVocabularyTerms` with each session snapshot for auditability.

## Reliability and Failure Handling
- LLM title generation failure does not invalidate core session persistence or markdown generation.
- Auto-export failure updates export status and exposes manual retry path.
- Auto-export shows toast feedback for success/failure states.
- Export failure must not mutate original stored artifacts.
- Missing optional diarization data degrades gracefully in rendered markdown (label omitted).
