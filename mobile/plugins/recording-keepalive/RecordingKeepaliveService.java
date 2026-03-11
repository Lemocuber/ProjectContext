package __PACKAGE__.keepalive;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class RecordingKeepaliveService extends Service {
  public static final String ACTION_START = "__PACKAGE__.action.START_RECORDING_KEEPALIVE";
  public static final String ACTION_STOP_REQUEST = "__PACKAGE__.action.STOP_REQUEST_RECORDING";
  public static final String EXTRA_TEXT = "text";
  public static final String EXTRA_TITLE = "title";

  private static final String CHANNEL_ID = "project_context_recording_keepalive";
  private static final int NOTIFICATION_ID = 4107;

  private PowerManager.WakeLock wakeLock;

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent != null && ACTION_START.equals(intent.getAction())) {
      ensureWakeLock();
      startForeground(
        NOTIFICATION_ID,
        buildNotification(intent.getStringExtra(EXTRA_TITLE), intent.getStringExtra(EXTRA_TEXT))
      );
    }
    return START_NOT_STICKY;
  }

  @Override
  public void onDestroy() {
    releaseWakeLock();
    stopForeground(STOP_FOREGROUND_REMOVE);
    super.onDestroy();
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  private Notification buildNotification(String title, String text) {
    createChannel();

    Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent contentIntent = null;
    if (launchIntent != null) {
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      contentIntent =
        PendingIntent.getActivity(
          this,
          0,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    Intent stopIntent = new Intent(this, KeepaliveStopReceiver.class);
    stopIntent.setAction(ACTION_STOP_REQUEST);
    PendingIntent stopPendingIntent =
      PendingIntent.getBroadcast(
        this,
        1,
        stopIntent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );

    NotificationCompat.Builder builder =
      new NotificationCompat.Builder(this, CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_btn_speak_now)
        .setContentTitle(title == null || title.isEmpty() ? "Recording in progress" : title)
        .setContentText(
          text == null || text.isEmpty()
            ? "__APP_NAME__ is keeping your recording alive."
            : text
        )
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setCategory(NotificationCompat.CATEGORY_SERVICE)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .addAction(0, "Stop", stopPendingIntent);

    if (contentIntent != null) {
      builder.setContentIntent(contentIntent);
    }

    return builder.build();
  }

  private void createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) {
      return;
    }

    NotificationChannel channel =
      new NotificationChannel(CHANNEL_ID, "Recording keepalive", NotificationManager.IMPORTANCE_LOW);
    channel.setDescription("Keeps active Project Context recordings alive in the background.");
    channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
    manager.createNotificationChannel(channel);
  }

  private void ensureWakeLock() {
    if (wakeLock == null) {
      PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
      if (powerManager == null) {
        return;
      }
      wakeLock =
        powerManager.newWakeLock(
          PowerManager.PARTIAL_WAKE_LOCK,
          getPackageName() + ":RecordingKeepalive"
        );
      wakeLock.setReferenceCounted(false);
    }

    if (!wakeLock.isHeld()) {
      wakeLock.acquire(8L * 60L * 60L * 1000L);
    }
  }

  private void releaseWakeLock() {
    if (wakeLock != null && wakeLock.isHeld()) {
      wakeLock.release();
    }
  }
}
