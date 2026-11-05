/* =====================================================================
   見本サイト（仮の実績）の描画
   data/works.json を読み、works.html と TOP の一覧に反映する。

   重要: 「架空の事業を想定した見本」の表示はこのファイル側で強制する。
   データから消すことはできない（設計書の表示ルールに従う）。
   ===================================================================== */
(function () {
  'use strict';
  var NOTICE = '架空の事業を想定した見本';

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function card(w) {
    var a = el(w.url ? 'a' : 'div', 'work');
    if (w.url) { a.href = w.url; a.rel = 'noopener'; }
    if (w.typeId) a.id = 'w-' + w.typeId;

    var thumb = el('div', 'work__thumb');
    thumb.appendChild(el('span', 'work__notice', NOTICE));   /* サムネイルにも必ず出す */
    if (w.thumb) {
      var img = new Image();
      img.src = w.thumb; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      img.width = 1600; img.height = 1000;
      thumb.appendChild(img);
    } else {
      thumb.classList.add('work__thumb--empty');
      thumb.appendChild(el('span', 'work__wait', '図版準備中'));
    }
    a.appendChild(thumb);

    var bd = el('div', 'work__bd');
    var meta = el('p', 'work__meta');
    if (w.typeId) meta.appendChild(el('span', 'work__type', w.typeId + (w.typeName ? ' ' + w.typeName : '')));
    if (w.industry) meta.appendChild(el('span', 'work__ind', w.industry));
    bd.appendChild(meta);
    bd.appendChild(el('h3', 'work__nm', w.name || '（名称未設定）'));
    if (w.summary) bd.appendChild(el('p', 'work__sum', w.summary));

    var facts = el('dl', 'work__facts');
    [['プラン', w.plan], ['ページ数', w.pages]].forEach(function (p) {
      if (!p[1]) return;
      var d = el('div'); d.appendChild(el('dt', null, p[0])); d.appendChild(el('dd', null, String(p[1])));
      facts.appendChild(d);
    });
    if (facts.children.length) bd.appendChild(facts);

    bd.appendChild(el('p', 'work__notice work__notice--txt', NOTICE));  /* 一覧の本文にも必ず出す */
    a.appendChild(bd);
    return a;
  }

  function render(mount, items, limit) {
    mount.textContent = '';
    if (!items.length) {
      var wait = el('div', 'works-wait');
      wait.appendChild(el('p', 'works-wait__t', '見本サイトは準備中です'));
      wait.appendChild(el('p', 'works-wait__d',
        '実在しない顧客の声や受注件数は掲載しません。公開できる見本ができ次第、ここに並べます。'));
      mount.appendChild(wait);
      return 0;
    }
    var list = (limit ? items.slice(0, limit) : items).slice().sort(function (x, y) {
      return String(x.typeId || 'ZZ').localeCompare(String(y.typeId || 'ZZ'));
    });
    var grid = el('div', 'works');
    list.forEach(function (w) { grid.appendChild(card(w)); });
    mount.appendChild(grid);
    return list.length;
  }

  /* 36マスの地図。CA01 が左上、CA36 が右下（診断の地図と同じ並び）。
     typeId が CA01〜CA36 の見本を、そのマスに写真で置く。見本がないマスは番号だけ。 */
  function renderMap(mount, items) {
    var byId = {};
    items.forEach(function (w) { if (/^CA\d\d$/.test(w.typeId || '')) byId[w.typeId] = w; });
    mount.textContent = '';
    for (var n = 1; n <= 36; n++) {
      var id = 'CA' + (n < 10 ? '0' : '') + n;
      var w = byId[id];
      var c = el(w ? 'a' : 'span', 'wk-cell' + (w ? '' : ' wk-cell--none'));
      c.style.setProperty('--r', Math.floor((n - 1) / 6));
      c.style.setProperty('--c', (n - 1) % 6);
      if (w) {
        c.href = '#w-' + id;
        c.setAttribute('aria-label', id + ' ' + (w.typeName || '') + '：' + (w.name || ''));
        if (w.thumb) {
          var img = new Image();
          img.src = w.thumbSmall || w.thumb; img.alt = ''; img.decoding = 'async';
          img.width = 160; img.height = 100;
          c.appendChild(img);
        }
      }
      c.appendChild(el('b', null, id));
      mount.appendChild(c);
    }
  }

  /* ---------------------------------------------------------------
     ほかのページに置く、小さな見本の入口
     ・タイプ説明 / 診断結果: [data-works-type="CA06"]（任意で data-works-near="CA05,CA12"）
     ・料金の各プラン:       [data-works-plan="標準"]
     見本がなければ何も出さない（hidden のまま）。
     --------------------------------------------------------------- */
  var cache = null;
  function load() {
    if (!cache) {
      cache = fetch('data/works.json', { cache: 'no-cache' })
        .then(function (r) { return r.json(); })
        .then(function (j) { return (j && Array.isArray(j.items)) ? j.items : []; })
        .catch(function () { return []; });
    }
    return cache;
  }
  function byType(items) {
    var m = {};
    items.forEach(function (w) { if (w.typeId && !m[w.typeId]) m[w.typeId] = w; });
    return m;
  }

  function strip(mount, items) {
    var map = byType(items);
    var w = map[mount.getAttribute('data-works-type')];
    mount.textContent = '';
    if (!w || !w.url) { mount.hidden = true; return; }
    var a = el('a', 'wk-strip__main');
    a.href = w.url;
    var fig = el('span', 'wk-strip__img');
    if (w.thumb) {
      var img = new Image();
      img.src = w.thumb; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      img.width = 1600; img.height = 1000;
      fig.appendChild(img);
    }
    fig.appendChild(el('span', 'work__notice', NOTICE));
    a.appendChild(fig);
    var bd = el('span', 'wk-strip__bd');
    bd.appendChild(el('span', 'wk-strip__k', mount.getAttribute('data-works-label') || 'このタイプで作った見本サイト'));
    bd.appendChild(el('b', 'wk-strip__nm', String(w.name || '').replace(/（架空）$/, '')));
    bd.appendChild(el('span', 'wk-strip__meta', [w.industry, w.pages].filter(Boolean).join(' ・ ')));
    if (w.summary) bd.appendChild(el('span', 'wk-strip__sum', w.summary));
    bd.appendChild(el('span', 'wk-strip__go', '見本サイトを開く →'));
    a.appendChild(bd);
    mount.appendChild(a);

    var near = (mount.getAttribute('data-works-near') || '').split(',').map(function (x) { return map[x.trim()]; })
      .filter(function (x) { return x && x.url; }).slice(0, 3);
    if (near.length) {
      var p = el('p', 'wk-strip__near');
      p.appendChild(el('span', null, '近いタイプの見本'));
      near.forEach(function (n) {
        var l = el('a', null, n.typeId + ' ' + String(n.name || '').replace(/（架空）$/, ''));
        l.href = n.url;
        p.appendChild(l);
      });
      mount.appendChild(p);
    }
    mount.appendChild(el('p', 'wk-strip__note', 'どれも' + NOTICE + 'です。実在の顧客・実績ではありません。'));
    mount.hidden = false;
  }

  function planLine(mount, items) {
    var plan = mount.getAttribute('data-works-plan');
    var hit = items.filter(function (w) { return w.plan === plan && w.url; });
    mount.textContent = '';
    if (!hit.length) { mount.hidden = true; return; }
    mount.appendChild(el('span', 'wk-plan__k', 'このプランで作った見本'));
    hit.forEach(function (w) {
      var l = el('a', null, String(w.name || '').replace(/（架空）$/, '') + (w.pages ? '（' + w.pages + '）' : ''));
      l.href = w.url;
      mount.appendChild(l);
    });
    mount.appendChild(el('span', 'wk-plan__note', NOTICE));
    mount.hidden = false;
  }

  function scan() {
    var all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
    var mounts = all('[data-works]'), maps = all('[data-works-map]'), stat = all('[data-works-status]'),
        strips = all('[data-works-type]'), plans = all('[data-works-plan]');
    if (!mounts.length && !maps.length && !strips.length && !plans.length) return Promise.resolve();
    return load().then(function (items) {
      /* 見出し下の状況表示（works.html）。件数に合わせて文を変える */
      stat.forEach(function (s) {
        s.textContent = items.length ? '公開中の見本: ' + items.length + '件（すべて架空の事業です）' : '現在、公開中の見本はありません。';
      });
      maps.forEach(function (m) { renderMap(m, items); });
      mounts.forEach(function (m) {
        var n = render(m, items, parseInt(m.getAttribute('data-works'), 10) || 0);
        var host = m.closest('[data-works-host]');
        if (host) host.hidden = (n === 0 && host.hasAttribute('data-works-hide-empty'));
      });
      strips.forEach(function (m) { strip(m, items); });
      plans.forEach(function (m) { planLine(m, items); });
    });
  }
  window.CREW_WORKS = { scan: scan };
  var init = scan;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
