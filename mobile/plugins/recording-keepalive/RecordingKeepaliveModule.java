package __PACKAGE__.keepalive;

import android.content.Intent;

import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class RecordingKeepaliveModule extends ReactContextBaseJavaModule {
  private static final String EVENT_STOP_REQUESTED = "recordingKeepaliveStopRequested";
  private static volatile RecordingKeepaliveModule instance;

  private final ReactApplicationContext reactContext;

  public RecordingKeepaliveModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    instance = this;
  }

  @Override
  public String getName() {
    return "RecordingKeepalive";
  }

  @ReactMethod
  public void startForegroundService(String title, String text, Promise promise) {
    try {
      Intent intent = new Intent(reactContext, RecordingKeepaliveService.class);
      intent.setAction(RecordingKeepaliveService.ACTION_START);
      intent.putExtra(RecordingKeepaliveService.EXTRA_TITLE, title);
      intent.putExtra(RecordingKeepaliveService.EXTRA_TEXT, text);
      ContextCompat.startForegroundService(reactContext, intent);
      promise.resolve(null);
    } catch (Exception error) {
      promise.reject("ERR_RECORDING_KEEPALIVE_START", error);
    }
  }

  @ReactMethod
  public void stopForegroundService(Promise promise) {
    try {
      Intent intent = new Intent(reactContext, RecordingKeepaliveService.class);
      reactContext.stopService(intent);
      promise.resolve(null);
    } catch (Exception error) {
      promise.reject("ERR_RECORDING_KEEPALIVE_STOP", error);
    }
  }

  @ReactMethod
  public void addListener(String eventName) {}

  @ReactMethod
  public void removeListeners(double count) {}

  public static void emitStopRequested() {
    RecordingKeepaliveModule current = instance;
    if (current == null) {
      return;
    }

    UiThreadUtil.runOnUiThread(() -> {
      if (!current.reactContext.hasActiveReactInstance()) {
        return;
      }
      current.reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
        .emit(EVENT_STOP_REQUESTED, null);
    });
  }
}
