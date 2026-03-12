// ============================================================
// ZPL Studio — UI Utilities (Status, Toast, Modals, Settings)
// ============================================================

// ── Status bar ────────────────────────────────────────────────
const Status = (() => {
  function set(msg, type) {
    const dot = document.getElementById('status-dot');
    const txt = document.getElementById('status-msg');
    txt.textContent = msg;
    dot.className = 'status-dot' + (type ? ' ' + type : '');
  }
  return { set };
})();

// ── Toast ─────────────────────────────────────────────────────
const Toast = (() => {
  let _timer = null;
  function show(msg, duration = 2200) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_timer);
    _timer = setTimeout(() => el.classList.remove('show'), duration);
  }
  return { show };
})();

// ── UI (Modals, Settings, Docs) ───────────────────────────────
const UI = (() => {

  const ZPL_DOCS = `
    <h3>基本结构</h3>
    <table>
      <tr><th>命令</th><th>说明</th><th>示例</th></tr>
      <tr><td><code>^XA</code></td><td>标签开始</td><td><code>^XA</code></td></tr>
      <tr><td><code>^XZ</code></td><td>标签结束</td><td><code>^XZ</code></td></tr>
      <tr><td><code>^PW</code></td><td>打印宽度 (点)</td><td><code>^PW812</code></td></tr>
      <tr><td><code>^LL</code></td><td>标签长度 (点)</td><td><code>^LL1218</code></td></tr>
    </table>

    <h3>字段定位与文字</h3>
    <table>
      <tr><th>命令</th><th>说明</th><th>示例</th></tr>
      <tr><td><code>^FO</code></td><td>字段原点 (x,y)</td><td><code>^FO50,50</code></td></tr>
      <tr><td><code>^FD</code></td><td>字段数据</td><td><code>^FDHello^FS</code></td></tr>
      <tr><td><code>^FS</code></td><td>字段分隔符 (结束)</td><td><code>^FS</code></td></tr>
      <tr><td><code>^A0</code></td><td>可缩放字体</td><td><code>^A0N,36,20</code></td></tr>
      <tr><td><code>^AD</code></td><td>点阵字体</td><td><code>^ADN,36,20</code></td></tr>
    </table>

    <h3>图形</h3>
    <table>
      <tr><th>命令</th><th>说明</th><th>示例</th></tr>
      <tr><td><code>^GB</code></td><td>图形方框 (宽,高,厚度)</td><td><code>^GB500,3,3</code></td></tr>
      <tr><td><code>^GC</code></td><td>图形圆形 (直径,厚度)</td><td><code>^GC100,3</code></td></tr>
      <tr><td><code>^GD</code></td><td>图形对角线</td><td><code>^GD100,50,3</code></td></tr>
    </table>

    <h3>条形码</h3>
    <table>
      <tr><th>命令</th><th>说明</th><th>示例</th></tr>
      <tr><td><code>^B3</code></td><td>Code 39</td><td><code>^B3N,N,80,Y,N^FD1234^FS</code></td></tr>
      <tr><td><code>^BC</code></td><td>Code 128</td><td><code>^BCN,100,Y,N,N</code></td></tr>
      <tr><td><code>^BE</code></td><td>EAN-13</td><td><code>^BEN,80,Y,N</code></td></tr>
      <tr><td><code>^BQ</code></td><td>QR Code</td><td><code>^BQN,2,8</code></td></tr>
      <tr><td><code>^B2</code></td><td>Interleaved 2of5</td><td><code>^B2N,80,Y,N</code></td></tr>
    </table>

    <h3>打印控制</h3>
    <table>
      <tr><th>命令</th><th>说明</th><th>示例</th></tr>
      <tr><td><code>^PQ</code></td><td>打印数量</td><td><code>^PQ10</code></td></tr>
      <tr><td><code>^MM</code></td><td>打印模式</td><td><code>^MMT</code></td></tr>
      <tr><td><code>^LH</code></td><td>标签原点偏移</td><td><code>^LH10,10</code></td></tr>
      <tr><td><code>^LS</code></td><td>水平移位</td><td><code>^LS0</code></td></tr>
    </table>

    <p style="margin-top:16px">完整文档参考: <a href="https://www.zebra.com/content/dam/zebra/manuals/printers/common/programming/zpl-zbi2-pm-en.pdf" target="_blank" style="color:var(--accent)">Zebra ZPL Programming Guide ↗</a></p>
  `;

  function showDocs() {
    document.getElementById('docs-content').innerHTML = ZPL_DOCS;
    openModal('docs-modal');
  }

  function showSettings() {
    openModal('settings-modal');
  }

  function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
  }

  function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  }

  function saveSettings() {
    const theme = document.getElementById('setting-theme').value;
    if (theme === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else if (theme === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    closeModal('settings-modal');
    Toast.show('设置已保存');
  }

  // Close modal on overlay click
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.add('hidden');
    }
  });

  // Resizable divider
  function initDivider() {
    const divider  = document.getElementById('divider');
    const workspace = divider.parentElement;
    let dragging = false, startX = 0, startCols = [];

    divider.addEventListener('mousedown', e => {
      dragging = true;
      startX = e.clientX;
      const cs = getComputedStyle(workspace);
      startCols = cs.gridTemplateColumns.split(' ').map(parseFloat);
      divider.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const dx    = e.clientX - startX;
      const total = startCols[0] + startCols[2];
      const newL  = Math.max(200, Math.min(total - 200, startCols[0] + dx));
      workspace.style.gridTemplateColumns = `${newL}px 4px 1fr`;
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      divider.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  return { showDocs, showSettings, openModal, closeModal, saveSettings, initDivider };
})();
