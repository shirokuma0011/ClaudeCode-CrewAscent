/* 車検と整備の町工場 わだち自動車（架空）— 見本サイトの動き
   動きは1つだけ：比較表の行（と、選んだ大きさの列）が静かに強調される。
   ほか：見積もり依頼票の状態（入力中・エラー・送信中・送信後）。JS がなくても全文が読める。 */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 比較表：列の強調（触れた列・選んだ大きさの列） */
  $$('table[data-cols]').forEach(function (t) {
    var picked = 0;
    function mark(i) {
      $$('tr', t).forEach(function (tr) {
        Array.prototype.forEach.call(tr.children, function (c, j) { c.classList.toggle('is-col', i > 0 && j === i); });
      });
    }
    t.addEventListener('mouseover', function (e) {
      var c = e.target.closest('td, thead th'); if (!c || !t.contains(c)) return;
      var i = Array.prototype.indexOf.call(c.parentNode.children, c); mark(i || picked);
    });
    t.addEventListener('mouseleave', function () { mark(picked); });
    var pick = document.querySelector('[data-pick]');
    if (pick) pick.addEventListener('change', function (e) {
      if (e.target.name !== 'size') return;
      picked = +e.target.value; mark(picked);
    });
  });

  /* 見積もり依頼票：入力中・エラー・送信中・送信後（見本のため送信しない） */
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.textContent : '';
    var busy = false;
    var dialog = document.getElementById('ca-sample-dialog');
    function fieldOf(el) { return el.closest('.field'); }
    form.setAttribute('novalidate', '');
    $$('input, textarea', form).forEach(function (el) {
      var f = fieldOf(el);
      el.addEventListener('input', function () {
        if (state && state.classList.contains('is-sent')) { state.className = 'form__state'; state.textContent = ''; }
        if (!f) return;
        f.classList.add('is-typing');
        if (el.checkValidity()) f.classList.remove('is-error');
      });
      el.addEventListener('change', function () { if (f && el.checkValidity()) f.classList.remove('is-error'); });
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
    });
    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      var bad = [];
      $$('input, textarea', form).forEach(function (el) {
        var f = fieldOf(el), ok = el.checkValidity();
        if (f && !ok) f.classList.add('is-error');
        if (f && ok && el.type !== 'radio') f.classList.remove('is-error');
        if (!ok) bad.push(el);
      });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        var nf = bad.map(fieldOf).filter(function (f, i, a) { return f && a.indexOf(f) === i; }).length || bad.length;
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない欄が ' + nf + ' つあります。欄の下の案内をご確認ください。';
        bad[0].focus();
        return;
      }
      /* 正しい入力: 送信中にして、共通の枠のダイアログへ渡す（ここでは止めない） */
      busy = true;
      btn.disabled = true; btn.textContent = '送信しています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。';
      var car = (form.elements.car.value || '').trim();
      var k = form.querySelector('input[name="kind"]:checked');
      function done() {
        busy = false;
        btn.disabled = false; btn.textContent = label;
        state.className = 'form__state is-sent';
        state.textContent = '依頼票の控え：' + car + '・' + (k ? k.value : '') + '。この見本では送信していません。';
      }
      if (dialog && typeof dialog.showModal === 'function') {
        var once = function () { dialog.removeEventListener('close', once); done(); };
        dialog.addEventListener('close', once);
      } else {
        e.preventDefault();
        window.setTimeout(done, 600);
      }
    });
  });
})();
