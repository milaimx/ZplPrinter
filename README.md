# ZPL Studio

**在线 ZPL (Zebra Programming Language) 代码预览、转 PDF 并打印工具**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue)](https://yourusername.github.io/zpl-studio)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ 功能特性

- 📝 **代码编辑器** — 行号显示、Tab 缩进、字符统计、格式化
- 👁 **实时预览** — 输入后自动渲染，联网调用 Labelary API 获取像素级精确预览
- 📶 **离线模式** — 断网时自动切换为本地 Canvas 渲染引擎
- ⚙️ **灵活配置** — DPI（152/203/300/600）、标签尺寸(mm)、旋转角度
- 📄 **PDF 导出** — 使用 jsPDF 生成精确尺寸 PDF，含元数据
- 🖨 **打印支持** — 打开系统打印对话框，自动设置页面为标签尺寸
- 📂 **文件上传** — 支持上传 `.zpl` / `.txt` 文件
- 📚 **ZPL 文档** — 内置常用命令快速参考
- 🌙 **深色模式** — 跟随系统 / 手动切换
- 📱 **响应式** — 支持移动端访问

---

## 🚀 快速开始

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/yourusername/zpl-studio.git
cd zpl-studio

# 无需安装依赖，直接用任意静态服务器运行
npx serve .
# 或
python3 -m http.server 8080
# 或
php -S localhost:8080
```

浏览器打开 `http://localhost:8080` 即可使用。

### 部署到 GitHub Pages

1. Fork 或上传本仓库到 GitHub
2. 进入仓库 **Settings → Pages**
3. Source 选择 `main` 分支，目录选 `/ (root)`
4. 保存，稍等片刻即可访问 `https://yourusername.github.io/zpl-studio`

---

## 📁 项目结构

```
zpl-studio/
├── index.html          # 主页面 HTML 骨架
├── src/
│   ├── style.css       # 全局样式（CSS 变量 + 深色模式）
│   ├── samples.js      # 内置 ZPL 示例代码
│   ├── renderer.js     # 渲染引擎（在线/离线）
│   ├── editor.js       # 编辑器模块
│   ├── preview.js      # 预览模块
│   ├── pdf.js          # PDF & 打印模块
│   ├── ui.js           # UI 工具（状态栏/Toast/Modal/设置）
│   └── app.js          # 入口，初始化
├── public/
│   └── favicon.svg     # 网站图标
├── docs/
│   └── DEVLOG.md       # 完整开发日志
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Pages 自动部署
├── README.md
└── LICENSE
```

---

## 🔧 技术栈

| 技术 | 用途 |
|------|------|
| 纯 HTML/CSS/JS | 无框架，零依赖运行时 |
| [Labelary API](https://labelary.com) | 在线 ZPL 渲染（PNG 图像） |
| [jsPDF](https://github.com/parallax/jsPDF) | PDF 生成 |
| [DM Sans](https://fonts.google.com/specimen/DM+Sans) | UI 字体 |
| [JetBrains Mono](https://www.jetbrains.com/legalnotices/jetbrains_mono/) | 代码字体 |
| Canvas API | 离线 ZPL 渲染 |
| GitHub Pages | 静态托管 |

---

## 📖 ZPL 快速参考

| 命令 | 说明 | 示例 |
|------|------|------|
| `^XA` | 标签开始 | `^XA` |
| `^XZ` | 标签结束 | `^XZ` |
| `^FO` | 字段原点 (x,y) | `^FO50,50` |
| `^FD...^FS` | 字段数据 | `^FDHello^FS` |
| `^A0N,h,w` | 可缩放字体 | `^A0N,36,20` |
| `^GB w,h,t` | 图形方框 | `^GB500,3,3` |
| `^BC` | Code 128 条形码 | `^BCN,80,Y,N,N` |
| `^BQ` | QR Code | `^BQN,2,8` |
| `^PW` | 打印宽度(点) | `^PW812` |
| `^LL` | 标签长度(点) | `^LL1218` |

---

## 📝 开发日志

详见 [docs/DEVLOG.md](docs/DEVLOG.md)

---

## 📄 License

MIT © 2025 ZPL Studio Contributors
