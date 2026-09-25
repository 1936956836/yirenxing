package com.onexing.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

/**
 * 一人行 · 主入口（v12.9.59 重做 → v12.9.66 WebView UA 豁免）
 *
 * 全部原生能力一律使用 npm 公开社区/官方 Capacitor 插件（npx cap sync 自动注册，
 * 清单见 android/app/src/main/assets/capacitor.plugins.json）：
 *   · @capacitor-community/speech-recognition —— 语音识别（Android SpeechRecognizer）
 *   · @capacitor-community/text-to-speech    —— 文字转语音（系统 TTS 引擎）
 *   · @capacitor/local-notifications         —— 通知栏本地推送（官方）
 *   · @capacitor/device                      —— 版本信息（官方）
 *
 * 历史教训（v12.9.41~58 的「unable to find plugin」根因）：
 *   曾经在此手写 registerPlugin(自造插件.class) 并在 build-android.js 注入假桩——
 *   自造插件不在 Capacitor 8 的注册链里，真机一律报「插件不存在」。
 *   本版彻底移除全部自造插件，只留官方注册链，MainActivity 不再需要任何手工代码。
 *
 * ── v12.9.66 WebView 跨域/UA 豁免（阿福 Edge-TTS 在线合成 · 用户规则 4）──
 * 网页前端直连 Edge-TTS（wss://speech.platform.bing.com）受浏览器安全模型限制：
 * JS 无法自定义 WebSocket 握手的 User-Agent / Origin 等头，而微软语音服务的 WAF
 * 只放行带「Edg/&lt;新版本号&gt;」的 Edge 浏览器 UA（实测 Edg/143 通过、Edg/130 及
 * 纯 Chrome UA 一律 403 拒绝）——安卓 WebView 默认 UA 是纯 Chrome 形态，直连必被拒。
 * 官方兜底两条路：① 配置 WebView 跨域豁免（本文件：在默认 UA 尾部追加 Edg 标识，
 * 不破坏原 UA 的设备信息，仅令 WSS 握手头满足 Edge 特征）；② 后端代理中转 Edge-TTS
 * 接口（无后端部署，未采用）。本实现选 ①：bridge 初始化完成后对 WebView 追加 UA 后缀。
 * 只影响网络请求握手头，不影响页面渲染与现有插件逻辑；网页版（无原生层）无法追加，
 * 失败时前端按统一文案弹「在线合成未成功」提示（95-native99.js 规则 6）。
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // v12.9.73 【P1 全局崩溃捕获】：进程级安装（幂等 · 链回系统默认处理，不改变崩溃后行为；
        //   只写本地文件绝不联网——上传需用户在前端弹窗明确同意）。放在 super.onCreate 之前，
        //   尽早覆盖初始化阶段的异常。
        try { Crash99.install(getApplicationContext()); } catch (Throwable t) {}
        super.onCreate(savedInstanceState);
        // 阿福 Edge-TTS 豁免：默认 UA 尾部追加 Edge 标识（微软 WAF 要求 Edg/≥131；
        // 143 为当前 edge-tts 官方客户端同款版本号。保留原 UA 全部设备信息。）
        try {
            WebSettings settings = getBridge().getWebView().getSettings();
            String ua = settings.getUserAgentString();
            if (ua != null && !ua.contains("Edg/")) {
                settings.setUserAgentString(ua + " Edg/143.0.0.0");
            }
        } catch (Throwable t) {
            // UA 追加失败不阻断启动（TTS 会走前端统一失败提示，不影响 App 其余功能）
        }
    }
}
