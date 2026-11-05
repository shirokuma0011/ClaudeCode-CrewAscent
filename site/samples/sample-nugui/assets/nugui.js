/* ハウスクリーニング ぬぐい（見本・架空）
   1) 見取り図の部屋を選ぶと、控えの行と合計の目安が変わる（JSがないときは、台所＋浴室の控えを表示したまま）
   2) 控えのボタンで、選んだ場所を問い合わせ欄に写す
   3) 問い合わせ欄：入力中・エラー・送信中・送信後。正しい入力は共通の枠へ渡し、見本ダイアログを出す */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var yen = function (n) { return n.toLocaleString('ja-JP'); };

  /* 1) 料金の目安 */
  var calc = document.getElementById('calc');
  if (calc) {
    var lines = document.getElementById('slip-lines');
    var sum = document.querySelector('#slip-sum b');
    var SET = 2200; /* 台所と浴室を同じ日に（25,300円）との差 */
    var row = function (name, time, price, cls) {
      var li = document.createElement('li'); if (cls) li.className = cls;
      var a = document.createElement('span'); a.textContent = name;
      var t = document.createElement('small'); t.textContent = time || '';
      var b = document.createElement('b'); b.className = 'num'; b.textContent = price;
      li.appendChild(a); li.appendChild(t); li.appendChild(b); return li;
    };
    var update = function () {
      var picked = $$('input[name="p"]:checked', calc), total = 0;
      lines.textContent = '';
      picked.forEach(function (i) {
        total += +i.dataset.price;
        lines.appendChild(row(i.dataset.name, i.dataset.time, yen(+i.dataset.price) + '円'));
      });
      var has = function (v) { return picked.some(function (i) { return i.value === v; }); };
      if (has('kitchen') && has('bath')) { total -= SET; lines.appendChild(row('台所と浴室を\u200B同じ日に', '', '−' + yen(SET) + '円', 'is-minus')); }
      var dirt = calc.querySelector('input[name="dirt"]');
      if (dirt.checked && picked.length) { var d = +dirt.dataset.price * picked.length; total += d; lines.appendChild(row('1年以上\u200B掃除していない', picked.length + 'か所', '+' + yen(d) + '円')); }
      var auto = calc.querySelector('input[name="auto"]');
      var note = calc.querySelector('[data-auto-note]');
      auto.disabled = !has('aircon'); if (auto.disabled) auto.checked = false;
      if (note) note.textContent = auto.disabled ? 'エアコンを選ぶと足せます' : '1台 +5,500円';
      if (auto.checked && has('aircon')) { total += +auto.dataset.price; lines.appendChild(row('お掃除機能付きの\u200Bエアコン', '1台', '+' + yen(+auto.dataset.price) + '円')); }
      var park = calc.querySelector('input[name="park"]');
      var approx = park.checked && picked.length;
      if (approx) { total += +park.dataset.price; lines.appendChild(row('駐車場（実費）', '', '約' + yen(+park.dataset.price) + '円')); }
      if (!picked.length) {
        var e = document.createElement('li'); e.className = 'is-empty';
        e.textContent = '見取り図の部屋を押すと、ここに足されます。'; lines.appendChild(e);
      }
      sum.textContent = (approx ? '約' : '') + yen(total);
    };
    calc.addEventListener('change', update);
    calc.addEventListener('submit', function (e) { e.preventDefault(); e.stopImmediatePropagation(); }, true); /* 計算の欄は送信しない */
    update();

    /* 2) 選んだ場所を問い合わせ欄へ */
    var carry = calc.querySelector('[data-carry]');
    if (carry) carry.addEventListener('click', function () {
      var map = { kitchen: '台所', bath: '浴室', aircon: 'エアコン' };
      var chosen = $$('input[name="p"]:checked', calc).map(function (i) { return map[i.value]; });
      $$('form.form input[name="place"]').forEach(function (c) { c.checked = chosen.indexOf(c.value) >= 0; });
      var conds = [];
      if (calc.querySelector('input[name="dirt"]').checked) conds.push('1年以上掃除していない');
      if (calc.querySelector('input[name="auto"]').checked) conds.push('お掃除機能付きエアコン');
      if (calc.querySelector('input[name="park"]').checked) conds.push('駐車場がない');
      var ta = document.getElementById('f-dirt');
      if (ta) {
        var rest = ta.value.replace(/^あてはまる条件：.*\n?/, '');
        ta.value = (conds.length ? 'あてはまる条件：' + conds.join('・') + '\n' : '') + rest;
      }
    });
  }

  /* 3) 問い合わせ欄 */
  $$('form.form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('span');
    var idle = label.textContent, idleState = state.textContent, busy = false;
    var okOf = function (f) {
      if (f.hasAttribute('data-group')) return $$('input:checked', f).length > 0;
      var el = f.querySelector('input, textarea'); return !el || el.checkValidity() && (!el.required || el.value.trim() !== '');
    };
    $$('.field', form).forEach(function (f) {
      $$('input, textarea', f).forEach(function (el) {
        el.addEventListener('input', function () {
          if (el.type !== 'checkbox') f.classList.add('is-typing');
          if (okOf(f)) f.classList.remove('is-error');
          if (state.classList.contains('is-sent') || state.classList.contains('is-error')) { state.className = 'form__state'; state.textContent = idleState; }
        });
        el.addEventListener('change', function () { if (okOf(f)) f.classList.remove('is-error'); });
        el.addEventListener('blur', function () { f.classList.remove('is-typing'); });
      });
    });
    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; } /* 二度押しを止める */
      var bad = $$('.field', form).filter(function (f) {
        var need = f.hasAttribute('data-group') || f.querySelector('[required]');
        var ng = need && !okOf(f); f.classList.toggle('is-error', !!ng); return ng;
      });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + bad.length + ' つあります。赤い文字の案内をご確認ください。';
        var first = bad[0].querySelector('input, textarea'); if (first) first.focus();
        return;
      }
      /* 正しい入力：送信中にして、共通の枠（crew-frame.js）へそのまま渡す。見本ダイアログが開く */
      busy = true; btn.disabled = true; label.textContent = '送信しています…';
      state.className = 'form__state is-busy'; state.textContent = '送信しています。';
      var done = function () {
        busy = false; btn.disabled = false; label.textContent = idle;
        state.className = 'form__state is-sent';
        state.textContent = '送信後の表示です。この見本では、入力した内容をどこにも送っていません。';
      };
      var dlg = document.getElementById('ca-sample-dialog');
      if (dlg && typeof dlg.showModal === 'function') dlg.addEventListener('close', done, { once: true });
      else setTimeout(done, 600);
    }, true);
  });
})();
