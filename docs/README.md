# Project Context Docs

This directory tracks product definition, technical specs, implementation notes, and decisions for Project Context.

## Index
- [DashScope ASR Docs](./dashscope-asr-docs/README.md)
- [Tencent COS Docs](./tencent-cos-docs/README.md)
- [V0 Spec Pack](./v0/README.md)
- [V1 Spec Pack](./v1/README.md)
- [V2 Spec Pack](./v2/README.md)
- [V1 Changelog](./v1/changelog.md)
- [Overall Roadmap](./overall-roadmap.md)
- [Execution Plan](./execution-plan.md)

## Principles
- Keep docs updated before and during implementation.
- Capture decisions and tradeoffs explicitly.
- Prefer concise docs tied to concrete milestones.

## Current Global Note
- V1 is completed and accepted (2026-03-06), including app-bundled default settings via `mobile/assets/ProjectContext.config.json` with section-level hide/discard behavior.
- V2 planning kicked off on 2026-03-11 with three pillars: recording keepalive, cloud-synced history/artifacts, and in-session realtime AI suggestions.
- V2 Milestone 1 (keepalive foundation) completed and passed on-device validation on 2026-03-12.
- V2 Milestone 2 (cloud sync) completed and validated on 2026-03-13; V2 Milestone 3 (in-session AI suggestions) also completed and validated on 2026-03-13.
- V2 Milestone 4 (observability and remote diagnostics) completed and validated on 2026-03-13, including Sentry capture for a real ASR reconnect failure with no sensitive payload leakage observed.
- V2 Milestone 5 (integration and validation) completed on 2026-03-13 with an 11/11 manual validation pass across keepalive, cloud sync, in-session suggestions, diagnostics capture/privacy, and Settings manual reporting.
- V2 is completed and accepted on 2026-03-13 and promoted to alpha release `1.2.0` (build `2`).
