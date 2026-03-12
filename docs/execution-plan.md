# Execution Plan

## Current Sprint Focus (V2 Kickoff)
1. Finalize V2 specs for recording keepalive, cloud history/artifact sync, and in-session AI suggestions.
2. Keepalive foundation completed and validated on 2026-03-12.
3. Cloud sync model completed and validated on 2026-03-13.
4. In-session "What do you think" completed and validated on 2026-03-13.
5. Observability and remote diagnostics completed and validated on 2026-03-13, including remote capture and privacy scrubbing checks for a real ASR reconnect failure.
6. Integrated manual validation completed on 2026-03-13 with 11/11 reported pass across Android continuity, cloud sync, AI suggestions, diagnostics/privacy gates, and Settings manual reporting.
7. V2 is closed and promoted to alpha release `1.2.0` (build `2`).

## V2 Workstreams

### Workstream A: Recording Keepalive
- Move recording lifecycle ownership from `RecordScreen` to app-level orchestrator/service.
- Ensure active recording survives:
  - screen lock,
  - app background transitions,
  - in-app tab switches.
- Add Android foreground notification while recording is active.

### Workstream B: Cloud Storage + History Sync
- Add remote artifact layout:
  - `users/{userId}/index.json`,
  - `users/{userId}/recordings/{sessionId}.wav`,
  - `users/{userId}/transcripts/{sessionId}.md`.
- Generate a local 10-character cloud `userId` on first launch and expose it in Settings so another device can target the same path.
- Allow asset-config `cloudUserId` override and hide that settings section when the build pre-specifies it.
- Keep local History metadata and artifacts in per-user namespaces so switching `userId` swaps local cache scope too.
- Add pull-on-launch/history-refresh and push-on-finalize/state-update flows.
- Keep local cache readable offline; retry failed cloud syncs on next trigger.
- Enforce explicit rule: discarded recordings never upload and never alter remote index.

### Workstream C: In-Session AI Suggestions
- Add "What do you think" action during recording.
- Build prompt from bounded rolling realtime transcript context.
- Enforce cooldown and single in-flight request behavior.
- Return short actionable moment-level guidance.

### Workstream D: Integration + Validation
- Verify remote diagnostics capture crashes and key operational failures with useful sanitized context.
- Verify privacy scrubbing removes transcript content, prompts, secrets, and raw audio references from remote events.
- Verify Settings remains visible even when all config-managed sections are hidden, and that the diagnostics/reporting section remains available.
- Verify keepalive behavior across lock/background/tab-switch.
- Verify discard path produces no remote objects.
- Verify continue-finalize path uploads artifacts and updates cloud history.
- Verify cross-device history visibility using same `userId`.
- Verify in-session suggestion behavior under active recording.

## Validation Gates (V2 Target)
- Typecheck and CI pass.
- Android APK build pass on GitHub Actions.
- Manual Android device matrix pass for all V2 acceptance criteria.

## Archive Note
- V1 execution plan and validation are completed and accepted as of 2026-03-06.
- V2 execution plan and validation are completed and accepted as of 2026-03-13 for alpha release `1.2.0` (build `2`).
- Detailed V1 implementation history remains in:
  - `docs/v1/delivery-plan.md`
  - `docs/v1/technical-specification.md`
  - `docs/v1/implementation-report.md`
