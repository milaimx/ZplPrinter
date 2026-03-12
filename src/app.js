// ============================================================
// ZPL Studio — App Entry Point
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  Editor.init();
  UI.initDivider();
  Status.set('就绪 — 输入 ZPL 代码或选择示例');
});
