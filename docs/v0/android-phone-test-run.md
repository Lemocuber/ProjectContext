# Android Phone Test Run

This guide runs the app on a physical Android phone using the existing GitHub Actions APK workflow.

## Why this path
- The app uses `react-native-live-audio-stream` (native module).
- Native modules are not supported in Expo Go.
- You need an APK build, then install it on phone.

## Steps
1. Push current branch to your public GitHub repo.
2. Open GitHub `Actions` tab.
3. Run workflow `Android APK Build` (manual trigger via `Run workflow`).
4. Wait for job `build-apk` to finish.
5. Download artifact `project-context-android-apk`.
6. Transfer `app-release.apk` to your Android phone.
7. Install APK on phone (allow installs from your browser/files app when prompted).
8. Open `Project Context` app.
9. Go to `Settings`, paste your DashScope API key, and tap `Save`.
10. Go to `Record`, tap `Start Recording`, speak for 10-20 seconds, then tap `Stop`.

## Expected behavior
- `Status` changes to `Recording` while speaking.
- `Live Draft` text updates in near real time.
- After stop, status changes to `Finalizing`, then returns to `Idle`.
- `Final Cleaned` text appears.

## Quick troubleshooting
- `Set your API key...`: save key in Settings first.
- `Microphone permission denied`: enable microphone permission in Android app settings.
- `Realtime transcription socket error` or immediate close:
  - verify API key validity;
  - verify network can reach DashScope endpoint;
  - verify key region matches endpoint (`dashscope.aliyuncs.com` currently configured).

## Current known limitation
- Final transcript is currently assembled from realtime stream completion.
- A dedicated second-pass cleanup model is planned next.
