// ============================================================
// ZPL Studio — Preview Module
// ============================================================

const Preview = (() => {
  let _zoom = 1.0;
  let _currentCanvas = null;
  const MAX_DISP = 520;

  function getSettings() {
    return {
      dpi:    parseInt(document.getElementById('sel-dpi').value)    || 203,
      wMM:    parseFloat(document.getElementById('inp-w').value)    || 100,
      hMM:    parseFloat(document.getElementById('inp-h').value)    || 150,
      rot:    parseInt(document.getElementById('sel-rot').value)    || 0,
      mode:   document.getElementById('setting-render-mode')?.value || 'auto',
    };
  }

  async function render() {
    const zpl = Editor.getZPL();
    if (!zpl) return;

    const { dpi, wMM, hMM, rot, mode } = getSettings();

    _showSpinner(true);
    Status.set('正在渲染...', 'busy');

    // Try online first unless forced offline
    if (mode !== 'offline') {
      try {
        const imgUrl = await Renderer.renderOnline(zpl, dpi, wMM, hMM);
        await _displayImage(imgUrl, wMM, hMM, rot, dpi, true);
        _showSpinner(false);
        return;
      } catch (err) {
        if (mode === 'online') {
          Status.set('在线渲染失败: ' + err.message, 'err');
          _showSpinner(false);
          return;
        }
        // fall through to offline
      }
    }

    // Offline
    try {
      const canvas = Renderer.renderOffline(zpl, wMM, hMM);
      _displayCanvas(canvas, wMM, hMM, rot, dpi, false);
    } catch (err) {
      Status.set('渲染失败: ' + err.message, 'err');
    }
    _showSpinner(false);
  }

  async function _displayImage(imgUrl, wMM, hMM, rot, dpi, online) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_DISP / Math.max(img.width, img.height)) * _zoom;
        const dW = Math.round(img.width  * scale);
        const dH = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width  = dW;
        canvas.height = dH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, dW, dH);
        _drawRotated(ctx, img, dW, dH, rot);

        _currentCanvas = { canvas, wMM, hMM };
        _mountCanvas(canvas, wMM, hMM, dpi, online);
        URL.revokeObjectURL(imgUrl);
        Status.set(`渲染成功 · ${wMM}×${hMM} mm · ${dpi} dpi · ${img.width}×${img.height}px`, 'ok');
        resolve();
      };
      img.onerror = () => reject(new Error('图像加载失败'));
      img.src = imgUrl;
    });
  }

  function _displayCanvas(canvas, wMM, hMM, rot, dpi, online) {
    const scale = Math.min(1, MAX_DISP / Math.max(canvas.width, canvas.height)) * _zoom;
    const dW = Math.round(canvas.width  * scale);
    const dH = Math.round(canvas.height * scale);

    const out = document.createElement('canvas');
    out.width  = dW;
    out.height = dH;
    const ctx = out.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, dW, dH);
    _drawRotated(ctx, canvas, dW, dH, rot);

    _currentCanvas = { canvas: out, wMM, hMM };
    _mountCanvas(out, wMM, hMM, dpi, online);
    Status.set(`离线渲染 · ${wMM}×${hMM} mm · (联网可获更精确结果)`, 'ok');
  }

  function _drawRotated(ctx, src, dW, dH, rot) {
    if (rot === 0) {
      ctx.drawImage(src, 0, 0, dW, dH);
      return;
    }
    ctx.save();
    ctx.translate(dW/2, dH/2);
    ctx.rotate(rot * Math.PI / 180);
    const sw = (rot === 90 || rot === 270) ? dH : dW;
    const sh = (rot === 90 || rot === 270) ? dW : dH;
    ctx.drawImage(src, -sw/2, -sh/2, sw, sh);
    ctx.restore();
  }

  function _mountCanvas(canvas, wMM, hMM, dpi, online) {
    const area = document.getElementById('preview-area');
    area.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'label-wrapper';

    const tag = document.createElement('div');
    tag.className = 'label-size-tag';
    tag.textContent = `${wMM} × ${hMM} mm · ${dpi} dpi`;
    wrapper.appendChild(tag);

    const wrap = document.createElement('div');
    wrap.className = 'label-canvas-wrap';
    wrap.appendChild(canvas);
    wrapper.appendChild(wrap);

    area.appendChild(wrapper);

    // Mode badge
    const badge = document.getElementById('render-mode');
    if (online) {
      badge.textContent = '在线'; badge.className = 'badge-mode online';
    } else {
      badge.textContent = '离线'; badge.className = 'badge-mode offline';
    }

    // Info
    document.getElementById('preview-info').textContent =
      `${canvas.width} × ${canvas.height}px`;
    document.getElementById('zoom-level').textContent =
      `${Math.round(_zoom * 100)}%`;
  }

  function clearLabels() {
    const area = document.getElementById('preview-area');
    area.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.id = 'empty-state';
    empty.innerHTML = `<div class="empty-icon">🏷</div>
      <p class="empty-title">标签预览区</p>
      <p class="empty-sub">输入 ZPL 代码后自动渲染</p>`;
    area.appendChild(empty);
    _currentCanvas = null;
    document.getElementById('render-mode').textContent = '';
    document.getElementById('render-mode').className = 'badge-mode';
    document.getElementById('preview-info').textContent = '-';
    document.getElementById('zoom-level').textContent = '100%';
  }

  function _showSpinner(v) {
    document.getElementById('spinner').classList.toggle('hidden', !v);
  }

  function zoomIn()  { _zoom = Math.min(3, _zoom + 0.25); _refit(); }
  function zoomOut() { _zoom = Math.max(0.25, _zoom - 0.25); _refit(); }
  function fitPage() { _zoom = 1.0; _refit(); }

  function _refit() {
    document.getElementById('zoom-level').textContent = `${Math.round(_zoom * 100)}%`;
    render();
  }

  function getCurrentCanvas() { return _currentCanvas; }

  return { render, clearLabels, zoomIn, zoomOut, fitPage, getCurrentCanvas };
})();
