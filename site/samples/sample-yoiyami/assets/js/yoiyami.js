/* よいやみ醸造（架空）見本 v5
   時間帯の色：閲覧している時刻から data-hour を <html> に付け、灯りの色と写真の色味を少しだけ替える。
   季節（柱の「冬の号」と差し色）は HTML の data-season で決めていて、ここでは触らない。
   宵の目盛り（16:00–22:00）に、いまの位置の印を出す。JS がなくても目盛りと柱の文字は読める。 */
(function () {
  'use strict';
  var root = document.documentElement;
  var d = new Date();
  var h = d.getHours() + d.getMinutes() / 60;
  var hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  var key, name, now, out = false;
  if (h >= 16 && h < 18) { key = 'yoinokuchi'; name = '宵ノ口のころ'; }
  else if (h >= 18 && h < 20) { key = 'hokage'; name = '灯影のころ'; }
  else if (h >= 20 || h < 4) { key = 'yofuke'; name = '夜更のころ'; }
  else { key = 'hiru'; name = '宵の前'; }
  if (h >= 16 && h < 22) { now = (h - 16) / 6; }
  else if (h >= 4 && h < 16) { now = 0; out = true; }
  else { now = 1; out = true; }

  var apply = function () { root.setAttribute('data-hour', key); };
  /* 写真の色味は、読み込みのあとに一度だけゆっくり替わる（動きを減らす設定ではすぐに替える） */
  if (window.requestAnimationFrame) { requestAnimationFrame(function () { requestAnimationFrame(apply); }); } else { apply(); }

  var label = 'いま <span class="num">' + hh + '</span>　<b>' + name + '</b>';
  document.querySelectorAll('[data-yoi-now]').forEach(function (el) { el.innerHTML = label; });
  document.querySelectorAll('.meter__now').forEach(function (el) {
    el.style.setProperty('--now', now.toFixed(3));
    if (out) el.classList.add('is-out');
    if (now > .62) el.classList.add('is-right');
    var em = el.querySelector('em');
    if (em) em.textContent = out ? (h < 16 && h >= 4 ? '宵の前' : '22時のあと') : 'いま ' + hh;
    el.hidden = false;
  });

  /* 知らせの登録：形を確かめ、送信中と見本の結果を出す（共通のダイアログより先に受け取る） */
  document.querySelectorAll('form.form').forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    var err = form.querySelector('.form__err');
    var status = form.querySelector('.form__status');
    var btn = form.querySelector('button[type="submit"]');
    if (!input || !btn) return;
    var label = btn.textContent;
    var ok = function () { return input.value.trim() !== '' && input.checkValidity(); };
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true' && ok()) { input.removeAttribute('aria-invalid'); if (err) err.hidden = true; }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (status) status.textContent = '';
      if (!ok()) {
        input.setAttribute('aria-invalid', 'true');
        if (err) err.hidden = false;
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      if (err) err.hidden = true;
      btn.disabled = true;
      btn.textContent = '確かめています…';
      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = label;
        if (status) status.textContent = '見本のため登録はしていません。実際には、登録の確認メールをお送りします【要確認】';
      }, 900);
    });
  });
})();
