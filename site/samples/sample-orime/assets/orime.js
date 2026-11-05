/* オリメ工業（架空）見本  orime.js  v4
   1) 最初の画面: 平板が90°折れてL形になる、一度きりの動き
   2) 材質×板厚マトリクス: 材質・板厚を選ぶと、その行と列を十字に強調し、交点の可否を表示
   3) 加工別の仕様表: 工程・材質で絞り込み
   4) 見積もり依頼フォーム: 入力中・エラー・送信中・送信後
   JSが動かなくても、表と文章はすべて読める。動きを減らす設定では動かさない。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 1) 折り曲げ */
  $$('.fold').forEach(function (f) {
    if (reduce) { f.classList.add('is-folded'); return; }
    requestAnimationFrame(function () { setTimeout(function () { f.classList.add('is-folded'); }, 120); });
  });

  /* 2) マトリクスの十字 */
  $$('[data-matrix]').forEach(function (table) {
    var out = document.getElementById(table.getAttribute('data-matrix'));
    var row = -1, col = -1;
    var heads = $$('thead th', table).map(function (th) { return th.textContent.trim(); });
    function paint() {
      $$('.is-row,.is-col', table).forEach(function (c) { c.classList.remove('is-row', 'is-col'); });
      $$('.pick', table).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
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
        out.textContent = rows[row].cells[0].querySelector('b').textContent + ' × 板厚 ' + heads[col] + 'mm … ' + (rows[row].cells[col].getAttribute('data-say') || '');
      } else if (row >= 0) {
        out.textContent = rows[row].cells[0].querySelector('b').textContent + ' の行を表示中。板厚も選ぶと、交わるマスの可否を表示します。';
      } else if (col >= 1) {
        out.textContent = '板厚 ' + heads[col] + 'mm の列を表示中。材質も選ぶと、交わるマスの可否を表示します。';
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
  var filter = document.querySelector('[data-filter]');
  if (filter) {
    var table = document.getElementById(filter.getAttribute('data-filter'));
    var rows = Array.prototype.slice.call(table.tBodies[0].rows);
    var count = document.getElementById('filter-count');
    filter.addEventListener('change', function () {
      var p = (filter.querySelector('input[name="proc"]:checked') || {}).value || 'all';
      var m = (filter.querySelector('input[name="mat"]:checked') || {}).value || 'all';
      var n = 0;
      rows.forEach(function (r) {
        var ok = (p === 'all' || r.getAttribute('data-proc') === p) && (m === 'all' || (' ' + r.getAttribute('data-mat') + ' ').indexOf(' ' + m + ' ') >= 0);
        r.hidden = !ok; if (ok) n++;
      });
      if (count) count.textContent = rows.length + '件中 ' + n + '件を表示しています' + (n ? '' : '。この組み合わせは表の範囲外です（ご相談ください）');
    });
  }

  /* 4) フォーム: 入力が足りないときと二度押しだけ止める。正しい入力は共通の枠（crew-frame.js）へ届け、見本ダイアログを出す */
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('span');
    var idle = label.textContent;
    var busy = false;
    var fields = $$('input:not([disabled]), select, textarea', form);
    fields.forEach(function (el) {
      var f = el.closest('.field');
      el.addEventListener('input', function () {
        if (!f) return;
        f.classList.add('is-typing');
        if (el.checkValidity()) { f.classList.remove('is-error'); el.removeAttribute('aria-invalid'); }
        if (state.classList.contains('is-sent')) { state.className = 'form__state'; state.textContent = ''; }
      });
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
    });
    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      var bad = fields.filter(function (el) {
        var ok = el.checkValidity();
        var f = el.closest('.field');
        if (f) f.classList.toggle('is-error', !ok);
        if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
        return !ok;
      });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + bad.length + ' つあります。項目の下の案内をご確認ください。';
        bad[0].focus();
        return;
      }
      busy = true;
      btn.disabled = true;
      label.textContent = '送信しています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。';
      /* ここでは止めない: 共通の枠が見本ダイアログを開く */
    }, true);
    var dialog = document.getElementById('ca-sample-dialog');
    var finish = function () {
      if (!busy) return;
      busy = false;
      btn.disabled = false;
      label.textContent = idle;
      state.className = 'form__state is-sent';
      state.textContent = '入力した内容は、どこにも送っておらず、保存もしていません。';
      state.focus();
    };
    if (dialog && typeof dialog.showModal === 'function') dialog.addEventListener('close', function () { setTimeout(finish, 60); });
    else form.addEventListener('submit', function (e) { e.preventDefault(); setTimeout(finish, 600); });
  });
})();
