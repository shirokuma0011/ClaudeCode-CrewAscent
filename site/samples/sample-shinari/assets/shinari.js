/* しなり（架空）見本  shinari.js  v5
   1) 今日の受付：上端の帯・最初の画面の「今日は？」・週の表の今日の列に、小さな印と今日の時間を出す（端末の時刻）
   2) スマホの固定ボタン：最初の画面のボタンが見えている間と、予約の章では出さない
   3) フォーム：入力中・エラー・送信中・送信後（見本のため送信しない）の状態
   JSが動かなくても、すべての文章は読める。動きを減らす設定では動かさない（CSS側で止める）。 */
(function () {
  'use strict';
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  var HOURS = { 0: null, 1: [11, 20], 2: [11, 20], 3: [11, 20], 4: [11, 20], 5: [11, 20], 6: [10, 17] };
  var now = new Date();
  var d = now.getDay();
  var h = now.getHours() + now.getMinutes() / 60;
  var t = HOURS[d];
  var pad = function (n) { return (n < 10 ? '0' : '') + n + ':00'; };
  var state, line, big, sub;
  if (!t) {
    state = 'closed';
    line = '本日（' + WD[d] + '）は休み・次は月曜 11:00から';
    big = '本日（' + WD[d] + '）は休み';
    sub = '月曜は11時から受付';
  } else if (h < t[0]) {
    state = 'before';
    line = '本日（' + WD[d] + '）' + pad(t[0]) + '〜' + pad(t[1]) + ' 受付';
    big = '本日 <span class="num">' + pad(t[1]) + '</span>まで';
    sub = pad(t[0]) + 'から受付';
  } else if (h < t[1]) {
    state = 'open';
    line = '本日（' + WD[d] + '）' + pad(t[0]) + '〜' + pad(t[1]) + ' 受付中';
    big = '本日 <span class="num">' + pad(t[1]) + '</span>まで';
    sub = 'いま受付中';
  } else {
    state = 'after';
    var nd = (d + 1) % 7, nt = HOURS[nd];
    if (!nt) { nd = 1; nt = HOURS[1]; }
    line = '本日（' + WD[d] + '）の受付は終了・次は' + WD[nd] + '曜 ' + pad(nt[0]) + 'から';
    big = '本日の受付は終了';
    sub = WD[nd] + '曜は' + nt[0] + '時から受付';
  }
  var dateEl = document.querySelector('[data-today-date]');
  if (dateEl) dateEl.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日（' + WD[d] + '）';
  var closedLike = state === 'closed' || state === 'after';
  var bar = document.getElementById('today-bar');
  var lineEl = document.querySelector('[data-today-line]');
  if (lineEl) lineEl.textContent = line;
  if (bar && closedLike) bar.classList.add('is-closed');
  var bigEl = document.querySelector('[data-today-big]');
  var subEl = document.querySelector('[data-today-sub]');
  if (bigEl) bigEl.innerHTML = big;
  if (subEl) subEl.textContent = sub;
  var row = document.querySelector('.answers__row--today');
  if (row && closedLike) row.classList.add('is-closed');
  document.querySelectorAll('.week [data-day="' + d + '"]').forEach(function (c) { c.classList.add('is-today'); });
  var th = document.querySelector('.week th[data-day="' + d + '"]');
  if (th) { th.setAttribute('aria-current', 'date'); th.insertAdjacentHTML('beforeend', '<span class="today-tag">今日</span>'); }
  var st = document.querySelector('[data-hours-status]');
  if (st) {
    st.textContent = state === 'open' ? 'いまは受付時間内です。当日の空きは電話でお確かめください。'
      : state === 'before' ? '本日は' + pad(t[0]) + 'から受付です。'
      : state === 'after' ? '本日の受付は終了しました。' : '本日は休みです。';
    st.hidden = false;
  }

  /* 固定ボタン */
  var dock = document.querySelector('.dock');
  var acts = document.querySelector('.hero__acts');
  var reserve = document.getElementById('reserve');
  if (dock && acts && reserve && 'IntersectionObserver' in window) {
    var heroSeen = true, resSeen = false;
    var upd = function () { dock.classList.toggle('is-shown', !heroSeen && !resSeen); };
    new IntersectionObserver(function (es) { es.forEach(function (e) { heroSeen = e.isIntersecting || e.boundingClientRect.top > 0; }); upd(); }).observe(acts);
    new IntersectionObserver(function (es) { es.forEach(function (e) { resSeen = e.isIntersecting || e.boundingClientRect.top < 0; }); upd(); }, { rootMargin: '0px 0px -30% 0px' }).observe(reserve);
  } else if (dock) { dock.classList.add('is-shown'); }

  /* フォーム */
  var form = document.querySelector('.form');
  if (!form) return;
  var status = form.querySelector('[data-form-status]');
  var req = Array.prototype.slice.call(form.querySelectorAll('input[required]'));
  var okVal = function (el) {
    var v = el.value.trim();
    if (!v) return false;
    if (el.name === 'contact') return /@/.test(v) || v.replace(/[^0-9]/g, '').length >= 10;
    return true;
  };
  var showErr = function (el, on) {
    var f = el.closest('.field'); var e = document.getElementById(el.getAttribute('aria-describedby'));
    f.classList.toggle('is-error', on); if (e) e.hidden = !on;
    if (on) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  };
  var count = function () {
    var n = req.filter(okVal).length;
    status.className = 'form__status';
    status.textContent = n === req.length ? '入力できました。送る前に内容をお確かめください。' : '入力中：必須の' + req.length + 'つのうち ' + n + 'つ入力済み';
  };
  req.forEach(function (el) {
    el.addEventListener('input', function () {
      el.closest('.field').classList.toggle('is-ok', okVal(el));
      if (el.closest('.field').classList.contains('is-error') && okVal(el)) showErr(el, false);
      count();
    });
    el.addEventListener('blur', function () { if (el.value.trim() && !okVal(el)) showErr(el, true); });
  });
  /* 止めるのは、入力が足りないときと送信中の二度押しだけ。
     そろった送信は共通の枠（crew-frame.js）まで届け、見本ダイアログを出す。
     ダイアログを閉じたあと、フォームの下に「送信後」の一行を残す。 */
  var dialog = document.getElementById('ca-sample-dialog');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.classList.contains('is-sending')) { e.stopPropagation(); return; }
    var bad = req.filter(function (el) { return !okVal(el); });
    req.forEach(function (el) { showErr(el, bad.indexOf(el) > -1); });
    if (bad.length) {
      e.stopPropagation();
      status.className = 'form__status is-error';
      status.textContent = '入っていない項目が' + bad.length + 'つあります。赤い欄をお確かめください。';
      bad[0].focus();
      return;
    }
    var btn = form.querySelector('button[type="submit"]');
    form.classList.add('is-sending'); btn.setAttribute('aria-disabled', 'true');
    status.className = 'form__status';
    status.textContent = '送信しています…';
    var done = function () {
      form.classList.remove('is-sending'); btn.removeAttribute('aria-disabled');
      status.className = 'form__status is-sent';
      status.textContent = '送信後：見本のため、内容はどこにも送っていません。';
    };
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.addEventListener('close', function once() { dialog.removeEventListener('close', once); done(); });
    } else { setTimeout(done, 900); }
  }, false);
})();
