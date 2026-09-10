// 单文件版构建脚本：把 index.html + css + js 内联成单个 HTML 文件
// 用法：node build.js            普通构建（版本号用 js/version.js 当前值，各处同步幂等）
//       node build.js release    发布构建（版本号末位 +1、日期自动更新 = 一次版本迭代）
//   版本发布链（v12.9.38）：js/version.js 是版本与更新内容的单一来源 →
//   build 注入 标题 / CSS 缓存串 / sw.js 缓存号 → 00-core.js 读 window.__APP_VER__，
//   管家阿福每版自动推送更新说明（按版本号 localStorage 去重）。
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ⚠️ 所有替换一律用函数形式 () => str：避免替换字符串中的 $' / $1 / $$ 被 String.replace
// 当作特殊替换模式展开（js/data.js 题库含 ans:'$'、hint:'如 $A$1' 曾因此被污染）

// ===== 0. 版本发布链（必须先于一切内联执行：bump 后的版本号随构建注入所有产物）=====
const verFile = path.join(ROOT, 'js/version.js');
let verSrc = read('js/version.js');
let ver = (verSrc.match(/v:\s*'([^']+)'/) || [])[1] || '0.0.1';
if (process.argv.includes('release')) {
  const parts = ver.split('.');
  parts[parts.length - 1] = String((+parts[parts.length - 1] || 0) + 1);
  ver = parts.join('.');
  const today = new Date().toISOString().slice(0, 10);
  verSrc = verSrc.replace(/v:\s*'[^']+'/, () => `v: '${ver}'`)
                 .replace(/date:\s*'[^']+'/, () => `date: '${today}'`);
  fs.writeFileSync(verFile, verSrc, 'utf8');
  console.log(`🔖 版本迭代 → v${ver}（${today}）· 管家阿福将向用户推送本版更新说明`);
}
// sw.js 缓存号随版本走（浏览器据此自动清旧缓存）
try {
  const swP = path.join(ROOT, 'deploy-netlify', 'sw.js');
  let sw = fs.readFileSync(swP, 'utf8');
  const swNew = sw.replace(/const CACHE = 'one-xing-netlify-[^']+';/, () => `const CACHE = 'one-xing-netlify-v${ver}';`);
  if (swNew !== sw) fs.writeFileSync(swP, swNew, 'utf8');
} catch (e) {}

let html = read('index.html');
// 根 index.html 同步版本（标题 + CSS 缓存串；写回源文件保持多文件版与构建产物一致）
try {
  const synced = html.replace(/<title>一人行 v[\d.]+<\/title>/, () => `<title>一人行 v${ver}</title>`)
                     .replace(/css\/styles\.css\?v=[\d.]+/, () => `css/styles.css?v=${ver}`);
  if (synced !== html) { html = synced; fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8'); }
} catch (e) {}

// 1. 内联 CSS：<link rel="stylesheet" href="css/styles.css[?v=...]"> → <style>...</style>
//    （兼容带缓存破坏 query string 的引用）
const css = read('css/styles.css');
html = html.replace(
  /<link rel="stylesheet" href="css\/styles\.css(\?[^"]*)?">/,
  () => `<style>\n${css}\n</style>`
);

// 2. 内联 SVG 图标为 base64 data URI（无需 icons/ 文件夹）
try {
  const svg = read('icons/icon.svg');
  const b64 = Buffer.from(svg).toString('base64');
  html = html.replace(
    /<link rel="icon" type="image\/svg\+xml" href="icons\/icon\.svg">/,
    () => `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${b64}">`
  );
} catch (e) {}

// 3. 清空 manifest href（单文件无独立 manifest.json；如需 PWA 安装用 ZIP 包）
html = html.replace(
  /<link rel="manifest" href="manifest\.json">/,
  () => '<link rel="manifest">'
);

// 4. 内联 JS 为单个 <script> 块：version + data + storage + app 模块
//    （顺序以 js/app/_manifest.json 为准；v7.0 起 sanguo.js 已随虚拟版拆分删除，不再内联）
const appManifest = JSON.parse(read('js/app/_manifest.json'));
const jsParts = [read('js/version.js'), read('js/data.js'), read('js/storage.js')]
  .concat(appManifest.files.map(f => read('js/app/' + f)));
const inlineJs = `<script>\n${jsParts.join('\n')}\n</script>`;
html = html.replace(
  /(?:\s*<script src="js\/[^"]*"><\/script>)+/,
  () => inlineJs
);

// 4.5 内联首页「我的形象」头像（男/女 jpg）：全 App 形象均为 canvas 运行时绘制（零图片资源），
//     唯独这两个是外部文件——单文件版/部署包没有 img/ 目录，相对引用在手机端 404 → 形象丢失。
//     base64 内联后单文件/部署版与多文件版行为一致（v12.9.36c）。
const avaUri = (p) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'img', p)).toString('base64'); // 二进制必须 Buffer 直读（read() 是 utf8，会读坏 JPG）
html = html.replace(/img\/avatar-female\.jpg/g, () => avaUri('avatar-female.jpg'));
html = html.replace(/img\/avatar-male\.jpg/g, () => avaUri('avatar-male.jpg'));

// 5. 写出两个单文件版本（中英文名各一份）
fs.writeFileSync(path.join(ROOT, 'life-journey.html'), html, 'utf8');
fs.writeFileSync(path.join(ROOT, '一人行-单文件版.html'), html, 'utf8');

// 6. 同步 deploy-netlify/（Netlify 一键部署包目录）
//    index.html 用单文件版，但恢复 manifest href（目录里有 manifest.json，PWA 安装可用）；
//    manifest.json / icons/ 与根目录保持同源；sw.js / netlify.toml / _headers / _redirects
//    为部署专用文件，手工维护（sw 只缓存壳资源，CSS/JS 已全部内联 index.html）。
const DEPLOY = path.join(ROOT, 'deploy-netlify');
fs.mkdirSync(path.join(DEPLOY, 'icons'), { recursive: true });
fs.writeFileSync(
  path.join(DEPLOY, 'index.html'),
  html.replace('<link rel="manifest">', '<link rel="manifest" href="manifest.json">'),
  'utf8'
);
fs.copyFileSync(path.join(ROOT, 'manifest.json'), path.join(DEPLOY, 'manifest.json'));
fs.copyFileSync(path.join(ROOT, 'icons/icon.svg'), path.join(DEPLOY, 'icons/icon.svg'));
fs.copyFileSync(path.join(ROOT, 'icons/icon-1024.jpg'), path.join(DEPLOY, 'icons/icon-1024.jpg'));

const sizeKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log(`✅ 单文件版构建完成 v${ver} (${sizeKB}KB)`);
console.log('   → life-journey.html');
console.log('   → 一人行-单文件版.html');
console.log('   → deploy-netlify/（index.html + manifest.json + icons 已同步 v' + ver + '）');
