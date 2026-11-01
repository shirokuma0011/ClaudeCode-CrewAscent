/* カリモノ屋（架空）見本  karimonoya.js  v1
   1) 一覧のタブ: 「映像・音響」と「テント・机」を切り替える（矢印キーでも移動できる）
      JSが動かないときは、タブを出さずに2つの表を縦に並べて全部読める。
   2) 目次: いま読んでいる章に、青緑の印を付ける（現在地）。 */
(function () {
  'use strict';
  /* 1) タブ */
  var list = document.getElementById('list');
  var tablist = list && list.querySelector('[role="tablist"]');
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tablist.hidden = false;
    list.classList.add('has-tabs');
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    select(tabs[0], false);
  }

  /* 2) 目次の現在地 */
  if (!('IntersectionObserver' in window)) return;
  var links = {};
  document.querySelectorAll('.toc a[data-toc]').forEach(function (a) { links[a.getAttribute('data-toc')] = a; });
  var current = null;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var id = e.target.id;
      if (current === id) return;
      if (current && links[current]) links[current].removeAttribute('aria-current');
      if (links[id]) {
        links[id].setAttribute('aria-current', 'true');
        var ol = links[id].closest('ol');
        if (ol && ol.scrollWidth > ol.clientWidth) ol.scrollTo({ left: links[id].parentNode.offsetLeft - 16, behavior: 'auto' });
      }
      current = id;
    });
  }, { rootMargin: '-35% 0px -60% 0px' });
  Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
})();
