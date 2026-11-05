/* のぼりざか（架空）見本  noborizaka.js  v2
   1. 署名の動き：「12週の進め方」が画面に入ると、回数の斜線が左下から右上へ1回だけ引かれ、点が順に現れる。
      JSが動かなくても、動きを減らす設定でも、線と点は最初から見える。
   2. スマホの固定の窓口：最初の画面と申し込みフォームが見えている間は隠す。
   3. 申し込みフォーム：入力中（答えの要約）・エラー（必須の欄）・送信後（見本のため送っていないこと）を出す。
      実際の送信はしない。送信の操作はクルーアセントの枠（crew-frame.js）が見本ダイアログに置き換える。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* 1. 署名の動き */
  var route = document.querySelector('.route12');
  if (route) {
    if (reduce || !hasIO) { route.classList.add('is-in'); }
    else {
      var io = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { route.classList.add('is-in'); io.disconnect(); }
      }, { rootMargin: '0px 0px -30% 0px' });
      io.observe(route.querySelector('.chart') || route);
    }
  }

  /* 2. 固定の窓口 */
  var dock = document.querySelector('.dock');
  var watch = document.querySelectorAll('[data-dock-hide]');
  if (dock && watch.length && hasIO) {
    var seen = new Set();
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      dock.classList.toggle('is-hidden', seen.size > 0);
    });
    watch.forEach(function (el) { io2.observe(el); });
  }

  /* よくある質問は、印刷するときに全部開く */
  window.addEventListener('beforeprint', function () { document.querySelectorAll('.faq details').forEach(function (d) { d.open = true; }); });

  /* 3. 申し込みフォーム */
  var form = document.querySelector('form[data-sample-form]');
  if (!form) return;
  form.setAttribute('novalidate', '');
  var summary = form.querySelector('[data-summary]');
  var status = form.querySelector('[data-status]');
  var labels = { freq: '通える回数', walk: '歩く時間', hard: 'つらい動作' };

  function val(name) {
    var els = form.querySelectorAll('[name="' + name + '"]');
    var out = [];
    els.forEach(function (el) {
      if ((el.type === 'radio' || el.type === 'checkbox') ? el.checked : el.value.trim()) out.push(el.type === 'radio' || el.type === 'checkbox' ? el.value : el.value.trim());
    });
    return out;
  }
  function updateSummary() {
    if (!summary) return;
    var parts = [];
    ['freq', 'walk', 'hard'].forEach(function (k) { var v = val(k); if (v.length) parts.push(labels[k] + '：' + v.join('・')); });
    summary.textContent = parts.length ? parts.join(' ／ ') : 'まだ選ばれていません。';
    summary.parentElement.classList.toggle('is-filled', parts.length > 0);
  }
  function setError(field, msg) {
    var box = form.querySelector('[data-field="' + field + '"]');
    if (!box) return;
    var err = box.querySelector('.err');
    var inputs = box.querySelectorAll('input, textarea, select');
    box.classList.toggle('is-error', !!msg);
    if (err) err.textContent = msg || '';
    inputs.forEach(function (el) { if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); });
  }
  function check() {
    var bad = [];
    if (!val('freq').length) { setError('freq', '通えそうな回数を1つ選んでください。'); bad.push('freq'); } else setError('freq');
    if (!val('name').length) { setError('name', 'お名前を入れてください。'); bad.push('name'); } else setError('name');
    var c = val('contact')[0] || '';
    if (!c) { setError('contact', 'メールアドレスか電話番号を入れてください。'); bad.push('contact'); }
    else if (!/@/.test(c) && c.replace(/[^0-9]/g, '').length < 10) { setError('contact', 'メールアドレス（@を含む）か、10桁以上の電話番号を入れてください。'); bad.push('contact'); }
    else setError('contact');
    return bad;
  }
  form.addEventListener('change', function (e) {
    updateSummary();
    if (form.classList.contains('was-checked')) check();
    if (status && !status.hidden && e.target) { status.hidden = true; }
  });
  form.addEventListener('input', function () { if (form.classList.contains('was-checked')) check(); });
  form.addEventListener('submit', function (e) {
    form.classList.add('was-checked');
    var bad = check();
    if (bad.length) {
      e.preventDefault();
      e.stopPropagation(); /* 未入力のときは見本ダイアログを出さない */
      if (status) {
        status.hidden = false;
        status.className = 'status status--error';
        status.textContent = '入力が足りない欄が ' + bad.length + ' つあります。赤い線の欄を確かめてください。';
      }
      var first = form.querySelector('[data-field="' + bad[0] + '"] input, [data-field="' + bad[0] + '"] textarea');
      if (first) first.focus();
      return;
    }
    /* 正しく入力されたとき：送信は行わず、見本であることを出す（ダイアログは crew-frame.js が開く） */
    if (status) {
      status.hidden = false;
      status.className = 'status status--done';
      status.textContent = '見本のため、送信はしていません。入力した内容は消していません。';
    }
  });
  updateSummary();
})();
