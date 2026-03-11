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
- `users/{userId}/sessions/{sessionId}/session.json`
- `users/{userId}/sessions/{sessionId}/audio.wav`
- `users/{userId}/sessions/{sessionId}/transcript.md`

## `index.json` Purpose
- Lightweight list for History tab loading:
  - `sessionId`,
  - `startedAt`,
  - `endedAt`,
  - `status`,
  - `title`,
  - `updatedAt`.
- Keep bounded size for prototype responsiveness (for example latest 200 entries).

## `session.json` Purpose
- Full metadata for session detail and reconciliation:
  - V1 metadata fields (final-pass status/failure reason, vocabulary, title state, export metadata),
  - remote artifact keys/URIs,
  - sync timestamps,
  - optional in-session AI suggestion records.

## Sync Model
- Local-first cache remains available when offline.
- Pull triggers:
  - app launch,
  - History tab open/refresh,
  - explicit manual refresh.
- Push triggers:
  - successful finalize state updates,
  - title/final-pass state changes,
  - any mutation to session metadata after finalize.
- Conflict rule:
  - last-write-wins by `updatedAt`.
- Failed sync writes:
  - mark local item as `syncPending`,
  - retry on next eligible sync trigger.

## History Tab Data Source Rule
- Cloud index is primary when reachable.
- Local cache is fallback when network unavailable.
- Detail view loads from local cache first, then hydrates with remote `session.json` if newer.

## In-Session "What Do You Think"

## Trigger and Timing
- Available only when status is `recording`.
- User-triggered action in recording UI.
- Cooldown between requests to avoid spam/cost burst.
- Single in-flight request at a time.

## Prompt Context
- Rolling realtime transcript window (target last 60-120 seconds, bounded by character limit).
- Optional recent highlights near the same window.
- Guidance prompt asks for short actionable suggestions for the immediate conversation moment.

## Output Contract
- Concise actionable response (prototype target: 1-3 short bullets).
- Displayed inline during recording without interrupting capture.
- Suggestion records may be persisted into session metadata for later review (optional but recommended for traceability).

## Data Model Additions
- `SessionHistoryItem` additions (proposed):
  - `cloudSyncStatus?: "idle" | "pending" | "synced" | "failed"`,
  - `cloudUpdatedAt?: string`,
  - `remoteSessionKey?: string`,
  - `remoteAudioKey?: string`,
  - `remoteMarkdownKey?: string`,
  - `liveSuggestions?: Array<{ id: string; createdAt: string; sourceWindowMs: number; text: string }>`
- `SessionHistoryStore` and cloud index mapping must remain backward-tolerant for existing V1 entries.

## Reliability Rules
- Keepalive failure must surface explicit status and not silently lose transcript.
- Background/network interruptions keep local draft state recoverable.
- Finalize success is independent from immediate history sync success:
  - session remains completed locally,
  - cloud sync can retry later.

## Prototype Security Posture (Explicit)
- Internal/personal tool posture allows simplified user identity setup.
- Strict production controls (credential rotation/policy enforcement/audit pipelines) are not required for V2 prototype acceptance.
