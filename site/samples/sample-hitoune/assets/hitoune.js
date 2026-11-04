/* ひとうね農園（架空）見本  hitoune.js  v3
   1) 時刻の帯（[data-route]）が画面に入ったら、帯を伸ばして点を順に灯す（署名の動き・1回だけ）
   2) 黒板の日付の帯と営業日の表に、今日の曜日の営業を出す（端末の時刻）
   3) スマホの固定ボタンは、最初の画面のボタンと入力欄が見えていない間だけ出す
   4) 予約・相談の入力欄: 入力中・エラー・送信中・送信後（見本のため送信しない）の状態
   JSが動かなくても、すべての文章は読める。動きを減らす設定では最初から灯した状態。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* 1) 時刻の帯 */
  if (!reduce && hasIO) {
    document.querySelectorAll('[data-route]').forEach(function (el) {
      el.classList.add('is-wait');
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { el.classList.remove('is-wait'); io.disconnect(); }
      }, { threshold: 0.35 });
      io.observe(el);
    });
  }

  /* 2) 今日の営業 */
  var names = ['日', '月', '火', '水', '木', '金', '土'];
  var d = new Date().getDay();
  var li = document.querySelector('.days li[data-day="' + d + '"]');
  if (li) { li.classList.add('is-today'); li.setAttribute('aria-current', 'date'); }
  var today = document.querySelector('[data-today]');
  if (today) {
    today.innerHTML = (d === 1 || d === 2)
      ? '今日（' + names[d] + '）は直売所の休みの日。水曜の <span class="num">8:30</span> から開けます'
      : '今日（' + names[d] + '）は <span class="num">8:30</span> から、売り切れまで開けています';
  }

  /* 3) スマホの固定ボタン */
  var dock = document.querySelector('.dock');
  if (dock && hasIO) {
    var seen = new Map();
    var targets = [document.querySelector('[data-fv-cta]'), document.getElementById('form'), document.querySelector('.foot')].filter(Boolean);
    var update = function () {
      var anyVisible = false;
      seen.forEach(function (v) { if (v) anyVisible = true; });
      var past = window.scrollY > 240;
      dock.classList.toggle('is-shown', past && !anyVisible);
    };
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen.set(e.target, e.isIntersecting); });
      update();
    });
    targets.forEach(function (t) { seen.set(t, false); io2.observe(t); });
    window.addEventListener('scroll', update, { passive: true });
  }

  /* 4) 入力欄 */
  var form = document.querySelector('.form[data-sample-form]');
  if (!form) return;
  var status = form.querySelector('.form__status');
  var submit = form.querySelector('button[type="submit"]');
  var req = [form.querySelector('#f-name'), form.querySelector('#f-contact')];
  var initial = status.textContent;

  var showFor = function () {
    var kind = (form.querySelector('input[name="kind"]:checked') || {}).value;
    form.querySelectorAll('[data-for]').forEach(function (el) { el.hidden = el.getAttribute('data-for') !== kind; });
  };
  form.querySelectorAll('input[name="kind"]').forEach(function (r) { r.addEventListener('change', showFor); });
  showFor();

  var check = function (el) {
    var v = el.value.trim();
    var ok = v.length > 0;
    if (ok && el.id === 'f-contact') ok = /@/.test(v) ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : /^[0-9０-９\-－ ()]{10,}$/.test(v);
    return ok;
  };
  var mark = function (el, bad) {
    var err = document.getElementById(el.getAttribute('aria-describedby'));
    el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (err) err.hidden = !bad;
  };
  var left = function () { return req.filter(function (el) { return !check(el); }).length; };

  form.addEventListener('input', function (e) {
    if (form.dataset.state === 'sending') return;
    if (e.target.getAttribute('aria-invalid') === 'true' && check(e.target)) mark(e.target, false);
    var n = left();
    form.dataset.state = 'editing';
    status.textContent = n ? '入力中です。必須の項目は、あと' + n + 'つです。' : '入力中です。必須の項目はそろいました。';
  });

  /* 止めるのは、入力が足りないときと送信中の二度押しだけ。
     正しく入力された送信は共通の枠（crew-frame.js）に届き、見本のダイアログが出る */
  form.addEventListener('submit', function (e) {
    if (form.dataset.state === 'sending') { e.preventDefault(); e.stopImmediatePropagation(); return; }
    var bad = req.filter(function (el) { return !check(el); });
    req.forEach(function (el) { mark(el, bad.indexOf(el) > -1); });
    if (bad.length) {
      e.preventDefault(); e.stopImmediatePropagation();
      form.dataset.state = 'error';
      status.textContent = '送れませんでした。赤い枠の項目を直してください（' + bad.length + 'か所）。';
      bad[0].focus();
      return;
    }
    form.dataset.state = 'sending';
    submit.disabled = true;
    submit.textContent = '送っています…';
    status.textContent = '送っています。このままお待ちください。';
  });

  var dlg = document.getElementById('ca-sample-dialog');
  var after = function () {
    if (form.dataset.state !== 'sending') return;
    form.dataset.state = 'sent';
    submit.disabled = false;
    submit.textContent = 'この内容で送る';
    status.textContent = '見本のため、この内容は送信していません。入力した内容は、この画面に残っています。';
  };
  if (dlg) dlg.addEventListener('close', after);
  else form.addEventListener('submit', function () { setTimeout(after, 0); });
})();
