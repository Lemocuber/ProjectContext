# Technical Specification (V1)

Date: 2026-03-06

## Scope Additions Over V0
- Highlight tap capture and sentence-level transcript anchoring.
- Post-record file ASR final pass as the source of truth for:
  - sentence timestamps,
  - speaker diarization labels,
  - finalized transcript line segmentation.
- Persisted raw realtime transcript fallback artifact.
- Vocabulary integration for recognition requests.
- Post-session LLM generation:
  - session title only.
- Finalized markdown transcript artifact generation.
- Session export actions:
  - markdown auto-export to `Downloads` after finalize,
  - manual markdown export,
  - manual audio export.

## Transcript Modes
- Live transcript:
  - in-session display only,
  - raw/clean text,
  - no timestamps, no speaker tags, no highlight markers.
- Realtime fallback transcript:
  - persisted raw/unprocessed text copy from live stream,
  - used only when post-record file ASR fails.
- Finalized transcript:
  - generated only from post-record file ASR result,
  - markdown artifact with sentence-level timestamps,
  - includes inline speaker/highlight markers based on finalized sentence metadata.

## Data Model Additions (Locked)
- `SessionHistoryItem`:
  - `highlightTapsMs: number[]` (milliseconds from session start),
  - `realtimeTranscriptRaw: string` (unprocessed fallback transcript),
  - `finalPassStatus?: "pending" | "completed" | "failed"`,
  - `finalPassTaskId?: string`,
  - `finalPassFailureReason?: "upload_failed" | "url_expired" | "recognition_failed" | "timeout" | "unknown"`,
  - `sourceAudioRemoteUrl?: string` (COS URL used for file ASR task submission),
  - `sourceAudioObjectKey?: string` (COS object key for cleanup/audit),
  - `finalizedSentences?: Array<{ startMs: number; endMs: number; text: string; speakerLabel?: string; isHighlight?: boolean }>` (from file ASR only),
  - `appliedVocabularyId?: string`,
  - `appliedVocabularyTerms?: string[]`,
  - `generatedTitle?: string`,
  - `titleStatus?: "pending" | "completed" | "failed"`,
  - `fallbackTitle: string`,
  - `transcriptMarkdownUri?: string`,
  - `exportMetadata?: { markdownExportedAt?: string; markdownLastPath?: string; markdownAutoExportStatus?: "completed" | "failed"; audioExportedAt?: string; audioLastPath?: string }`.
- `VocabularySettings`:
  - `rawText: string` (textarea content, one term per line),
  - `terms: string[]` (trimmed, non-empty, de-duplicated),
  - `vocabularyId?: string` (managed internally, not user-entered),
  - `syncStatus?: "idle" | "syncing" | "failed"`.
- Storage versioning:
  - v1 remains on `session_history_v2`,
  - no backward compatibility/migration from v0 persisted session shape is required.

## Recording and Finalization Pipeline
1. Start recording and realtime ASR stream for live transcript UX.
2. Capture highlight taps as `tapMs` while recording.
3. Persist rolling raw realtime transcript content for fallback.
4. On stop/finalize, persist audio artifact.
5. Stage recorded audio to COS (zero-backend BYOK upload mode).
6. Resolve a publicly fetchable HTTPS URL for file ASR (prefer signed URL).
7. Submit file ASR recognition task for the staged audio URL.
8. Poll/query recognition task until terminal state.
9. If file ASR succeeds:
  - parse sentence timestamps/speakers from result,
  - anchor highlight taps to finalized sentences,
  - generate markdown transcript artifact from finalized sentences.
10. If file ASR fails/times out:
  - mark `finalPassStatus="failed"`,
  - set `finalPassFailureReason`,
  - keep `realtimeTranscriptRaw` as session fallback transcript,
  - skip speaker/timestamp enrichment.
11. Trigger title generation and markdown export using best available transcript artifact.
12. Persist title updates and export statuses for history/detail rendering.

## Zero-Backend COS BYOK Mode (Locked)
- v1 supports a zero-backend storage staging mode via Tencent COS.
- User provides BYOK COS configuration in Settings.
- Ingestion path:
  - app upload path only: app uploads recorded audio to COS and generates a signed GET URL.
- URL contract for file ASR submission:
  - HTTPS only,
  - must remain valid for full recognition lifecycle,
  - signed URL expiry must exceed `final-pass timeout + queue buffer`.
- Initial recommended defaults:
  - presigned URL expiry: `>= 2 hours`,
  - final-pass timeout: `<= 30 minutes` per task.
- If temporary credentials are used, effective URL validity is bounded by the shorter of:
  - credential expiration,
  - URL `Expires`.
- For private buckets, use presigned GET URLs; avoid public-read as default.
- Upload constraints:
  - single PUT supports up to 5GB,
  - files over 5GB require multipart upload.
- Cleanup:
  - delete staged COS object after terminal file-ASR state on best-effort basis,
  - cleanup failure must not block session completion.

## BYOK Configuration Checklist (V1)
- DashScope (required):
  - `dashscopeApiKey` (used for realtime ASR, file ASR, vocabulary API).
- DeepSeek (optional but recommended):
  - `deepseekApiKey` (used for async title generation).
- COS upload fields (required for file-ASR source):
  - `cosBucket` (BucketName-APPID),
  - `cosRegion`,
  - credentials:
    - either permanent `secretId` + `secretKey`,
    - or temporary `secretId` + `secretKey` + `sessionToken` + `credentialExpiresAt`,
  - optional `cosKeyPrefix` for object organization.
- Runtime policy knobs:
  - `signedUrlExpiresSec` (recommended >= 7200),
  - `finalPassTimeoutMs` (recommended <= 30 minutes),
  - `cleanupEnabled` (best-effort delete after terminal state).

## Sentence Timestamp Rule (File ASR)
- Finalized sentence timestamps must come from file ASR result payload.
- If sentence-level times are missing, use documented word-level fallbacks from file ASR payload.
- If neither sentence nor word timing is available for a line, fallback to nearest prior known time and never synthesize speaker data.
- Timestamp display format in markdown lines: `[mm:ss]` from `startMs`.

## Highlight Anchoring Rule
- Store taps only as `tapMs` during recording.
- On successful file ASR finalize, for each tap:
  - anchor to sentence containing tap (`startMs <= tapMs <= endMs`),
  - else anchor to first sentence with `startMs > tapMs`,
  - else anchor to final sentence in session.
- Anchored sentence line gets `[!IMPORTANT]` marker.
- Multiple taps anchored to one sentence still render a single marker on that line.
- If file ASR fails, keep unanchored raw highlight taps in metadata only.

## Speaker Diarization Rule
- Speaker labels are sourced only from file ASR diarization output.
- If speaker information is available for a finalized sentence, render inline as `[Speaker N]`.
- If speaker information is unavailable, omit speaker label entirely.
- Do not infer speaker labels from realtime ASR payloads.

## Title Generation Rule
- Fallback title is available immediately at finalize:
  - `Record YY-MM-DD hh:mm` (session start local time).
- LLM title generation is attempted during finalize after final-pass transcript selection.
- LLM provider for v1: DeepSeek (BYOK).
- DeepSeek key handling follows existing BYOK storage/validation patterns.
- On success, replace fallback title with generated title.
- On failure, keep fallback title and mark `titleStatus="failed"`.

## Markdown Transcript Output
- One markdown document per completed session.
- Preferred source: file ASR finalized sentence list.
- Fallback source: `realtimeTranscriptRaw` when file ASR is unavailable.
- File content format:
  - line 1: `# {Title}`,
  - line 2: `YY-MM-DD hh:mm - hh:mm{ (+1d when cross-day) } ({rounded minutes} minutes)`,
  - line 3: `---`,
  - remaining lines:
    - success path: `[mm:ss] [Speaker N] [!IMPORTANT] {sentence text}` (tokens omitted when not applicable),
    - fallback path: plain transcript lines without speaker/timestamp/highlight tags.
- Duration in minutes is rounded to nearest minute.
- Store markdown artifact in local app storage and reference via `transcriptMarkdownUri`.
- Persist `SessionHistoryItem.transcript` from the same finalized markdown content so History text matches export content.

## Filename and Export
- Markdown filename: `YYMMDD-{Title}.md` (sanitized for filesystem safety).
- Filename sanitization uses a blacklist of filesystem-invalid characters and preserves non-Latin characters.
- Destination: user `Downloads` directory.
- Auto-export markdown once after final-pass completion and title-generation attempt.
- Auto-export failure does not trigger background retry on next launch.
- Manual export actions remain available for markdown and audio.
- In-app stored artifacts are always retained even if export fails.
- Export flow must continue to work after app restart for previously completed sessions.
- Android/Expo implementation contract:
  - use SAF directory permission for `Downloads`,
  - cache granted `Downloads` directory URI in local settings,
  - request permission when no valid cached permission exists,
  - fail gracefully when permission denied/unavailable and record status,
  - manual export can re-request permission and retry.

## Vocabulary Support
- Settings UI remains:
  - multiline textarea input (`one term per line`),
  - save/update action,
  - clear action to disable vocabulary injection.
- Vocabulary scope for v1 remains global app settings (no per-session override).
- Validation/sync constraints remain unchanged.
- Apply configured vocabulary to post-record file ASR request where the API supports it.
- Realtime ASR may use vocabulary only as a best-effort live-caption enhancement; it is not part of finalized transcript correctness.
- Persist `appliedVocabularyId` and `appliedVocabularyTerms` with each session snapshot for auditability.

## Reliability and Failure Handling
- File ASR final pass failure does not invalidate core session persistence (audio + realtime fallback transcript remain available).
- URL-expired/file-fetch failures map to explicit `finalPassFailureReason`.
- When URL expiry/fetch failure happens, do not retry automatically with the same URL.
- LLM title generation failure does not invalidate transcript persistence.
- Auto-export failure updates export status and exposes manual retry path.
- Auto-export shows toast feedback for success/failure states.
- Export failure must not mutate original stored artifacts.

## References
- `docs/dashscope-asr-docs/overview.md` (realtime stream behavior)
- `docs/dashscope-asr-docs/recorded-recognition.md` (post-record final-pass assumptions)
- `docs/dashscope-asr-docs/vocabulary.md` (vocabulary customization API)
- `docs/tencent-cos-docs/presign_url.md` (signed URL behavior and expiry)
- `docs/tencent-cos-docs/put_object.md` (upload constraints)
- `docs/tencent-cos-docs/get_object.md` (read permission behavior)
- `docs/tencent-cos-docs/delete_object.md` (cleanup semantics)
