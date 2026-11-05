/* コトワケ（架空）見本サイト v5 — 小さな道具だけ。外部へは何も送らない。
   動きは2つだけ：絞り込みで行が滑らかに入れ替わる／最初の画面で行 014 が一度だけ光る（CSS）。
   料金の数字は動かさない。動きを減らす設定では、どちらも止める */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(.2,.7,.2,1)';

  /* 行の入れ替え：位置を覚え、変えてから、差の分だけ戻して滑らせる */
  function flip(items, isShown, update) {
    if (reduce || !Element.prototype.animate) { update(); return; }
    var first = new Map();
    items.forEach(function (el) { if (isShown(el)) first.set(el, el.getBoundingClientRect().top); });
    update();
    items.forEach(function (el) {
      if (!isShown(el)) return;
      var top = el.getBoundingClientRect().top;
      if (first.has(el)) {
        var dy = first.get(el) - top;
        if (Math.abs(dy) > .5) el.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 300, easing: EASE });
      } else {
        el.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE });
      }
    });
  }

  /* スマホのメニュー（列見出し）の開閉 */
  var menuBtn = document.querySelector('.hd__menu');
  var cols = document.getElementById('cols');
  if (menuBtn && cols) {
    var setMenu = function (open) { cols.classList.toggle('is-open', open); menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    menuBtn.addEventListener('click', function () { setMenu(!cols.classList.contains('is-open')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && cols.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
    });
    cols.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }

  /* 最初の画面の台帳：列で絞り込む */
  document.querySelectorAll('.seg[data-ledger]').forEach(function (seg) {
    var ledger = document.getElementById(seg.getAttribute('data-ledger'));
    if (!ledger) return;
    var rows = Array.prototype.slice.call(ledger.querySelectorAll('.lr[data-lane]'));
    var count = document.querySelector('[data-ledger-count]');
    var buttons = seg.querySelectorAll('button[data-lane]');
    var shown = function (el) { return !el.classList.contains('is-gone'); };
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lane = btn.getAttribute('data-lane');
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        flip(rows, shown, function () {
          var n = 0;
          rows.forEach(function (r) {
            var hit = lane === 'all' || r.getAttribute('data-lane') === lane;
            r.classList.toggle('is-gone', !hit);
            if (hit) n++;
          });
          if (count) count.textContent = n;
        });
      });
    });
  });

  /* 機能：困りごとで絞り込む（ページの中だけで処理） */
  var filter = document.getElementById('need-filter');
  if (filter) {
    var boxes = filter.querySelectorAll('input[type=checkbox]');
    var items = Array.prototype.slice.call(document.querySelectorAll('.feat[data-needs]'));
    var count = document.getElementById('need-count');
    var empty = document.getElementById('need-empty');
    var reset = document.getElementById('need-reset');
    var apply = function (animate) {
      var on = [];
      boxes.forEach(function (b) { if (b.checked) on.push(b.value); });
      var run = function () {
        var n = 0;
        items.forEach(function (it) {
          var needs = it.getAttribute('data-needs').split(' ');
          var hit = !on.length || on.some(function (x) { return needs.indexOf(x) > -1; });
          it.hidden = !hit;
          if (hit) n++;
        });
        count.innerHTML = on.length ? '<span class="num">' + items.length + '</span>件のうち <span class="num">' + n + '</span>件' : '<span class="num">' + items.length + '</span>件すべて';
        empty.hidden = n > 0;
      };
      if (animate) flip(items, function (el) { return !el.hidden; }, run); else run();
    };
    boxes.forEach(function (b) { b.addEventListener('change', function () { apply(true); }); });
    reset.addEventListener('click', function () { boxes.forEach(function (b) { b.checked = false; }); apply(true); });
    apply(false);
  }

  /* 料金：月額の計算（数字は動かさず、すぐ書き換える） */
  var sim = document.getElementById('sim');
  if (sim) {
    var users = document.getElementById('sim-users');
    var books = document.getElementById('sim-books');
    var support = document.getElementById('sim-support');
    var outPlan = document.getElementById('sim-plan');
    var outMonth = document.getElementById('sim-month');
    var outFirst = document.getElementById('sim-first');
    var outYear = document.getElementById('sim-year');
    var outMsg = document.getElementById('sim-msg');
    var yen = function (n) { return Math.round(n).toLocaleString('ja-JP'); };
    var clamp = function (el) {
      var v = parseInt(el.value, 10), min = +el.min, max = +el.max;
      if (isNaN(v)) v = min; v = Math.max(min, Math.min(max, v)); el.value = v; return v;
    };
    var calc = function () {
      var u = clamp(users), b = clamp(books), s = support.checked;
      var plan, month, msg, warn = false;
      if (u <= 2 && b <= 1) { plan = 'スタータープラン'; month = 1100; msg = '台帳1つ・利用者2人までの範囲です。'; }
      else if (u <= 10 && b <= 5) { plan = 'スタンダードプラン'; month = 3300; msg = '台帳5つ・利用者10人まで。予約受付ページが含まれます。'; }
      else { plan = 'スタンダードプラン＋ご相談'; month = 3300; warn = true; msg = 'スタンダードプランの上限（台帳5つ・利用者10人）を超えています。表示の月額は上限までの金額です。超える分は、資料請求・お問い合わせからご相談ください（見本上の設定）。'; }
      var once = s ? 11000 : 0;
      outPlan.textContent = plan;
      outMonth.textContent = yen(month);
      outFirst.textContent = yen(month + once) + '円';
      outYear.textContent = yen(month * 12 + once) + '円';
      outMsg.textContent = msg;
      outMsg.classList.toggle('warn', warn);
      cells.forEach(function (c) { c.classList.toggle('is-on', +c.getAttribute('data-u') === u && +c.getAttribute('data-b') === b); });
    };
    /* 月額の早見：マスを押すと、その数で計算する */
    var cells = Array.prototype.slice.call(document.querySelectorAll('.qg__c'));
    cells.forEach(function (c) {
      c.addEventListener('click', function () {
        users.value = c.getAttribute('data-u');
        books.value = c.getAttribute('data-b');
        calc();
        var t = document.getElementById('sim-title');
        if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      });
    });
    sim.querySelectorAll('[data-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = document.getElementById(btn.getAttribute('data-for'));
        el.value = (parseInt(el.value, 10) || 0) + parseInt(btn.getAttribute('data-step'), 10);
        calc();
      });
    });
    [users, books].forEach(function (el) {
      el.addEventListener('input', function () { if (el.value !== '') calc(); });
      el.addEventListener('change', calc);
    });
    support.addEventListener('change', calc);
    calc();
  }

  /* 問い合わせ：用件の切り替えと、送る前の入力確認（見本のため送信はしない） */
  var form = document.getElementById('ask-form');
  if (form) {
    var kinds = form.querySelectorAll('input[name="kind"]');
    var msgRow = document.getElementById('fr-msg');
    var msgTag = document.getElementById('msg-tag');
    var alertBox = document.getElementById('form-alert');
    var setKind = function () {
      var v = (form.querySelector('input[name="kind"]:checked') || {}).value;
      var need = v !== 'doc';
      msgRow.setAttribute('data-required', need ? '1' : '0');
      msgTag.textContent = need ? '必須' : '任意';
      msgTag.className = need ? 'req' : 'opt';
    };
    kinds.forEach(function (k) { k.addEventListener('change', setKind); });
    var h = location.hash.replace('#', '');
    if (h === 'doc' || h === 'ask') { var t = form.querySelector('input[name="kind"][value="' + (h === 'doc' ? 'doc' : 'question') + '"]'); if (t) t.checked = true; }
    setKind();
    var sendBtn = document.getElementById('ask-send');
    var sendLabel = sendBtn ? sendBtn.innerHTML : '';
    var passing = false, sending = false;
    form.addEventListener('submit', function (e) {
      /* 2回目：送信中の表示を終えたので、見本の案内（crew-frame）へ渡す */
      if (passing) { passing = false; return; }
      if (sending) { e.preventDefault(); e.stopPropagation(); return; }
      var bad = [];
      form.querySelectorAll('.fr[data-required]').forEach(function (row) {
        var f = row.querySelector('input, textarea');
        var need = row.getAttribute('data-required') === '1';
        var v = f ? f.value.trim() : '';
        var ok = !need || (v && (f.type !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)));
        row.classList.toggle('is-err', !ok);
        if (f) f.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok) bad.push(f);
      });
      if (bad.length) {
        e.preventDefault();
        e.stopPropagation();
        alertBox.textContent = '送れませんでした。入力が足りない項目が ' + bad.length + ' つあります。赤い枠の項目を確かめてください。';
        alertBox.classList.add('is-on');
        bad[0].focus();
      } else {
        alertBox.classList.remove('is-on');
        /* 1回目：ボタンを「送信しています」にして二度押しを防ぐ */
        e.preventDefault();
        e.stopPropagation();
        if (!sendBtn) return;
        sending = true;
        sendBtn.setAttribute('aria-disabled', 'true');
        sendBtn.textContent = '送信しています…';
        setTimeout(function () {
          sending = false;
          sendBtn.removeAttribute('aria-disabled');
          sendBtn.innerHTML = sendLabel;
          passing = true;
          if (form.requestSubmit) form.requestSubmit(sendBtn);
          else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }, 600);
      }
    });
  }
})();
