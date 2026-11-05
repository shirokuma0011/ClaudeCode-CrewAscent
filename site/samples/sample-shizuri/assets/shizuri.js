/* サロン しずり（見本・架空）
   1) 障子の面をゆっくり引き寄せる・章の要素をゆっくり現す（動きを減らす設定では最初から表示）
   2) 問い合わせ欄: 入力中・エラー・送信中。足りないときと二度押しだけ止め、正しい送信は共通の枠のダイアログへ渡す */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var screen = document.querySelector('.fv__screen');
  var els = document.querySelectorAll('.rv');
  if (reduce || !('IntersectionObserver' in window)) {
    if (screen) screen.classList.add('is-open');
    els.forEach(function (e) { e.classList.add('is-in'); });
  } else {
    if (screen) requestAnimationFrame(function () { requestAnimationFrame(function () { screen.classList.add('is-open'); }); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  var form = document.querySelector('form[data-sample-form]');
  if (!form) return;
  var state = form.querySelector('[data-form-state]');
  var btn = form.querySelector('button[type="submit"]');
  var label = btn.querySelector('span');
  var idle = label.textContent;
  var busy = false;
  var dialog = document.getElementById('ca-sample-dialog');
  var fields = form.querySelectorAll('input, textarea');

  fields.forEach(function (el) {
    var f = el.closest('.field');
    el.addEventListener('input', function () {
      if (!f) return;
      f.classList.add('is-typing');
      if (el.type === 'radio') { f.classList.remove('is-error'); f.querySelectorAll('input').forEach(function (r) { r.removeAttribute('aria-invalid'); }); return; }
      if (el.checkValidity()) { f.classList.remove('is-error'); el.removeAttribute('aria-invalid'); }
    });
    el.addEventListener('change', function () { if (f && el.checkValidity()) f.classList.remove('is-error'); });
    el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
  });

  form.addEventListener('submit', function (e) {
    if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    var bad = [];
    fields.forEach(function (el) {
      var f = el.closest('.field'); var ok = el.checkValidity();
      if (f && (el.type !== 'radio' || el.required)) f.classList.toggle('is-error', !ok);
      if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
      if (!ok) bad.push(el);
    });
    if (bad.length) {
      e.preventDefault(); e.stopImmediatePropagation();
      var n = 0; var seen = [];
      bad.forEach(function (el) { var f = el.closest('.field'); if (seen.indexOf(f) < 0) { seen.push(f); n++; } });
      state.className = 'form__state is-error';
      state.textContent = '入力が足りない項目が ' + n + ' つあります。項目の下の案内をご確認ください。';
      bad[0].focus();
      return;
    }
    /* 正しい送信: 送信中の表示にして、共通の枠（crew-frame.js）のダイアログへそのまま渡す */
    /* 送信中の表示はボタンの文字だけ（状態の行は空にして、ダイアログの文と食い違わないようにする） */
    busy = true;
    btn.setAttribute('aria-disabled', 'true');
    label.textContent = '送っています…';
    state.className = 'form__state';
    state.textContent = '';
    var done = function () {
      busy = false; btn.removeAttribute('aria-disabled'); label.textContent = idle;
      state.className = 'form__state';
      state.textContent = 'この見本では送信していません。入力した内容は、この画面に残っています。';
      btn.focus();
    };
    if (dialog) dialog.addEventListener('close', done, { once: true });
    else setTimeout(done, 1200);
  });
})();
