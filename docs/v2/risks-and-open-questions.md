# Risks and Open Questions (V2)

Date: 2026-03-11

## Risks
- Android vendor/device policies can still kill background tasks despite foreground service usage.
- Long recordings with keepalive can increase battery and thermal load.
- Cloud `index.json` can become a conflict hotspot when multiple devices update near-simultaneously.
- Network failures during finalize can leave local-complete but cloud-pending sessions.
- Realtime suggestion quality can vary with partial/unclean transcript context.
- In-session suggestion requests can distract users if trigger UX is too frequent.

## Mitigations
- Treat foreground service as required for recording keepalive on Android and surface explicit failure states when service drops.
- Keep transcript/audio local draft durability independent from screen lifecycle.
- Keep local and remote History schemas aligned and use deterministic `updatedAt` last-write-wins merge logic.
- Keep local storage user-scoped as well as remote storage user-scoped so changing `userId` does not produce mixed-account History lists.
- Preserve local completed session state even when cloud sync fails; retry on next sync trigger.
- Enforce request cooldown + single in-flight policy for live suggestions.
- Keep suggestion output concise and scoped to immediate next steps.

## Open Questions
- Should `index.json` updates be append-only with periodic compaction, or full overwrite for prototype simplicity?
- What is the default cloud retention policy for prototype artifacts (indefinite vs bounded)?
- Do we expose a manual "sync now" control in History for prototype debugging/visibility?

## Locked Decisions (2026-03-12)
- Discarded recordings are never uploaded.
- Remote upload starts only after explicit continue-finalize action.
- "What do you think" runs during recording using realtime transcript context.
- Live suggestions remain UI-only in V2 and are not stored in History data.
- Prototype/internal usage does not require production-grade security hardening in V2 acceptance.
- V2 cloud identity is a random 10-character alphanumeric `userId` generated on first launch unless a valid bundled `cloudUserId` override is present; the Settings section is shown only when the value is not config-managed.
- Remote History storage mirrors finalized user-visible History data, not intermediate finalize/runtime state.
- Highlight tap lists and finalized sentence lists are not retained after markdown generation completes.
- V2 removes the built-in history entry count limit.
- V2 uses strict alignment for transcript storage: metadata in history, transcript body only in markdown artifacts.
- V2 does not include backward compatibility for pre-alignment persisted history entries.
