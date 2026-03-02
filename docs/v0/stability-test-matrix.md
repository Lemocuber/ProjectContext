# Stability Test Matrix (V0)

Date: 2026-03-02

## Goal
Validate realtime recording reliability and session persistence behavior on Android phone builds.

## Test Cases
| ID | Scenario | Expected Result | Status |
| --- | --- | --- | --- |
| STB-01 | Start recording with valid key and stable network | Session reaches `Recording`; live text updates continuously | Pass |
| STB-02 | Stop recording after 10-20s | Status transitions `Stopping` -> `Idle`; transcript remains visible | Pass |
| STB-03 | Disable network mid-recording for 5-10s, then restore | Reconnect attempts occur automatically; app does not crash; session either recovers or fails clearly | Pass |
| STB-04 | Keep network disabled through max retry window | Session fails with explicit error instead of hanging indefinitely | Pass |
| STB-05 | Leave long silence (>45s) with network alive | Session remains healthy if server heartbeat/messages continue; no immediate crash | Pass |
| STB-06 | Microphone permission denied | User sees clear error state; no crash | Pass |
| STB-07 | Kill and reopen app after successful session | Recent session appears in local history | Pass |
| STB-08 | Trigger session failure, then reopen app | Failed session appears in local history with error context | Pass |
| STB-09 | Complete a session and inspect History tab entry | `Audio saved` appears and stored file URI exists | Pending |
| STB-10 | Open a completed session detail card with saved audio and tap `Play` | Audio plays in-app; `Pause`/`Stop` controls work; no crash | Pending |
| STB-11 | Drag audio progress scrubber while playback is active | Seek applies correctly; elapsed/total time updates; no crash | Pending |

## Notes
- Current reconnect policy: bounded retries with increasing backoff (0.8s, 1.6s, 3.2s).
- Current guardrails: websocket open timeout, task-start timeout, inactivity timeout, and finish fallback timeout.
- v0 final transcript is intentionally realtime-derived.
- LLM cleanup/summarization is planned for v1.
