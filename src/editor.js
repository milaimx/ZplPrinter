// ============================================================
// ZPL Studio — Editor Module
// ============================================================

const Editor = (() => {
  let _renderTimer = null;

  function init() {
    const ta = document.getElementById('zpl-input');
    ta.addEventListener('input',  _onInput);
    ta.addEventListener('scroll', _syncLineNums);
    ta.addEventListener('keydown', _onKeydown);
    ta.addEventListener('click',  _updateCursor);
    ta.addEventListener('keyup',  _updateCursor);
    _updateLineNums();
    loadSample('shipping');
  }

  function _onInput() {
    _updateLineNums();
    _updateStats();
    clearTimeout(_renderTimer);
    const delay = parseInt(document.getElementById('setting-delay')?.value || 800);
    _renderTimer = setTimeout(() => Preview.render(), delay);
  }

  function _onKeydown(e) {
    // Tab → 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target;
      const s = ta.selectionStart, end = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = s + 2;
      _onInput();
    }
  }

  function _syncLineNums() {
    document.getElementById('line-nums').scrollTop =
      document.getElementById('zpl-input').scrollTop;
  }

  function _updateLineNums() {
    const lines = (document.getElementById('zpl-input').value.match(/\n/g) || []).length + 1;
    document.getElementById('line-nums').textContent =
      Array.from({length: lines}, (_, i) => i + 1).join('\n');
  }

  function _updateCursor() {
    const ta   = document.getElementById('zpl-input');
    const val  = ta.value.slice(0, ta.selectionStart);
    const line = (val.match(/\n/g) || []).length + 1;
    const col  = ta.selectionStart - val.lastIndexOf('\n');
    document.getElementById('cursor-pos').textContent = `行 ${line}, 列 ${col}`;
  }

  function _updateStats() {
    const val = document.getElementById('zpl-input').value;
    document.getElementById('char-count').textContent = `${val.length} 字符`;
    const labels = (val.match(/\^XA/gi) || []).length;
    document.getElementById('label-count').textContent = `${labels} 个标签`;
  }

  function loadSample(name) {
    const zpl = SAMPLES[name];
    if (!zpl) return;
    document.getElementById('zpl-input').value = zpl;
    _updateLineNums();
    _updateStats();
    _updateCursor();
    const names = { shipping:'货运标签', barcode:'条形码', qr:'二维码', product:'产品标签' };
    Status.set(`已加载示例: ${names[name] || name}`, 'ok');
    Preview.render();
  }

  function clear() {
    document.getElementById('zpl-input').value = '';
    _updateLineNums();
    _updateStats();
    document.getElementById('labels-container') &&
      (document.getElementById('labels-container').innerHTML = '');
    document.getElementById('empty-state').classList.remove('hidden');
    Status.set('已清空编辑器');
    Preview.clearLabels();
  }

  function format() {
    const ta  = document.getElementById('zpl-input');
    let val   = ta.value.trim();
    // Ensure each ^ command starts on its own line
    val = val
      .replace(/(\^(?!FS|FD))/g, '\n$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    ta.value = val;
    _updateLineNums();
    _updateStats();
    Toast.show('格式化完成');
  }

  function getZPL() {
    return document.getElementById('zpl-input').value.trim();
  }

  function copyZPL() {
    const zpl = getZPL();
    if (!zpl) { Toast.show('没有可复制的内容'); return; }
    navigator.clipboard.writeText(zpl).then(() => Toast.show('已复制到剪贴板'));
  }

  function uploadFile() {
    document.getElementById('file-upload').click();
  }

  function onFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('zpl-input').value = ev.target.result;
      _updateLineNums();
      _updateStats();
      Status.set(`已加载: ${file.name}`, 'ok');
      Preview.render();
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return { init, loadSample, clear, format, getZPL, copyZPL, uploadFile, onFileUpload };
})();
