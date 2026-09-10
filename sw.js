// Service Worker - 一人行 PWA 离线缓存（v12.7 新首页版）
const CACHE = 'one-xing-v12947'; // v12.9.47：独行地球 + 独行视频 + 独行表达 + 模块清单补全（92→103 全量）
const APP_MODULES = [
  '00-core.js', '05-reminder-safety.js', '08-afu-night.js', '10-goal-report.js', '15-utils.js', '20-dashboard.js', '25-home-cards.js', '30-news-cards.js', '35-health.js', '40-daily-habits.js', '45-workbench.js', '50-habit-data.js', '55-insight.js', '56-report.js', '60-profile.js', '62-pixelcat.js', '63-music99.js', '65-task-theme.js', '68-focus-notes.js', '70-pet.js', '75-home99.js', '76-dream99.js', '77-drift99.js', '78-cloud-auth.js', '79-afu-record.js', '80-mode99.js', '81-vault99.js', '82-gewu99.js', '83-zhizhi99.js', '84-afu-mood.js', '85-ta99.js', '86-sport99.js', '87-study99.js', '88-quiz99-data.js', '89-quiz99-major.js', '90-study99-quiz.js', '91-record99.js', '92-rpg99.js', '93-quit99.js', '94-hot99.js', '95-usage99.js', '96-perm99.js', '97-food99.js', '98-boss99.js', '99-weather99.js', '100-solomusic99.js', '101-earth99.js', '102-video99.js', '103-express99.js', '125-journal-sync.js', '130-library.js', '145-boot.js',
];
// 预缓存一律用无 query 路径；fetch 回退用 ignoreSearch 匹配（页面各模块带不同 ?v= 缓存串也能命中）
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/version.js',
  './js/data.js',
  './js/storage.js',
].concat(APP_MODULES.map(f => './js/app/' + f)).concat([
  './manifest.json',
  './icons/icon.svg',
  './img/avatar-male.jpg',
  './img/avatar-female.jpg',
]);

// 安装：预缓存核心资源（任一文件失败则整体失败，保持旧缓存继续服务，避免半新半旧）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存（v4 等旧版本会被清掉，强制下次访问拉取新内容）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 请求策略：网络优先（在线时总是拿最新），失败/非 200 回退缓存（离线可用）
// v2026.0905c 手机端崩溃修复：
//  ① 网络错误才回退 → 现在 404/500 也回退（部署漏文件/CDN 抖动时手机不至于白屏）
//  ② 注：回退只对同源 GET 生效；缓存也没有时才把原始错误响应交还浏览器（由 index.html 兜底守卫显示可见错误）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const sameOrigin = event.request.url.startsWith(self.location.origin);
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        // 同源成功响应同步刷新缓存
        if (resp && resp.status === 200 && sameOrigin) {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        // 404/5xx：先试缓存里的旧版本，避免单个文件拉取失败引发白屏
        if (resp && !resp.ok && sameOrigin) {
          return caches.match(event.request, { ignoreSearch: true }).then((c) => c || resp);
        }
        return resp;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }).then((c) => c || caches.match('./index.html')))
  );
});
