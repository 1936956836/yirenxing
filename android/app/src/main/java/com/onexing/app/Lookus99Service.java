package com.onexing.app;

// Lookus99Service —— v12.9.68 【此时此刻】后台采集前台 Service（安卓原生逻辑）
// 职责（Lookus 同款设备状态采集，仅在本机运行、数据只进本机 SharedPreferences）：
//   · 系统广播监听：充电/拔充电、电量变化、屏幕亮/熄、通话状态（PHONE_STATE，需 READ_PHONE_STATE）
//   · 定时轮询（5 分钟）：UsageStatsManager 前台 App 使用记录（需「使用情况访问」特殊权限）
//   · LocationManager 后台定位（需 ACCESS_BACKGROUND_LOCATION「始终允许」）
//   · 夜间统计（23:00-06:00 亮屏次数 + 每次亮屏时打开的 App）
// 采集启停由前端经 Lookus99 插件桥接下发（分权限项真停采：usage/location/notifs/battery）；
//   battery 开 = 持有 PARTIAL_WAKE_LOCK 保活，关 = 释放（接受系统调度，可能被杀 → 前端有断档提示）。
// 存储：SharedPreferences "lookus99"（events 近 48h 上限 2000 条 / now 实时态 / night_日期 / lastBeat 心跳）。
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.Logger;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.Timer;
import java.util.TimerTask;

public class Lookus99Service extends Service {

    public static final String CH_ID = "lookus99_sync";
    private static volatile boolean running = false;
    // v12.9.73 【P2-5】WakeLock 限时：6 小时一次 acquire，beat() 里续期，teardown/onDestroy 释放
    private static final long WAKE_TIMEOUT_MS = 6L * 3600_000L;

    private BroadcastReceiver batteryRx = null;      // 电量/充电
    private BroadcastReceiver screenRx = null;        // 亮/熄屏（夜间统计）
    private PhoneStateListener phoneLs = null;        // 通话状态
    private TelephonyManager tele = null;
    private LocationManager locMgr = null;
    private LocationListener locLs = null;
    private Timer usageTimer = null;
    private PowerManager.WakeLock wake = null;
    private final Handler main = new Handler(Looper.getMainLooper());

    // 采集开关（由前端经桥接下发；默认全关——真停采）
    private boolean swUsage = false, swLocation = false, swNotifs = false, swBattery = false;

    // 内部状态
    private int lastPct = -1;
    private boolean lastCharging = false;
    private String lastFgPkg = null;
    private long lastFgSince = 0;
    private long lastUsageScan = 0;
    private int lastCallState = TelephonyManager.CALL_STATE_IDLE;
    private long callSince = 0;
    private boolean callWasRinging = false;

    // ==================== 生命周期 ====================

    @Override
    public void onCreate() {
        super.onCreate();
        // v12.9.73 【P1 崩溃捕获】：STICKY 重启场景进程可能只建 Service（MainActivity 未建）——
        //   Service 侧也要幂等安装，保证被杀重启后的首崩也有现场日志
        try { Crash99.install(this); } catch (Throwable t) {}
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // v12.9.72 闪退根因修复：START_STICKY 被系统杀后用 null intent 重启，旧代码直接
        //   intent.getBooleanExtra(...) → NPE → 进程崩 → 系统再重启 → 无限闪退循环。
        //   null intent = STICKY 恢复 → 从持久化开关表恢复采集，不再崩。
        boolean stop = intent != null && intent.getBooleanExtra("stop", false);
        if (stop) {
            // v12.9.72：stopService 前必须先 startForeground——本 Service 由 startForegroundService
            //   拉起的场景（前端 stop 走 stopService() 直停，此分支为双保险），
            //   不调 startForeground 直接停会触发 did-not-call-startForeground 崩溃
            startForeground(9901, buildNotification());
            stopSelf();
            return START_NOT_STICKY;
        }
        if (intent == null) {                                        // STICKY 重启：读盘恢复开关
            swUsage = sp().getBoolean("sw_usage", false);
            swLocation = sp().getBoolean("sw_location", false);
            swNotifs = sp().getBoolean("sw_notifs", false);
            swBattery = sp().getBoolean("sw_battery", false);
            if (!swUsage && !swLocation && !swNotifs && !swBattery) {
                // 采全关后旧进程被杀重启：不再常驻，合规停机（startForeground 保平 5 秒窗口）
                startForeground(9901, buildNotification());
                stopSelf();
                return START_NOT_STICKY;
            }
        } else {
            swUsage = intent.getBooleanExtra("usage", false);
            swLocation = intent.getBooleanExtra("location", false);
            swNotifs = intent.getBooleanExtra("notifs", false);
            swBattery = intent.getBooleanExtra("battery", false);
            sp().edit().putBoolean("sw_usage", swUsage)
                    .putBoolean("sw_location", swLocation)
                    .putBoolean("sw_notifs", swNotifs)
                    .putBoolean("sw_battery", swBattery).apply();   // 持久化供 STICKY 恢复
        }
        startForeground(9901, buildNotification());
        applySwitches();
        running = true;
        beat();
        Logger.info("Lookus99Service started: usage=" + swUsage + " location=" + swLocation
                + " notifs=" + swNotifs + " battery=" + swBattery + (intent == null ? " (sticky-restore)" : ""));
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        teardownAll();
        Logger.info("Lookus99Service stopped");
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    public static boolean isRunning() { return running; }

    // ==================== 开关应用（真停采：关掉的项注销监听）====================

    private void applySwitches() {
        // —— 电池/充电广播（电量事件属于基础状态，跟随 battery 开关）——
        if (swBattery && batteryRx == null) {
            batteryRx = new BroadcastReceiver() {
                @Override public void onReceive(Context c, Intent it) {
                    onBattery(it);
                }
            };
            IntentFilter f = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            // v12.9.72 闪退修复：targetSdk 34+（当前 36）动态注册接收器必须显式指定
            //   RECEIVER_NOT_EXPORTED，否则 Android 14+ 抛 SecurityException → 开权限即闪退
            if (Build.VERSION.SDK_INT >= 34) {
                registerReceiver(batteryRx, f, Context.RECEIVER_NOT_EXPORTED);
                onBattery(registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED), Context.RECEIVER_NOT_EXPORTED)); // 立即读一次当前值
            } else {
                registerReceiver(batteryRx, f);
                onBattery(registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED)));
            }
        } else if (!swBattery && batteryRx != null) {
            try { unregisterReceiver(batteryRx); } catch (Throwable t) {}
            batteryRx = null;
        }
        // —— 保活（battery 开 = PARTIAL_WAKE_LOCK；关 = 释放）——
        // v12.9.73 【P2-5】WakeLock 不再永久持有：限时 6 小时 acquire + beat() 事件续期
        //   （永久持有会被厂商省电策略盯上反而更易被杀；限时+续期既有保活效果又留出系统回收窗口）
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (swBattery) {
            if (wake == null && pm != null) {
                wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "onexing:lookus99");
                wake.setReferenceCounted(false);
                wake.acquire(WAKE_TIMEOUT_MS);
            }
        } else if (wake != null && wake.isHeld()) {
            try { wake.release(); } catch (Throwable t) {}
            wake = null;
        }
        // —— 亮/熄屏（usage 项：夜间统计 + 前台 App 捕获）——
        if (swUsage && screenRx == null) {
            screenRx = new BroadcastReceiver() {
                @Override public void onReceive(Context c, Intent it) {
                    String a = it.getAction();
                    if (Intent.ACTION_SCREEN_ON.equals(a)) onScreenOn();
                }
            };
            IntentFilter f = new IntentFilter();
            f.addAction(Intent.ACTION_SCREEN_ON);
            f.addAction(Intent.ACTION_SCREEN_OFF);
            // v12.9.72 闪退修复：同 batteryRx——Android 14+ 必须显式 NOT_EXPORTED
            if (Build.VERSION.SDK_INT >= 34) registerReceiver(screenRx, f, Context.RECEIVER_NOT_EXPORTED);
            else registerReceiver(screenRx, f);
        } else if (!swUsage && screenRx != null) {
            try { unregisterReceiver(screenRx); } catch (Throwable t) {}
            screenRx = null;
        }
        // —— 前台 App 轮询（usage 项）——
        if (swUsage && usageTimer == null) {
            lastUsageScan = System.currentTimeMillis() - 5 * 60_000L;
            usageTimer = new Timer();
            usageTimer.schedule(new TimerTask() {
                @Override public void run() { scanUsage(); }
            }, 3_000L, 5 * 60_000L);
        } else if (!swUsage && usageTimer != null) {
            usageTimer.cancel();
            usageTimer = null;
        }
        // —— 通话状态（notifs 项：PHONE_STATE + READ_PHONE_STATE 运行时权限）——
        if (swNotifs && phoneLs == null) {
            tele = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
            if (tele != null) {
                phoneLs = new PhoneStateListener() {
                    @Override public void onCallStateChanged(int state, String number) {
                        onCallState(state);
                    }
                };
                try { tele.listen(phoneLs, PhoneStateListener.LISTEN_CALL_STATE); } catch (Throwable t) { phoneLs = null; }
            }
        } else if (!swNotifs && phoneLs != null) {
            try { tele.listen(phoneLs, PhoneStateListener.LISTEN_NONE); } catch (Throwable t) {}
            phoneLs = null; tele = null;
        }
        // —— 后台定位（location 项）——
        if (swLocation && locLs == null) {
            locMgr = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (locMgr != null) {
                locLs = new LocationListener() {
                    @Override public void onLocationChanged(Location loc) { onLoc(loc); }
                    @Override public void onStatusChanged(String p, int s, Bundle e) {}
                    @Override public void onProviderEnabled(String p) {}
                    @Override public void onProviderDisabled(String p) {}
                };
                try {
                    boolean hasGps = locMgr.isProviderEnabled(LocationManager.GPS_PROVIDER);
                    boolean hasNet = locMgr.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
                    if (hasGps) locMgr.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5 * 60_000L, 200f, locLs, Looper.getMainLooper());
                    if (hasNet) locMgr.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5 * 60_000L, 200f, locLs, Looper.getMainLooper());
                    if (!hasGps && !hasNet) { locLs = null; locMgr = null; }
                } catch (SecurityException se) { locLs = null; locMgr = null; }
                catch (Throwable t) { locLs = null; locMgr = null; }
            }
        } else if (!swLocation && locLs != null) {
            try { locMgr.removeUpdates(locLs); } catch (Throwable t) {}
            locLs = null; locMgr = null;
        }
    }

    private void teardownAll() {
        swUsage = swLocation = swNotifs = swBattery = false;
        if (batteryRx != null) { try { unregisterReceiver(batteryRx); } catch (Throwable t) {} batteryRx = null; }
        if (screenRx != null) { try { unregisterReceiver(screenRx); } catch (Throwable t) {} screenRx = null; }
        if (phoneLs != null && tele != null) { try { tele.listen(phoneLs, PhoneStateListener.LISTEN_NONE); } catch (Throwable t) {} phoneLs = null; tele = null; }
        if (locLs != null && locMgr != null) { try { locMgr.removeUpdates(locLs); } catch (Throwable t) {} locLs = null; locMgr = null; }
        if (usageTimer != null) { usageTimer.cancel(); usageTimer = null; }
        if (wake != null && wake.isHeld()) { try { wake.release(); } catch (Throwable t) {} wake = null; }
    }

    // ==================== 事件处理 ====================

    private void onBattery(Intent it) {
        if (it == null) return;
        int level = it.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = it.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
        int plugged = it.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0);
        int pct = (level >= 0 && scale > 0) ? Math.round(level * 100f / scale) : -1;
        boolean charging = plugged != 0;
        if (pct < 0) return;
        boolean changed = (lastPct >= 0) && (charging != lastCharging);
        lastPct = pct;
        lastCharging = charging;
        // 实时状态
        JSONObject now = readJson("now");
        try {
            JSONObject bat = now.optJSONObject("bat");
            if (bat == null) { bat = new JSONObject(); now.put("bat", bat); }
            bat.put("pct", pct);
            bat.put("charging", charging);
            saveJson("now", now);
        } catch (Throwable t) {}
        // 充电/拔电事件（状态翻转才记）
        if (changed) addEvent(evPut(evPut(ev("charge"), "on", charging), "pct", pct));
        beat();
    }

    private void onScreenOn() {
        if (!inNightWindow()) return;                    // 只统计 23:00-06:00 夜间亮屏
        String d = nightKey();
        JSONObject night = readJson("night_" + d);
        int ons = night.optInt("ons", 0) + 1;
        String app = appLabel(lastFgPkg);
        JSONArray apps = night.optJSONArray("apps");
        if (apps == null) { apps = new JSONArray(); }
        if (app != null) apps.put(app);
        try {
            night.put("ons", ons);
            night.put("apps", apps);
            night.put("d", d);
            saveJson("night_" + d, night);
        } catch (Throwable t) {}
        beat();
    }

    private void onCallState(int state) {
        long now = System.currentTimeMillis();
        if (state == TelephonyManager.CALL_STATE_OFFHOOK) {
            if (lastCallState == TelephonyManager.CALL_STATE_RINGING) callWasRinging = true; // 呼入接通
            callSince = now;
            setCall("offhook", 0);
        } else if (state == TelephonyManager.CALL_STATE_RINGING) {
            callSince = 0;
            setCall("ringing", 0);
        } else { // IDLE
            if (lastCallState == TelephonyManager.CALL_STATE_OFFHOOK && callSince > 0) {
                int min = Math.max(1, Math.round((now - callSince) / 60000f));
                addEvent(evPut(evPut(ev("call"), "dir", callWasRinging ? "in" : "out"), "min", min));
            }
            setCall("idle", 0);
            callWasRinging = false;
        }
        lastCallState = state;
        beat();
    }

    private void setCall(String state, int min) {
        JSONObject now = readJson("now");
        try {
            JSONObject call = now.optJSONObject("call");
            if (call == null) { call = new JSONObject(); now.put("call", call); }
            call.put("state", state);
            if (callSince > 0) call.put("sinceMin", Math.max(0, Math.round((System.currentTimeMillis() - callSince) / 60000f)));
            saveJson("now", now);
        } catch (Throwable t) {}
    }

    private void onLoc(Location loc) {
        if (loc == null) return;
        double lat = loc.getLatitude(), lng = loc.getLongitude();
        // v12.9.72 ANR 加固：Geocoder 是同步网络请求，旧代码在主线程调用会阻塞 UI；
        //   改为「坐标先行落盘 → 后台线程补地名再回写」
        JSONObject now = readJson("now");
        try {
            JSONObject pos = new JSONObject();
            pos.put("name", String.format(Locale.CHINA, "北纬%.2f·东经%.2f 附近", lat, lng));
            pos.put("lat", Math.round(lat * 10000) / 10000.0);
            pos.put("lng", Math.round(lng * 10000) / 10000.0);
            pos.put("ts", System.currentTimeMillis());
            now.put("pos", pos);
            saveJson("now", now);
        } catch (Throwable t) {}
        addEvent(evPut(evPut(evPut(ev("loc"), "name", "定位中…"),
                "lat", Math.round(lat * 10000) / 10000.0),
                "lng", Math.round(lng * 10000) / 10000.0));
        beat();
        java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
            try {
                final String name = geocode(lat, lng);
                main.post(() -> {
                    JSONObject n2 = readJson("now");
                    try {
                        JSONObject pos = n2.optJSONObject("pos");
                        if (pos == null) { pos = new JSONObject(); n2.put("pos", pos); }
                        pos.put("name", name);
                        saveJson("now", n2);
                    } catch (Throwable t) {}
                });
            } catch (Throwable t) {}
        });
    }

    // 前台 App 使用扫描（UsageEvents MOVE_TO_FOREGROUND/BACKGROUND → 使用时长事件 + now.fg）
    private void scanUsage() {
        if (!hasUsagePerm()) return;
        try {
            android.app.usage.UsageStatsManager usm =
                    (android.app.usage.UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm == null) return;
            long end = System.currentTimeMillis();
            android.app.usage.UsageEvents events = usm.queryEvents(lastUsageScan, end);
            lastUsageScan = end;
            if (events == null) return;
            android.app.usage.UsageEvents.Event e = new android.app.usage.UsageEvents.Event();
            String openPkg = null; long openAt = 0;
            while (events.hasNextEvent()) {
                events.getNextEvent(e);
                int t = e.getEventType();
                String pkg = e.getPackageName();
                if (pkg == null || pkg.equals(getPackageName())) continue;
                if (t == android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    // 上一个 App 结束 → 记使用时长事件
                    if (openPkg != null && openAt > 0) {
                        int min = Math.round((e.getTimeStamp() - openAt) / 60000f);
                        if (min >= 1) addEvent(evPut(evPut(ev("app"), "app", appLabel(openPkg)), "min", min));
                    }
                    openPkg = pkg;
                    openAt = e.getTimeStamp();
                } else if (t == android.app.usage.UsageEvents.Event.MOVE_TO_BACKGROUND) {
                    if (openPkg != null && openPkg.equals(pkg) && openAt > 0) {
                        int min = Math.round((e.getTimeStamp() - openAt) / 60000f);
                        if (min >= 1) addEvent(evPut(evPut(ev("app"), "app", appLabel(pkg)), "min", min));
                        openPkg = null; openAt = 0;
                    }
                }
            }
            // 当前前台 App 实时态
            String curFg = openPkg != null ? openPkg : lastFgPkg;
            if (curFg == null) curFkgFromUsage(usm);
            if (curFg != null) {
                if (!curFg.equals(lastFgPkg)) { lastFgPkg = curFg; lastFgSince = System.currentTimeMillis(); }
                JSONObject now = readJson("now");
                try {
                    JSONObject fg = new JSONObject();
                    fg.put("app", appLabel(curFg));
                    fg.put("sinceMin", Math.max(0, Math.round((System.currentTimeMillis() - lastFgSince) / 60000f)));
                    now.put("fg", fg);
                    saveJson("now", now);
                } catch (Throwable t) {}
            }
        } catch (Throwable t) {
            Logger.warn("Lookus99 scanUsage failed: " + t.getMessage());
        }
    }

    private void curFkgFromUsage(android.app.usage.UsageStatsManager usm) {
        try {
            long end = System.currentTimeMillis();
            java.util.Map<String, android.app.usage.UsageStats> agg = usm.queryAndAggregateUsageStats(end - 60_000L, end);
            if (agg == null) return;
            String best = null; long bestT = 0;
            for (android.app.usage.UsageStats us : agg.values()) {
                if (us == null) continue;
                if (us.getLastTimeUsed() > bestT) { bestT = us.getLastTimeUsed(); best = us.getPackageName(); }
            }
            if (best != null) { lastFgPkg = best; lastFgSince = bestT; }
        } catch (Throwable t) {}
    }

    // ==================== 工具 ====================

    private JSONObject ev(String type) {
        JSONObject o = new JSONObject();
        try { o.put("t", System.currentTimeMillis()); o.put("type", type); } catch (Throwable t) {}
        return o;
    }

    // 静默 put（JSONException 就地吞掉——事件字段丢失好过采集线程崩掉）
    private JSONObject evPut(JSONObject o, String k, Object v) {
        try { o.put(k, v); } catch (Throwable t) {}
        return o;
    }

    private void addEvent(JSONObject e) {
        try {
            JSONArray arr = readArr("events");
            arr.put(e);
            // 上限 2000 条 + 只留近 48h
            long cut = System.currentTimeMillis() - 48 * 3600_000L;
            JSONArray out = new JSONArray();
            for (int i = arr.length() - 1, kept = 0; i >= 0 && kept < 2000; i--) {
                JSONObject x = arr.optJSONObject(i);
                if (x != null && x.optLong("t", 0) >= cut) { out.put(x); kept++; }
            }
            saveStr("events", out.toString());
        } catch (Throwable t) {}
    }

    private boolean inNightWindow() {
        int h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        return h >= 23 || h < 6;
    }

    // 夜间归属日期：昨夜 23:00 ~ 今晨 06:00 归「昨夜」（06:00 前算昨晚）
    private String nightKey() {
        Calendar c = Calendar.getInstance();
        if (c.get(Calendar.HOUR_OF_DAY) < 6) c.add(Calendar.DATE, -1);
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.CHINA);
        return f.format(c.getTime());
    }

    private String appLabel(String pkg) {
        if (pkg == null) return null;
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
            String n = String.valueOf(pm.getApplicationLabel(ai));
            return n == null || n.isEmpty() ? pkg : n;
        } catch (Throwable t) { return pkg; }
    }

    private String geocode(double lat, double lng) {
        try {
            Geocoder g = new Geocoder(this, Locale.CHINA);
            List<Address> list = g.getFromLocation(lat, lng, 1);
            if (list != null && !list.isEmpty()) {
                Address a = list.get(0);
                StringBuilder sb = new StringBuilder();
                if (a.getLocality() != null) sb.append(a.getLocality());
                if (a.getSubLocality() != null) sb.append(a.getSubLocality());
                if (a.getThoroughfare() != null) sb.append(a.getThoroughfare());
                if (sb.length() > 0) return sb.toString();
            }
        } catch (Throwable t) {}
        return String.format(Locale.CHINA, "北纬%.2f·东经%.2f 附近", lat, lng);
    }

    private boolean hasUsagePerm() {
        try {
            android.app.AppOpsManager ops = (android.app.AppOpsManager) getSystemService(Context.APP_OPS_SERVICE);
            if (ops == null) return false;
            int mode = ops.checkOpNoThrow(android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(), getPackageName());
            return mode == android.app.AppOpsManager.MODE_ALLOWED;
        } catch (Throwable t) { return false; }
    }

    // ==================== 存储（SharedPreferences 轻量 JSON）====================

    private android.content.SharedPreferences sp() {
        return getSharedPreferences("lookus99", Context.MODE_PRIVATE);
    }

    private JSONObject readJson(String k) {
        try { return new JSONObject(sp().getString(k, "{}")); } catch (Throwable t) { return new JSONObject(); }
    }

    private JSONArray readArr(String k) {
        try { return new JSONArray(sp().getString(k, "[]")); } catch (Throwable t) { return new JSONArray(); }
    }

    private void saveJson(String k, JSONObject v) { saveStr(k, v.toString()); }
    private void saveStr(String k, String v) { sp().edit().putString(k, v).apply(); }
    private void beat() {
        sp().edit().putLong("lastBeat", System.currentTimeMillis()).apply();
        // v12.9.73 【P2-5】心跳续期 WakeLock（非计数锁重复 acquire = 重置超时；不抛异常）
        if (swBattery && wake != null) { try { wake.acquire(WAKE_TIMEOUT_MS); } catch (Throwable t) {} }
    }

    private Notification buildNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(CH_ID, "此时此刻设备状态同步", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("情侣空间【此时此刻】双方知情授权的状态同步采集（可随时在权限中心关闭）");
            nm.createNotificationChannel(ch);
        }
        Intent i = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = i == null ? null : PendingIntent.getActivity(this, 0, i, PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CH_ID)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentTitle("一人行 · 此时此刻")
                .setContentText("设备状态同步运行中（权限中心可关闭采集）")
                .setOngoing(true)
                .setContentIntent(pi)
                .build();
    }
}
