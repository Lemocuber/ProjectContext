# Android Phone Test Run

This guide runs the app on a physical Android phone using the existing GitHub Actions APK workflow.

## Why this path
- The app uses `react-native-live-audio-stream` (native module).
- Native modules are not supported in Expo Go.
- You need an APK build, then install it on phone.

## Steps
1. Create or checkout a non-`main` branch.
2. Commit your changes and push that branch to GitHub.
3. Open GitHub `Actions` tab and locate workflow `Android APK Build`.
4. Confirm the run was triggered by `push` on your branch (auto-trigger path).
5. Wait for job `build-apk` to finish successfully.
6. Open the finished run and download artifact `project-context-android-apk`.
7. Unzip artifact and get `app-release.apk`.
8. Transfer `app-release.apk` to your Android phone.
9. Install APK on phone (allow installs from your browser/files app when prompted).
10. Open `Project Context` app.
11. Go to `Settings`, paste your DashScope API key, and tap `Save`.
12. Go to `Record`, tap `Start Recording`, speak for 10-20 seconds, then tap `Stop`.

## Workflow trigger details
- Auto-trigger is enabled for `push` to all branches except `main`.
- Workflow file: `.github/workflows/android-build.yml`
- Manual `workflow_dispatch` trigger is also available as fallback.

## Artifact details
- Artifact name: `project-context-android-apk`
- APK path inside workflow: `mobile/android/app/build/outputs/apk/release/app-release.apk`

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
