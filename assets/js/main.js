/* main.js — サイト共通のふるまい。JS無効でも本文・料金・相談方法は読める前提の上乗せ。 */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 計測: dataLayer がある場合だけ push する薄い層（個人情報・回答値は送らない） */
  window.crewTrack = function (event, params) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: event }, params || {}));
    } catch (e) { /* noop */ }
  };

  /* ------------------- モバイルメニュー -------------------
     全画面。開いている間は背面をスクロールさせない。Escで閉じ、フォーカスを戻す。 */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    var setMenu = function (open) {
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('menu-open', open);
    };
    setMenu(false);
    toggle.addEventListener('click', function () {
      var willOpen = menu.hidden;
      setMenu(willOpen);
      if (willOpen) {
        var first = menu.querySelector('a, button');
        if (first) first.focus();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
    });
    /* モバイルの階層開閉 */
    Array.prototype.forEach.call(menu.querySelectorAll('.m-nav__toggle'), function (b) {
      b.addEventListener('click', function () {
        var sub = document.getElementById(b.getAttribute('aria-controls'));
        var open = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (sub) sub.hidden = open;
      });
    });
    /* 幅が広がったら閉じる(表示が残らないように) */
    var wide = window.matchMedia('(min-width: 1080px)');
    var onWide = function () { if (wide.matches && !menu.hidden) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* ------------------- デスクトップのドロップダウン -------------------
     hoverだけに依存しない。クリックとキーボードで開閉し、Escで閉じてボタンへ戻る。
     矢印キーでパネル内を移動できる。 */
  var navItems = document.querySelectorAll('.nav-item--has-panel');
  if (navItems.length) {
    var openPanel = null;
    var close = function (focusBtn) {
      if (!openPanel) return;
      var btn = openPanel.querySelector('.nav-link--btn');
      var panel = openPanel.querySelector('.nav-panel');
      btn.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
      if (focusBtn) btn.focus();
      openPanel = null;
    };
    var open = function (item) {
      if (openPanel === item) return;
      close(false);
      var btn = item.querySelector('.nav-link--btn');
      var panel = item.querySelector('.nav-panel');
      btn.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
      openPanel = item;
    };
    Array.prototype.forEach.call(navItems, function (item) {
      var btn = item.querySelector('.nav-link--btn');
      var panel = item.querySelector('.nav-panel');
      btn.addEventListener('click', function () {
        if (openPanel === item) close(true); else open(item);
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            open(item);
            var a = panel.querySelector('a');
            if (a) a.focus();
          }
        }
      });
      /* hoverでは開かない。ポインタとキーボードで同じ操作になるようクリックに一本化する。
         (hoverで開くと、クリック時に「開く→閉じる」が同時に起きて操作が読めなくなる) */
      panel.addEventListener('keydown', function (e) {
        var links = Array.prototype.slice.call(panel.querySelectorAll('a'));
        var i = links.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); (links[i + 1] || links[0]).focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (links[i - 1] || links[links.length - 1]).focus(); }
        else if (e.key === 'Home') { e.preventDefault(); links[0].focus(); }
        else if (e.key === 'End') { e.preventDefault(); links[links.length - 1].focus(); }
      });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
    document.addEventListener('click', function (e) {
      if (openPanel && !openPanel.contains(e.target)) close(false);
    });
    document.addEventListener('focusin', function (e) {
      if (openPanel && !openPanel.contains(e.target)) close(false);
    });
  }

  /* ------------------- セクションの控えめな出現 ------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
  }

  /* ------------------- ヒーロー: 全幅6×6マップ -------------------
     薄い背景模様ではなく第一印象そのもの。4領域の色面 + 経路 + 座標点。
     再生は初回1回のみでループしない。reduced-motion では最終状態を即時表示。 */
  var hero = document.querySelector('.hero');
  var heroMap = hero && hero.querySelector('.hero__map');
  var heroMedia = hero && hero.classList.contains('hero--media');
  if (heroMap) {
    var narrow = window.matchMedia('(max-width: 759px)');
    // 広い画面: コピーの右半分を上る経路。
    // 狭い画面: 本文の折り返し幅の外（右端の列）だけを上る。文字と線が触れないようにする。
    var ROUTE_WIDE = [[5, 3], [4, 3], [4, 4], [3, 4], [3, 5], [2, 5], [1, 5], [0, 5]];
    var ROUTE_NARROW = [[5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [0, 5]];
    var NS = 'http://www.w3.org/2000/svg';
    var scene = null;

    function buildHero(first) {
      var route = (narrow.matches && !heroMedia) ? ROUTE_NARROW : ROUTE_WIDE;
      var onCells = {};
      route.forEach(function (rc) { onCells[rc[0] * 6 + rc[1]] = true; });

      heroMap.textContent = '';
      for (var r = 0; r < 6; r++) {
        for (var c = 0; c < 6; c++) {
          var cell = document.createElement('div');
          // 上半分=先進、下半分=王道 / 左半分=実用、右半分=魅力
          var q = (r < 3 ? (c < 3 ? 'q-tl' : 'q-tr') : (c < 3 ? 'q-bl' : 'q-br'));
          cell.className = 'hero__c ' + q + (onCells[r * 6 + c] ? ' on' : '');
          heroMap.appendChild(cell);
        }
      }

      if (scene) scene.parentNode.removeChild(scene);
      scene = document.createElement('div');
      scene.className = 'hero__scene';
      scene.setAttribute('aria-hidden', 'true');

      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'hero__route');
      svg.setAttribute('viewBox', '0 0 600 600');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', route.map(function (rc, n) {
        return (n === 0 ? 'M' : 'L') + ((rc[1] + 0.5) * 100) + ' ' + ((rc[0] + 0.5) * 100);
      }).join(' '));
      svg.appendChild(path);
      scene.appendChild(svg);

      // 座標点は HTML 要素。SVGを横へ引き伸ばすと円が楕円になるため。
      var dots = (narrow.matches && !heroMedia)
        ? [{ i: 0, c: '#087F78' }, { i: 1, c: '#C98213' }, { i: 3, c: '#C64B3C' }, { i: 4, c: '#7354B8' }, { i: 5, c: '#1F64D1' }]
        : [{ i: 0, c: '#087F78' }, { i: 2, c: '#C98213' }, { i: 4, c: '#C64B3C' }, { i: 6, c: '#7354B8' }, { i: 7, c: '#1F64D1' }];
      dots.forEach(function (nd, k) {
        var rc = route[nd.i];
        var dot = document.createElement('i');
        dot.className = 'hero__node';
        dot.style.left = ((rc[1] + 0.5) / 6 * 100) + '%';
        dot.style.top = ((rc[0] + 0.5) / 6 * 100) + '%';
        dot.style.background = nd.c;
        dot.style.animationDelay = (480 + k * 120) + 'ms';
        scene.appendChild(dot);
      });
      heroMap.insertAdjacentElement('afterend', scene);

      if (!reduceMotion && first) {
        requestAnimationFrame(function () {
          svg.classList.add('is-drawing');
          hero.classList.add('is-drawing');
        });
      } else {
        hero.classList.add('is-drawing');
      }
    }

    buildHero(true);
    // 幅の区分をまたいだ時だけ組み直す（通常のリサイズでは再生し直さない）
    var onChange = function () { buildHero(false); };
    if (narrow.addEventListener) narrow.addEventListener('change', onChange);
    else if (narrow.addListener) narrow.addListener(onChange);
  }

  /* ------------------- ヒーローの小さな結果UI -------------------
     ダミーの飾りではなく、結果画面と同じ 6×6 の並びを実際に塗る。 */
  var miniGrid = document.querySelector('.mini-result__grid');
  if (miniGrid) {
    var COL = { tl: '#DCE8FB', tr: '#E7E0F7', bl: '#D9EEEA', br: '#FBEBD4' };
    for (var mr = 5; mr >= 0; mr--) {
      for (var mc = 0; mc < 6; mc++) {
        var i = document.createElement('i');
        var a = (mr >= 3 ? (mc < 3 ? 'tl' : 'tr') : (mc < 3 ? 'bl' : 'br'));
        i.style.background = COL[a];
        if (mc === 2 && mr === 2) { i.style.background = '#087F78'; i.style.outline = '2px solid #0B3B39'; }
        miniGrid.appendChild(i);
      }
    }
  }

  /* ------------------- 4つのサービスストーリー -------------------
     自動再生しない。矢印キー・Home・Endで移動できる。選択は色だけで示さない。 */
  var storyTabs = Array.prototype.slice.call(document.querySelectorAll('.story-tab'));
  if (storyTabs.length) {
    var selectStory = function (tab, focus) {
      storyTabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    storyTabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectStory(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = storyTabs[(i + 1) % storyTabs.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = storyTabs[(i - 1 + storyTabs.length) % storyTabs.length];
        else if (e.key === 'Home') n = storyTabs[0];
        else if (e.key === 'End') n = storyTabs[storyTabs.length - 1];
        if (n) { e.preventDefault(); selectStory(n, true); }
      });
    });
  }

  /* ------------------- プラン比較: モバイルタブ -------------------
     同一ページに複数のタブ組が存在しうるため querySelectorAll で扱う。 */
  var tablists = document.querySelectorAll('.plan-tablist');
  Array.prototype.forEach.call(tablists, function (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
    }
    tablist.addEventListener('click', function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (tab) select(tab);
    });
    tablist.addEventListener('keydown', function (e) {
      var idx = tabs.indexOf(document.activeElement);
      if (idx === -1) return;
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(idx - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); next.focus(); select(next); }
    });
  });

  /* プラン「詳しく見る」の計測 */
  Array.prototype.forEach.call(document.querySelectorAll('[data-plan-detail]'), function (el) {
    el.addEventListener('click', function () {
      window.crewTrack('plan_detail_open', { plan_id: el.getAttribute('data-plan-detail') });
    });
  });

  /* ------------------- 相談フォームリンク -------------------
     URLが設定済みなら差し込む。未設定でも、サイト内の相談ページへ行けるリンクは
     生かしたままにする（押せない状態にするのは行き先が外部フォームしかない場合だけ）。 */
  var cfg = window.CREW_CONFIG || {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-form-link]'), function (a) {
    if (cfg.googleFormUrl && cfg.googleFormUrl !== 'PUBLISH_BLOCKER') {
      a.href = cfg.googleFormUrl;
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    } else {
      var raw = a.getAttribute('href') || '';
      if (!raw || raw === '#') a.setAttribute('aria-disabled', 'true');
    }
    a.addEventListener('click', function (e) {
      if (a.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
      window.crewTrack('contact_form_open', { source_page: document.body.getAttribute('data-page') || '' });
    });
  });

  /* 動きの設定が 'off' なら、head で付けたクラスを外す。
     （head の時点では site-config.js をまだ読めないため、ここで後追いする） */
  if ((window.CREW_CONFIG || {}).motion === 'off') {
    document.documentElement.classList.remove('motion');
  }

  /* 年 */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = new Date().getFullYear();
  });
}());
