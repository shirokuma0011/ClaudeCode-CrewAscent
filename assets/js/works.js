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
    var list = limit ? items.slice(0, limit) : items;
    var grid = el('div', 'works');
    list.forEach(function (w) { grid.appendChild(card(w)); });
    mount.appendChild(grid);
    return list.length;
  }

  function init() {
    var mounts = Array.prototype.slice.call(document.querySelectorAll('[data-works]'));
    if (!mounts.length) return;
    fetch('data/works.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var items = (j && Array.isArray(j.items)) ? j.items : [];
        mounts.forEach(function (m) {
          var n = render(m, items, parseInt(m.getAttribute('data-works'), 10) || 0);
          var host = m.closest('[data-works-host]');
          if (host) host.hidden = (n === 0 && host.hasAttribute('data-works-hide-empty'));
        });
      })
      .catch(function () {
        mounts.forEach(function (m) { render(m, []); });
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
