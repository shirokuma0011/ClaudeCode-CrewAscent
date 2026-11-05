/* アオリ写場（架空）見本  aorishajo.js  v2
   1) スマホの固定バー：最初の画面のボタンが画面から出てから出す（重ならない）
   2) 問い合わせフォーム：入力中・エラー・送信中・送信後（見本のため送信しない）
   3) 料金ページの見積もりの目安：表の料金で足し算（数字は動かさない）
   4) 目安から問い合わせへ：選んだ内容をフォームの欄に写す
   仕上げ前後の比較は CSS だけで動く。JS がなくても、すべての文章は読める。 */
(function () {
  'use strict';
  var yen = function (n) { return n.toLocaleString('ja-JP'); };

  /* 1) 固定バー */
  var dock = document.querySelector('.dock');
  var cta = document.querySelector('[data-hero-cta]');
  if (dock) {
    if (cta && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { dock.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0); });
      }).observe(cta);
    } else { dock.classList.add('is-on'); }
  }

  /* 2) 問い合わせフォーム */
  var form = document.querySelector('form.form[data-sample-form]');
  if (form) {
    var status = form.querySelector('.form__status');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.textContent : '';
    var mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var check = function (el) {
      var v = (el.value || '').trim();
      var ok = el.required ? v.length > 0 : true;
      if (ok && el.type === 'email' && v) ok = mailRe.test(v);
      var f = el.closest('.field');
      if (f) f.classList.toggle('is-err', !ok);
      if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
      return ok;
    };
    var say = function (html) { status.innerHTML = html; status.hidden = false; };
    form.addEventListener('input', function (e) {
      var f = e.target.closest && e.target.closest('.field');
      if (f && f.classList.contains('is-err')) check(e.target);
      if (!status.hidden && !form.classList.contains('is-sending')) say('<b>入力中</b>送る前に、もう一度内容を確かめてください。');
    });
    form.addEventListener('submit', function (e) {
      var bad = [];
      form.querySelectorAll('[required]').forEach(function (el) { if (!check(el)) bad.push(el); });
      if (bad.length) {
        e.preventDefault(); e.stopPropagation();
        say('<b>' + bad.length + 'つの欄を確かめてください。</b>赤い印の欄に入力が必要です。');
        bad[0].focus();
        return;
      }
      form.classList.add('is-sending'); form.setAttribute('aria-busy', 'true');
      if (btn) { btn.disabled = true; btn.textContent = '送信中…'; }
      say('<b>送信中…</b>');
      setTimeout(function () {
        form.classList.remove('is-sending'); form.removeAttribute('aria-busy');
        if (btn) { btn.disabled = false; btn.textContent = label; }
        say('<b>見本のため、送信はしていません。</b>入力した内容はどこにも送られず、保存もされません。');
      }, 700);
    });
    /* 4) 料金ページの目安を受け取る */
    try {
      var q = new URLSearchParams(location.search);
      var est = q.get('est');
      if (est) {
        var msg = form.querySelector('#f-msg');
        if (msg && !msg.value) msg.value = '料金ページの目安：' + est.slice(0, 200);
        var kind = q.get('kind');
        var map = { half: '商品撮影', day: '商品撮影', video: '採用動画' };
        if (map[kind]) { var box = form.querySelector('input[name="what"][value="' + map[kind] + '"]'); if (box) box.checked = true; }
        if (q.get('trip') && q.get('trip') !== 'studio') { var t = form.querySelector('input[name="what"][value="出張撮影"]'); if (t) t.checked = true; }
      }
    } catch (err) { /* 受け取れなくても入力はできる */ }
  }

  /* 3) 見積もりの目安 */
  var calc = document.querySelector('[data-calc]');
  if (calc) {
    var rows = document.querySelector('[data-slip-rows]');
    var sum = document.querySelector('[data-slip-sum]');
    var note = document.querySelector('[data-slip-note]');
    var go = document.querySelector('[data-slip-go]');
    var BASE = { half: ['商品撮影・半日', 55000], day: ['商品撮影・1日', 88000], video: ['採用動画・90秒1本', 198000] };
    calc.addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); });
    var update = function () {
      var kind = calc.querySelector('input[name="kind"]:checked').value;
      calc.querySelectorAll('[data-for]').forEach(function (g) { g.hidden = g.getAttribute('data-for') !== kind; });
      var items = [[BASE[kind][0], BASE[kind][1]]];
      var notes = ['「〜」の付く料金は最低の目安です。'];
      if (kind === 'half') {
        var cuts = Math.max(1, Math.min(300, parseInt(calc.cuts.value, 10) || 20));
        if (cuts > 20) items.push(['カットを増やす（' + (cuts - 20) + '点 × 2,200円）', (cuts - 20) * 2200]);
      }
      if (kind === 'day') notes.push('1日で撮れる点数は見積書でお伝えします。');
      if (kind === 'video') {
        var len = parseInt(calc.len.value, 10);
        if (len > 90) items.push(['動画を長くする（+' + (len - 90) + '秒）', (len - 90) / 30 * 33000]);
      }
      var trip = calc.trip.value;
      if (trip === 'city') items.push(['出張撮影（市内）', 11000]);
      if (trip === 'far') { items.push(['出張撮影（市外）', 11000]); notes.push('市外の出張費は距離で見積もるため、合計に足していません（市内の11,000円だけ足しています）。'); }
      var fix = parseInt(calc.fix.value, 10);
      if (fix > 2) items.push(['3回目以降の修正（' + (fix - 2) + '回 × 5,500円）', (fix - 2) * 5500]);
      if (calc.rush.checked) items.push(['5営業日で納品（特急）', 22000]);
      var total = 0;
      rows.innerHTML = '';
      items.forEach(function (it) {
        total += it[1];
        var li = document.createElement('li');
        var a = document.createElement('span'); a.textContent = it[0];
        var b = document.createElement('b'); b.className = 'ff-s'; b.textContent = yen(it[1]) + '円';
        li.appendChild(a); li.appendChild(b); rows.appendChild(li);
      });
      sum.innerHTML = '<span class="ff-s">' + yen(total) + '</span>円〜';
      note.textContent = notes.join('');
      var est = items.map(function (it) { return it[0]; }).join('／') + '／合計の目安 ' + yen(total) + '円〜（税込）';
      go.href = 'index.html?kind=' + kind + '&trip=' + trip + '&est=' + encodeURIComponent(est) + '#contact';
    };
    calc.addEventListener('input', update);
    calc.addEventListener('change', update);
    update();
  }
})();
