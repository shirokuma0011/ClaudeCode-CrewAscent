/* はなしば英会話（架空）見本  hanashiba.js  v3
   1) スマホ下の固定ボタン: 最初の画面のボタンが画面の上へ消えてから出す（重ならないように）
   2) 体験の申し込みフォームの状態: 入力中 → エラー → 送信中 → 送信後（見本のため送っていないと示す）
   押した所が軽く沈む動きは CSS（.tap）だけ。JS がなくても、すべての文章は読める。 */
(function () {
  'use strict';
  var dock = document.querySelector('.dock');
  var first = document.getElementById('hero-cta');
  if (dock) {
    if (first && 'IntersectionObserver' in window) {
      /* 最初の画面のボタンが上へ消えたら出し、申し込みの章かフッターが見えたら隠す（本文と同じボタンを重ねない） */
      var passed = false, blockers = {};
      var update = function () {
        var blocked = Object.keys(blockers).some(function (k) { return blockers[k]; });
        dock.classList.toggle('is-on', passed && !blocked);
      };
      new IntersectionObserver(function (es) {
        var e = es[0];
        passed = !e.isIntersecting && e.boundingClientRect.top < 0;
        update();
      }).observe(first);
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { blockers[e.target.getAttribute('data-dock-id')] = e.isIntersecting; });
        update();
      });
      document.querySelectorAll('#apply, .site-foot').forEach(function (el, i) {
        el.setAttribute('data-dock-id', 'b' + i);
        io.observe(el);
      });
    } else {
      dock.classList.add('is-on');
    }
  }
})();
(function () {
  'use strict';
  var form = document.querySelector('form[data-sample-form]');
  if (!form) return;
  var status = form.querySelector('.form__status');
  var btn = form.querySelector('button[type="submit"]');
  var label = btn ? btn.textContent : '';
  var mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function checkField(el) {
    var field = el.closest('.field');
    var ok;
    if (el.type === 'radio') {
      ok = !!form.querySelector('input[name="' + el.name + '"]:checked');
    } else {
      var v = (el.value || '').trim();
      ok = el.required ? v.length > 0 : true;
      if (ok && el.type === 'email' && v) ok = mailRe.test(v);
    }
    if (field) field.classList.toggle('is-err', !ok);
    if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
    return ok;
  }
  function say(html) { status.innerHTML = html; status.hidden = false; }

  /* ご用件: 「質問だけ」ならクラスは任意にし、ボタンの文字を変える。#ask で開いたときは「質問だけ」から */
  var cls = form.querySelector('input[name="cls"]');
  var clsReq = form.querySelector('[data-req-trial]');
  function setKind() {
    var q = form.querySelector('input[name="kind"]:checked');
    var isQ = q && q.value === 'question';
    if (cls) cls.required = !isQ;
    if (clsReq) clsReq.textContent = isQ ? '任意' : '必須';
    if (isQ && cls) { var f = cls.closest('.field'); if (f) f.classList.remove('is-err'); }
    label = isQ ? '質問を送る' : '体験を申し込む';
    if (btn && !btn.disabled) btn.textContent = label;
  }
  if (location.hash === '#ask') {
    var qr = form.querySelector('input[name="kind"][value="question"]');
    if (qr) qr.checked = true;
  }
  form.querySelectorAll('input[name="kind"]').forEach(function (r) { r.addEventListener('change', setKind); });
  setKind();

  /* 入力中: 一度エラーになった欄は、直したところで印を消す */
  form.addEventListener('input', function (e) {
    var f = e.target.closest && e.target.closest('.field');
    if (f && f.classList.contains('is-err')) checkField(e.target);
  });
  form.addEventListener('change', function (e) {
    var f = e.target.closest && e.target.closest('.field');
    if (f && f.classList.contains('is-err')) checkField(e.target);
  });

  form.addEventListener('submit', function (e) {
    var bad = [];
    var seen = {};
    form.querySelectorAll('[required]').forEach(function (el) {
      if (el.type === 'radio') { if (seen[el.name]) return; seen[el.name] = true; }
      if (!checkField(el)) bad.push(el);
    });
    if (bad.length) {
      e.preventDefault();
      e.stopPropagation();
      say('<b>' + bad.length + 'つの欄を確かめてください。</b>赤い線の欄に、入力か選択が必要です。');
      bad[0].focus();
      return;
    }
    /* 送信中 → 送信後。送り先のない見本のため「完了」とは書かない。見本ダイアログは crew-frame.js が出す */
    form.classList.add('is-sending');
    form.setAttribute('aria-busy', 'true');
    if (btn) { btn.disabled = true; btn.textContent = '送信中…'; }
    say('<b>送信中…</b>');
    setTimeout(function () {
      form.classList.remove('is-sending');
      form.removeAttribute('aria-busy');
      if (btn) { btn.disabled = false; btn.textContent = label; }
      say('<b>見本のため、送信はしていません。</b>入力した内容は、どこにも送られず、保存もされません。');
    }, 700);
  });
})();
