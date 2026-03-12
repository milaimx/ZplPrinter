// ============================================================
// ZPL Studio — PDF & Print Module
// ============================================================

const PDF = (() => {

  async function _ensureRendered() {
    let result = Preview.getCurrentCanvas();
    if (!result) {
      await Preview.render();
      result = Preview.getCurrentCanvas();
    }
    return result;
  }

  async function download() {
    const result = await _ensureRendered();
    if (!result) { Toast.show('请先渲染预览'); return; }

    const { canvas, wMM, hMM } = result;
    const margin = parseFloat(document.getElementById('setting-margin')?.value || 0);

    try {
      const { jsPDF } = window.jspdf;
      const totalW = wMM + margin * 2;
      const totalH = hMM + margin * 2;

      const pdf = new jsPDF({
        orientation: totalW >= totalH ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [totalW, totalH]
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', margin, margin, wMM, hMM);

      // Metadata
      pdf.setProperties({
        title:    'ZPL Label',
        subject:  `${wMM}x${hMM}mm`,
        author:   'ZPL Studio',
        keywords: 'ZPL, Zebra, Label',
        creator:  'ZPL Studio (https://github.com/yourusername/zpl-studio)'
      });

      const filename = `zpl-label-${wMM}x${hMM}mm-${Date.now()}.pdf`;
      pdf.save(filename);

      Status.set(`PDF 已下载: ${filename}`, 'ok');
      Toast.show('PDF 已下载');
    } catch (err) {
      Status.set('PDF 生成失败: ' + err.message, 'err');
      Toast.show('PDF 生成失败');
    }
  }

  async function print() {
    const result = await _ensureRendered();
    if (!result) { Toast.show('请先渲染预览'); return; }

    const { canvas, wMM, hMM } = result;
    const imgData = canvas.toDataURL('image/png', 1.0);

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) { Toast.show('请允许弹出窗口'); return; }

    printWin.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>打印标签 — ZPL Studio</title>
  <style>
    @page {
      margin: 0;
      size: ${wMM}mm ${hMM}mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${wMM}mm; height: ${hMM}mm; }
    .label-img {
      width: ${wMM}mm;
      height: ${hMM}mm;
      display: block;
      page-break-after: always;
    }
    .no-print {
      position: fixed; top: 0; left: 0; right: 0;
      background: #1a1a18; color: white;
      padding: 10px 16px; font-family: sans-serif; font-size: 13px;
      display: flex; align-items: center; gap: 12px;
      z-index: 999;
    }
    .no-print button {
      padding: 5px 14px; border-radius: 6px; cursor: pointer;
      border: none; font-size: 12px; font-weight: 500;
    }
    .btn-print { background: #185FA5; color: white; }
    .btn-close { background: #444; color: white; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print">
    <span>标签尺寸: ${wMM} × ${hMM} mm</span>
    <button class="btn-print" onclick="window.print()">🖨 打印</button>
    <button class="btn-close" onclick="window.close()">✕ 关闭</button>
  </div>
  <img class="label-img" src="${imgData}" alt="ZPL Label">
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 500);
    });
  <\/script>
</body>
</html>`);
    printWin.document.close();

    Toast.show('正在打开打印对话框...');
    Status.set(`打印: ${wMM}×${hMM}mm`, 'ok');
  }

  return { download, print };
})();
