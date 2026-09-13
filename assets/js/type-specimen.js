/* =====================================================================
   タイプページの「60秒の見本」を動かす（2026-08-25）

   X軸の6方式ごとに、操作の種類そのものを変えます。
     filter  … 条件を選んで絞り込む（X1 検索・参照）
     steps   … 段階を進む・戻る（X2 案内・導入）
     match   … 課題を選ぶと対応が入れ替わる（X3 行動・成果）
     pair    … 価値を選ぶと根拠が対で出る（X4 価値・根拠）
     gallery … 場面を切り替える（X5 魅力・体験）
     story   … 章を送る（X6 世界観・編集）

   守っていること:
     ・中身は最初からHTMLにある。JSは表示の出し分けだけ。
       → JSが動かない環境では、すべての状態がそのまま読めます。
     ・自動再生しない。勝手に切り替わらない。
     ・キーボードだけで操作できる（ボタンとチェックボックスのみ）。
     ・状態は色だけでなく、aria-pressed / aria-selected と文字で示す。
     ・reduced-motion では動きを出さない（CSS側で対応）。
     ・架空の見本であることは、見出しと読み上げの両方に入れてあります。
   ===================================================================== */
(function () {
  'use strict';

  var boxes = document.querySelectorAll('[data-spec]');
  if (!boxes.length) return;

  function say(box, text) {
    var live = box.querySelector('[data-spec-live]');
    if (live) live.textContent = text;
  }

  /* ---- 共通: 単一選択のボタン列 ---- */
  function single(box, btnSel, panelSel, onChange) {
    var btns = Array.prototype.slice.call(box.querySelectorAll(btnSel));
    var panels = Array.prototype.slice.call(box.querySelectorAll(panelSel));
    if (!btns.length || !panels.length) return;

    function show(i) {
      btns.forEach(function (b, n) {
        b.setAttribute('aria-pressed', n === i ? 'true' : 'false');
      });
      panels.forEach(function (p, n) { p.hidden = n !== i; });
      if (onChange) onChange(i, btns[i], panels[i]);
    }
    btns.forEach(function (b, i) { b.addEventListener('click', function () { show(i); }); });
    show(0);
    return show;
  }

  boxes.forEach(function (box) {
    var kind = box.getAttribute('data-spec');

    /* ---------- X1 条件で絞り込む ---------- */
    if (kind === 'filter') {
      var checks = Array.prototype.slice.call(box.querySelectorAll('[data-spec-cond]'));
      var rows = Array.prototype.slice.call(box.querySelectorAll('[data-spec-row]'));
      var count = box.querySelector('[data-spec-count]');
      var empty = box.querySelector('[data-spec-empty]');
      var apply = function () {
        var on = checks.filter(function (c) { return c.checked; })
          .map(function (c) { return c.getAttribute('data-spec-cond'); });
        var hit = 0;
        rows.forEach(function (r) {
          var tags = (r.getAttribute('data-spec-row') || '').split('|');
          var ok = on.every(function (c) { return tags.indexOf(c) >= 0; });
          r.hidden = !ok;
          if (ok) hit++;
        });
        if (count) count.textContent = String(hit);
        if (empty) empty.hidden = hit !== 0;
        say(box, on.length ? '条件' + on.length + '件で絞り込み、' + hit + '件が該当します。'
                           : '条件なし。' + hit + '件すべてを表示しています。');
      };
      checks.forEach(function (c) { c.addEventListener('change', apply); });
      var reset = box.querySelector('[data-spec-reset]');
      if (reset) reset.addEventListener('click', function () {
        checks.forEach(function (c) { c.checked = false; }); apply();
      });
      apply();
      return;
    }

    /* ---------- X2 段階を進む・戻る ---------- */
    if (kind === 'steps') {
      var panels2 = Array.prototype.slice.call(box.querySelectorAll('[data-spec-step]'));
      var prev = box.querySelector('[data-spec-prev]');
      var next = box.querySelector('[data-spec-next]');
      var pos = box.querySelector('[data-spec-pos]');
      var bar = box.querySelector('[data-spec-bar]');
      var dots = Array.prototype.slice.call(box.querySelectorAll('[data-spec-dot]'));
      var i2 = 0;
      var draw = function () {
        panels2.forEach(function (p, n) { p.hidden = n !== i2; });
        dots.forEach(function (d, n) {
          d.setAttribute('aria-current', n === i2 ? 'step' : 'false');
        });
        if (pos) pos.textContent = (i2 + 1) + ' / ' + panels2.length;
        if (bar) bar.style.transform = 'scaleX(' + ((i2 + 1) / panels2.length) + ')';
        if (prev) prev.disabled = i2 === 0;
        if (next) next.disabled = i2 === panels2.length - 1;
        say(box, '段階 ' + (i2 + 1) + ' / ' + panels2.length + '。' +
          (panels2[i2].getAttribute('data-spec-title') || ''));
      };
      if (prev) prev.addEventListener('click', function () { if (i2 > 0) { i2--; draw(); } });
      if (next) next.addEventListener('click', function () { if (i2 < panels2.length - 1) { i2++; draw(); } });
      draw();
      return;
    }

    /* ---------- X3 課題 → 対応 / X4 価値 → 根拠 / X5 場面 / X6 章 ---------- */
    if (kind === 'match' || kind === 'pair' || kind === 'gallery' || kind === 'story') {
      var labelFor = { match: '場面', pair: '印象', gallery: '見せる情報', story: '読む順番' }[kind];
      single(box, '[data-spec-pick]', '[data-spec-panel]', function (i, btn) {
        say(box, labelFor + '「' + (btn.getAttribute('data-spec-name') || btn.textContent.trim()) + '」を表示中。');
      });
      return;
    }
  });
}());
