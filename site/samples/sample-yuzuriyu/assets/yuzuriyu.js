/* ゆずり湯（架空）見本  yuzuriyu.js  v2
   1) 番台の札の「本日」：今日の曜日に合わせて書き換える（月曜休み・日曜は朝湯つき）
   2) 今週の湯：十一月の替わり湯の暦から、今日の週に印を付ける（十一月以外は号の初めの週のまま）
   3) 読みものの列：前・次のボタンで横に送る（署名の動き。動きを減らす設定では即座に送る）
   4) お問い合わせ：入力中・エラー・送信中・送信後の状態。見本のため送信はしない
   JSが動かなくても、すべての文章は読め、読みものの列は横にスクロールできる。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var now = new Date();

  /* 1) 本日の営業 */
  var today = document.querySelector('[data-today]');
  if (today) {
    var d = now.getDay();
    today.innerHTML = d === 1 ? '<b>本日は休み</b>（月曜）' :
      (d === 0 ? '<b>本日</b> 朝湯8:00と15:00から' : '<b>本日</b> 15:00–24:00');
  }

  /* 2) 今週の湯 */
  var cal = document.querySelector('[data-cal]');
  if (cal && now.getFullYear() === 2026 && now.getMonth() === 10) {
    var day = now.getDate();
    var items = cal.querySelectorAll('li');
    for (var i = 0; i < items.length; i++) {
      var li = items[i];
      if (day >= +li.dataset.from && day <= +li.dataset.to) {
        li.classList.add('is-now');
        var name = li.lastChild.textContent.trim();
        var wn = document.querySelector('[data-week-name]');
        var wr = document.querySelector('[data-week-range]');
        var nx = document.querySelector('[data-week-next]');
        if (wn) wn.textContent = name;
        if (wr) wr.textContent = '11月' + li.dataset.from + '日から' + li.dataset.to + '日まで';
        if (nx) {
          var nli = items[i + 1];
          nx.textContent = nli ? '次は' + nli.dataset.from + '日から、' + nli.lastChild.textContent.trim() + '。' : '12月21日と22日は、冬至の柚子湯。';
        }
      }
    }
  } else if (cal) {
    cal.querySelector('li').classList.add('is-now');
  }

  /* 3) 読みものの列 */
  var rail = document.getElementById('rail');
  var ctrl = document.querySelector('[data-rail-ctrl]');
  if (rail && ctrl) {
    ctrl.hidden = false;
    var prev = ctrl.querySelector('[data-rail-prev]');
    var next = ctrl.querySelector('[data-rail-next]');
    var step = function () {
      var c = rail.querySelector('.card:not(.card--wide)');
      return c ? c.getBoundingClientRect().width + 28 : rail.clientWidth * 0.8;
    };
    var update = function () {
      prev.disabled = rail.scrollLeft <= 4;
      next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
    };
    prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { rail.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }); });
    rail.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* 4) お問い合わせ */
  var form = document.querySelector('form[data-sample-form]');
  if (form) {
    var status = form.querySelector('[data-form-status]');
    var submit = form.querySelector('button[type="submit"]');
    var fields = [
      { el: form.querySelector('#f-name'), err: form.querySelector('#e-name'), ok: function (v) { return v.trim().length > 0; } },
      { el: form.querySelector('#f-mail'), err: form.querySelector('#e-mail'), ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); } },
      { el: form.querySelector('#f-body'), err: form.querySelector('#e-body'), ok: function (v) { return v.trim().length > 0; } }
    ];
    var setBad = function (f, bad) {
      f.el.classList.toggle('is-bad', bad);
      f.el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      f.err.hidden = !bad;
    };
    form.addEventListener('input', function (e) {
      fields.forEach(function (f) { if (f.el === e.target && f.el.classList.contains('is-bad') && f.ok(f.el.value)) setBad(f, false); });
      if (!busy) { status.className = 'form__status'; status.textContent = '入力中です。送る前に、返信先のメールアドレスをもう一度ご確認ください。'; }
    });
    var busy = false;
    var dlg = document.getElementById('ca-sample-dialog');
    /* 止めるのは、入力が足りないときと送信中の二度押しだけ。
       正しい送信は共通の枠（crew-frame.js）まで届け、見本のダイアログを出す */
    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      var first = null;
      fields.forEach(function (f) { var bad = !f.ok(f.el.value); setBad(f, bad); if (bad && !first) first = f.el; });
      if (first) {
        e.preventDefault(); e.stopImmediatePropagation();
        status.className = 'form__status is-error';
        status.textContent = '入っていない項目があります。赤い枠の欄をご確認ください。';
        first.focus();
        return;
      }
      e.preventDefault();
      busy = true;
      submit.setAttribute('aria-disabled', 'true');
      submit.textContent = '送信中…';
      status.className = 'form__status';
      status.textContent = '';
      var done = function () {
        busy = false;
        submit.removeAttribute('aria-disabled');
        submit.textContent = '内容を送る';
        status.className = 'form__status is-done';
        status.textContent = '見本のため、内容は送信していません。入力した内容は、この画面に残っています。';
      };
      if (dlg && typeof dlg.showModal === 'function') dlg.addEventListener('close', done, { once: true });
      else window.setTimeout(done, 900);
    });
  }
})();
