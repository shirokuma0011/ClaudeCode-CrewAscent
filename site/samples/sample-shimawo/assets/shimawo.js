/* シマヲ（架空）見本  shimawo.js  v2
   1) 署名の動き「縞」: 読み込み時に、宣言の下の縞が一段ずつ横へ流れる（1回だけ）。
      JSが動かなければ縞は最初から表示。動きを減らす設定では動かさない。
   2) 贈り物のページの相談フォーム: 入力中の確認 → エラー → 送信中 → 送信後（見本・送信しない）／送れなかったとき。 */
(function () {
  'use strict';
  var d = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && d.querySelector('.sweep')) {
    d.documentElement.classList.add('sh-anim');
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.body.classList.add('is-loaded'); }); });
  }

  var form = d.getElementById('gift-form');
  if (!form) return;
  var box = d.getElementById('form-error');
  var done = d.getElementById('form-done');
  var fail = d.getElementById('form-fail');
  var demoFail = /[?&]demo=fail(&|$)/.test(window.location.search);
  var send = form.querySelector('[type="submit"]');
  var sendLabel = send ? send.textContent : '';
  var mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var fields = Array.prototype.slice.call(form.querySelectorAll('[data-required]'));

  function valueOf(f) {
    var radio = f.querySelector('input[type="radio"]');
    if (radio) return form.querySelector('input[name="' + radio.name + '"]:checked') ? 'ok' : '';
    var el = f.querySelector('input, textarea');
    return el ? el.value.trim() : '';
  }
  function okOf(f) {
    var v = valueOf(f);
    if (!v) return false;
    var m = f.querySelector('input[type="email"]');
    return m ? mailRe.test(v) : true;
  }
  function mark(f, show) {
    var ok = okOf(f);
    var err = d.getElementById(f.id + '-err');
    f.classList.toggle('is-ok', ok);
    if (show) {
      if (err && err.hasAttribute('data-empty')) err.textContent = valueOf(f) ? err.getAttribute('data-format') : err.getAttribute('data-empty');
      f.classList.toggle('is-error', !ok);
      if (err) err.hidden = ok;
    } else if (ok) {
      f.classList.remove('is-error');
      if (err) err.hidden = true;
    }
    f.querySelectorAll('input:not([type="radio"])').forEach(function (el) {
      if (f.classList.contains('is-error')) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    });
    return ok;
  }
  fields.forEach(function (f) {
    f.addEventListener('input', function () { mark(f, f.classList.contains('is-error')); });
    f.addEventListener('change', function () { mark(f, f.classList.contains('is-error')); });
    /* 入力欄を離れたときは、合っている印だけを付ける（エラーの文は送信を押したときに出す。押す直前に位置がずれないように） */
    f.addEventListener('focusout', function (e) { if (!f.contains(e.relatedTarget)) mark(f, false); });
  });

  form.addEventListener('submit', function (e) {
    var bad = fields.filter(function (f) { return !mark(f, true); });
    if (bad.length) {
      e.preventDefault();
      e.stopPropagation();               /* 足りないときは見本ダイアログを出さず、足りない項目を示す */
      var ul = box.querySelector('ul');
      ul.innerHTML = '';
      bad.forEach(function (f) {
        var li = d.createElement('li');
        var a = d.createElement('a');
        a.href = '#' + f.id;
        a.textContent = f.getAttribute('data-label') + 'を確かめる';
        a.addEventListener('click', function (ev) { ev.preventDefault(); var el = f.querySelector('input, textarea'); if (el) el.focus(); });
        li.appendChild(a); ul.appendChild(li);
      });
      box.querySelector('.form-error__h').textContent = '入力が足りない項目が ' + bad.length + ' つあります';
      box.hidden = false;
      box.focus();
      return;
    }
    /* そろったら: 送信中 → 見本ダイアログ（crew-frame.js）→ 送信後（見本）または送れなかったとき */
    box.hidden = true;
    fail.hidden = true;
    form.setAttribute('aria-busy', 'true');
    if (send) { send.disabled = true; send.textContent = '送信中…'; }
    window.setTimeout(function () {
      form.removeAttribute('aria-busy');
      var dlg = d.getElementById('ca-sample-dialog');
      if (demoFail || navigator.onLine === false) {
        if (send) { send.disabled = false; send.textContent = sendLabel; }
        fail.hidden = false;
        if (!dlg || !dlg.open) fail.focus();
        return;
      }
      form.hidden = true;
      done.hidden = false;
      if (!dlg || !dlg.open) done.focus();
    }, 700);
  });
  var dlg = d.getElementById('ca-sample-dialog');
  if (dlg) dlg.addEventListener('close', function () {
    window.setTimeout(function () { if (!done.hidden) done.focus(); else if (!fail.hidden) fail.focus(); }, 0);
  });
  var back = d.querySelector('[data-form-back]');
  if (back) back.addEventListener('click', function () {
    done.hidden = true;
    form.hidden = false;
    if (send) { send.disabled = false; send.textContent = sendLabel; }
    var first = form.querySelector('input, textarea');
    if (first) first.focus();
  });
})();
