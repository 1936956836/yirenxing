# 一人行 · Yi Ren Xing

> 一个人也能好好生活 —— 沉浸式日常生活管理 Web App（v12.9.47）

纯原生 HTML / CSS / JavaScript 构建，**零框架、零构建依赖**。克隆即可运行，推上 GitHub 连 Vercel 一键部署。

## 功能总览

- **生活底盘**：习惯打卡（25 卡）、睡眠 / 饮食 / 运动 / 卫生 / 学习每日记录、健康·药物·就医档案、提醒调度
- **独行系列**（底部导航旋钮**长按 1 秒**进入）：
  - 🎧 独行音乐 —— 四平台聚合搜索 + 3D 像素地形可视化播放器
  - 🌍 独行地球 —— 五地质年代地球 · ISS/USGS 实时数据 · 太阳系/银河系视图
  - 🎬 独行视频 —— 多源片库搜索 + 液态玻璃播放器 · 横竖屏 · 手势控制
  - 🎙️ 独行表达 —— 语音实时转文字 · 口头禅标红 · AI 表达分析报告
- **独行信条（RPG）**：经验/等级/属性引擎、像素战士、宝箱、宝石商店、月度魔物 Boss 讨伐
- **数据洞察**：阿福 AI 洞察、周月报、应用使用统计、戒断四魔封印对决
- **云同步**：Supabase 账号体系，单设备在线、多端存档同步
- **PWA**：Service Worker 离线缓存，可安装到手机桌面

## 技术栈

| 层 | 方案 |
| --- | --- |
| UI | 原生 JS + Canvas（像素画 / 3D 投影 / 液态玻璃 CSS） |
| 音效 | Web Audio 全程序合成（零音频文件） |
| 播放器 | 原生 video + 按需加载 hls.js / flv.js / dash.js |
| 语音 | Web Speech API（中英混合） |
| 云端 | Supabase（auth + 数据库 + RPC） |
| AI | OpenAI 兼容接口直连（DeepSeek / 智谱 glm-4-flash 可选配置） |

## 目录结构

```
├── index.html          # 唯一入口（视图容器 + 模块脚本加载）
├── css/styles.css      # 全部样式（7600+ 行）
├── js/
│   ├── version.js      # 版本与更新日志（单一来源）
│   ├── data.js         # 静态数据
│   ├── storage.js      # 本地存储层
│   └── app/            # 50 个功能模块（按编号加载）
├── icons/  img/        # 图标与头像
├── manifest.json       # PWA 清单
├── sw.js               # Service Worker（离线缓存）
├── build.js            # 可选：构建单文件版（全部内联成一个 HTML）
└── vercel.json         # Vercel 部署配置（headers / 缓存策略）
```

## 本地运行

纯静态站，任意静态服务器即可：

```bash
# Python
python3 -m http.server 8080

# 或 Node
npx serve .
```

浏览器打开 `http://localhost:8080`。

## 部署到 Vercel

### 方式 A · GitHub 仓库联动（推荐，自动持续部署）

1. 把本仓库推到 GitHub（见下节）
2. 打开 [vercel.com/new](https://vercel.com/new) → Import 你的仓库
3. Framework Preset 选 **Other**，其余全部默认（无构建命令、输出目录根目录）
4. Deploy —— 约 10 秒上线，之后每次 `git push` 自动重新部署

### 方式 B · Vercel CLI 直接部署

```bash
npm i -g vercel
cd yirenxing-app
vercel          # 首次部署（按提示登录）
vercel --prod   # 切生产域名
```

## 推送到 GitHub

```bash
cd yirenxing-app
git init -b main
git add .
git commit -m "一人行 v12.9.47"
# 在 GitHub 新建空仓库后：
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

也可以用 GitHub CLI 一步完成：

```bash
gh repo create yirenxing --public --source=. --push
```

## 可选：构建单文件版

```bash
node build.js
# 产物：一人行-单文件版.html（CSS/JS/图标全内联，双击即用，可离线分发）
```

## 说明

- App 内登录 / 云同步依赖 Supabase（key 已内置或自行部署替换）
- 独行视频 / 独行音乐的部分数据源来自互联网公开接口，仅供个人学习交流，请支持正版
- Android 客户端（Capacitor 壳）不在本仓库范围内

## License

MIT
