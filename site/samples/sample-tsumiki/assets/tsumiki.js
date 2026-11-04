/* 個別指導 つみき塾（架空） 見本サイト v5  tsumiki.js
   動きは1つだけ：読み進めた分だけ、階段の段が灯る（トップの4段・流れの4段）。
   ほかに、コースの早見、年間総額の計算、FAQのタブ、申し込みフォームの状態。何も送信しない。JSがなくても全文が読める。 */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* トップ：いまの段（1段目・無料体験）だけが灯る（1回だけ） */
  var first = document.querySelector('.hs__step');
  if (first) {
    if (reduce) first.classList.add('is-lit');
    else setTimeout(function () { first.classList.add('is-lit'); }, 300);
  }

  /* 流れ：読み進めた段まで灯る。左の小さな階段も同じ段まで灯る */
  var steps = $$('.g4__s');
  if (steps.length) {
    var rails = $$('.rail__s');
    var now = document.querySelector('[data-rail-now]');
    var light = function () {
      var line = window.innerHeight * 0.6, n = 0;
      steps.forEach(function (s, i) { if (s.getBoundingClientRect().top < line) n = i + 1; });
      if (n === 0) n = 1;
      steps.forEach(function (s, i) { s.classList.toggle('is-lit', i < n); });
      rails.forEach(function (r, i) { r.classList.toggle('is-lit', i < n); });
      if (now) now.textContent = 'いまは' + n + '段目';
    };
    var tick = false;
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; light(); }); } }, { passive: true });
    light();
  }

  /* コース早見：学年と困りごとから、合うコースの列に印を付ける */
  var finder = document.querySelector('[data-finder]');
  if (finder) {
    var out = finder.querySelector('[data-finder-out]');
    var msg = {
      sho: { back: '小学生コース（週1回・60分）が合います。分数・割合など、つまずいた単元まで戻って始めます。',
             test: '小学生コース（週1回・60分）が合います。小学生には定期テストがないため、学校の単元テストに合わせて進めます。',
             exam: '小学生コース（週1回・60分）が合います。中学受験の専用講座はありません。中学の学習に向けた土台づくりが中心です。' },
      chu: { back: '中学生コース（週2回・80分）が合います。前の学年の単元まで戻ってから、今の単元に進みます。',
             test: '中学生コース（週2回・80分）に、テスト前の追加授業（1回80分・3,300円）を組み合わせる形が合います。',
             exam: '中学生コース（週2回・80分）が合います。受験に向けた計画は、体験のあとの面談で一緒に立てます。' }
    };
    var update = function () {
      var g = finder.querySelector('input[name="grade"]:checked');
      var p = finder.querySelector('input[name="purpose"]:checked');
      if (!g || !p) return;
      var key = g.value === 'e' ? 'sho' : 'chu';
      ['sho', 'chu'].forEach(function (k) {
        var th = document.getElementById('c-' + k);
        if (th) { th.classList.toggle('is-pick', k === key); th.classList.toggle('is-dim', k !== key); }
        $$('[data-col="' + k + '"]', finder).forEach(function (td) { td.classList.toggle('is-dim', k !== key); });
      });
      if (out) out.textContent = msg[key][p.value];
    };
    finder.addEventListener('change', update);
    update();
  }

  /* 1年間でかかる費用の例：費用を積む階段の高さも計算し直す */
  var calc = document.querySelector('[data-cost]');
  if (calc) {
    var yen = function (n) { return n.toLocaleString('ja-JP') + '円'; };
    var run = function () {
      var c = calc.querySelector('input[name="course"]:checked');
      var add = parseInt(calc.querySelector('select[name="add"]').value, 10) || 0;
      var monthly = c && c.value === 'sho' ? 12100 : 22000;
      var parts = { m: monthly * 12, n: 11000, k: 8800, a: add * 3300 };
      var total = parts.m + parts.n + parts.k + parts.a;
      var max = 22000 * 12 + 11000 + 8800 + 8 * 3300;
      /* 1か月目は入塾金・教材費を含め、そこから毎月の月謝を積む。最後の段が追加授業 */
      $$('.climb__s', calc).forEach(function (s, i) {
        var v = i < 12 ? parts.n + parts.k + monthly * (i + 1) : total;
        s.style.setProperty('--h', (v / max * 100).toFixed(1) + '%');
      });
      ['m', 'n', 'k', 'a'].forEach(function (k) {
        var v = calc.querySelector('[data-v="' + k + '"]'); if (v) v.textContent = yen(parts[k]);
      });
      var ml = calc.querySelector('[data-v="mlabel"]'); if (ml) ml.textContent = '月謝 ' + yen(monthly) + ' × 12か月';
      var al = calc.querySelector('[data-v="alabel"]'); if (al) al.textContent = '追加授業 3,300円 × ' + add + '回';
      var t = calc.querySelector('[data-v="total"]'); if (t) t.textContent = yen(total);
    };
    calc.addEventListener('change', run);
    run();
  }

  /* FAQ のタブ（保護者向け／生徒向け）。JSがないときは両方を縦に並べて表示 */
  var tabs = document.querySelector('[data-tabs]');
  if (tabs) {
    var list = tabs.querySelector('[role="tablist"]');
    var btns = $$('[role="tab"]', tabs);
    var panels = btns.map(function (b) { return document.getElementById(b.getAttribute('aria-controls')); });
    list.hidden = false;
    var select = function (i, focus) {
      btns.forEach(function (b, j) {
        var on = i === j;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) btns[i].focus();
    };
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { select(i); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          select((i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length, true);
        }
      });
    });
    select(0);
  }

  /* 申し込みフォーム：入力中・エラー・送信中・送信後（見本のため送信しない） */
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('span').textContent;
    $$('input, select, textarea', form).forEach(function (el) {
      var f = el.closest('.field');
      el.addEventListener('input', function () { if (f) { f.classList.add('is-typing'); if (el.checkValidity()) f.classList.remove('is-error'); } });
      el.addEventListener('change', function () { if (f && el.checkValidity()) f.classList.remove('is-error'); });
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = [];
      $$('input, select, textarea', form).forEach(function (el) {
        var f = el.closest('.field'); var ok = el.checkValidity();
        if (f) f.classList.toggle('is-error', !ok);
        if (!ok) bad.push(el);
      });
      if (bad.length) {
        e.stopImmediatePropagation(); /* 入力が足りないときは、見本のダイアログを出さない */
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + bad.length + ' つあります。赤い文字の案内をご確認ください。';
        bad[0].focus();
        return;
      }
      /* 正しく入力された送信は、共通の枠（crew-frame.js）まで届き、見本のダイアログが開く */
      btn.disabled = true; btn.querySelector('span').textContent = '送信しています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。画面を閉じずにお待ちください。';
      setTimeout(function () {
        btn.disabled = false; btn.querySelector('span').textContent = label;
        state.className = 'form__state is-sent';
        state.textContent = 'この見本サイトでは、申し込みは送信していません。入力した内容は、どこにも保存されていません。';
        state.focus();
      }, 900);
    }, true);
  });
})();
