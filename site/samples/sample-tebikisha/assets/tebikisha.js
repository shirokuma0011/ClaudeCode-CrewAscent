/* てびき舎（架空）見本  tebikisha.js  v3
   1. 駅の線：読み進めた分だけ、ページを通る一本の線が伸びる（動きはこれ1つだけ）
      JSが動かない環境・動きを減らす設定では、線ははじめから最後まで描かれている
   2. 下の固定ボタン（スマホ）：同じ役目のボタンが画面に見えている間は隠す（動きはつけない）
      JSが動かない環境では、いつも出ている
   3. 3本の路線：近いお店を選ぶと、その業態の線だけを濃く見せる（選ばなくても全部読める）
   4. 相談フォーム：入力中（必須4項目の駅が埋まる）・エラー・送信中・送信後（見本）・送信の失敗の状態
      失敗の状態は、回線が切れているとき、または soudan.html?demo=fail で見られる */
(function () {
  'use strict';
  var d = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 駅の線 ---------- */
  var area = d.querySelector('[data-line-area]');
  var trunk = area && area.querySelector('.trunk');
  var end = area && area.querySelector('[data-line-end]');
  function fitTrunk() {
    if (!trunk || !end) return;
    var ring = end.querySelector('[data-line-stop]') || end.querySelector('.stn--end') || end;
    var a = area.getBoundingClientRect(), r = ring.getBoundingClientRect();
    trunk.style.bottom = Math.max(0, a.bottom - (r.top + r.height / 2)) + 'px';
  }
  var ticking = false;
  function paint() {
    ticking = false;
    var r = trunk.getBoundingClientRect();
    var p = (window.innerHeight * 0.78 - r.top) / Math.max(1, r.height);
    p = Math.min(1, Math.max(0, p));
    trunk.style.setProperty('--p', p.toFixed(4));
  }
  if (trunk) {
    fitTrunk();
    if (!reduce) {
      paint();
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(paint); } }, { passive: true });
    }
    window.addEventListener('resize', function () { fitTrunk(); if (!reduce) paint(); });
    window.addEventListener('load', function () { fitTrunk(); if (!reduce) paint(); });
    d.addEventListener('toggle', function () { fitTrunk(); }, true);
  }

  /* ---------- 2. 下の固定ボタン ---------- */
  var dock = d.querySelector('[data-dock]');
  var hiders = d.querySelectorAll('[data-dock-hide]');
  if (dock && hiders.length && 'IntersectionObserver' in window) {
    var seen = [];
    dock.hidden = true;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        /* data-dock-hide="first"（最初の画面のボタン）は、画面の外へ上に抜けるまで固定ボタンを出さない */
        var first = e.target.getAttribute('data-dock-hide') === 'first';
        var on = e.isIntersecting || (first && e.boundingClientRect.top > 0);
        var i = seen.indexOf(e.target);
        if (on && i < 0) seen.push(e.target);
        if (!on && i > -1) seen.splice(i, 1);
      });
      dock.hidden = seen.length > 0;
    });
    hiders.forEach(function (h) { io.observe(h); });
  }

  /* ---------- 3. 3本の路線 ---------- */
  var lines = d.querySelector('[data-lines]');
  if (lines) {
    var pick = d.querySelector('.lines__pick');
    var btns = pick ? pick.querySelectorAll('[data-pick]') : [];
    if (pick) pick.hidden = false;
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true';
        btns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        lines.querySelectorAll('.tline').forEach(function (t) { t.classList.remove('is-on'); });
        lines.classList.toggle('is-picked', on);
        if (on) {
          b.setAttribute('aria-pressed', 'true');
          var t = lines.querySelector('.tline[data-line="' + b.getAttribute('data-pick') + '"]');
          if (t) t.classList.add('is-on');
        }
      });
    });
  }

  /* ---------- 4. 相談フォーム ---------- */
  var form = d.getElementById('consult-form');
  if (!form) return;
  form.noValidate = true;                     /* JSがあるときは、このページの言葉でエラーを出す */
  var box = d.getElementById('form-error');
  var done = d.getElementById('form-done');
  var fail = d.getElementById('form-fail');
  var demoFail = /[?&]demo=fail(&|$)/.test(window.location.search);
  var send = form.querySelector('[type="submit"]');
  var sendLabel = send ? send.textContent : '';
  var route = d.querySelector('[data-form-route]');
  var mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function valueOf(field) {
    var radio = field.querySelector('input[type="radio"]');
    if (radio) return form.querySelector('input[name="' + radio.name + '"]:checked') ? 'ok' : '';
    var el = field.querySelector('input, textarea');
    return el ? el.value.trim() : '';
  }
  function okOf(field) {
    var v = valueOf(field);
    if (!v) return false;
    var el = field.querySelector('input[type="email"]');
    return el ? mailRe.test(v) : true;
  }
  var fields = Array.prototype.slice.call(form.querySelectorAll('[data-required]'));
  function mark(field, showError) {
    var ok = okOf(field);
    var err = d.getElementById(field.id + '-err');
    field.classList.toggle('is-ok', ok);
    if (showError) {
      if (err && err.hasAttribute('data-empty')) {   /* 空のときと、形が違うときで言葉を分ける */
        err.textContent = valueOf(field) ? err.getAttribute('data-format') : err.getAttribute('data-empty');
      }
      field.classList.toggle('is-error', !ok);
      if (err) err.hidden = ok;
      field.querySelectorAll('input, textarea').forEach(function (el) {
        if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
      });
    } else if (ok) {
      field.classList.remove('is-error');
      if (err) err.hidden = true;
      field.querySelectorAll('input, textarea').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    }
    if (route) {
      var st = route.querySelector('[data-for="' + field.id + '"]');
      if (st) st.classList.toggle('is-done', ok);
      var n = route.querySelectorAll('.is-done').length;
      route.style.setProperty('--f', Math.max(0, n - 1) / 3);   /* 埋まった項目の数だけ、フォームの線も伸びる */
    }
    return ok;
  }
  fields.forEach(function (f) {
    f.addEventListener('input', function () { mark(f, f.classList.contains('is-error')); });
    f.addEventListener('change', function () { mark(f, f.classList.contains('is-error')); });
    f.addEventListener('focusout', function (e) {
      if (f.contains(e.relatedTarget)) return;
      if (valueOf(f)) mark(f, true);
    });
  });

  form.addEventListener('submit', function (e) {
    var bad = fields.filter(function (f) { return !mark(f, true); });
    if (bad.length) {
      e.preventDefault();
      e.stopPropagation();                     /* 見本ダイアログは出さず、足りない項目を示す */
      var ul = box.querySelector('ul');
      ul.innerHTML = '';
      bad.forEach(function (f) {
        var li = d.createElement('li');
        var a = d.createElement('a');
        a.href = '#' + f.id;
        a.textContent = f.getAttribute('data-label') + 'を確かめる';
        a.addEventListener('click', function (ev) {
          ev.preventDefault();
          var el = f.querySelector('input, textarea');
          if (el) el.focus();
        });
        li.appendChild(a);
        ul.appendChild(li);
      });
      box.querySelector('.form-error__h').textContent = '入力が足りない項目が ' + bad.length + ' つあります';
      box.hidden = false;
      box.focus();
      return;
    }
    /* 入力がそろったら：送信中 → 見本ダイアログ（crew-frame.js）→ 送信後（見本）または送信の失敗 */
    box.hidden = true;
    if (fail) fail.hidden = true;
    form.setAttribute('aria-busy', 'true');
    if (send) { send.disabled = true; send.textContent = '送信中…'; }
    window.setTimeout(function () {
      form.removeAttribute('aria-busy');
      var dlg = d.getElementById('ca-sample-dialog');
      if (fail && (demoFail || navigator.onLine === false)) {
        /* 送れなかったとき：入力はそのまま残し、ボタンをもう一度押せるようにする */
        if (send) { send.disabled = false; send.textContent = sendLabel; }
        fail.hidden = false;
        if (!dlg || !dlg.open) fail.focus();
        return;
      }
      form.hidden = true;
      if (route) route.hidden = true;
      done.hidden = false;
      if (!dlg || !dlg.open) done.focus();
    }, 700);
  });
  var dlg = d.getElementById('ca-sample-dialog');
  if (dlg) dlg.addEventListener('close', function () {
    window.setTimeout(function () {
      if (!done.hidden) done.focus();
      else if (fail && !fail.hidden) fail.focus();
    }, 0);
  });

  var back = d.querySelector('[data-form-back]');
  if (back) back.addEventListener('click', function () {
    done.hidden = true;
    form.hidden = false;
    if (route) route.hidden = false;
    if (send) { send.disabled = false; send.textContent = sendLabel; }
    var first = form.querySelector('input, textarea');
    if (first) first.focus();
  });
})();
