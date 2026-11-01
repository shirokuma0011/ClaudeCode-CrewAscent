/* オリメ工業（架空）見本  orime.js
   1) 章の寸法線が、画面に入ると両端へ伸びて数値が出る（署名の動きの後半）
   2) 材質×板厚マトリクス: 材質・板厚を選ぶと、その行と列を十字に強調
   3) 加工別の仕様表: 工程・材質で絞り込み、残った行を transform で詰める
   JSが動かなくても、表と文章はすべて読める。動きを減らす設定では動かさない。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1) 寸法線 */
  var dims = document.querySelectorAll('.dim');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    dims.forEach(function (d) { io.observe(d); });
  } else {
    dims.forEach(function (d) { d.classList.add('is-in'); });
  }

  /* 2) マトリクスの十字 */
  document.querySelectorAll('[data-matrix]').forEach(function (table) {
    var out = document.getElementById(table.getAttribute('data-matrix'));
    var row = -1, col = -1;
    var heads = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
    function paint() {
      table.querySelectorAll('.is-row,.is-col').forEach(function (c) { c.classList.remove('is-row', 'is-col'); });
      table.querySelectorAll('.pick').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      var rows = table.tBodies[0].rows;
      if (row >= 0) {
        Array.prototype.forEach.call(rows[row].cells, function (c) { c.classList.add('is-row'); });
        rows[row].cells[0].querySelector('.pick').setAttribute('aria-pressed', 'true');
      }
      if (col >= 1) {
        table.tHead.rows[0].cells[col].classList.add('is-col');
        table.tHead.rows[0].cells[col].querySelector('.pick').setAttribute('aria-pressed', 'true');
        Array.prototype.forEach.call(rows, function (r) { r.cells[col].classList.add('is-col'); });
      }
      if (!out) return;
      if (row >= 0 && col >= 1) {
        var cell = rows[row].cells[col];
        out.textContent = rows[row].cells[0].querySelector('b').textContent + ' × 板厚 ' + heads[col] + ' … ' + (cell.getAttribute('data-say') || '');
      } else if (row >= 0) {
        out.textContent = rows[row].cells[0].querySelector('b').textContent + ' の行を表示中。板厚の列も選ぶと、可否を読み上げます。';
      } else if (col >= 1) {
        out.textContent = '板厚 ' + heads[col] + ' の列を表示中。材質も選ぶと、可否を読み上げます。';
      } else out.textContent = '';
    }
    table.addEventListener('click', function (e) {
      var b = e.target.closest('.pick'); if (!b) return;
      var cell = b.closest('th');
      if (cell.parentNode.parentNode.tagName === 'THEAD') { col = col === cell.cellIndex ? -1 : cell.cellIndex; }
      else { var r = cell.parentNode.sectionRowIndex; row = row === r ? -1 : r; }
      paint();
    });
  });

  /* 3) 絞り込み */
  var form = document.querySelector('[data-filter]');
  if (form) {
    var table = document.getElementById(form.getAttribute('data-filter'));
    var rows = Array.prototype.slice.call(table.tBodies[0].rows);
    var count = document.getElementById('filter-count');
    form.addEventListener('change', function () {
      var p = (form.querySelector('input[name="proc"]:checked') || {}).value || 'all';
      var m = (form.querySelector('input[name="mat"]:checked') || {}).value || 'all';
      var first = new Map();
      rows.forEach(function (r) { if (!r.hidden) first.set(r, r.getBoundingClientRect().top); });
      var n = 0;
      rows.forEach(function (r) {
        var ok = (p === 'all' || r.getAttribute('data-proc') === p) && (m === 'all' || (' ' + r.getAttribute('data-mat') + ' ').indexOf(' ' + m + ' ') >= 0);
        r.hidden = !ok; if (ok) n++;
      });
      if (count) count.textContent = rows.length + '件中 ' + n + '件を表示しています' + (n ? '' : '。条件に合う加工は、表の範囲ではありません（要相談）');
      if (reduce) return;
      rows.forEach(function (r) {
        if (r.hidden) return;
        var was = first.get(r), now = r.getBoundingClientRect().top;
        if (was === undefined) { r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' }); return; }
        if (Math.abs(was - now) > 1) r.animate([{ transform: 'translateY(' + (was - now) + 'px)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.3,.1,.2,1)' });
      });
    });
  }
})();
