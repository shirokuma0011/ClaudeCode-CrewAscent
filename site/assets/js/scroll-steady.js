/* =====================================================================
   ホイール／トラックパッドのスクロール速度を上限で固定する

   なぜ必要か:
     トラックパッドのスクロールは、OSとブラウザが「慣性」を掛けます。
     指を速く動かすほど1イベントあたりの移動量が大きくなり、
     指を離したあとも減衰しながらイベントが続きます。
     これはサイトのCSS/HTMLからは制御できません。
     ここでホイールを引き取り、自前で動かすことで、
     「入力がいくら来ても、1秒あたりこれ以上は進まない」を保証します。

   有効にする方法（3つのうちどれでも）:
     1. URLの末尾に ?steady=1 を付ける
     2. assets/js/site-config.js に steadyScroll: true を書く
     3. このファイルの ALWAYS を true にする

   切っているあいだは、ブラウザ標準のスクロールのままです。

   注意して作ってあること:
     ・入れ子のスクロール領域（ドロワー、横スクロールの表）は横取りしない
     ・Ctrl+ホイール（拡大縮小）は横取りしない
     ・キーボード、ページ内リンク、フォーカス移動は一切触らない
     ・prefers-reduced-motion では補間せず即座に移動する
     ・タッチ（画面タッチ・フリック）は対象外。ブラウザ標準のまま
   ===================================================================== */
(function () {
  'use strict';

  var ALWAYS = false;

  var cfg = window.CREW_CONFIG || {};
  var on = ALWAYS || cfg.steadyScroll === true || /[?&]steady=1/.test(location.search);
  if (/[?&]steady=0/.test(location.search)) on = false;
  if (!on) return;

  function num(v, d) { return (typeof v === 'number' && isFinite(v) && v > 0) ? v : d; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 調整値 ---------------------------------------------------------
     STEP_CAP : ホイール1イベントで受け付ける最大量(px)。
                トラックパッドの慣性で届く巨大な値をここで切り捨てる。
     SPEED_CAP: 1コマで進む最大量(px)。60fpsなら 60px × 60 = 毎秒3600px。
                「これ以上は絶対に速くならない」の上限。
     EASE     : 目標へ近づく割合。大きいほど機敏、小さいほど滑らか。
  ------------------------------------------------------------------- */
  var STEP_CAP  = num(cfg.steadyStepCap,  120);
  var SPEED_CAP = num(cfg.steadySpeedCap,  60);
  var EASE      = num(cfg.steadyEase,     0.26);

  /* 重い/軽いと感じたら site-config.js で調整できます。
       steadyStepCap  … 小さくするほど勢いを切り捨てる（既定 120）
       steadySpeedCap … 1コマの上限px。小さいほど最高速度が下がる（既定 60 = 毎秒3600px）
       steadyEase     … 大きいほど機敏、小さいほど滑らか（既定 0.26）
     URLに ?steady=0 を付ければ、その場で標準スクロールに戻せます。 */

  var target = window.scrollY;
  var running = false;

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  /* ポインタの下に「自分で縦スクロールできる要素」があるなら横取りしない */
  function insideScrollable(node, dy) {
    for (var el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      var cs = getComputedStyle(el);
      var oy = cs.overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
        var atTop = el.scrollTop <= 0;
        var atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if (!(dy < 0 && atTop) && !(dy > 0 && atBottom)) return true;   /* まだ動ける */
      }
    }
    return false;
  }

  function step() {
    var cur = window.scrollY;
    var diff = target - cur;
    if (Math.abs(diff) < 0.5) {
      window.scrollTo(0, target);
      running = false;
      return;
    }
    var move = diff * EASE;
    if (move > SPEED_CAP) move = SPEED_CAP;
    else if (move < -SPEED_CAP) move = -SPEED_CAP;
    window.scrollTo(0, cur + move);
    requestAnimationFrame(step);
  }

  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.defaultPrevented) return;           /* 拡大縮小には触らない */
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   /* 横スクロールは標準のまま */
    if (insideScrollable(e.target, e.deltaY)) return;      /* 入れ子の領域は横取りしない */
    if (document.body.style.overflow === 'hidden') return; /* ドロワーが開いている間 */

    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 40;                        /* 行単位 */
    else if (e.deltaMode === 2) d *= window.innerHeight;   /* ページ単位 */

    /* 慣性で届く大きな値をここで切り捨てる。これが速度固定の要 */
    if (d > STEP_CAP) d = STEP_CAP;
    else if (d < -STEP_CAP) d = -STEP_CAP;

    e.preventDefault();

    /* 途中で向きが変わったら、その場から積み直す */
    if ((d > 0 && target < window.scrollY) || (d < 0 && target > window.scrollY)) target = window.scrollY;

    target = Math.max(0, Math.min(maxScroll(), target + d));

    if (reduce) { window.scrollTo(0, target); return; }
    if (!running) { running = true; requestAnimationFrame(step); }
  }, { passive: false });

  /* 自前以外の理由（キーボード、ページ内リンク、フォーカス移動など）で
     位置が変わったときは、目標をそこへ合わせ直す */
  window.addEventListener('scroll', function () {
    if (!running) target = window.scrollY;
  }, { passive: true });

  window.addEventListener('resize', function () {
    target = Math.max(0, Math.min(maxScroll(), window.scrollY));
  });
})();
