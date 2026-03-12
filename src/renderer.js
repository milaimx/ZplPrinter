// ============================================================
// ZPL Studio — Renderer Module
// Handles both online (Labelary API) and offline (Canvas) rendering
// ============================================================

const Renderer = (() => {
  const LABELARY_BASE = 'https://api.labelary.com/v1/printers';

  // ── Online rendering via Labelary API ──────────────────────
  async function renderOnline(zpl, dpi, widthMM, heightMM) {
    const inchW = (widthMM / 25.4).toFixed(4);
    const inchH = (heightMM / 25.4).toFixed(4);
    const dpmm  = Math.round(dpi / 25.4 * 10) / 10;
    // Labelary uses dpmm (dots per mm): 6=152dpi, 8=203dpi, 12=300dpi, 24=600dpi
    const dpmmMap = { 152: 6, 203: 8, 300: 12, 600: 24 };
    const dpmmVal = dpmmMap[dpi] || 8;

    const url = `${LABELARY_BASE}/${dpmmVal}dpmm/labels/${inchW}x${inchH}/0/`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'image/png',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: zpl
    });

    if (!resp.ok) throw new Error(`Labelary API 返回 ${resp.status}`);
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  }

  // ── Offline rendering via Canvas ──────────────────────────
  function renderOffline(zpl, widthMM, heightMM) {
    const SCALE = 2.835; // 1mm = 2.835px at 72dpi
    const W = Math.round(widthMM * SCALE);
    const H = Math.round(heightMM * SCALE);

    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, W, H);

    parseAndRenderZPL(ctx, zpl, W, H);

    return canvas;
  }

  // ── ZPL parser & canvas renderer ──────────────────────────
  function parseAndRenderZPL(ctx, zpl, W, H) {
    // Normalise line endings, flatten multi-line commands
    const raw = zpl.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split into individual commands by ^ or ~
    const commands = raw.split(/(?=\^|\~)/).map(s => s.trim()).filter(Boolean);

    const state = {
      x: 0, y: 0,
      fontW: 18, fontH: 18,
      scale: W / 812,
    };

    const s = state.scale;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];

      // ^FO — Field Origin
      const fo = cmd.match(/^\^FO(-?\d+),(-?\d+)/);
      if (fo) { state.x = parseInt(fo[1]) * s; state.y = parseInt(fo[2]) * s; continue; }

      // ^A0 — scalable font
      const a0 = cmd.match(/^\^A0[NRI]?,(\d+),(\d+)/);
      if (a0) { state.fontH = parseInt(a0[1]); state.fontW = parseInt(a0[2]); continue; }

      // ^AD — dot-matrix font
      const ad = cmd.match(/^\^AD[NRI]?,(\d+),(\d+)/);
      if (ad) { state.fontH = parseInt(ad[1]); state.fontW = parseInt(ad[2]); continue; }

      // ^GB — Graphic Box
      const gb = cmd.match(/^\^GB(\d+),(\d+),(\d+)/);
      if (gb) {
        const bw = parseInt(gb[1]) * s;
        const bh = parseInt(gb[2]) * s;
        const thick = Math.max(0.5, parseInt(gb[3]) * s);
        ctx.fillStyle = '#000';
        if (bh <= thick * 1.5) {
          ctx.fillRect(state.x, state.y, bw, thick);
        } else if (bw <= thick * 1.5) {
          ctx.fillRect(state.x, state.y, thick, bh);
        } else {
          ctx.strokeStyle = '#000';
          ctx.lineWidth = thick;
          ctx.strokeRect(state.x + thick/2, state.y + thick/2, bw - thick, bh - thick);
        }
        continue;
      }

      // ^GC — Graphic Circle
      const gc = cmd.match(/^\^GC(\d+),(\d+)/);
      if (gc) {
        const r = parseInt(gc[1]) / 2 * s;
        const thick = Math.max(0.5, parseInt(gc[2]) * s);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = thick;
        ctx.beginPath();
        ctx.arc(state.x + r, state.y + r, r - thick/2, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }

      // ^FD...^FS — Field Data
      if (cmd.includes('^FD')) {
        const fdMatch = cmd.match(/\^FD([\s\S]*?)\^FS/);
        if (!fdMatch) continue;
        let text = fdMatch[1].replace(/^>:/, '').replace(/^_5/, '');

        const fh = Math.max(8, state.fontH * s * 0.72);
        ctx.font = `${fh}px 'Arial', sans-serif`;
        ctx.fillStyle = '#000';
        ctx.fillText(text, state.x, state.y + fh * 0.92);
        continue;
      }

      // ^B3 — Code 39 barcode (simplified visual)
      if (cmd.startsWith('^B3') || cmd.startsWith('^BCN') || cmd.startsWith('^BC')) {
        const heightMatch = cmd.match(/\^B[C3][NRI]?,(\d+)/);
        const bh = heightMatch ? parseInt(heightMatch[1]) * s : 60 * s;
        drawBarcode(ctx, state.x, state.y, 200 * s, bh);
        continue;
      }

      // ^BQ — QR code (simplified visual)
      if (cmd.startsWith('^BQ')) {
        const sizeMatch = cmd.match(/\^BQN?,\d+,(\d+)/);
        const modules = 21;
        const cellPx = sizeMatch ? Math.max(3, parseInt(sizeMatch[1]) * 3) * s : 5 * s;
        drawQR(ctx, state.x, state.y, modules, cellPx);
        continue;
      }

      // ^B2 — Interleaved 2of5
      if (cmd.startsWith('^B2')) {
        const hm = cmd.match(/\^B2[NRI]?,(\d+)/);
        const bh = hm ? parseInt(hm[1]) * s : 60 * s;
        drawBarcode(ctx, state.x, state.y, 180 * s, bh);
        continue;
      }
    }
  }

  function drawBarcode(ctx, x, y, totalW, totalH) {
    ctx.fillStyle = '#000';
    const barCount = 30;
    const barW = totalW / (barCount * 1.5);
    for (let i = 0; i < barCount; i++) {
      const pattern = [1, 0.5, 1, 0.5, 1];
      const w = barW * pattern[i % pattern.length];
      if (i % 2 === 0) {
        ctx.fillRect(x + i * barW * 1.5, y, w, totalH);
      }
    }
  }

  function drawQR(ctx, x, y, modules, cellPx) {
    // Simplified QR-like pattern for offline preview
    const seed = [
      [1,1,1,1,1,1,1,0,1,0,0,1,0,0,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1,0,1,1,0,0,1,0,1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,0,0,1,1,0,0,0,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,1,0,1,1,0,0,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,0,1,0,0,1,0,1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1,0,1,1,0,1,0,0,1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
      [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
      [1,0,1,1,0,1,1,1,0,0,1,0,1,1,1,0,1,1,0,1,0],
      [0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0,1],
      [1,0,1,1,0,1,1,1,0,1,0,0,1,0,1,0,1,0,0,0,1],
      [0,0,0,1,0,0,0,0,1,1,0,1,0,0,0,1,0,1,0,1,0],
      [1,1,1,0,1,1,1,0,0,0,1,0,1,1,1,0,1,0,1,0,1],
      [0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1,0,1,0,1,0],
      [1,1,1,1,1,1,1,0,1,1,0,0,1,0,1,0,1,0,0,0,1],
      [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1,0,1,0],
      [1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
      [1,0,1,1,1,0,1,0,0,1,0,1,0,0,0,1,0,1,0,1,0],
      [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1],
      [1,0,0,0,0,0,1,0,0,1,0,1,0,0,0,1,0,1,0,1,0],
      [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
    ];
    ctx.fillStyle = '#000';
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (seed[r] && seed[r][c]) {
          ctx.fillRect(x + c * cellPx, y + r * cellPx, cellPx - 0.5, cellPx - 0.5);
        }
      }
    }
  }

  // ── Public API ─────────────────────────────────────────────
  return { renderOnline, renderOffline };
})();
