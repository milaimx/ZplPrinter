# ZPL Studio — 完整开发日志 (DEVLOG)

> 记录 ZPL Studio 从零到上线的完整设计与开发过程

---

## 阶段 0 — 需求分析与竞品调研

### 2025-01-01 · 项目立项

**目标用户：**
- 使用 Zebra 打印机的仓库/物流操作员
- 需要在没有 Zebra 打印机的环境下预览标签的开发者
- 需要将 ZPL 标签转为 PDF 存档或发送的企业用户

**竞品分析：**

| 产品 | 优点 | 缺点 |
|------|------|------|
| [Labelary](https://labelary.com) | 渲染精度极高，提供免费 API | 无 PDF 导出，无打印功能，UI 较旧 |
| [ZplPrinter](https://zplprinter.com) | 功能完整 | 付费墙，需注册 |
| Zebra ZebraDesigner | 官方软件 | 需安装，Windows 限定 |
| 自建工具 | 完全可控 | 需开发成本 |

**决策：**
- 以 Labelary API 为渲染后端（免费、精确）
- 自建前端，增加 PDF 导出 + 打印功能
- 纯静态站点，部署到 GitHub Pages，零运营成本
- 离线降级渲染，确保断网可用

---

## 阶段 1 — 架构设计

### 2025-01-05 · 技术选型

**考量框架：**
- React/Vue → 引入构建工具、package.json，增加维护成本
- 纯 HTML/CSS/JS → 无需构建、直接部署静态文件，维护简单

**决策：纯原生 JS + 模块化文件拆分**

理由：
1. 项目规模适中，无需框架
2. GitHub Pages 直接托管 `.html` 文件
3. 所有依赖通过 CDN 加载（jsPDF）

**模块划分：**

```
renderer.js  ← 核心：在线/离线渲染
editor.js    ← 编辑器行为
preview.js   ← 预览区控制
pdf.js       ← PDF 生成 & 打印
ui.js        ← 状态栏/Toast/Modal
samples.js   ← 示例 ZPL 数据
app.js       ← 入口 & 初始化
```

### 2025-01-06 · UI 设计规范

**设计方向：工业/实用主义（Industrial Utility）**

灵感来源：IDE 界面（VS Code、JetBrains）
- 双栏布局：左侧代码编辑器，右侧预览
- 无装饰，数据优先
- 深色/浅色均美观

**色彩系统：**
```
主色：#185FA5 (Zebra Blue)
背景层：
  --bg:  #ffffff (主面板)
  --bg2: #f7f7f6 (工具栏/面板头)
  --bg3: #f0efec (预览背景，模拟标签台)
  --bg4: #e8e7e3 (hover 状态)

文字：
  --txt:  #1a1a18 (主文字)
  --txt2: #6b6b66 (次要文字)
  --txt3: #9b9b96 (占位/提示)

语义：
  success: #0F6E56
  danger:  #993C1D
  warn:    #854F0B
```

**深色模式：**
全部通过 CSS 变量 + `@media (prefers-color-scheme: dark)` 实现，无额外类名切换逻辑。

---

## 阶段 2 — 核心功能开发

### 2025-01-08 · 编辑器 (editor.js)

**功能列表：**
- [x] 行号同步滚动
- [x] Tab 键 → 2 空格（通过 keydown 拦截）
- [x] 输入防抖（800ms 后触发渲染）
- [x] 光标行列显示
- [x] 字符数 & 标签数统计（统计 `^XA` 出现次数）
- [x] 代码格式化（按 `^` 断行）
- [x] 上传 `.zpl` / `.txt` 文件

**关键实现 — 行号同步：**
```javascript
ta.addEventListener('scroll', () => {
  document.getElementById('line-nums').scrollTop = ta.scrollTop;
});
```

**关键实现 — Tab 拦截：**
```javascript
if (e.key === 'Tab') {
  e.preventDefault();
  const s = ta.selectionStart;
  ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd);
  ta.selectionStart = ta.selectionEnd = s + 2;
}
```

### 2025-01-10 · 渲染引擎 (renderer.js)

#### 在线渲染 — Labelary API

**API 接口：**
```
POST https://api.labelary.com/v1/printers/{dpmm}dpmm/labels/{width}x{height}/0/
Content-Type: application/x-www-form-urlencoded
Accept: image/png
Body: <ZPL code>
```

**DPI 与 dpmm 换算：**
| DPI | dpmm |
|-----|------|
| 152 | 6    |
| 203 | 8    |
| 300 | 12   |
| 600 | 24   |

**单位换算：**
```javascript
const inchW = widthMM / 25.4;   // mm → inch
const inchH = heightMM / 25.4;
```

**关键问题 & 解决：**
- 问题：CORS 限制某些环境
- 解决：Labelary API 支持跨域请求，直接 fetch 可用
- 问题：网络失败时白屏
- 解决：try/catch 捕获后降级到离线渲染

#### 离线渲染 — Canvas

**渲染流程：**
1. 解析 ZPL 文本，拆分为命令数组（按 `^` 分割）
2. 逐命令处理：`^FO` 设置坐标，`^FD`/`^FS` 绘文字，`^GB` 绘矩形，`^BC`/`^B3` 绘条码占位，`^BQ` 绘 QR 码占位
3. 坐标系缩放：ZPL 点 → 像素 = `dotValue × (canvasWidth / labelWidthInDots)`

**支持的 ZPL 命令（离线）：**
| 命令 | 支持程度 |
|------|---------|
| `^FO` | ✅ 完整 |
| `^FD`/`^FS` | ✅ 完整 |
| `^A0`, `^AD` | ✅ 字体大小 |
| `^GB` | ✅ 线条/方框 |
| `^GC` | ✅ 圆形 |
| `^BC`, `^B3`, `^B2` | ⚡ 占位图案 |
| `^BQ` | ⚡ 固定 QR 图案 |

> 注：条码/QR 离线模式为视觉占位，精确条码需在线模式。

### 2025-01-12 · 预览模块 (preview.js)

**缩放系统：**
```javascript
// 基准缩放：长边不超过 MAX_DISP(520px)
const scale = Math.min(1, 520 / Math.max(img.width, img.height)) * _zoom;
```

**旋转实现：**
```javascript
ctx.save();
ctx.translate(dW/2, dH/2);
ctx.rotate(rot * Math.PI / 180);
ctx.drawImage(src, -sw/2, -sh/2, sw, sh);
ctx.restore();
```

**渲染模式策略：**
```
auto:    先尝试在线 → 失败则离线
online:  只用 Labelary API，失败报错
offline: 只用 Canvas 本地渲染
```

### 2025-01-14 · PDF & 打印 (pdf.js)

**jsPDF 核心用法：**
```javascript
const pdf = new jsPDF({
  orientation: wMM >= hMM ? 'landscape' : 'portrait',
  unit: 'mm',
  format: [wMM, hMM]   // 自定义页面尺寸
});
pdf.addImage(imgData, 'PNG', margin, margin, wMM, hMM);
pdf.save(filename);
```

**打印窗口：**
打开新窗口并注入 HTML，关键 CSS：
```css
@page {
  margin: 0;
  size: {wMM}mm {hMM}mm;  /* 精确设置页面尺寸 */
}
```
图像加载完成后自动调用 `window.print()`。

---

## 阶段 3 — 交互优化

### 2025-01-16 · 可拖拽分隔条

实现左右面板宽度可拖拽调整：

```javascript
divider.addEventListener('mousedown', e => {
  dragging = true;
  startX = e.clientX;
  startCols = getComputedStyle(workspace).gridTemplateColumns
    .split(' ').map(parseFloat);
});

document.addEventListener('mousemove', e => {
  if (!dragging) return;
  const dx   = e.clientX - startX;
  const newL = Math.max(200, Math.min(total - 200, startCols[0] + dx));
  workspace.style.gridTemplateColumns = `${newL}px 4px 1fr`;
});
```

### 2025-01-17 · 设置持久化

通过 `localStorage` 保存用户偏好：
- 渲染模式
- 自动预览延迟
- PDF 边距
- 主题（浅色/深色/跟随系统）

### 2025-01-18 · 深色模式

三种模式：
1. **跟随系统**：`@media (prefers-color-scheme: dark)` CSS + 不设 `data-theme`
2. **强制浅色**：`document.documentElement.setAttribute('data-theme','light')`
3. **强制深色**：`document.documentElement.setAttribute('data-theme','dark')`

CSS 变量策略：确保所有颜色都是 `var(--xxx)`，无硬编码颜色。

---

## 阶段 4 — 测试

### 2025-01-20 · 兼容性测试

| 浏览器 | 版本 | 状态 |
|--------|------|------|
| Chrome | 120+ | ✅ 完全支持 |
| Firefox | 121+ | ✅ 完全支持 |
| Safari | 17+ | ✅ 完全支持 |
| Edge | 120+ | ✅ 完全支持 |
| 移动 Chrome | Android 13 | ✅ 基本支持 |
| 移动 Safari | iOS 17 | ✅ 基本支持 |

### 2025-01-21 · ZPL 示例测试

| 示例 | 在线渲染 | 离线渲染 |
|------|---------|---------|
| 货运标签（文字+线条+条码） | ✅ | ✅ |
| 条形码标签（Code 39） | ✅ | ⚡ 占位 |
| 二维码标签（QR） | ✅ | ⚡ 占位 |
| 产品标签 | ✅ | ✅ |

### 2025-01-22 · PDF 输出测试

测试标签尺寸：
- 4×6 inch (101.6×152.4 mm) — 标准货运标签 ✅
- 2×1 inch (50.8×25.4 mm) — 小标签 ✅
- 10×15 cm — 自定义尺寸 ✅

---

## 阶段 5 — 部署

### 2025-01-23 · GitHub Pages 配置

**自动部署工作流** (`.github/workflows/deploy.yml`)：
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - uses: actions/deploy-pages@v4
```

**说明：**
- 无需构建步骤，直接上传整个仓库
- 推送到 `main` 分支后约 2 分钟自动部署

---

## 已知问题 & TODO

### 已知问题
- [ ] Labelary API 偶发超时（网络波动），已有离线降级兜底
- [ ] 离线模式不支持 `^CF`（字体配置）命令
- [ ] 移动端拖拽分隔条不可用（触摸事件未实现）

### TODO
- [ ] 支持多标签文件（多个 `^XA...^XZ` 块）
- [ ] 历史记录（localStorage 保存最近 5 条）
- [ ] 导出 PNG 功能
- [ ] 更完整的离线 ZPL 解析器（支持 `^CF`、`^BY`、`^FX` 等）
- [ ] 键盘快捷键（Ctrl+Enter 触发渲染，Ctrl+S 下载 PDF）
- [ ] PWA 支持（离线可用）

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0.0 | 2025-01-23 | 首次发布：编辑器、预览、PDF、打印 |
| v1.1.0 | 计划中 | 多标签支持、历史记录 |

---

## 贡献指南

欢迎 PR 和 Issue！

1. Fork 仓库
2. 创建特性分支 `git checkout -b feature/xxx`
3. 提交 `git commit -m 'feat: add xxx'`
4. 推送 `git push origin feature/xxx`
5. 创建 Pull Request

---

## 参考资料

- [Zebra ZPL II Programming Guide](https://www.zebra.com/content/dam/zebra/manuals/printers/common/programming/zpl-zbi2-pm-en.pdf)
- [Labelary Online ZPL Viewer](https://labelary.com/viewer.html)
- [Labelary API Documentation](https://labelary.com/api.html)
- [jsPDF Documentation](https://artskydj.github.io/jsPDF/docs/)
- [ZPLPrinter Emulator](https://zplprinter.com)
