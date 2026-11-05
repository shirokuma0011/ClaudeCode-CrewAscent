/* 木桶で二夏寝かせる醤油蔵 ねかせ醤油（架空）— 見本サイトの動きと注文票
   動きは1つだけ：「工程の線が、ゆっくり伸びる」（暦の線・章の縦線・届くまでの線。一度だけ）。
   注文票：用件で欄を切り替え、本数と地域から合計（税込）をその場で出す。
   入力が足りないときと送信中の二度押しだけ止め、正しい送信は共通の枠（crew-frame.js）の見本ダイアログへ渡す。
   動きを減らす設定では線は最初から伸びた状態。JS がなくても全文が読める。 */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 線が伸びる */
  var lines = $$('[data-grow]');
  if (!reduce && 'IntersectionObserver' in window && lines.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('is-wait');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -15% 0px' });
    lines.forEach(function (el) {
      el.classList.add('is-wait');
      void el.offsetWidth;
      io.observe(el);
    });
  }

  /* 注文票 */
  var form = document.querySelector('form[data-sample-form]');
  if (!form) return;
  var yen = function (n) { return n.toLocaleString('ja-JP') + '円'; };
  var out = function (k) { return form.querySelector('[data-out="' + k + '"]'); };
  var state = form.querySelector('[data-form-state]');
  var btn = form.querySelector('button[type="submit"]');
  var label = btn.querySelector('span');
  var qty = $$('input[data-price]', form);
  var area = form.querySelector('#f-area');
  var itemsErr = form.querySelector('#items-err');
  var busy = false;
  var dialog = document.getElementById('ca-sample-dialog');
  var hasDialog = !!(dialog && typeof dialog.showModal === 'function');

  function kind() { var r = form.querySelector('input[name="kind"]:checked'); return r ? r.value : 'okuru'; }

  function applyKind() {
    var k = kind();
    $$('[data-for]', form).forEach(function (g) {
      var on = g.getAttribute('data-for').split(' ').indexOf(k) > -1;
      g.hidden = !on;
      $$('input, select, textarea', g).forEach(function (el) { el.disabled = !on; });
      if (!on) g.classList.remove('is-error');
    });
    calc();
  }

  function n(el) { var v = parseInt(el.value, 10); return isNaN(v) || v < 0 ? 0 : v; }

  function calc() {
    var k = kind();
    var sub = qty.reduce(function (s, el) { return s + n(el) * (+el.getAttribute('data-price')); }, 0);
    out('sub').textContent = yen(sub);
    if (k === 'kengaku') {
      out('sub').textContent = '—';
      out('ship').textContent = 'かかりません';
      out('total').textContent = '無料';
      out('hint').textContent = '見学は月に2回、予約制・無料です。';
      return;
    }
    if (k === 'gyomu') {
      out('sub').textContent = '—';
      out('ship').textContent = '—';
      out('total').textContent = '【要確認】';
      out('hint').textContent = '業務用は1.8Lを6本から。業務用の価格と送料は【要確認】です。';
      return;
    }
    var fee = area && area.value ? +area.value : null;
    var free = sub >= 8000;
    if (fee === null) out('ship').textContent = free ? '無料' : '地域を選ぶと出ます';
    else out('ship').textContent = free ? '無料' : yen(fee);
    out('total').textContent = sub ? (free ? yen(sub) : (fee === null ? yen(sub) + '＋送料' : yen(sub + fee))) : '—';
    out('hint').textContent = free ? '8,000円以上のため、送料はかかりません。' : (sub ? 'あと' + yen(8000 - sub) + 'で送料無料です。' : '8,000円以上で送料無料です。');
  }

  function checkItems() {
    var k = kind(), msg = '';
    var total = qty.reduce(function (s, el) { return s + n(el); }, 0);
    if (k === 'okuru' && !total) msg = '本数を1本以上入れてください。';
    if (k === 'gyomu' && n(form.querySelector('#q2')) < 6) msg = '業務用は、二夏 濃口 1.8L を6本からお受けしています。';
    itemsErr.textContent = msg;
    var g = itemsErr.closest('.field');
    g.classList.toggle('is-error', !!msg);
    return msg ? [qty[k === 'gyomu' ? 1 : 0]] : [];
  }

  $$('input[name="kind"]', form).forEach(function (r) { r.addEventListener('change', applyKind); });
  $$('input, select, textarea', form).forEach(function (el) {
    var f = el.closest('.field');
    var mark = function () {
      if (f) { f.classList.add('is-typing'); if (el.checkValidity() && f.classList.contains('is-error') && !f.classList.contains('field--items')) f.classList.remove('is-error'); }
      if (el.hasAttribute('data-price') || el === area) { calc(); if (itemsErr.textContent) checkItems(); }
    };
    el.addEventListener('input', mark);
    el.addEventListener('change', mark);
    el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
  });

  form.addEventListener('submit', function (e) {
    if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }   /* 二度押しを止める */
    var bad = checkItems();
    $$('input, select, textarea', form).forEach(function (el) {
      if (el.disabled || el.hasAttribute('data-price') || el.type === 'radio') return;
      var f = el.closest('.field'); var ok = el.checkValidity();
      if (f) f.classList.toggle('is-error', !ok);
      if (!ok) bad.push(el);
    });
    if (bad.length) {
      e.preventDefault(); e.stopImmediatePropagation();
      state.className = 'slip__state is-error';
      state.textContent = '足りない項目が ' + bad.length + ' つあります。赤い文字の案内をご確認ください。';
      bad[0].focus();
      return;
    }
    /* 正しい入力: 送信中にして、共通の枠のダイアログへそのまま渡す */
    busy = true;
    btn.disabled = true; label.textContent = '送信しています…';
    state.className = 'slip__state is-busy';
    state.textContent = '送信しています。画面を閉じずにお待ちください。';
    if (!hasDialog) { e.preventDefault(); done(); }
  });

  function done() {
    busy = false;
    btn.disabled = false; label.textContent = 'この内容で送る';
    state.className = 'slip__state is-sent';
    var k = kind();
    var summary = k === 'kengaku' ? '見学のご予約（' + (form.querySelector('#f-month').value || '') + '）' : (k === 'gyomu' ? '業務用のご相談' : '取り寄せ／' + out('total').textContent);
    /* ダイアログが「見本のため行われません」と伝えるので、ここでは控えだけを出す。ダイアログがないときだけ自分で伝える */
    state.textContent = (hasDialog ? '' : 'この見本のため、送信はしていません。') + '入力した内容（' + summary + '）は、この画面に残っています。';
    state.focus();
  }
  if (hasDialog) dialog.addEventListener('close', function () { if (busy) done(); });

  applyKind();
})();
