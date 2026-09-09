/* =====================================================================
   クルーアセント TOP — R3 behaviour
   Vanilla JS のみ。自動で動き続けるものは作らない。
   ===================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------------
     スクロールの購読口をひとつにまとめる。
     ハンドラが複数あると、それぞれが毎フレーム要素の寸法を測り、
     そのたびブラウザがレイアウトを計算し直す。連続スクロール中は
     この計算が積み重なってコマが落ち、スクロールが飛んで見える。
     ここでは 1本の rAF で購読者へ scrollY を配るだけにして、
     購読側は寸法を測らない（測るのは resize のときだけ）。
  ------------------------------------------------------------------ */
  var scrollSubs = [], resizeSubs = [], scrollQueued = false;

  function onScroll(fn) { scrollSubs.push(fn); }
  function onResize(fn) { resizeSubs.push(fn); }

  function flushScroll() {
    var y = window.scrollY;
    for (var i = 0; i < scrollSubs.length; i++) scrollSubs[i](y);
    scrollQueued = false;
  }
  /* スクロール中はホバー判定を止める。
     ポインタは動いていないのに、その下を要素が次々に通過するため、
     スクロール中はホバーが連続発火し、影・拡大・フィルタ・背景の
     トランジションが重なり続ける。当たり判定を止めれば発火しない。
     （タッチにはホバーが無いので、この症状はトラックパッドでだけ出る） */
  var root = document.documentElement, hoverTimer = null;
  function suspendHover() {
    if (hoverTimer === null) root.classList.add('is-scrolling');
    else clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function () {
      hoverTimer = null;
      root.classList.remove('is-scrolling');
    }, 120);
  }

  /* --- 速く送っている間だけ、演出の補間を切る -------------------------
     ホバー停止（is-scrolling）はスクロールしていれば常に付くので、
     これを演出の停止に使うと「読む速さで送っているとき」まで止まります。
     ここでは実際の速度を測り、速いときだけ is-fast を付けます。

     実測（1280×900）: 読む速さ 300px/秒、ホイール1ノッチの瞬間値 1,100px/秒、
     勢いよく送ると 6,000px/秒。しきい値は 1,400px/秒（1ノッチの瞬間値のすぐ上）。 */
  var FAST_PXPS = 1400, lastY = window.scrollY, lastT = 0, fastTimer = null;
  function markSpeed(now) {
    var y = window.scrollY, dt = now - lastT;
    if (dt > 0 && lastT > 0) {
      var v = Math.abs(y - lastY) / dt * 1000;
      if (v > FAST_PXPS) {
        if (fastTimer === null) root.classList.add('is-fast');
        else clearTimeout(fastTimer);
        fastTimer = setTimeout(function () {
          fastTimer = null;
          root.classList.remove('is-fast');
        }, 140);
      }
    }
    lastY = y; lastT = now;
  }

  window.addEventListener('scroll', function () {
    suspendHover();
    markSpeed(performance.now());
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(flushScroll);
  }, { passive: true });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      for (var i = 0; i < resizeSubs.length; i++) resizeSubs[i]();
    }, 150);
  });

  /* ---------------- 1. ヘッダー ---------------- */
  function header() {
    var hdr = $('.hdr'), hero = $('.hero');
    if (!hdr) return;
    if (!hero) { hdr.classList.add('is-solid'); return; }   /* 下層ページは常に不透明 */

    /* 閾値はスクロール中に測らない。
       スクロール中に offsetHeight を読むと、そのたびにブラウザが
       レイアウトを計算し直し、連続スクロールでコマ落ちの原因になる。 */
    var limit = 80;
    function measure() { limit = Math.max(hero.offsetHeight - hdr.offsetHeight - 40, 80); }

    var solid = null;
    function apply(y) {
      var next = y > limit;
      if (next === solid) return;          /* 状態が変わるときだけDOMへ触る */
      solid = next;
      hdr.classList.toggle('is-solid', next);
    }
    measure();
    onScroll(apply);
    onResize(function () { measure(); apply(window.scrollY); });
    apply(window.scrollY);
  }

  /* ---------------- 2. メガメニュー ---------------- */
  function mega() {
    var hdr = $('.hdr');
    var trigs = $$('.gnav__link[aria-controls]');
    if (!trigs.length) return;
    var openId = null, timer = null, byHover = false;
    var panelOf = function (b) { return document.getElementById(b.getAttribute('aria-controls')); };

    function closeAll(focusBack) {
      trigs.forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
        var p = panelOf(b); if (p) p.hidden = true;
        if (focusBack === b) b.focus();
      });
      openId = null; byHover = false;
      if (hdr) hdr.classList.remove('is-panel-open');
    }
    function open(b) {
      closeAll();
      b.setAttribute('aria-expanded', 'true');
      var p = panelOf(b); if (p) p.hidden = false;
      openId = b.getAttribute('aria-controls');
      if (hdr) hdr.classList.add('is-panel-open');
    }

    trigs.forEach(function (btn) {
      var panel = panelOf(btn);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (btn.getAttribute('aria-expanded') === 'true') {
          if (byHover) { byHover = false; return; }   /* ホバーで開いた直後は閉じない */
          closeAll();
        } else { open(btn); byHover = false; }
      });
      [btn, panel].forEach(function (el) {
        if (!el) return;
        el.addEventListener('mouseenter', function () {
          if (!window.matchMedia('(hover: hover) and (min-width: 1080px)').matches) return;
          clearTimeout(timer);
          if (btn.getAttribute('aria-expanded') !== 'true') { open(btn); byHover = true; }
        });
        el.addEventListener('mouseleave', function () {
          if (!window.matchMedia('(hover: hover) and (min-width: 1080px)').matches) return;
          clearTimeout(timer);
          timer = setTimeout(function () { if (byHover) closeAll(); }, 220);
        });
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openId) {
        closeAll(trigs.filter(function (b) { return b.getAttribute('aria-controls') === openId; })[0]);
      }
    });
    document.addEventListener('click', function (e) {
      if (openId && !e.target.closest('.mega') && !e.target.closest('.gnav')) closeAll();
    });
    onScroll(function () { if (openId) closeAll(); });
  }

  /* ---------------- 3. モバイルドロワー ---------------- */
  function drawer() {
    var burger = $('.burger'), panel = $('#drawer');
    if (!burger || !panel) return;
    function setOpen(on) {
      burger.setAttribute('aria-expanded', String(on));
      panel.hidden = !on;
      document.body.style.overflow = on ? 'hidden' : '';
      var lab = burger.querySelector('.burger__label');
      if (lab) lab.textContent = on ? '閉じる' : 'メニュー';
    }
    burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
    $$('.drawer__row[aria-controls]', panel).forEach(function (row) {
      var sub = document.getElementById(row.getAttribute('aria-controls'));
      row.addEventListener('click', function () {
        var on = row.getAttribute('aria-expanded') === 'true';
        row.setAttribute('aria-expanded', String(!on));
        if (sub) sub.hidden = on;
      });
    });
    $$('a', panel).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setOpen(false); burger.focus(); }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1080 && burger.getAttribute('aria-expanded') === 'true') setOpen(false);
    });
  }

  /* ---------------- 4. タブ（自動切替なし） ---------------- */
  function tabs() {
    $$('[data-tabs]').forEach(function (root) {
      var list = $$('[role="tab"]', root);
      if (!list.length) return;
      function select(tab, focus) {
        list.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          var p = document.getElementById(t.getAttribute('aria-controls'));
          if (p) p.hidden = !on;
        });
        if (focus) tab.focus();
      }
      list.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(tab); });
        tab.addEventListener('keydown', function (e) {
          var n = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = list[(i + 1) % list.length];
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = list[(i - 1 + list.length) % list.length];
          else if (e.key === 'Home') n = list[0];
          else if (e.key === 'End') n = list[list.length - 1];
          if (n) { e.preventDefault(); select(n, true); }
        });
      });
    });
  }

  /* ---------------- 5. 36タイプのマップ（対話式） ----------------
     マス目を選ぶと、そのタイプの名前と座標が右の欄に出る。
     矢印キーで上下左右に移動できる（グリッドの標準的な操作）。 */
  var selectTypeCell = null;   /* 4問診断からマップを動かすために公開する */

  function typeMap() {
    var root = $('.tmap');
    if (!root) return;
    var cells = $$('.tmap__c', root);
    if (cells.length !== 36) return;

    /* 読み取り欄はマップの外（別の桁）に置いているので document から探す */
    var elId = $('[data-read="id"]');
    var elNm = $('[data-read="name"]');
    var elX  = $('[data-read="x"]');
    var elY  = $('[data-read="y"]');
    var elQ  = $('[data-read="area"]');
    var elGo = $('[data-read="go"]');
    var dot  = $('.tread__id i');
    var AREA_COLOR = { q1: 'var(--q1)', q2: 'var(--q2)', q3: 'var(--q3)', q4: 'var(--q4)' };

    function show(cell) {
      if (elId) elId.textContent = cell.dataset.id;
      if (elNm) elNm.textContent = cell.dataset.name;
      if (elX)  elX.textContent  = cell.dataset.x + ' / 6';
      if (elY)  elY.textContent  = cell.dataset.y + ' / 6';
      if (elQ)  elQ.textContent  = cell.dataset.area;
      if (dot)  dot.style.background = AREA_COLOR[cell.dataset.q] || 'var(--q3)';
      /* 読み取り欄からそのタイプのページへ進めるようにする。
         いま欄に出ているタイプへ必ず一致させる（カーソル位置でも、選んだマスでも）。 */
      if (elGo && cell.dataset.slug) {
        elGo.href = 'type-' + cell.dataset.slug + '.html';
        elGo.textContent = cell.dataset.name + 'のページを見る';
      }
    }
    function select(cell, focus) {
      cells.forEach(function (c) {
        var on = c === cell;
        c.setAttribute('aria-pressed', String(on));
        c.tabIndex = on ? 0 : -1;
      });
      show(cell);
      if (focus) cell.focus();
    }
    selectTypeCell = function (x, y) {
      /* x/y は 0..5 の段階。行は上から数えるので yIndex を反転する */
      var cell = cells[(5 - y) * 6 + x];
      if (cell) { select(cell); return cell; }
      return null;
    };

    cells.forEach(function (cell, i) {
      var r = Math.floor(i / 6), c = i % 6;
      cell.addEventListener('click', function () { select(cell); });
      cell.addEventListener('mouseenter', function () { show(cell); });
      cell.addEventListener('focus', function () { show(cell); });
      cell.addEventListener('keydown', function (e) {
        var nr = r, nc = c;
        if (e.key === 'ArrowRight') nc = (c + 1) % 6;
        else if (e.key === 'ArrowLeft') nc = (c + 5) % 6;
        else if (e.key === 'ArrowDown') nr = (r + 1) % 6;
        else if (e.key === 'ArrowUp') nr = (r + 5) % 6;
        else return;
        e.preventDefault();
        select(cells[nr * 6 + nc], true);
      });
    });

    /* カーソルの位置を最優先で出す。ただし読み取り欄のリンクを押せなくなると困るので、
       戻すのは「マップと読み取り欄をまとめた枠」から出たときだけにする。
       枠の中（マップ→読み取り欄）へ動く分には、出ている内容が変わらない。 */
    var block = root.closest('[data-tmap-block]') || root;
    block.addEventListener('mouseleave', function () {
      var cur = cells.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })[0];
      if (cur) show(cur);
    });
  }

  /* ---------------- 6. 出現（1回だけ） ---------------- */
  function reveal() {
    var items = $$('.rv, .rvm, .rvl, .dgm-mini, .rvsec, .dgm, .tl-phase').filter(function (el) {
      return !el.classList.contains('is-in');
    });
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .06 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- 7. ヒーローの経路（読み込み時に1回だけ） ---------------- */
  function heroIn() {
    var hero = $('.hero');
    if (!hero) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('is-in'); }); });
    /* 骨格の切り抜きは、開き終わったら外す。
       付けたままだとスクロール中にヒーロー全面の切り抜き計算が走る。 */
    var arch = hero.querySelector('.hero__arch');
    if (arch) setTimeout(function () { arch.classList.add('arch-done'); }, 1400);
  }

  /* ---------------- 8. モバイル固定CTA ---------------- */
  function mobileCta() {
    var bar = $('.mcta'), hero = $('.hero'), ftr = $('.ftr');
    if (!bar) return;

    /* フッターに達したかは IntersectionObserver に任せる。
       スクロール中に getBoundingClientRect を呼ばないため、
       ブラウザにレイアウトの再計算を強いない。 */
    var atFtr = false, threshold = 400, on = null;
    function measure() { threshold = hero ? hero.offsetHeight * .7 : 400; }
    function apply(y) {
      var next = (y > threshold) && !atFtr;
      if (next === on) return;
      on = next;
      bar.classList.toggle('is-on', next);
    }
    measure();
    if (ftr && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        atFtr = es[0].isIntersecting;
        apply(window.scrollY);
      }, { rootMargin: '0px 0px -40px 0px' }).observe(ftr);
    }
    onScroll(apply);
    onResize(function () { measure(); apply(window.scrollY); });
    apply(window.scrollY);
  }

  /* ---------------- 9. ヒーローの十字を、印のマスの中心へ合わせる ----------------
     6×6の骨格は画面より大きい正方形なので、印のマスの位置は実測して線を置く。 */
  function heroCross() {
    var arch = $('.hero__arch'), cross = $('.hero__cross');
    if (!arch || !cross) return;
    var on = $('.on', arch);
    var lineX = $('.x', cross), lineY = $('.y', cross);
    if (!on || !lineX || !lineY) return;
    function place() {
      var h = arch.parentElement.getBoundingClientRect();
      var r = on.getBoundingClientRect();
      lineX.style.top  = Math.round(r.top - h.top + r.height / 2) + 'px';
      lineY.style.left = Math.round(r.left - h.left + r.width / 2) + 'px';
    }
    place();
    window.addEventListener('resize', place);
  }

  /* ---------------- 10. 章の索引（左端） ---------------- */
  function chapterIndex() {
    var idx = $('.chapidx');
    if (!idx || !('IntersectionObserver' in window)) return;
    var links = $$('a', idx);
    var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
    if (!secs.length) return;

    var hero = $('.hero'), ftr = $('.ftr');
    var atFtr = false, threshold = 300, on = null;
    function measure() { threshold = hero ? hero.offsetHeight * .55 : 300; }
    function apply(y) {
      var next = (y > threshold) && !atFtr;
      if (next === on) return;
      on = next;
      idx.classList.toggle('is-on', next);
    }
    measure();
    if (ftr) {
      new IntersectionObserver(function (es) {
        atFtr = es[0].isIntersecting;
        apply(window.scrollY);
      }, { rootMargin: '0px 0px -50% 0px' }).observe(ftr);
    }
    onScroll(apply);
    onResize(function () { measure(); apply(window.scrollY); });
    apply(window.scrollY);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var i = secs.indexOf(en.target);
        if (i < 0) return;
        links.forEach(function (a, j) { a.classList.toggle('is-cur', j === i); });
        idx.classList.toggle('on-ink', en.target.classList.contains('sec--ink'));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }

  /* ---------------- 11. 数値のカウントアップ（1回だけ） ---------------- */
  function countUp() {
    var els = $$('[data-count]');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) return;
    els.forEach(function (el) {
      // 幅を確保してから 0 に戻す（桁が増えるたびに版面が動くのを防ぐ）
      var t = parseInt(el.getAttribute('data-count'), 10);
      el.style.minWidth = String(t.toLocaleString('ja-JP').length) + 'ch';
      el.style.display = 'inline-block';
      el.textContent = '0';
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; io.unobserve(el);
        var target = parseInt(el.getAttribute('data-count'), 10);
        var t0 = null, dur = 1000;
        function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * e).toLocaleString('ja-JP');
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: .4 });
    els.forEach(function (el) { io.observe(el); });
  }


  /* ------------------------------------------------------------------
     12. 4問の暫定診断
     仕様（materials/03_diagnosis-specification.txt）に合わせて計算する。
       P/B/T/M = 各カテゴリの回答合計（1問なので -2〜2）
       Xraw = B - P, Yraw = M - T   （-4〜4）
       X = clamp(round(Xraw * 84 / 4), -84, 84)   ※診断と同じ ±84 の目盛りへ正規化
       6段階の境界も本診断と同一。
     4問なので粗い。画面には必ず「暫定」と明記する。
  ------------------------------------------------------------------ */
  function miniQuiz() {
    var root = $('[data-mini]');
    if (!root) return;
    var qs = $$('.mini__q', root);
    if (qs.length !== 4) return;

    var out   = $('[data-mini-out]', root);
    var bar   = $$('.mini__bar i', root);
    var elId  = $('[data-mini="id"]', root);
    var elNm  = $('[data-mini="name"]', root);
    var reset = $('[data-mini-reset]', root);
    var answers = {};

    function band(v) {                       /* 正規化済みスコア → 0〜5 */
      if (v <= -57) return 0;
      if (v <= -29) return 1;
      if (v <= 0)   return 2;
      if (v <= 28)  return 3;
      if (v <= 56)  return 4;
      return 5;
    }
    function norm(raw) {                     /* 4問 → ±84 の目盛り */
      return Math.max(-84, Math.min(84, Math.round(raw * 84 / 4)));
    }

    function evaluate() {
      var done = Object.keys(answers).length;
      bar.forEach(function (i, n) { i.classList.toggle('on', n < done); });
      if (done < 4) { if (out) out.hidden = true; return; }

      var X = norm((answers.brand || 0) - (answers.practical || 0));
      var Y = norm((answers.modern || 0) - (answers.trust || 0));
      var cell = selectTypeCell ? selectTypeCell(band(X), band(Y)) : null;
      if (!cell) return;
      if (elId) elId.textContent = cell.dataset.id;
      if (elNm) elNm.textContent = cell.dataset.name;
      if (out) out.hidden = false;
    }

    qs.forEach(function (q) {
      var cat = q.getAttribute('data-cat');
      var btns = $$('button[role="radio"]', q);
      function pick(btn, focus) {
        btns.forEach(function (b) {
          var on = b === btn;
          b.setAttribute('aria-checked', String(on));
          b.tabIndex = on ? 0 : -1;
        });
        answers[cat] = parseInt(btn.getAttribute('data-v'), 10);
        if (focus) btn.focus();
        evaluate();
      }
      btns.forEach(function (btn, i) {
        btn.addEventListener('click', function () { pick(btn); });
        btn.addEventListener('keydown', function (e) {
          var n = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = btns[(i + 1) % btns.length];
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = btns[(i - 1 + btns.length) % btns.length];
          else if (e.key === 'Home') n = btns[0];
          else if (e.key === 'End') n = btns[btns.length - 1];
          if (n) { e.preventDefault(); pick(n, true); }
        });
      });
    });

    /* 「16問で確定する」へ進むとき、この4問（ID 1〜4 = かんたん診断の冒頭4問）を
       診断本編の保存形式で書き出しておき、5問目から再開できるようにする。 */
    var go = $('[data-mini-go]', root);
    if (go) {
      go.addEventListener('click', function () {
        if (Object.keys(answers).length < 4) return;
        var byCat = { practical: 1, brand: 2, trust: 3, modern: 4 };
        var a = {};
        Object.keys(byCat).forEach(function (c) { a[byCat[c]] = answers[c]; });
        var now = new Date().toISOString();
        try {
          localStorage.setItem('crewAscentDiagnosis:v3', JSON.stringify({
            version: 3, mode: 'quick', currentIndex: 4,
            answers: a, startedAt: now, updatedAt: now
          }));
        } catch (e) { /* 保存できなくても遷移は妨げない */ }
      });
    }

    if (reset) {
      reset.addEventListener('click', function () {
        answers = {};
        $$('button[role="radio"]', root).forEach(function (b, i) {
          b.setAttribute('aria-checked', 'false');
          b.tabIndex = (i % 5 === 0) ? 0 : -1;
        });
        evaluate();
        var first = $('button[role="radio"]', root);
        if (first) first.focus();
      });
    }
  }

  /* ---------------- 画像を表示前に展開しておく ----------------
     lazy 読み込みの画像は、画面に入った瞬間に取得と展開（デコード）が走る。
     それが描画を数コマ止め、そのぶんスクロールがまとめて進むため、
     画像のところで「加速した」ように見えていた。
     画面のかなり手前で読み込みと展開を済ませ、表示時には何もしない状態にする。

     注意: この関数は以前から書かれていたが init() から呼ばれておらず、
     一度も動いていなかった。呼び出しを追加したのが今回の修正の要点。 */
  function predecodeImages() {
    var imgs = $$('img');
    if (!imgs.length) return;
    var done = [];

    function warm(img) {
      if (!img || img.__warmed) return;
      img.__warmed = true;
      if (img.getAttribute('loading') === 'lazy') img.loading = 'eager';   // 先に取得を始める
      if (typeof img.decode === 'function') {
        img.decode().catch(function () { /* 失敗しても表示は妨げない */ });
      }
      done.push(img);
    }

    if ('IntersectionObserver' in window) {
      /* 画面の2枚ぶん手前で取得と展開を始める。
         連続スクロールでも、画像が見える頃には展開が終わっている。 */
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          warm(en.target);
        });
      }, { rootMargin: '2000px 0px 2000px 0px' });
      imgs.forEach(function (img) { io.observe(img); });
    } else {
      imgs.forEach(warm);
      return;
    }

    /* 読み込みが落ち着いたら、残りの画像も手が空いた時間に展開しておく。
       初回スクロールで画面に入った瞬間に展開が走るのを避けるため。 */
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1); };
    function warmNext(list, i) {
      if (i >= list.length) return;
      idle(function () {
        var img = list[i];
        warm(img);
        if (img && typeof img.decode === 'function') {
          img.decode().catch(function () {}).then(function () { warmNext(list, i + 1); });
        } else {
          warmNext(list, i + 1);
        }
      }, { timeout: 400 });
    }
    var start = function () { setTimeout(function () { warmNext(imgs, 0); }, 1200); };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);
  }

  function year() { $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); }); }

  /* 結果ページのように、あとからJSで組み立てる節にも効かせるため外へ出す */
  window.CREW_REVEAL = function () { reveal(); };

  function init() {
    header(); mega(); drawer(); tabs(); typeMap(); miniQuiz(); reveal();
    heroCross(); heroIn(); chapterIndex(); countUp(); mobileCta(); year();
    predecodeImages();   /* ← 呼び出しが抜けていた。画像の展開がスクロール中に走っていた原因 */
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
