# Product Definition (V2)

Date: 2026-03-11

## Goal
Evolve V1 into a resilient daily-use alpha release by ensuring recording continuity, cloud-synced session history, live in-session AI guidance, and actionable remote diagnostics for field failures.

## Core Principles
- Recording lifecycle is service-owned, not screen-owned.
- Cloud history is the primary cross-device source; local cache remains usable offline.
- "What do you think" is a live assist tool during recording, not a post-session summary flow.
- Alpha-stage usage prioritizes speed of iteration over strict production-grade safety controls.
- Remote diagnostics must help debug failures without exporting transcript content, prompts, credentials, or audio payloads.

## In Scope
- Recording keepalive on Android:
  - survive screen lock,
  - survive app background transitions,
  - survive in-app tab changes.
- Persistent recording indicator while keepalive service is running.
- Finalize/Discard behavior refinement:
  - upload starts only after explicit "continue" finalize decision,
  - discard deletes local draft artifacts and does not create remote records.
- Cloud-backed history and artifacts:
  - store audio, transcript markdown, and finalized History metadata remotely,
  - sync history list across devices for same `userId`.
- In-session "What do you think" flow:
  - available during active recording,
  - prompt context from rolling realtime transcript window,
  - short actionable suggestions for the current moment.
- Remote diagnostics:
  - capture crashes plus key operational failures,
  - include lifecycle breadcrumbs and release metadata,
  - expose a small manual report/support section in Settings,
  - keep Settings visible even when config-managed settings inputs are hidden.

## Out of Scope (V2)
- Enterprise-grade auth, IAM hardening, and zero-trust controls.
- Team/multi-user shared workspaces.
- iOS parity for keepalive behavior.
- Complex conflict-resolution systems beyond deterministic last-write-wins.

## UX Requirements
- Recording remains active after user locks the screen or backgrounds the app.
- Android shows an ongoing recording notification while keepalive recording is active.
- Returning to app restores current recording state and transcript progress.
- Switching to History/Settings does not stop or reset active recording.
- Post-stop review state remains explicit:
  - stop feedback is immediate after local capture stops,
  - discard (two-tap confirm),
  - continue finalize.
- DashScope realtime session shutdown must not block the post-stop review transition.
- Post-stop finalize uses the recorded audio artifact upload path; realtime transcript is only for live UX and fallback behavior.
- Discard path performs no remote upload.
- History screen reflects cloud-synced sessions and remains readable with locally cached data offline.
- During recording, user can request "What do you think" and receive concise live suggestions.
- Settings remains available as a stable place for diagnostics/support actions.
- Manual report flow is reachable from Settings and can attach short user-entered context.

## Non-Goals
- Fully autonomous coaching with no user trigger.
- Perfect continuity through OS process kills on all device vendors.
- Production retention/compliance guarantees.
- Full remote log streaming of transcript or prompt content.
