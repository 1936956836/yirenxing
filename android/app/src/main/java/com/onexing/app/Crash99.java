package com.onexing.app;

import android.content.Context;

import java.io.File;

// Crash99 —— v12.9.73 【P1 全局崩溃捕获】（仅本地 · 绝不联网）
// 背景：v12.9.72 前权限闪退排查全靠静态审查，无现场堆栈。本插件为进程级兜底：
//   · MainActivity.onCreate + Lookus99Service/Lock99Service.onCreate 三处幂等安装
//     （STICKY 重启时进程可能只建 Service、MainActivity 未建——Service 侧必须装）
//   · 崩溃发生 → 堆栈同步写入 filesDir/crash99/crash-<毫秒>.log（小文件 · <几KB）
//   · 写完链回系统默认 UncaughtExceptionHandler——进程退出/崩溃对话框/STICKY 重启
//     行为完全不变（不吞异常、不拦截系统处置）
//   · 容量限制：单份 ≤ 256KB · 最多 20 份 · 目录总量 ≤ 2MB（写后即轮转删旧）
//   · 隐私红线：原生层零网络权限调用；上传只经前端（96-perm99.js 弹窗征得用户
//     明确同意后，走已登录 Supabase 插入 crash99_logs 表）——禁止任何静默上传
//   · 前端接口：pending() 未上传崩溃数 / read(limit) 读日志 / clear() 用户确认后清
@com.getcapacitor.annotation.CapacitorPlugin(name = "Crash99")
public class Crash99 extends com.getcapacitor.Plugin {

    private static final int MAX_FILES = 20;                       // 最多保留 20 份
    private static final long MAX_FILE_BYTES = 256 * 1024L;        // 单份上限 256KB
    private static final long MAX_DIR_BYTES = 2 * 1024 * 1024L;    // 目录总上限 2MB
    private static volatile boolean installed = false;
    private static volatile String appVer = "?";

    // ==================== 进程级安装（幂等）====================

    public static synchronized void install(Context ctx) {
        if (installed) return;
        try {
            final Context app = ctx.getApplicationContext();
            final Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
            appVer = versionOf(app);
            Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
                try { write(app, t, e); } catch (Throwable ignore) {}   // 日志失败绝不影响崩溃处置
                if (prev != null) prev.uncaughtException(t, e);        // 链回系统默认（保持原有行为）
            });
            installed = true;
        } catch (Throwable ignore) {}
    }

    private static String versionOf(Context ctx) {
        try {
            android.content.pm.PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            return pi.versionName != null ? pi.versionName : "?";
        } catch (Throwable t) { return "?"; }
    }

    // ==================== 同步写盘 + 轮转 ====================

    private static File dirOf(Context ctx) {
        File d = new File(ctx.getFilesDir(), "crash99");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    private static void write(Context ctx, Thread t, Throwable e) {
        String stack;
        try { stack = android.util.Log.getStackTraceString(e); }
        catch (Throwable ig) {
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            stack = sw.toString();
        }
        StringBuilder sb = new StringBuilder();
        sb.append("time=").append(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS",
                java.util.Locale.CHINA).format(new java.util.Date())).append('\n');
        sb.append("app=").append(appVer).append(" android=").append(android.os.Build.VERSION.RELEASE)
          .append(" device=").append(android.os.Build.MANUFACTURER).append('/')
          .append(android.os.Build.MODEL).append('\n');
        sb.append("thread=").append(t != null ? t.getName() : "?").append('\n');
        sb.append("---- stack ----").append('\n').append(stack);
        byte[] bytes = sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        if (bytes.length > MAX_FILE_BYTES) {   // 截断保命：超长堆栈只留前 256KB
            sb.setLength(0);
            sb.append(new String(bytes, 0, (int) MAX_FILE_BYTES, java.nio.charset.StandardCharsets.UTF_8));
            sb.append("\n…(truncated)");
        }
        java.io.FileWriter fw = null;
        try {
            File f = new File(dirOf(ctx), "crash-" + System.currentTimeMillis() + ".log");
            fw = new java.io.FileWriter(f, false);
            fw.write(sb.toString());
        } catch (Throwable ignore) {
        } finally { try { if (fw != null) fw.close(); } catch (Throwable ignore) {} }
        rotate(ctx);
    }

    // 写后轮转：超 20 份或目录超 2MB → 从最旧删起（文件名含毫秒时间戳 · 字典序即时间序）
    private static void rotate(Context ctx) {
        try {
            File d = dirOf(ctx);
            File[] fs = d.listFiles((f, n) -> n.startsWith("crash-") && n.endsWith(".log"));
            if (fs == null || fs.length == 0) return;
            java.util.Arrays.sort(fs, (a, b) -> a.getName().compareTo(b.getName()));
            long total = 0;
            for (File f : fs) total += f.length();
            int i = 0;
            while (i < fs.length && (fs.length - i > MAX_FILES || total > MAX_DIR_BYTES)) {
                total -= fs[i].length();
                try { fs[i].delete(); } catch (Throwable ignore) {}
                i++;
            }
        } catch (Throwable ignore) {}
    }

    // ==================== 前端插件接口（只在用户明确操作时被调用）====================

    @com.getcapacitor.PluginMethod
    public void pending(com.getcapacitor.PluginCall call) {
        try {
            File[] fs = dirOf(getContext()).listFiles((f, n) -> n.startsWith("crash-") && n.endsWith(".log"));
            call.resolve(new com.getcapacitor.JSObject().put("count", fs == null ? 0 : fs.length));
        } catch (Throwable t) {
            call.resolve(new com.getcapacitor.JSObject().put("count", 0));
        }
    }

    @com.getcapacitor.PluginMethod
    public void read(com.getcapacitor.PluginCall call) {
        Integer limit = call.getInt("limit");
        int lim = (limit == null || limit < 1 || limit > MAX_FILES) ? MAX_FILES : limit;
        com.getcapacitor.JSArray arr = new com.getcapacitor.JSArray();
        try {
            File[] fs = dirOf(getContext()).listFiles((f, n) -> n.startsWith("crash-") && n.endsWith(".log"));
            if (fs != null) {
                java.util.Arrays.sort(fs, (a, b) -> b.getName().compareTo(a.getName()));   // 新在前
                for (int i = 0; i < fs.length && i < lim; i++) {
                    java.io.FileInputStream in = null;
                    try {
                        in = new java.io.FileInputStream(fs[i]);
                        java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
                        byte[] buf = new byte[4096];
                        int n;
                        while ((n = in.read(buf)) > 0 && bo.size() <= MAX_FILE_BYTES) bo.write(buf, 0, n);
                        com.getcapacitor.JSObject o = new com.getcapacitor.JSObject();
                        o.put("file", fs[i].getName());
                        o.put("text", bo.toString("UTF-8"));
                        arr.put(o);
                    } catch (Throwable ignore) {
                    } finally { try { if (in != null) in.close(); } catch (Throwable ignore) {} }
                }
            }
        } catch (Throwable t) {}
        com.getcapacitor.JSObject r = new com.getcapacitor.JSObject();
        try { r.put("logs", arr); } catch (Throwable ignore) {}
        call.resolve(r);
    }

    @com.getcapacitor.PluginMethod
    public void clear(com.getcapacitor.PluginCall call) {
        try {
            File[] fs = dirOf(getContext()).listFiles((f, n) -> n.startsWith("crash-") && n.endsWith(".log"));
            if (fs != null) for (File f : fs) { try { f.delete(); } catch (Throwable ignore) {} }
        } catch (Throwable t) {}
        call.resolve(new com.getcapacitor.JSObject().put("cleared", true));
    }
}
