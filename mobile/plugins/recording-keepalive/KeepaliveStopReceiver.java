package __PACKAGE__.keepalive;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class KeepaliveStopReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    RecordingKeepaliveModule.emitStopRequested();
  }
}
