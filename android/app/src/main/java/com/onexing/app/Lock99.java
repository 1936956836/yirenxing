package com.onexing.app;

// Lock99 —— v12.9.70 【应用锁机】插件桥（前端 ↔ Lock99Service）
// 前端 116-lock99.js 经 Capacitor 官方注册链调用（capacitor.plugins.json 已列本类）：
//   listApps()              本机全部可启动的用户 App（供勾选上锁目标）
//   getRules()/saveRules()  规则读写（JSON 整包下发；Service 在跑则即时重载）
//   lockNow(minutes)        手动模式立即上锁（allowUnlock 遵从用户配置）
//   afuLock(minutes,reason) 阿福模式上锁（原生强制屏蔽手动解锁——无视 allowManualUnlock）
//   unlockManually()         手动解锁（仅 manual+allowUnlock 放行；阿福模式一律拒绝）
//   stopAll()               停止 Service + 销毁屏保（权限中心关悬浮窗开关的唯一逃生出口）
//   status()                锁机会话 + 规则 + 运行/心跳（前端渲染状态卡与异常提示）
//   history()               最近上锁日志（触发时间/原因/App/模式/解锁方式）
// 所有数据只进本机 SharedPreferences "lock99"，不联网不上传。
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "Lock99")
public class Lock99 extends Plugin {

    // ==================== 应用列表（勾选用）====================

    @PluginMethod
    public void listApps(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            List<android.content.pm.ResolveInfo> launchables = pm.queryIntentActivities(
                    new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0);
            List<JSObject> out = new ArrayList<>();
            String self = getContext().getPackageName();
            for (android.content.pm.ResolveInfo ri : launchables) {
                try {
                    String pkg = ri.activityInfo.packageName;
                    if (pkg == null || pkg.equals(self)) continue;      // 不锁自己
                    ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
                    boolean sys = (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0
                            && (ai.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) == 0;
                    if (sys) continue;                                  // 只列用户 App
                    JSObject o = new JSObject();
                    o.put("pkg", pkg);
                    o.put("name", String.valueOf(ri.loadLabel(pm)));
                    out.add(o);
                } catch (Throwable ignore) {}
            }
            out.sort((a, b) -> String.valueOf(a.optString("name")).compareTo(String.valueOf(b.optString("name"))));
            JSObject r = new JSObject();
            r.put("apps", new JSArray(out));
            call.resolve(r);
        } catch (Throwable t) {
            call.reject("list-failed");
        }
    }

    // ==================== 规则读写 =====================

    @PluginMethod
    public void getRules(PluginCall call) {
        try {
            call.resolve(new JSObject(readJson("rules").toString()));
        } catch (Throwable t) {
            call.resolve(new JSObject());
        }
    }

    @PluginMethod
    public void saveRules(PluginCall call) {
        JSObject rules = call.getObject("rules");
        if (rules == null) { call.reject("no-rules"); return; }
        try {
            sp().edit().putString("rules", new JSONObject(rules.toString()).toString()).apply();
            svc("RULES_CHANGED");
            call.resolve(new JSObject().put("saved", true));
        } catch (Throwable t) { call.reject("save-failed"); }
    }

    // ==================== 锁机操作 =====================

    // 手动模式立即上锁（遵从 rules.allowManualUnlock）
    @PluginMethod
    public void lockNow(PluginCall call) {
        int minutes = clampMinutes(call.getInt("minutes"));
        JSONObject rules = readJson("rules");
        JSONArray apps = rules.optJSONArray("apps");
        if (apps == null || apps.length() == 0) { call.reject("no-apps"); return; }
        Intent it = lockIntent(false, minutes, "manual", apps);
        start(it);
        call.resolve(new JSObject().put("locked", true));
    }

    // 阿福自动管控上锁（强制不可手动解锁——硬性约束在原生层兜底）
    @PluginMethod
    public void afuLock(PluginCall call) {
        int minutes = clampMinutes(call.getInt("minutes"));
        String reason = call.getString("reason", "afu");
        JSONObject rules = readJson("rules");
        JSONArray apps = rules.optJSONArray("apps");
        if (apps == null || apps.length() == 0) { call.reject("no-apps"); return; }
        Intent it = lockIntent(true, minutes, reason, apps);
        start(it);
        call.resolve(new JSObject().put("locked", true));
    }

    // 手动解锁（阿福模式一律拒绝）
    @PluginMethod
    public void unlockManually(PluginCall call) {
        JSONObject l = readJson("locking");
        if (l.optBoolean("on") && "manual".equals(l.optString("mode")) && l.optBoolean("allowUnlock")) {
            start(new Intent(getContext(), Lock99Service.class).setAction("UNLOCK_MANUAL"));
            call.resolve(new JSObject().put("unlocked", true));
        } else {
            call.reject("unlock-forbidden");     // 阿福自控锁：不存在手动解锁路径
        }
    }

    // 权限中心关「悬浮窗」App内开关 → 全量停止（唯一逃生出口）
    @PluginMethod
    public void stopAll(PluginCall call) {
        start(new Intent(getContext(), Lock99Service.class).setAction("STOP_ALL"));
        call.resolve(new JSObject().put("stopped", true));
    }

    // ==================== 状态 / 日志 =====================

    @PluginMethod
    public void status(PluginCall call) {
        try {
            JSONObject l = readJson("locking");
            long beat = sp().getLong("lastBeat", 0);
            long remainMs = l.optBoolean("on") ? l.optLong("until", 0) - System.currentTimeMillis() : 0;
            JSObject o = new JSObject();
            o.put("locking", l);
            o.put("remainSec", l.optBoolean("on") ? Math.max(0, Math.round(remainMs / 1000f)) : 0);
            o.put("running", Lock99Service.isRunning());
            o.put("beatGapMin", beat <= 0 ? -1 : Math.round((System.currentTimeMillis() - beat) / 60000f));
            o.put("overlayPerm", canOverlay());
            o.put("usagePerm", hasUsagePerm());
            call.resolve(o);
        } catch (Throwable t) { call.reject("status-failed"); }
    }

    @PluginMethod
    public void history(PluginCall call) {
        JSObject o = new JSObject();
        try { o.put("list", new JSONArray(sp().getString("history", "[]"))); }
        catch (Throwable t) { o.put("list", new JSONArray()); }
        call.resolve(o);
    }

    @PluginMethod
    public void hasOverlayPerm(PluginCall call) {
        call.resolve(new JSObject().put("granted", canOverlay()));
    }

    // ==================== 工具 =====================

    private int clampMinutes(Integer m) {
        int v = m == null ? 30 : m;
        if (v < 1) v = 1;
        if (v > 480) v = 480;
        return v;
    }

    private Intent lockIntent(boolean afu, int minutes, String reason, JSONArray apps) {
        Intent it = new Intent(getContext(), Lock99Service.class).setAction("LOCK");
        it.putExtra("afu", afu);
        it.putExtra("minutes", minutes);
        it.putExtra("reason", reason);
        String[] arr = new String[apps.length()];
        for (int i = 0; i < apps.length(); i++) arr[i] = apps.optString(i, "");
        it.putExtra("apps", arr);
        return it;
    }

    private void start(Intent it) {
        Context ctx = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(it);
            else ctx.startService(it);
        } catch (Throwable t) { /* 前台服务启动失败由 status() 暴露给前端提示 */ }
    }

    private void svc(String action) {
        try {
            Intent it = new Intent(getContext(), Lock99Service.class).setAction(action);
            if (Lock99Service.isRunning()) start(it);
        } catch (Throwable t) {}
    }

    private boolean canOverlay() {
        try { return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(getContext()); }
        catch (Throwable t) { return false; }
    }

    private boolean hasUsagePerm() {
        try {
            android.app.AppOpsManager ops = (android.app.AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
            if (ops == null) return false;
            int mode = ops.checkOpNoThrow(android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(), getContext().getPackageName());
            return mode == android.app.AppOpsManager.MODE_ALLOWED;
        } catch (Throwable t) { return false; }
    }

    private android.content.SharedPreferences sp() {
        return getContext().getSharedPreferences("lock99", Context.MODE_PRIVATE);
    }

    private JSONObject readJson(String k) {
        try { return new JSONObject(sp().getString(k, "{}")); } catch (Throwable t) { return new JSONObject(); }
    }
}
