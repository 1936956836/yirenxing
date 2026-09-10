// 145-boot.js —— 生词样式注入 / 生词初始化 / 应用启动入口（自 app.js 机械拆分 · v2026.0905 模块化）
// [功能组] G1-系统内核（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// 剧情生词高亮样式（动态注入）
(function injectStoryCSS(){
  if (document.getElementById('story-css')) return;
  const style = document.createElement('style');
  style.id = 'story-css';
  style.textContent = `
    .story-word-unknown { color:#b45309; border-bottom:2px dashed #fbbf24; cursor:pointer; font-weight:700; }
    .story-word-unknown:hover { background:#fef3c7; }
    .story-tooltip { position:fixed; background:#1e293b; color:#fff; padding:8px 12px; border-radius:6px; font-size:12px; z-index:10000; max-width:260px; line-height:1.5; pointer-events:none; }
  `;
  document.head.appendChild(style);
})();

// v2026.0906：initStory（App._storyLoad 调用）已删除——生词表模块早已移除，
// _storyLoad 无任何定义方，此处仅剩 typeof 守卫的空转死代码。

// ============ 应用启动入口 ============
(function bootApp() {
  // v2026.0905c 手机端崩溃修复：模块加载失败（404/漏传目录/旧缓存）不再静默白屏，
  // 而是给出可见的自诊断错误屏（此前只有 console.error + return，用户看到的就是"闪退/崩溃"）
  const bootFail = (miss, hint) => {
    console.error('[boot]', miss, '加载失败！检查 script 加载顺序');
    try {
      const el = document.getElementById('view-dashboard');
      if (el) el.innerHTML =
        '<div class="card"><div class="empty" style="color:#dc2626">❌ 应用启动失败：' + miss + ' 未能加载</div>' +
        '<div class="tip-box" style="margin-top:10px;text-align:left">' +
        '<div><b>可能原因与自救步骤：</b></div>' +
        '<div>1️⃣ 网络抖动：下拉刷新或稍后重开页面；</div>' +
        '<div>2️⃣ 部署/拷贝时漏了 js/app/ 目录（本次更新新增的模块文件夹）：请把 <b>整个项目文件夹</b> 完整上传，尤其是 index.html 同级下的 js/app/（18 个文件）；</div>' +
        '<div>3️⃣ 手机浏览器缓存了旧版本：强制刷新页面；仍不行则清除该站点缓存后重开；</div>' +
        '<div>4️⃣ 应急使用：打开「一人行-单文件版.html」（全部代码内联，不依赖任何外部文件）。</div>' +
        '</div></div>';
    } catch(_) {}
  };
  const run = () => {
    try {
      console.log('[boot] App.init() starting...');
      if (typeof App === 'undefined') {
        bootFail('App 模块（js/app/*.js）');
        return;
      }
      if (typeof Store === 'undefined') {
        bootFail('Store 模块（js/storage.js）');
        return;
      }
      // v2026.0905c：任一核心模块加载失败时拒绝半启动（缺模块的 App 点进对应板块即崩；
      // index.html 的兜底守卫会随后弹全屏遮罩+重试按钮，这里先止损）
      const bad = (typeof window !== 'undefined' && window.__bootFailedScripts) || [];
      const fatalBad = bad.filter(f => f.indexOf('/js/app/') !== -1 || /\/js\/(data|storage)\.js/.test(f));
      if (fatalBad.length) {
        bootFail('模块文件（' + fatalBad.join('、') + '）');
        return;
      }
      App.init();
      console.log('[boot] App.init() done, currentView:', App.currentView);
    } catch(e) {
      console.error('[boot] 启动失败:', e.message, e.stack);
      // 即便 init 崩溃也尽可能显示错误
      try {
        const el = document.getElementById('view-dashboard');
        if (el) el.innerHTML = `<div class="card"><div class="empty" style="color:#dc2626">❌ 启动失败：${e.message}</div></div>`;
      } catch(_) {}
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
