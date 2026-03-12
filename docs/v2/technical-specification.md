# Technical Specification (V2)

Date: 2026-03-11

## Scope Additions Over V1
- Android recording keepalive architecture with foreground service notification.
- Session lifecycle ownership moved from `RecordScreen` to an app-level recording orchestrator.
- Cloud-backed session artifact model with per-user index + per-session metadata files.
- History synchronization for cross-device session visibility.
- In-session "What do you think" AI requests powered by realtime transcript context.

## Recording Lifecycle Refactor

## Root Cause (From V1 Behavior)
- Recording/session state is currently owned by `RecordScreen`.
- App-level tab switching currently conditionally mounts/unmounts screen content.
- Screen ownership causes session interruption or lost state when leaving the Record tab.

## V2 Architecture
- Introduce `RecordingOrchestrator` singleton (or app-level context provider) as the source of truth for:
  - recording status (`idle | recording | review | finalizing | failed`),
  - transcript stream text,
  - highlight taps,
  - pending finalization event and local draft artifact URIs.
- `RecordScreen` becomes a view/controller that subscribes to orchestrator state.
- Tab changes no longer affect recording internals.

## Android Keepalive Contract
- When recording starts:
  - start foreground service,
  - show persistent notification (`Recording in progress`).
- While foreground service is running:
  - keep microphone capture and realtime websocket session active under screen lock/background.
- Notification actions (prototype minimum):
  - `Stop` action supported.
- When recording fully completes/discards/fails:
  - stop foreground service,
  - remove ongoing notification.

## Post-Record Decision Gate
- `Stop` transitions session to local review state (no remote upload yet).
- `Stop` uses the locally buffered transcript/audio snapshot and must not wait for DashScope `finish-task` acknowledgement before entering review.
- Any post-stop DashScope websocket shutdown or `task-finished` acknowledgement is background cleanup only.
- No late realtime transcript refinement is applied after stop.
- Realtime transcript exists for live UI and fallback-only usage.
- Finalize source of truth is the recorded audio artifact uploaded for file ASR/final-pass processing.
- `Discard` path:
  - requires existing two-tap confirm,
  - deletes local draft audio/transcript artifacts,
  - does not create/modify remote session metadata,
  - does not touch remote index.
- `Continue` path:
  - triggers finalization pipeline,
  - performs remote upload and metadata sync.

## Cloud Storage Model (Prototype)

## Object Layout
- `users/{userId}/index.json`
- `users/{userId}/recordings/{sessionId}.wav`
- `users/{userId}/transcripts/{sessionId}.md`

## Cloud Identity
- `userId` is a locally persisted random 10-character alphanumeric string generated on first launch.
- A valid `cloudUserId` in the bundled asset config overrides the stored/generated value using the same precedence model as the other settings.
- When no config override is present, Settings exposes the current `userId` and allows manual edits so multiple devices can intentionally share the same remote History path.
- The Cloud User ID settings section is hidden when the asset config already specifies `cloudUserId`.
- Remote COS keys are derived from the current `userId` plus `sessionId`.

## `index.json` Purpose
- Lightweight list for History tab loading:
  - `sessionId`,
  - `startedAt`,
  - `endedAt`,
  - `status`,
  - `title`,
  - `updatedAt`.
- Optional fields may include `previewText` and `errorText` if History list rendering should avoid opening transcript artifacts.
- Keep newest-first ordering with no artificial count limit in V2.

## Transcript Persistence Rule
- `transcript.md` is the canonical persisted transcript artifact.
- Both local and remote storage place it at `transcripts/{sessionId}.md` under the user root.
- Raw transcript text is finalize-time working data only.
- If final-pass succeeds, markdown is built from finalized sentences and highlight markers.
- If final-pass is unavailable or fails, markdown is built from the fallback raw transcript.
- After markdown generation completes, raw transcript and other finalize intermediates are discarded.

## Artifact Addressing Rule
- Remote artifact paths are deterministic from `sessionId`.
- Because artifact locations are derivable, V2 does not require `session.json`.
- Local storage follows the same strict-alignment rule: metadata in the history store, transcript body in the markdown artifact.
- Local History metadata is stored in app-private per-user files rather than `SecureStore`.
- Local transcript and audio artifacts live under per-user private directories so changing `userId` changes the visible local namespace too.

## Sync Model
- Local-first cache remains available when offline.
- Pull triggers:
  - app launch,
  - History tab open/refresh,
  - explicit manual refresh.
- Push triggers:
  - successful finalize completion,
  - later mutations to finalized user-visible History fields only.
- Conflict rule:
  - last-write-wins by `updatedAt`.
- Failed sync writes:
  - mark local item as `pending` or `failed`,
  - retry on next eligible sync trigger.

## History Tab Data Source Rule
- Cloud index is primary when reachable.
- Local cache is fallback when network unavailable.
- Detail view loads from local artifact cache first, then hydrates transcript/audio artifacts from the deterministic remote paths when needed.

## In-Session "What Do You Think"

## Trigger and Timing
- Available only when status is `recording`.
- User-triggered action in recording UI.
- Cooldown between requests to avoid spam/cost burst.
- Single in-flight request at a time.

## Prompt Context
- Shared transcript truncation helper used by both title generation and live suggestions.
- Prompt budgets are bounded by estimated token count rather than character count.
- Live suggestion context uses the last 400 estimated tokens of transcript context.
- Title generation uses the first 200 estimated tokens plus the last 300 estimated tokens of transcript context.
- If the title ranges would overlap, the transcript context should be deduplicated rather than repeating the middle.
- Highlights do not affect live suggestion or title prompt shaping in V2.
- Guidance prompt asks for short actionable suggestions for the immediate conversation moment.

## Output Contract
- Concise actionable response (prototype target: 1-3 short bullets).
- Displayed inline during recording without interrupting capture.
- Suggestion records remain UI-only in V2 and are not part of History storage.

## Live Highlight UI Rule
- Highlight behavior remains unchanged during recording in V2.
- The recording timer should occupy the current recording-time highlight-count slot.

## Data Model Additions
- `SessionHistoryItem` additions (proposed):
  - `ownerUserId: string`,
  - `cloudSyncStatus?: "idle" | "pending" | "synced" | "failed"`,
  - `cloudUpdatedAt?: string`,
  - `remoteAudioKey?: string`,
  - `remoteMarkdownKey?: string`
- Persisted history should contain only finalized History metadata plus local artifact references required by the app.
- Persisted history should not duplicate the full transcript body inline.
- `SessionHistoryStore` validates only the V2 strict-alignment shape; older persisted shapes are not supported.

## Reliability Rules
- Keepalive failure must surface explicit status and not silently lose transcript.
- Background/network interruptions keep local draft state recoverable.
- Finalize success is independent from immediate history sync success:
  - session remains completed locally,
  - cloud sync can retry later.
- Local and remote History models should stay intentionally aligned so sync does not need to translate pipeline-only state.

## Prototype Security Posture (Explicit)
- Internal/personal tool posture allows simplified user identity setup.
- Strict production controls (credential rotation/policy enforcement/audit pipelines) are not required for V2 prototype acceptance.
