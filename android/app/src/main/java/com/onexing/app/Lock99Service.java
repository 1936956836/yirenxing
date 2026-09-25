package com.onexing.app;

// Lock99Service —— v12.9.70 【应用锁机】后台监控前台 Service（安卓原生）
// 职责（模仿「不做手机控」核心自控锁机 · 仅本机运行）：
//   · 前台 App 切换监听（UsageEvents · 需「使用情况访问」权限）→ 被锁 App 一到前台立刻弹全屏悬浮屏保
//   · 全屏悬浮屏保（WindowManager TYPE_APPLICATION_OVERLAY · 需悬浮窗权限）：绿白治愈风、
//     剩余倒计时 mm:ss；手动模式且允许 →【立即解锁】按钮；阿福模式 → 无任何解锁入口
//   · 锁机倒计时走原生 Service（退出一人行 / 划掉后台计时不中断；结束自动解锁）
//   · 阿福自动规则原生判定：时间条件（HH:mm 达标且当日未触发）+ 使用时长阈值条件（当日累计分钟达标）
//   · 硬性约束：阿福触发的锁机（mode=afu）强制屏蔽手动解锁，无视 allowManualUnlock 配置
//   · 逃生出口唯一：前端权限中心关「悬浮窗权限」App内开关 → Lock99.stopAll() 销毁一切
//   · 状态持久化（SharedPreferences "lock99"）：rules / locking（会话） / history（最近100条）/ lastBeat
//   · 设备重启：Lock99BootReceiver 拉起本 Service → START_STICKY 恢复会话与规则监控
//   · 目标 App 被卸载：轮询自动从规则与会话中剔除该包名
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.Logger;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.Map;

public class Lock99Service extends Service {

    public static final String CH_ID = "lock99_guard";
    private static volatile boolean running = false;

    private final Handler main = new Handler(Looper.getMainLooper());
    // v12.9.73 【P2-4】tick 主循环迁至独立 HandlerThread：detectForeground /
    //   todayUsageMinutes / pruneUninstalled 全是 Binder IPC + PackageManager 查询，
    //   旧版在主线程每 1~2 秒执行会拖 UI；现在只留屏保 View 增删回主线程（WindowManager
    //   视图必须挂在带 Looper 的稳定线程——悬浮屏保是核心功能，View 线程不冒险）
    private android.os.HandlerThread bgThread = null;
    private android.os.Handler bg = null;
    private final Runnable tickRun = this::tick;
    private WindowManager wm = null;
    private volatile View overlay = null;         // 当前屏保 View（同一时刻只挂一张 · main 线程改 · bg 读）
    private volatile String overlayFor = null;    // 屏保当前覆盖的包名
    private volatile JSONObject locking = new JSONObject();   // 当前锁机会话（内存态 · 变更即写盘）
    private volatile JSONObject rules = new JSONObject();     // 上锁规则（内存态 · 启动/变更时读盘）
    private long lastFgScan = 0;                 // UsageEvents 游标
    private String lastFgPkg = null;
    private long lastRuleCheck = 0;
    private long lastPrune = 0;
    private long tickN = 0;
    private volatile TextView tvCount = null, tvMsg = null;
    private volatile Button btnUnlock = null;

    // ==================== 生命周期 ====================

    @Override
    public void onCreate() {
        super.onCreate();
        // v12.9.73 【P1 崩溃捕获】：STICKY 重启场景进程可能只建 Service——Service 侧幂等安装
        try { Crash99.install(this); } catch (Throwable t) {}
        try {
            bgThread = new android.os.HandlerThread("Lock99Bg");
            bgThread.start();
            bg = new Handler(bgThread.getLooper());
        } catch (Throwable t) { bg = null; }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String act = intent != null ? intent.getAction() : "";
        if ("STOP_ALL".equals(act)) {                       // 权限中心关悬浮窗开关：唯一逃生出口
            // v12.9.72 闪退修复：本 Service 由 stopAll() 经 startForegroundService 拉起——
            //   Android 12+ 要求拉起后 5 秒内必须调 startForeground()，直接 stopSelf()
            //   会抛 ForegroundServiceDidNotStartInTimeException → 关开关闪退。
            //   先挂前台通知再立即自停（通知随 stopSelf 消失，用户无感知）。
            try { startForeground(9902, buildNotification()); } catch (Throwable t) {}
            clearLocking(true);
            hideOverlay();
            stopSelf();
            return START_NOT_STICKY;
        }
        startForeground(9902, buildNotification());
        rules = readJson("rules");
        if ("LOCK".equals(act)) {                           // 插件桥下发：立即锁（手动 / 阿福）
            JSONObject l = new JSONObject();
            jput(l, "on", true);
            jput(l, "mode", intent.getBooleanExtra("afu", false) ? "afu" : "manual");
            jput(l, "allowUnlock", !intent.getBooleanExtra("afu", false) && intent.getBooleanExtra("allowUnlock", false));
            jput(l, "minutes", Math.max(1, intent.getIntExtra("minutes", 30)));
            jput(l, "started", System.currentTimeMillis());
            jput(l, "until", System.currentTimeMillis() + Math.max(1, intent.getIntExtra("minutes", 30)) * 60000L);
            jput(l, "reason", intent.getStringExtra("reason") != null ? intent.getStringExtra("reason") : "manual");
            JSONArray apps = new JSONArray();
            String[] arr = intent.getStringArrayExtra("apps");
            if (arr != null) for (String p : arr) apps.put(p);
            jput(l, "apps", apps);
            locking = l;
            saveJson("locking", l);
            addHistory(l);
        } else if ("UNLOCK_MANUAL".equals(act)) {          // 手动解锁（仅 manual + allowUnlock 放行）
            JSONObject l = readJson("locking");
            if (l.optBoolean("on") && "manual".equals(l.optString("mode")) && l.optBoolean("allowUnlock")) {
                jput(l, "unlockedBy", "manual");
                jput(l, "on", false);
                jput(l, "endT", System.currentTimeMillis());
                locking = l;
                saveJson("locking", l);
                addHistory(l);
                hideOverlay();
            }
        } else if ("RULES_CHANGED".equals(act)) {
            rules = readJson("rules");
        } else {
            // 系统重启 / START_STICKY 恢复：locking 未过期则续走，过期则清
            JSONObject l = readJson("locking");
            if (l.optBoolean("on") && l.optLong("until", 0) <= System.currentTimeMillis()) {
                jput(l, "on", false);
                jput(l, "unlockedBy", "auto");
                jput(l, "endT", System.currentTimeMillis());
                saveJson("locking", l);
                addHistory(l);
            }
            locking = readJson("locking");
        }
        running = true;
        lastFgScan = System.currentTimeMillis() - 10_000L;
        startLoop();
        Logger.info("Lock99Service started: " + act + " locking.on=" + locking.optBoolean("on"));
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        main.removeCallbacksAndMessages(null);
        if (bg != null) bg.removeCallbacksAndMessages(null);
        try { if (bgThread != null) bgThread.quitSafely(); } catch (Throwable t) {}
        hideOverlay();
        Logger.info("Lock99Service stopped");
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    public static boolean isRunning() { return running; }

    // ==================== 主循环（1s tick · v12.9.73 起跑在 Lock99Bg HandlerThread）====================

    // v12.9.73 修复隐藏问题：旧版每次 onStartCommand 都 postDelayed 一个新 tick →
    //   LOCK/RULES_CHANGED 多次下发后出现 N 重并行循环（N 倍心跳/检测开销）。
    //   先 removeCallbacks 去重再排，任意时刻最多 1 条循环。
    private void startLoop() {
        Handler h = bg != null ? bg : main;
        h.removeCallbacks(tickRun);
        h.postDelayed(tickRun, 1000L);
    }

    private void tick() {
        try {
            tickN++;
            long now = System.currentTimeMillis();
            // —— 倒计时：结束自动解锁 ——
            if (locking.optBoolean("on")) {
                long remain = locking.optLong("until", 0) - now;
                if (remain <= 0) {
                    jput(locking, "on", false);
                    jput(locking, "unlockedBy", "auto");
                    jput(locking, "endT", now);
                    saveJson("locking", locking);
                    addHistory(locking);
                    main.post(this::hideOverlay);          // View 操作回主线程
                } else {
                    updateOverlayCountdown(remain);
                }
            }
            // —— 前台 App 检测（每 2s · Binder IPC 现已在本后台线程）→ 弹/收屏保 ——
            if (tickN % 2 == 0 && locking.optBoolean("on")) {
                String fg = detectForeground();
                if (fg != null && inLockList(fg) && canOverlay()) {
                    if (!fg.equals(overlayFor)) {
                        final String pkg = fg;
                        main.post(() -> { hideOverlay(); showOverlay(pkg); });   // View 增删回主线程
                    }
                } else if (overlay != null && (fg == null || !inLockList(fg))) {
                    // 回到桌面/其他 App：收起屏保（回被锁 App 再弹）
                    main.post(this::hideOverlay);
                }
            }
            // —— 阿福自动规则（每 60s · 未在锁机中才评估；usageBinder 查询同样在后台线程）——
            if (now - lastRuleCheck >= 60_000L) {
                lastRuleCheck = now;
                if (!locking.optBoolean("on")) checkAfuRules(now);
            }
            // —— 卸载剔除（每 5 分钟）——
            if (now - lastPrune >= 300_000L) {
                lastPrune = now;
                pruneUninstalled();
            }
            // v12.9.72 降频：心跳写盘从每秒 1 次改为每 30 秒 1 次（SharedPreferences
            //   高频序列化+落盘开销大，且 beatGapMin 只需分钟级精度）
            if (tickN % 30 == 0) beat();
        } catch (Throwable t) {
            Logger.warn("Lock99 tick: " + t.getMessage());
        }
        Handler h = bg != null ? bg : main;
        h.postDelayed(tickRun, 1000L);
    }

    // ==================== 前台 App 检测（UsageEvents）====================

    private String detectForeground() {
        try {
            if (!hasUsagePerm()) return lastFgPkg;
            UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm == null) return lastFgPkg;
            long end = System.currentTimeMillis();
            UsageEvents events = usm.queryEvents(lastFgScan, end);
            lastFgScan = end;
            if (events != null) {
                UsageEvents.Event e = new UsageEvents.Event();
                while (events.hasNextEvent()) {
                    events.getNextEvent(e);
                    if (e.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND
                            && e.getPackageName() != null) {
                        lastFgPkg = e.getPackageName();
                    }
                }
            }
            if (lastFgPkg == null) {
                Map<String, UsageStats> agg = usm.queryAndAggregateUsageStats(end - 30_000L, end);
                if (agg != null) {
                    String best = null; long bestT = 0;
                    for (UsageStats us : agg.values()) {
                        if (us != null && us.getLastTimeUsed() > bestT) { bestT = us.getLastTimeUsed(); best = us.getPackageName(); }
                    }
                    if (best != null) lastFgPkg = best;
                }
            }
            return lastFgPkg;
        } catch (Throwable t) { return lastFgPkg; }
    }

    private boolean inLockList(String pkg) {
        if (pkg == null) return false;
        JSONArray apps = locking.optJSONArray("apps");
        if (apps == null) return false;
        for (int i = 0; i < apps.length(); i++) {
            if (pkg.equals(apps.optString(i, null))) return true;
        }
        return false;
    }

    // ==================== 阿福自动规则（时间 / 使用时长阈值）====================

    private void checkAfuRules(long now) {
        if (!rules.optBoolean("afuMode")) return;
        JSONArray apps = rules.optJSONArray("apps");
        if (apps == null || apps.length() == 0) return;
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd", Locale.CHINA);
        String today = df.format(new Date(now));
        SimpleDateFormat hf = new SimpleDateFormat("HH:mm", Locale.CHINA);
        String hm = hf.format(new Date(now));
        int minutes = Math.max(1, rules.optInt("minutes", 30));
        // —— 时间条件：到点且当日未触发 ——
        JSONObject tc = rules.optJSONObject("timeCond");
        if (tc != null && tc.optBoolean("on") && tc.optString("time", "").length() == 5) {
            if (hm.compareTo(tc.optString("time")) >= 0
                    && !today.equals(sp().getString("afuTimeDate", ""))) {
                sp().edit().putString("afuTimeDate", today).apply();
                startLockSession(true, minutes, "time", apps);
                return;
            }
        }
        // —— 使用时长阈值条件：当日被锁 App 累计前台分钟 ≥ 阈值 ——
        JSONObject uc = rules.optJSONObject("usageCond");
        if (uc != null && uc.optBoolean("on") && hasUsagePerm() && uc.optInt("minutes", 0) > 0) {
            int total = todayUsageMinutes(apps);
            if (total >= uc.optInt("minutes", 0)
                    && !today.equals(sp().getString("afuUsageDate", ""))) {
                sp().edit().putString("afuUsageDate", today).apply();
                startLockSession(true, minutes, "usage", apps);
            }
        }
        // 习惯打卡条件：习惯数据在前端 Store（本机 JS 库）——由前端阿福调度 tick 判定后
        //   经 Lock99 插件 afuLock() 下发，原生不掺和（数据不出本机的边界保持不变）。
    }

    private int todayUsageMinutes(JSONArray apps) {
        try {
            UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm == null) return 0;
            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
            Map<String, UsageStats> agg = usm.queryAndAggregateUsageStats(cal.getTimeInMillis(), System.currentTimeMillis());
            if (agg == null) return 0;
            long ms = 0;
            for (int i = 0; i < apps.length(); i++) {
                UsageStats us = agg.get(apps.optString(i, ""));
                if (us != null) ms += us.getTotalTimeInForeground();
            }
            return Math.round(ms / 60000f);
        } catch (Throwable t) { return 0; }
    }

    private void startLockSession(boolean afu, int minutes, String reason, JSONArray apps) {
        JSONObject l = new JSONObject();
        jput(l, "on", true);
        jput(l, "mode", afu ? "afu" : "manual");
        jput(l, "allowUnlock", !afu && rules.optBoolean("allowManualUnlock"));   // 阿福模式硬性屏蔽
        jput(l, "minutes", minutes);
        jput(l, "started", System.currentTimeMillis());
        jput(l, "until", System.currentTimeMillis() + minutes * 60000L);
        jput(l, "reason", reason);
        jput(l, "apps", apps);
        locking = l;
        saveJson("locking", l);
        addHistory(l);
        Logger.info("Lock99 session start: mode=" + (afu ? "afu" : "manual") + " reason=" + reason + " min=" + minutes);
    }

    // ==================== 全屏悬浮屏保（绿白治愈风）====================

    private void showOverlay(String pkg) {
        try {
            if (overlay != null || !canOverlay()) return;
            wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
            boolean afu = "afu".equals(locking.optString("mode"));
            LinearLayout root = new LinearLayout(this);
            root.setOrientation(LinearLayout.VERTICAL);
            root.setGravity(Gravity.CENTER);
            GradientDrawable bg = new GradientDrawable(
                    GradientDrawable.Orientation.TOP_BOTTOM,
                    new int[]{0xFFF0FDF4, 0xFFDCFCE7, 0xFFF0FDF4});
            root.setBackground(bg);

            TextView dog = new TextView(this);
            dog.setText("🐕");
            dog.setTextSize(46);
            dog.setGravity(Gravity.CENTER);
            root.addView(dog);

            TextView title = new TextView(this);
            title.setText(afu ? "🔒 阿福自控锁进行中" : "🔒 应用锁机中");
            title.setTextSize(19);
            title.setTypeface(Typeface.DEFAULT_BOLD);
            title.setTextColor(0xFF047857);
            title.setGravity(Gravity.CENTER);
            title.setPadding(0, 18, 0, 4);
            root.addView(title);

            TextView count = new TextView(this);
            count.setText("--:--");
            count.setTextSize(52);
            count.setTypeface(Typeface.DEFAULT_BOLD);
            count.setTextColor(0xFF059669);
            count.setGravity(Gravity.CENTER);
            root.addView(count);
            tvCount = count;

            TextView msg = new TextView(this);
            msg.setText(afu ? "阿福自控模式，需等待时间结束自动解锁"
                    : "休息一下，眼睛和明天的你都会感谢现在");
            msg.setTextSize(14);
            msg.setTextColor(0xFF3F6212);
            msg.setGravity(Gravity.CENTER);
            msg.setPadding(60, 12, 60, 12);
            root.addView(msg);
            tvMsg = msg;

            if (!afu && locking.optBoolean("allowUnlock")) {
                Button unlock = new Button(this);
                unlock.setText("立即解锁");
                unlock.setTextSize(15);
                unlock.setTextColor(0xFF047857);
                GradientDrawable bbg = new GradientDrawable();
                bbg.setColor(0xFFFFFFFF);
                bbg.setStroke(2, 0xFF34D399);
                bbg.setCornerRadius(999);
                unlock.setBackground(bbg);
                LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(
                        (int) (220 * getResources().getDisplayMetrics().density), ViewGroup_lp());
                bp.topMargin = 18;
                bp.gravity = Gravity.CENTER;
                unlock.setLayoutParams(bp);
                unlock.setOnClickListener(v -> unlockManuallyFromOverlay());
                root.addView(unlock);
                btnUnlock = unlock;
            }
            TextView tiny = new TextView(this);
            tiny.setText("一人行 · 应用锁机");
            tiny.setTextSize(11);
            tiny.setTextColor(0xFF86EFAC);
            tiny.setGravity(Gravity.CENTER);
            tiny.setPadding(0, 26, 0, 0);
            root.addView(tiny);

            WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                            : WindowManager.LayoutParams.TYPE_PHONE,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE     // 不吃系统返回键焦点
                            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                            | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                            | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                    PixelFormat.TRANSLUCENT);
            // 全屏：状态栏/导航栏也盖住（沉浸）
            lp.gravity = Gravity.CENTER;
            wm.addView(root, lp);
            overlay = root;
            overlayFor = pkg;
            updateOverlayCountdown(locking.optLong("until", 0) - System.currentTimeMillis());
        } catch (Throwable t) {
            Logger.warn("Lock99 showOverlay: " + t.getMessage());
        }
    }

    // Button 高度换算（dp → px，兼容低版本无 ViewGroup 常量写法）
    private int ViewGroup_lp() {
        return (int) (44 * getResources().getDisplayMetrics().density);
    }

    private void updateOverlayCountdown(long remainMs) {
        try {
            if (overlay == null || tvCount == null) return;
            long s = Math.max(0, remainMs / 1000);
            String txt = String.format(Locale.CHINA, "%d:%02d", s / 60, s % 60);
            main.post(() -> { try { if (tvCount != null) tvCount.setText(txt); } catch (Throwable t) {} });
        } catch (Throwable t) {}
    }

    private void unlockManuallyFromOverlay() {
        try {
            JSONObject l = readJson("locking");
            if (l.optBoolean("on") && "manual".equals(l.optString("mode")) && l.optBoolean("allowUnlock")) {
                jput(l, "on", false);
                jput(l, "unlockedBy", "manual");
                jput(l, "endT", System.currentTimeMillis());
                locking = l;
                saveJson("locking", l);
                addHistory(l);
            }
            hideOverlay();
        } catch (Throwable t) {}
    }

    private void hideOverlay() {
        try {
            if (overlay != null && wm != null) wm.removeView(overlay);
        } catch (Throwable t) {}
        overlay = null;
        overlayFor = null;
        tvCount = null; tvMsg = null; btnUnlock = null;
    }

    // ==================== 卸载剔除 ====================

    private void pruneUninstalled() {
        try {
            PackageManager pm = getPackageManager();
            boolean dirty = false;
            // 规则表
            JSONArray apps = rules.optJSONArray("apps");
            if (apps != null) {
                JSONArray out = new JSONArray();
                for (int i = 0; i < apps.length(); i++) {
                    String p = apps.optString(i, "");
                    if (p.length() == 0) continue;
                    if (pm.getLaunchIntentForPackage(p) != null) out.put(p);
                    else { dirty = true; Logger.info("Lock99 prune(uninstalled): " + p); }
                }
                if (dirty) { jput(rules, "apps", out); saveJson("rules", rules); }
            }
            // 锁机会话
            JSONArray la = locking.optJSONArray("apps");
            if (la != null) {
                JSONArray out = new JSONArray();
                boolean d2 = false;
                for (int i = 0; i < la.length(); i++) {
                    String p = la.optString(i, "");
                    if (p.length() == 0) continue;
                    if (pm.getLaunchIntentForPackage(p) != null) out.put(p);
                    else d2 = true;
                }
                if (d2) { jput(locking, "apps", out); saveJson("locking", locking); }
            }
        } catch (Throwable t) {}
    }

    private void clearLocking(boolean log) {
        if (locking.optBoolean("on")) {
            jput(locking, "on", false);
            jput(locking, "unlockedBy", "force");       // 权限中心强制终止
            jput(locking, "endT", System.currentTimeMillis());
            if (log) addHistory(locking);
        }
        saveJson("locking", locking);
    }

    // ==================== 上锁日志（最近 100 条）====================

    private void addHistory(JSONObject l) {
        try {
            JSONObject h = new JSONObject();
            jput(h, "t", l.optLong("started", System.currentTimeMillis()));
            jput(h, "mode", l.optString("mode", "manual"));
            jput(h, "reason", l.optString("reason", "manual"));
            jput(h, "minutes", l.optInt("minutes", 0));
            jput(h, "unlockedBy", l.optString("unlockedBy", ""));
            jput(h, "endT", l.optLong("endT", 0));
            JSONArray names = new JSONArray();
            JSONArray apps = l.optJSONArray("apps");
            PackageManager pm = getPackageManager();
            if (apps != null) for (int i = 0; i < apps.length(); i++) {
                String p = apps.optString(i, "");
                String n = p;
                try {
                    ApplicationInfo ai = pm.getApplicationInfo(p, 0);
                    n = String.valueOf(pm.getApplicationLabel(ai));
                } catch (Throwable t) {}
                names.put(n);
            }
            jput(h, "apps", names);
            JSONArray arr = readArr("history");
            arr.put(h);
            JSONArray out = new JSONArray();
            for (int i = arr.length() - 1, kept = 0; i >= 0 && kept < 100; i--) out.put(arr.optJSONObject(i));
            saveStr("history", out.toString());
        } catch (Throwable t) {}
    }

    // ==================== 工具 ====================

    private boolean canOverlay() {
        try { return Settings.canDrawOverlays(this); } catch (Throwable t) { return false; }
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

    private void jput(JSONObject o, String k, Object v) { try { o.put(k, v); } catch (Throwable t) {} }

    private android.content.SharedPreferences sp() {
        return getSharedPreferences("lock99", Context.MODE_PRIVATE);
    }

    private JSONObject readJson(String k) {
        try { return new JSONObject(sp().getString(k, "{}")); } catch (Throwable t) { return new JSONObject(); }
    }

    private JSONArray readArr(String k) {
        try { return new JSONArray(sp().getString(k, "[]")); } catch (Throwable t) { return new JSONArray(); }
    }

    private void saveJson(String k, JSONObject v) { saveStr(k, v.toString()); }
    private void saveStr(String k, String v) { sp().edit().putString(k, v).apply(); }
    private void beat() { sp().edit().putLong("lastBeat", System.currentTimeMillis()).apply(); }

    private Notification buildNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(CH_ID, "应用锁机守护", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("应用锁机后台守护（权限中心可随时关闭）");
            nm.createNotificationChannel(ch);
        }
        Intent i = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = i == null ? null : PendingIntent.getActivity(this, 0, i, PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CH_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setContentTitle("一人行 · 应用锁机")
                .setContentText("锁机守护运行中（权限中心可关闭）")
                .setOngoing(true)
                .setContentIntent(pi)
                .build();
    }
}
