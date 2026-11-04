/* うすあかり研究所（架空）見本  usuakari.js  v2
   1) とても遅い視差: [data-depth] の要素が、画面の中心からの距離に応じてごくわずかにずれる（全ページ同じ係数、±12pxまで）。
   2) 深さの目盛: いまのページの中で、どこまで読んだかを薄紫の線で示す。
   3) 相談フォーム: 入力中・エラー・送信中・送信後（見本のため送信しない）の状態。
   JSが動かなくても内容は読め、フォームはブラウザの必須チェックで動く。動きを減らす設定では 1) を止める。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var depthEls = Array.prototype.slice.call(document.querySelectorAll('[data-depth]'));
  var panel = document.querySelector('.ask__panel');
  var gauge = document.querySelector('.depth');
  var K = 0.035; /* 視差の係数（全ページ同じ） */
  var LIM = 12;   /* ずれは ±12px まで。面の縁が文字に届かないようにする */
  function clamp(v) { return Math.max(-LIM, Math.min(LIM, v)); }
  var ticking = false;

  function update() {
    var vh = window.innerHeight;
    if (!reduce) {
      depthEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var d = parseFloat(el.getAttribute('data-depth')) || 1;
        var c = (r.top + r.height / 2) - vh / 2;
        el.style.setProperty('--py', clamp(-c * K * d).toFixed(1) + 'px');
      });
      if (panel) {
        var pr = panel.getBoundingClientRect();
        if (pr.bottom > -200 && pr.top < vh + 200) panel.style.setProperty('--py', clamp(-((pr.top + pr.height / 2) - vh / 2) * K * 1.4).toFixed(1) + 'px');
      }
    }
    if (gauge) {
      var max = document.documentElement.scrollHeight - vh;
      gauge.style.setProperty('--p', max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)).toFixed(3) : '0');
    }
    ticking = false;
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  /* ---------- 相談フォーム ---------- */
  var form = document.getElementById('ask-form');
  if (!form) return;
  form.setAttribute('novalidate', '');
  var stateEl = form.querySelector('[data-form-state]');
  var errBox = form.querySelector('[data-form-errors]');
  var done = form.querySelector('[data-form-done]');
  var btn = form.querySelector('button[type="submit"]');

  var rules = [
    { key: 'kind', label: '相談の種類', test: function () { return !!form.querySelector('input[name="kind"]:checked'); }, focus: function () { return form.querySelector('input[name="kind"]'); }, err: 'err-kind' },
    { key: 'name', label: 'お名前', test: function () { return form.elements.name.value.trim() !== ''; }, focus: function () { return form.elements.name; }, err: 'err-name' },
    { key: 'mail', label: 'メールアドレス', test: function () { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.mail.value.trim()); }, focus: function () { return form.elements.mail; }, err: 'err-mail' },
    { key: 'agree', label: '個人情報の扱いの確認', test: function () { return form.elements.agree.checked; }, focus: function () { return form.elements.agree; }, err: 'err-agree' }
  ];
  var touched = {};

  function setState(s, text) {
    form.setAttribute('data-state', s);
    if (stateEl) stateEl.textContent = text;
  }
  function mark(rule, ok) {
    var e = document.getElementById(rule.err);
    if (e) e.hidden = ok;
    var f = rule.focus();
    if (rule.key === 'kind') {
      form.querySelectorAll('input[name="kind"]').forEach(function (r) { r.setAttribute('aria-invalid', ok ? 'false' : 'true'); });
    } else if (f) {
      f.setAttribute('aria-invalid', ok ? 'false' : 'true');
    }
  }
  function remaining() { return rules.filter(function (r) { return !r.test(); }); }
  function refresh() {
    rules.forEach(function (r) { if (touched[r.key]) mark(r, r.test()); });
    var left = remaining();
    if (form.getAttribute('data-state') === 'sent') return;
    if (left.length === 0) setState('ready', '入力中です。必須の項目はそろいました。');
    else setState('editing', '入力中です。必須の残り：' + left.length + '項目（' + left.map(function (r) { return r.label; }).join('・') + '）');
    if (errBox && !errBox.hidden && left.length === 0) errBox.hidden = true;
  }
  form.addEventListener('input', function (e) {
    var n = e.target.name;
    if (n && form.getAttribute('data-state') === 'sent') { done.hidden = true; }
    if (n === 'kind' || n === 'agree') touched[n] = true;
    if (form.getAttribute('data-state') === 'sent') form.setAttribute('data-state', 'editing');
    refresh();
  });
  form.addEventListener('focusout', function (e) {
    var n = e.target.name;
    if (n === 'name' || n === 'mail') { touched[n] = true; refresh(); }
  });

  form.addEventListener('submit', function (e) {
    var left = remaining();
    rules.forEach(function (r) { touched[r.key] = true; mark(r, r.test()); });
    if (left.length) {
      /* エラー: 見本のダイアログ（crew-frame.js）へは渡さない */
      e.preventDefault();
      e.stopPropagation();
      setState('error', '送れませんでした。' + left.length + '項目を確かめてください。');
      errBox.innerHTML = '<p>次の項目を確かめてください。</p><ul>' + left.map(function (r) {
        var f = r.focus(); return '<li><a href="#' + (f && f.id ? f.id : '') + '" data-to="' + r.key + '">' + r.label + '</a></li>';
      }).join('') + '</ul>';
      errBox.hidden = false;
      errBox.focus();
      return;
    }
    /* 送信中 → 送信後（見本のため送信しない。「完了」とは表示しない） */
    setState('sending', '内容を確かめています…');
    btn.disabled = true;
    errBox.hidden = true;
    setTimeout(function () {
      btn.disabled = false;
      setState('sent', '見本のため、送信はしていません。');
      done.hidden = false;
    }, 700);
    /* e は止めずに crew-frame.js へ渡し、見本のダイアログを出す */
  });
  if (errBox) errBox.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-to]');
    if (!a) return;
    e.preventDefault();
    var r = rules.filter(function (x) { return x.key === a.getAttribute('data-to'); })[0];
    var f = r && r.focus();
    if (f) f.focus();
  });
})();
