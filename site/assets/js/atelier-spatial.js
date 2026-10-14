/* =====================================================================
   トップ: 36タイプの立体配置（座標 / 4つの領域 / 業種）と矢印キー移動
   引き継ぎ（2026-10-14）の spatial.js を実サイトへ移植したもの。

   ・立体表現は CSS3D とポインター反応だけ。常時動く描画ループは持たない
     （pointermove 1回につき rAF 1回。離れたら取り消す）
   ・並び替えても選択は保持する。矢印キーは「見えている位置」で隣を探す
   ・動きを減らす設定では立体を外し、切り替えボタンも無効にする
   ・業種の並びは引き継ぎ指定の「参考の分類」。診断結果や適性の断定ではない
   ===================================================================== */
(() => {
  'use strict';
  const stage = document.querySelector('.atl-spatial-stage');
  const map = document.querySelector('#type-map');
  const types = window.CrewAtelierTypes;
  if (!stage || !map || !Array.isArray(types)) return;
  const plane = stage.querySelector('.atl-spatial-plane'), labels = stage.querySelector('.atl-stage-labels');
  const tiles = [...map.querySelectorAll('.atl-map-cell')], byId = new Map(tiles.map((b) => [b.dataset.id, b]));
  const groups = [
    ['士業', [13, 25, 2, 20, 36]],
    ['建設・リフォーム・工務店', [31, 26, 32, 27, 33]],
    ['整体・クリニック', [7, 19, 15, 28, 35, 24]],
    ['美容室・サロン・エステ', [9, 10, 17, 23, 29, 30]],
    ['学習塾・教室', [8, 3, 21, 18]],
    ['カフェ・店舗', [16, 22, 34, 5, 11]],
    ['小規模BtoB', [1, 14, 4, 6, 12]]
  ].map(([name, ids]) => [name, ids.map((n) => 'CA' + String(n).padStart(2, '0'))]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)'), motionButton = document.querySelector('#spatial-motion');
  let mode = 'coord', positions = new Map(), motion = !reduce.matches, frame = 0;

  function label(text, x, y, align = 'center') {
    const el = document.createElement('span');
    el.textContent = text;
    el.className = 'atl-stage-label';
    el.style.left = x + '%';
    el.style.top = y + 'px';
    el.dataset.align = align;
    labels.append(el);
  }
  function arrange() {
    const width = stage.clientWidth || 480, unit = width / 7.25, size = unit * .83;
    const split = mode === 'regions' ? .62 : 0, origin = (width - unit * (5 + split) - size) / 2;
    const top = mode === 'industry' ? 36 : 45;
    const height = mode === 'industry' ? top + 7 * unit * 1.42 : top + unit * (6 + split) + 33;
    stage.style.height = height + 'px';
    plane.style.height = height + 'px';
    plane.style.setProperty('--tile-size', size + 'px');
    labels.replaceChildren();
    positions = new Map();
    for (const type of types) {
      const row = 5 - type.yIndex, col = type.xIndex, id = type.id;
      let x = origin + (col + (col >= 3 ? split : 0)) * unit, y = top + (row + (row >= 3 ? split : 0)) * unit;
      if (mode === 'industry') {
        const g = groups.findIndex(([, ids]) => ids.includes(id)), index = groups[g][1].indexOf(id);
        x = origin + index * unit;
        y = top + g * unit * 1.42;
      }
      positions.set(id, { x, y });
      const tile = byId.get(id);
      tile.style.setProperty('--tile-x', x + 'px');
      tile.style.setProperty('--tile-y', y + 'px');
      const context = mode === 'industry' ? groups.find(([, ids]) => ids.includes(id))[0] + 'の参考分類。' : '';
      tile.setAttribute('aria-label', context + id + ' ' + type.name + 'を表示。実用からブランドへの位置 ' + (col + 1) + ' / 6、王道から先進への位置 ' + (type.yIndex + 1) + ' / 6');
    }
    if (mode === 'coord') {
      label('先進・新しさ', 50, 12);
      label('王道・信頼', 50, height - 27);
      label('実用・情報', origin / width * 100, height - 27, 'left');
      label('ブランド・魅力', (width - origin) / width * 100, height - 27, 'right');
    } else if (mode === 'regions') {
      ['実用 × 先進', 'ブランド × 先進', '実用 × 王道', 'ブランド × 王道'].forEach((text, i) => {
        const x = origin + ((i % 2) * (3 + split) + 1) * unit + size / 2;
        label(text, x / width * 100, i < 2 ? 12 : height - 27);
      });
    } else {
      groups.forEach(([name], i) => label(name, origin / width * 100, top + i * unit * 1.42 - 22, 'left'));
    }
    stage.dataset.arrangement = mode;
    document.querySelectorAll('[data-arrange]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.arrange === mode)));
    document.querySelector('#arrangement-note').textContent = {
      coord: '36の位置から、伝え方のバランスを探せます。',
      regions: '実用・ブランド × 先進・王道。4つの領域で比べられます。',
      industry: '業種別は参考の分類です。同じ業種でも、合う設計方向は異なります。'
    }[mode];
  }
  document.querySelectorAll('[data-arrange]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.arrange; arrange(); }));

  /* 並び替えても選択は保持。矢印キーは見えている位置で隣を探す（短い行を飛び越えない） */
  map.addEventListener('keydown', (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const tile = event.target.closest('.atl-map-cell');
    if (!tile) return;
    event.preventDefault();
    const current = positions.get(tile.dataset.id);
    const ordered = [...positions].sort((a, b) => a[1].y - b[1].y || a[1].x - b[1].x);
    let target;
    if (event.key === 'Home' || event.key === 'End') target = ordered[event.key === 'Home' ? 0 : 35][0];
    else {
      const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key), sign = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
      let choices = [...positions];
      if (horizontal) {
        choices = choices.filter(([, p]) => Math.abs(p.y - current.y) < 1 && (p.x - current.x) * sign > 1);
        choices.sort((a, b) => Math.abs(a[1].x - current.x) - Math.abs(b[1].x - current.x));
      } else {
        choices = choices.filter(([, p]) => (p.y - current.y) * sign > 1);
        const distance = Math.min(...choices.map(([, p]) => Math.abs(p.y - current.y)));
        choices = choices.filter(([, p]) => Math.abs(Math.abs(p.y - current.y) - distance) < 1);
        choices.sort((a, b) => Math.abs(a[1].x - current.x) - Math.abs(b[1].x - current.x));
      }
      target = choices[0] ? choices[0][0] : undefined;
    }
    if (target) {
      const next = byId.get(target);
      next.click();
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  });

  function resetTilt() { plane.style.removeProperty('--look-x'); plane.style.removeProperty('--look-y'); }
  function syncMotion() {
    const on = motion && !reduce.matches;
    stage.dataset.motion = on ? 'on' : 'off';
    motionButton.setAttribute('aria-pressed', String(on));
    motionButton.textContent = on ? '立体 ON' : '立体 OFF';
    motionButton.disabled = reduce.matches;
    resetTilt();
  }
  motionButton.addEventListener('click', () => { motion = !motion; syncMotion(); });
  if (reduce.addEventListener) reduce.addEventListener('change', syncMotion);
  stage.addEventListener('pointermove', (event) => {
    if (!motion || reduce.matches || event.pointerType !== 'mouse' || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const rect = stage.getBoundingClientRect();
      plane.style.setProperty('--look-x', ((event.clientY - rect.top) / rect.height - .5) * -5 + 'deg');
      plane.style.setProperty('--look-y', ((event.clientX - rect.left) / rect.width - .5) * 7 + 'deg');
    });
  });
  stage.addEventListener('pointerleave', () => { if (frame) cancelAnimationFrame(frame); frame = 0; resetTilt(); });

  /* リサイズは即時に置き直し、旧幅からタイルが飛んでくる動きを出さない */
  let lastWidth = 0;
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver((entries) => {
    const width = entries[0].contentRect.width;
    if (Math.abs(width - lastWidth) > .5) {
      lastWidth = width;
      stage.classList.add('atl-resizing');
      arrange();
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('atl-resizing')));
    }
  }).observe(stage);
  else window.addEventListener('resize', arrange);
  syncMotion();
  arrange();
})();
