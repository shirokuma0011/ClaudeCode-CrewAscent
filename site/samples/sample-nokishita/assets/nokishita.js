/* ノキシタ設計室（架空）見本  nokishita.js  v3
   1) 署名の動き: 写真が画面に入ると、ゆっくり明るくなる（1回だけ）。
   2) 相談フォーム: 入力中・エラー・送信中・送信後（見本のため送信しない）の状態。
   JSが動かなくても、文章と写真はすべて見える。動きを減らす設定では 1) を行わない。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = document.querySelectorAll('.rv');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: .2 });
    els.forEach(function (el) { io.observe(el); });
  }

  var form = document.querySelector('form[data-sample-form]');
  if (!form) return;
  var stateText = form.querySelector('[data-state-text]');
  var errBox = form.querySelector('[data-errbox]');
  var done = form.querySelector('[data-done]');
  var btn = form.querySelector('button[type="submit"]');
  var rules = [
    { key: 'name', label: 'お名前', el: form.elements.name, err: 'e-name', test: function () { return form.elements.name.value.trim() !== ''; }, msg: 'お名前を書いてください。' },
    { key: 'mail', label: 'メールアドレス', el: form.elements.mail, err: 'e-mail', test: function () { var v = form.elements.mail.value.trim(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }, msg: 'メールアドレスを、@を含む形で書いてください。' },
    { key: 'kind', label: '相談したいこと', el: form.querySelector('input[name="kind"]'), err: 'e-kind', test: function () { return !!form.querySelector('input[name="kind"]:checked'); }, msg: '新築・改修・店の内装から1つ選んでください。' }
  ];
  var touched = {};
  function setState(s, t) { form.setAttribute('data-state', s); stateText.textContent = t; }
  function mark(r, ok) {
    var box = document.getElementById(r.err);
    if (r.key !== 'kind') r.el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (box) box.textContent = ok ? '' : r.msg;
  }
  function left() { return rules.filter(function (r) { return !r.test(); }); }
  function refresh() {
    rules.forEach(function (r) { if (touched[r.key]) mark(r, r.test()); });
    var l = left();
    if (!l.length) setState('ready', '送る準備ができました。');
    else setState('editing', '入力中です。残り：' + l.map(function (r) { return r.label; }).join('・'));
    if (!errBox.hidden && !l.length) errBox.hidden = true;
  }
  form.addEventListener('input', function (e) {
    if (e.target.name === 'kind') touched.kind = true;
    if (form.getAttribute('data-state') === 'sent') done.hidden = true;
    refresh();
  });
  form.addEventListener('focusout', function (e) {
    var n = e.target.name;
    if (n === 'name' || n === 'mail') { touched[n] = true; refresh(); }
  });
  form.addEventListener('submit', function (e) {
    var l = left();
    rules.forEach(function (r) { touched[r.key] = true; mark(r, r.test()); });
    if (l.length) {
      e.preventDefault();
      e.stopPropagation();
      setState('error', '送れませんでした。' + l.length + '項目を確かめてください。');
      errBox.innerHTML = '<p>次の項目を確かめてください。</p><ul>' + l.map(function (r) { return '<li><a href="#' + (r.el.id || '') + '" data-to="' + r.key + '">' + r.label + '</a></li>'; }).join('') + '</ul>';
      errBox.hidden = false;
      errBox.focus();
      return;
    }
    setState('sending', '内容を確かめています…');
    btn.disabled = true;
    errBox.hidden = true;
    setTimeout(function () {
      btn.disabled = false;
      setState('sent', '見本のため、送信はしていません。');
      var k = form.querySelector('input[name="kind"]:checked');
      done.textContent = '書いた内容：' + (k ? k.value : '') + (form.elements.site.value.trim() ? '／敷地 ' + form.elements.site.value.trim() : '') + '。返信の目安は3営業日以内です。';
      done.hidden = false;
    }, 700);
    /* 止めずに crew-frame.js へ渡し、見本のダイアログを出す */
  });
  errBox.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-to]');
    if (!a) return;
    e.preventDefault();
    var r = rules.filter(function (x) { return x.key === a.getAttribute('data-to'); })[0];
    if (r && r.el) r.el.focus();
  });
})();
