# Milestone 2 Implementation Spec

Date: 2026-03-12
Status: completed and validated on 2026-03-13.

## Goal
Define and implement the cloud session storage contract that V2 history sync depends on, then wire the first end-to-end push/pull flows around that contract.

## Why Start With Storage Details
- Storage layout is the contract boundary for every later cloud sync step.
- `SessionHistoryItem` and History hydration need stable remote keys and metadata shape before implementation can safely proceed.
- Finalize flow, discard rules, offline cache behavior, and local cleanup all depend on the same session object model.

## Scope for This Slice
- Define the remote object layout for finalized sessions.
- Define `index.json` as the only remote metadata file, mirroring finalized History entries without finalize pipeline internals.
- Clean up local history persistence so it stores only finalized, user-visible result data plus local artifact references.
- Extend local history types with cloud sync state and remote object key fields.
- Add cloud push on explicit continue-finalize only.
- Add cloud pull on app launch and History refresh.
- Keep local history readable offline and retry failed syncs on later triggers.
- Enforce the locked rule that discard never uploads and never mutates remote state.

## Explicitly Deferred Within Milestone 2
- Manual "sync now" debugging UI.
- Multi-writer conflict sophistication beyond `updatedAt` last-write-wins.
- Background sync outside existing app triggers.
- Persisting in-session AI suggestion records to History storage.
- Large-history pagination or archive tooling.

## Remote Object Layout
- `users/{userId}/index.json`
- `users/{userId}/recordings/{sessionId}.wav`
- `users/{userId}/transcripts/{sessionId}.md`

## Cloud Identity Rule
- `userId` is a random 10-character `[0-9A-Za-z]` string generated on first launch and persisted locally.
- A valid `cloudUserId` in the bundled asset config overrides the stored/generated value, matching the precedence model used by other settings.
- When no config override is present, the current `userId` is visible and editable in Settings so another device can be pointed at the same remote history path.
- The Settings section is hidden when `cloudUserId` is pre-specified in the bundled asset config.
- Remote paths always resolve from the effective `userId`.

## Artifact Path Rule
- Artifact paths are deterministic from `sessionId`.
- Remote detail loading does not require `session.json`.
- Local storage follows strict alignment: metadata references local artifact URIs, while transcript content lives only in the local markdown file.

## Remote Metadata Contract

## `index.json`
- Purpose: fast History list hydration across devices.
- Shape per entry:
  - `sessionId`
  - `startedAt`
  - `endedAt`
  - `status`
  - `title`
  - `updatedAt`
  - optional `previewText`
  - optional `errorText`
- Rule: keep newest-first ordering with no artificial entry cap in V2.

## Persistence Rule
- Persist only data that the user should still see in History after finalize.
- Do not persist intermediate finalize/runtime state in local or remote History storage.
- The only persisted transcript representation is the finalized markdown artifact (`transcript.md` locally and remotely).
  - Local and remote storage both place it at `transcripts/{sessionId}.md` under the user root.
- Raw transcript text exists only as finalize-time working data used to produce the final markdown when final-pass is unavailable or fails.
- `highlightTapsMs` lives only during recording/review and is discarded after markdown is built.
- `finalizedSentences` lives only during finalize and is discarded after markdown is built.
- Final-pass task ids, staging URLs, and other pipeline internals are not part of the History storage contract.

## Local Model Changes
- Trim persisted `SessionHistoryItem` to finalized History data plus local artifact references.
- Persist local History metadata in app-private per-user JSON storage, not `SecureStore`.
- Add:
  - `ownerUserId: string`
  - `cloudSyncStatus?: "idle" | "pending" | "synced" | "failed"`
  - `cloudUpdatedAt?: string`
  - `remoteAudioKey?: string`
  - `remoteMarkdownKey?: string`
- Keep only local-only fields that History/export needs after finalize, such as local audio/markdown URIs and export metadata.
- Use `updatedAt` as the local and remote reconciliation timestamp for cloud-managed sessions.
- Remove the local entry count limit; keep all history entries unless the user explicitly deletes them in a later feature.
- Do not persist full transcript text inline in local metadata; read it from the local markdown artifact when needed.
- The chosen model for V2 is strict alignment, not cached transcript duplication.
- V2 does not provide backward compatibility for older persisted session shapes.
- Local metadata and local artifacts are both `userId`-scoped so switching `userId` behaves like switching accounts rather than merging device-global caches.

## Upload Rules
- Upload starts only after the user explicitly chooses continue-finalize from review state.
- Upload order:
  1. Upload `recordings/{sessionId}.wav`
  2. Upload `transcripts/{sessionId}.md`
  3. Read/merge/write `index.json`
- If any step fails:
  - keep the local session completed,
  - mark `cloudSyncStatus` as `failed`,
  - preserve enough remote key metadata to retry safely on the next trigger.
- On full success:
  - mark `cloudSyncStatus` as `synced`,
  - store `cloudUpdatedAt`,
  - persist remote keys on the local session item.

## Pull Rules
- Pull triggers:
  - app launch,
  - History tab open,
  - explicit History refresh.
- Hydration behavior:
  - load local cache first,
  - replace or merge from remote index when reachable,
  - fetch remote `transcripts/{sessionId}.md` and `recordings/{sessionId}.wav` lazily when the user opens session detail and the local artifact is missing.
- Conflict rule:
  - newer `updatedAt` wins.

## Discard and Failure Rules
- Review-state discard performs local cleanup only.
- Discarded sessions do not upload artifacts and do not mutate `index.json`.
- Recording/final-pass failures can still remain local-only history items without forcing remote upload.
- When local entries are later deleted by product logic, associated local audio/markdown artifacts must be cleaned up too.

## Implementation Plan
1. Redefine the persisted `SessionHistoryItem` shape around finalized History data and remove the entry cap.
2. Validate only the new persisted shape in local history loading.
3. Add a cloud history storage service that maps the trimmed local model to/from `index.json`.
4. Wire finalize flow in `mobile/src/recording/RecordingProvider.tsx` to persist the final History projection first, then upload remote artifacts.
5. Wire History/app startup hydration to read remote index and merge into local cache.
6. Wire detail loading to resolve transcript/audio from deterministic artifact paths.
7. Add retry behavior for `failed` and `pending` cloud sync entries on later sync triggers.

## Validation Targets
- Finalized session uploads `recordings/{sessionId}.wav`, `transcripts/{sessionId}.md`, and updates `index.json`.
- Discarded review session performs no remote writes.
- Same `userId` on a second device can see the uploaded session in History.
- Offline launch still shows previously cached local history.
- A simulated upload failure leaves the session locally completed with retryable sync state.
- No history items are dropped due to a built-in count limit.

## Implementation Status
- 2026-03-12: local history model trimmed to strict-alignment metadata plus artifact references.
- 2026-03-12: local history store now validates only the strict-alignment session shape and no longer includes migration/backward-compat logic.
- 2026-03-12: History detail switched to load transcript content from markdown artifacts instead of inline stored text.
- 2026-03-12: mobile typecheck passed after the local storage refactor.
- 2026-03-12: remote sync service now uploads `audio.wav` + `transcript.md`, merges `index.json`, retries pending/failed entries on later sync triggers, and hydrates missing local artifacts lazily from cloud.
- 2026-03-12: cloud `userId` is now generated on first launch and editable in Settings for cross-device history sharing.
- 2026-03-13: local History metadata moved from `SecureStore` to app-private per-user JSON storage, and local audio/transcript artifact paths are now scoped by `ownerUserId`.
- 2026-03-13: local and remote storage layouts were aligned around the same user-root structure: `index.json`, `recordings/{sessionId}.wav`, and `transcripts/{sessionId}.md`.
