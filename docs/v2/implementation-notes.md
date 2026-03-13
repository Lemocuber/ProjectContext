# V2 Implementation Notes

Status: post-acceptance V2 notes and patch-line adjustments after alpha release `1.2.0` (build `2`).

## 2026-03-13 - 1.2.1 Android Permission Gate
- Added an Android permission gate overlay that appears when startup or in-gate checks detect missing recording permissions.
- The gate uses a scroll view with vertically stacked permission cards so later Android permissions can be added without changing the layout model.
- Initial cards cover microphone access and notification access; once all required permissions are granted the gate exits with a delayed slide-down reveal of the main screen.
- Reordered recording startup so microphone permission is obtained before the `microphone` foreground service starts, which addresses the Android target SDK 36 eligibility failure path.
- `FOREGROUND_SERVICE_MICROPHONE` remains a packaged manifest permission supplied by the Android config/plugin path, not a runtime prompt shown to the user.
- Added Sentry breadcrumbs and exception capture around permission-gate display, refresh, denial, and completion paths for field debugging.
