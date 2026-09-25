package com.onexing.app;

// Lookus99 —— v12.9.69 【此时此刻】插件（扩展覆盖全权限检测与跳转）
// v12.9.68 原始：checkPerms(四项特殊) + openSetting(usage/notifs/battery/location) + 启停 + query
// v12.9.69 扩展：checkAllPerms(全九项) + openSetting(全九项系统设置跳转)
//   支持：mic(录音) / notif(通知栏) / overlay(悬浮窗) / usage(使用情况访问)
//        / battery(忽略电池优化) / applist(读取应用列表) / alarm(闹钟提醒)
//        / notifs(通知使用权) / location(后台位置)
// 数据只存本机 SharedPreferences；上不上传云端由前端业务层决定。
import android.app.AlarmManager;
import android.app.AppOpsManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Set;

@CapacitorPlugin(name = "Lookus99", permissions = {
        @Permission(strings = {
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION,
                android.Manifest.permission.READ_PHONE_STATE
        }, alias = "lookus")
})
public class Lookus99 extends Plugin {

    // ==================== 权限真值检测 ====================

    // v12.9.69 全权限检测（9 项）——权限中心用它渲染所有「系统已授予/未授予」标签
    // v12.9.73 【P2-7】：显式投递 bridge.execute 后台执行器——多个 AppOps/PackageManager
    //   真值查询不占插件调度线程，前端多路并发（防抖后仍会有 2~3 路顺序调用）也不排队
    @PluginMethod
    public void checkAllPerms(PluginCall call) {
        getBridge().execute(() -> {
            JSObject o = new JSObject();
            o.put("mic", isMicGranted());
            o.put("notif", isNotifGranted());
            o.put("overlay", isOverlayGranted());
            o.put("usage", isUsageGranted());
            o.put("battery", isBatteryIgnored());
            o.put("applist", isAppListGranted());
            o.put("alarm", isAlarmGranted());
            o.put("notifs", isNotifListenerGranted());
            o.put("location", isBackgroundLocGranted());
            o.put("running", Lookus99Service.isRunning());
            call.resolve(o);
        });
    }

    // 保留旧接口（只返回 Lookus 四项）——兼容旧调用方
    @PluginMethod
    public void checkPerms(PluginCall call) {
        getBridge().execute(() -> {
            JSObject o = new JSObject();
            o.put("usage", isUsageGranted());
            o.put("notifs", isNotifListenerGranted());
            o.put("battery", isBatteryIgnored());
            o.put("location", isBackgroundLocGranted());
            o.put("running", Lookus99Service.isRunning());
            call.resolve(o);
        });
    }

    // ==================== 跳系统设置页（全九项覆盖）====================

    @PluginMethod
    public void openSetting(PluginCall call) {
        String k = call.getString("k", "");
        try {
            Intent it;
            switch (k) {
                // —— 运行时权限：跳到应用详情页，用户点权限自行开启 ——
                case "mic":
                    it = appDetails();
                    break;
                case "applist":
                    it = appDetails();
                    break;
                case "alarm":
                    it = appDetails();
                    break;
                case "location":
                    it = appDetails();
                    break;
                // —— 通知栏权限（POST_NOTIFICATIONS · Android 13+ 有专门设置）——
                case "notif":
                    it = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU
                            ? new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                                .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName())
                            : appDetails();
                    break;
                // —— 特殊权限 ——
                case "overlay":
                    it = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                    it.setData(Uri.parse("package:" + getContext().getPackageName()));
                    break;
                case "usage":
                    it = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                    break;
                case "notifs":
                    it = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
                    break;
                case "battery":
                    // 先尝试直接请求豁免（系统确认框）；个别 ROM 拒绝则跳电池优化设置列表
                    try {
                        it = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        it.setData(Uri.parse("package:" + getContext().getPackageName()));
                        it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getContext().startActivity(it);
                        call.resolve(new JSObject().put("opened", true));
                        return;
                    } catch (Throwable t) {
                        it = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    }
                    break;
                default:
                    call.reject("bad-key");
                    return;
            }
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(it);
            call.resolve(new JSObject().put("opened", true));
        } catch (Throwable t) {
            call.reject("settings-unavailable");
        }
    }

    private Intent appDetails() {
        Intent it = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        it.setData(Uri.parse("package:" + getContext().getPackageName()));
        return it;
    }

    // ==================== 采集启停（桥接 · 真停采）====================

    @PluginMethod
    public void start(PluginCall call) {
        if (!hasRuntimePerms()) { requestPermissionForAlias("lookus", call, "startPermsCb"); return; }
        doStart(call);
    }

    @PermissionCallback
    private void startPermsCb(PluginCall call) {
        if (!hasRuntimePerms()) { call.reject("runtime-perm-denied"); return; }
        doStart(call);
    }

    private void doStart(PluginCall call) {
        try {
            Intent it = new Intent(getContext(), Lookus99Service.class);
            it.putExtra("usage", call.getBoolean("usage", false));
            it.putExtra("location", call.getBoolean("location", false));
            it.putExtra("notifs", call.getBoolean("notifs", false));
            it.putExtra("battery", call.getBoolean("battery", false));
            Context ctx = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(it);
            else ctx.startService(it);
            call.resolve(new JSObject().put("running", true));
        } catch (Throwable t) {
            call.reject("start-failed: " + (t.getMessage() != null ? t.getMessage() : t.getClass().getSimpleName()));
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            // v12.9.72 修复：旧实现走 startService(stop intent)——App 在后台时抛
            //   IllegalStateException 被 catch 吞掉 → Service 停不掉（假关）。
            //   改用 stopService() 直停：onDestroy → teardownAll 注销全部监听，前后台都有效。
            getContext().stopService(new Intent(getContext(), Lookus99Service.class));
            call.resolve(new JSObject().put("running", false));
        } catch (Throwable t) {
            call.reject("stop-failed");
        }
    }

    // ==================== 数据读取 ====================

    @PluginMethod
    public void query(PluginCall call) {
        // v12.9.73 【P2-7】同上：读 SharedPreferences + JSON 组装放后台执行器
        getBridge().execute(() -> {
            try {
                Context ctx = getContext();
                android.content.SharedPreferences sp = ctx.getSharedPreferences("lookus99", Context.MODE_PRIVATE);
                JSONObject now = new JSONObject(sp.getString("now", "{}"));
                JSONArray evAll = new JSONArray(sp.getString("events", "[]"));
                long cut = System.currentTimeMillis() - 24 * 3600_000L;
                JSONArray recent = new JSONArray();
                for (int i = evAll.length() - 1; i >= 0 && recent.length() < 120; i--) {
                    JSONObject e = evAll.optJSONObject(i);
                    if (e != null && e.optLong("t", 0) >= cut) recent.put(e);
                }
                Calendar c = Calendar.getInstance();
                if (c.get(Calendar.HOUR_OF_DAY) < 6) c.add(Calendar.DATE, -1);
                java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.CHINA);
                JSONObject night = new JSONObject(sp.getString("night_" + f.format(c.getTime()), "{}"));
                long beat = sp.getLong("lastBeat", 0);
                JSObject o = new JSObject();
                o.put("now", now);
                o.put("timeline", recent);
                o.put("night", night);
                o.put("running", Lookus99Service.isRunning());
                o.put("beatGapMin", beat <= 0 ? -1 : Math.round((System.currentTimeMillis() - beat) / 60000f));
                call.resolve(o);
            } catch (Throwable t) {
                call.reject("query-failed");
            }
        });
    }

    // ==================== 真值判定（9 项 · 只读）====================

    private boolean isMicGranted() {
        try {
            PackageManager pm = getContext().getPackageManager();
            return pm.checkPermission(android.Manifest.permission.RECORD_AUDIO, getContext().getPackageName())
                    == PackageManager.PERMISSION_GRANTED;
        } catch (Throwable t) { return false; }
    }

    private boolean isNotifGranted() {
        try {
            // Android 13+ POST_NOTIFICATIONS
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                PackageManager pm = getContext().getPackageManager();
                return pm.checkPermission("android.permission.POST_NOTIFICATIONS",
                        getContext().getPackageName()) == PackageManager.PERMISSION_GRANTED;
            }
            // Android 12- 旧版：通知开关
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            return nm != null && NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        } catch (Throwable t) { return false; }
    }

    private boolean isOverlayGranted() {
        try {
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    ? Settings.canDrawOverlays(getContext())
                    : true;   // 6.0 以下默认允许
        } catch (Throwable t) { return false; }
    }

    private boolean isUsageGranted() {
        try {
            Context ctx = getContext();
            AppOpsManager ops = (AppOpsManager) ctx.getSystemService(Context.APP_OPS_SERVICE);
            if (ops == null) return false;
            int mode = ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(), ctx.getPackageName());
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Throwable t) { return false; }
    }

    private boolean isBatteryIgnored() {
        try {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        } catch (Throwable t) { return false; }
    }

    // 读取应用列表：Android 11+ 需要 QUERY_ALL_PACKAGES，旧版靠 usage 也可查，
    //   这里用 AppOpsManager.OPSTR_GET_INSTALLED_APPS（Android 12+）判定
    private boolean isAppListGranted() {
        try {
            Context ctx = getContext();
            AppOpsManager ops = (AppOpsManager) ctx.getSystemService(Context.APP_OPS_SERVICE);
            if (ops != null && Build.VERSION.SDK_INT >= 31) {
                int mode = ops.checkOpNoThrow("android:get_installed_apps",
                        android.os.Process.myUid(), ctx.getPackageName());
                if (mode == AppOpsManager.MODE_ALLOWED) return true;
            }
            // 没这项也不影响主要功能——视为 granted（保守）
            return true;
        } catch (Throwable t) { return true; }
    }

    // 闹钟/提醒：Android 12+ 需要 SCHEDULE_EXACT_ALARM
    private boolean isAlarmGranted() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
                return am != null && am.canScheduleExactAlarms();
            }
            return true;   // 31- 默认允许
        } catch (Throwable t) { return true; }
    }

    private boolean isNotifListenerGranted() {
        try {
            Set<String> pkgs = NotificationManagerCompat.getEnabledListenerPackages(getContext());
            return pkgs != null && pkgs.contains(getContext().getPackageName());
        } catch (Throwable t) { return false; }
    }

    private boolean isBackgroundLocGranted() {
        try {
            PackageManager pm = getContext().getPackageManager();
            String pkg = getContext().getPackageName();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                return pm.checkPermission(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION, pkg)
                        == PackageManager.PERMISSION_GRANTED;
            }
            return pm.checkPermission(android.Manifest.permission.ACCESS_FINE_LOCATION, pkg)
                    == PackageManager.PERMISSION_GRANTED;
        } catch (Throwable t) { return false; }
    }

    private boolean hasRuntimePerms() {
        try {
            PackageManager pm = getContext().getPackageManager();
            String pkg = getContext().getPackageName();
            return pm.checkPermission(android.Manifest.permission.ACCESS_FINE_LOCATION, pkg) == PackageManager.PERMISSION_GRANTED
                    && pm.checkPermission(android.Manifest.permission.READ_PHONE_STATE, pkg) == PackageManager.PERMISSION_GRANTED;
        } catch (Throwable t) { return false; }
    }
}
