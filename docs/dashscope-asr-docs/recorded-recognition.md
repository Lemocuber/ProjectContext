# Recorded Recognition Notes

Date: 2026-03-06

## Purpose
Capture the integration assumptions for DashScope recorded/file ASR used by v1 post-record finalization.

## Why This Matters
- Realtime ASR remains useful for live transcript display.
- V1 finalized transcript metadata (timestamps/speaker labels/highlight anchoring) depends on file ASR output.

## Integration Notes
- Recognition runs as an asynchronous task (submit + query/poll).
- Session finalization must wait for terminal task status or timeout.
- Audio source URL is staged via COS in zero-backend mode and must be externally fetchable over HTTPS.
- Terminal outcomes are handled explicitly:
  - success: build finalized sentence list from file ASR output,
  - failure/timeout: preserve raw realtime transcript fallback and mark final-pass failed.
- Highlight anchoring is executed only on successful file ASR sentence timing output.
- Speaker labels are accepted only from file ASR diarization fields.

## Project Usage Contract
- Source of truth for final transcript:
  - file ASR result.
- Fallback transcript:
  - persisted unprocessed realtime transcript.
- No speaker/timestamp tags are fabricated from realtime fallback text.

## Related Docs
- [V1 Product Definition](../v1/product-definition.md)
- [V1 Technical Specification](../v1/technical-specification.md)
- [V1 Delivery Plan](../v1/delivery-plan.md)
- [Tencent COS Docs](../tencent-cos-docs/README.md)
