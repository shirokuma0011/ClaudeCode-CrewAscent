/* ハレノマ（架空）見本  harenoma.js  v2
   1. 飾り罫「結びの線」が、画面に入ったときに1回だけフェードで現れる（動きを減らす設定では最初から表示）
   2. 見積もりの目安（料金のページ）: 人数と追加を選ぶと、見積書がその場で変わる。送信はしない
   3. 見学の予約フォーム: 入力中・エラー・送信中・送信後。正しい入力は共通の枠（crew-frame.js）の見本ダイアログへ渡す */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 1. 飾り罫 */
  var orns = $$('.orn');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { orns.forEach(function (o) { o.classList.add('is-in'); }); }
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    orns.forEach(function (o) { io.observe(o); });
  }

  /* 2. 見積もりの目安 */
  var est = document.querySelector('[data-estimator]');
  if (est) {
    var yen = function (v) { return v.toLocaleString('ja-JP'); };
    var range = est.querySelector('#e-n');
    var out = document.getElementById('e-n-out');
    var rows = document.querySelector('[data-bill-rows]');
    var total = document.querySelector('[data-bill-total]');
    var from = document.querySelector('[data-bill-from]');
    var calc = function () {
      var n = Number(range.value);
      var tier = n <= 10 ? 10 : (n <= 15 ? 15 : 20);
      var base = { 10: 440000, 15: 550000, 20: 660000 }[tier];
      var lines = [['基本料金 ' + tier + '人まで', base, false]];
      if (est.querySelector('[name="photo"]').checked) lines.push(['写真（提携先）', 88000, true]);
      if (est.querySelector('[name="gift"]').checked) lines.push(['引出物 ' + n + '人分', 3300 * n, true]);
      if (est.querySelector('[name="ext"]').checked) lines.push(['食事会の延長（30分）', 22000, false]);
      if (est.querySelector('[name="weekend"]').checked) lines.push(['土日祝の午後', 33000, false]);
      var sum = 0, hasFrom = false, html = '';
      lines.forEach(function (l) {
        sum += l[1]; if (l[2]) hasFrom = true;
        html += '<tr><th scope="row">' + l[0] + '</th><td>' + yen(l[1]) + '円' + (l[2] ? 'から' : '') + '</td></tr>';
      });
      rows.innerHTML = html;
      total.textContent = yen(sum);
      from.hidden = !hasFrom;
      out.innerHTML = '<span class="num">' + n + '</span>人';
      Array.prototype.forEach.call(document.querySelectorAll('.bill__seats [data-seat]'), function (c, i) { c.classList.toggle('is-on', i < n); });
    };
    est.addEventListener('input', calc);
    est.addEventListener('change', calc);
    calc();
  }

  /* 3. 見学の予約フォーム */
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('span');
    var idle = label.textContent;
    var busy = false;
    var fields = $$('input, select, textarea', form);
    fields.forEach(function (el) {
      var f = el.closest('.field');
      el.addEventListener('input', function () {
        if (!f) return;
        f.classList.add('is-typing');
        if (el.checkValidity()) f.classList.remove('is-error');
        if (state.classList.contains('is-sent')) { state.className = 'form__state'; state.textContent = ''; }
      });
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
    });
    /* 送信: 入力が足りないときと、送信中の二度押しだけ止める。正しい入力は crew-frame.js へ届ける */
    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      var bad = fields.filter(function (el) {
        var ok = el.checkValidity();
        var f = el.closest('.field');
        if (f) f.classList.toggle('is-error', !ok);
        return !ok;
      });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + bad.length + ' つあります。赤い文字の案内をご確認ください。';
        bad[0].focus();
        return;
      }
      busy = true;
      btn.disabled = true;
      label.textContent = '送信しています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。';
      /* ここでは止めない: 共通の枠が見本ダイアログを開く */
    }, true);
    /* ダイアログを閉じたあとに、送信後の表示へ（ダイアログと同時には出さない） */
    var dialog = document.getElementById('ca-sample-dialog');
    var finish = function () {
      if (!busy) return;
      busy = false;
      btn.disabled = false;
      label.textContent = idle;
      state.className = 'form__state is-sent';
      state.textContent = 'ありがとうございます。この見本では、内容を送信していません。入力した内容は、どこにも保存していません。';
      state.focus();
    };
    if (dialog && typeof dialog.showModal === 'function') dialog.addEventListener('close', finish);
    else form.addEventListener('submit', function (e) { e.preventDefault(); setTimeout(finish, 600); });
  });
})();
