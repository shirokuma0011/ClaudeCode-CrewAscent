/* 個別指導 つみき塾（架空） 見本サイト  tsumiki.js
   ・積み上げ（署名の動き）: 章が画面に入ったら、その章の番号の数だけ積み木を落とす（1回）
   ・蛍光ペンの帯、コース早見、年間総額の計算、FAQのタブ
   何も送信しない。JSがなくても全文が読める。 */
(function () {
  'use strict';
  var root = document.documentElement;

  /* 1回だけ「画面に入った」印を付ける */
  var targets = document.querySelectorAll('.stk, .kv, .mk[data-mk]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add('is-in'); });
  }

  /* コース早見: 学年と目的から、該当するコースを持ち上げる */
  var finder = document.querySelector('[data-finder]');
  if (finder) {
    var out = finder.querySelector('[data-finder-out]');
    var cards = { sho: document.getElementById('c-sho'), chu: document.getElementById('c-chu') };
    var extra = document.getElementById('c-extra');
    var update = function () {
      var g = finder.querySelector('input[name="grade"]:checked');
      var p = finder.querySelector('input[name="purpose"]:checked');
      if (!g || !p) return;
      var key = g.value === 'e' ? 'sho' : 'chu';
      Object.keys(cards).forEach(function (k) {
        if (!cards[k]) return;
        cards[k].classList.toggle('is-pick', k === key);
        cards[k].classList.toggle('is-dim', k !== key);
      });
      var test = p.value === 'test' && key === 'chu';
      if (extra) extra.classList.toggle('is-pick', test);
      var msg = {
        sho: { back: '小学生コース（週1回・60分）が合います。分数・割合など、つまずいた単元まで戻って始めます。',
               test: '小学生コース（週1回・60分）が合います。小学生には定期テストがないため、学校の単元テストに合わせて進めます。',
               exam: '小学生コース（週1回・60分）が合います。中学受験の専用講座はありません。中学の学習に向けた土台づくりが中心です。' },
        chu: { back: '中学生コース（週2回・80分）が合います。前の学年の単元まで戻ってから、今の単元に進みます。',
               test: '中学生コース（週2回・80分）に、テスト前の追加授業（1回80分・3,300円）を組み合わせる形が合います。',
               exam: '中学生コース（週2回・80分）が合います。受験に向けた計画は、体験のあとの面談で一緒に立てます。' }
      };
      if (out) out.textContent = msg[key][p.value];
    };
    finder.addEventListener('change', update);
    update();
  }

  /* 年間でかかる費用の例 */
  var calc = document.querySelector('[data-cost]');
  if (calc) {
    var yen = function (n) { return n.toLocaleString('ja-JP') + '円'; };
    var run = function () {
      var c = calc.querySelector('input[name="course"]:checked');
      var add = parseInt(calc.querySelector('select[name="add"]').value, 10) || 0;
      var monthly = c && c.value === 'chu' ? 22000 : 12100;
      var parts = { m: monthly * 12, n: 11000, k: 8800, a: add * 3300 };
      var total = parts.m + parts.n + parts.k + parts.a;
      Object.keys(parts).forEach(function (k) {
        var bar = calc.querySelector('.bar .' + k); if (bar) bar.style.flexGrow = String(parts[k] || 0.0001);
        var v = calc.querySelector('[data-v="' + k + '"]'); if (v) v.textContent = yen(parts[k]);
      });
      var mlabel = calc.querySelector('[data-v="mlabel"]');
      if (mlabel) mlabel.textContent = '月謝 ' + yen(monthly) + ' × 12か月';
      var alabel = calc.querySelector('[data-v="alabel"]');
      if (alabel) alabel.textContent = '追加授業 3,300円 × ' + add + '回';
      var t = calc.querySelector('[data-v="total"]'); if (t) t.textContent = yen(total);
    };
    calc.addEventListener('change', run);
    run();
  }

  /* FAQ のタブ（保護者向け／生徒向け）。JSがないときは両方を縦に並べて表示 */
  var tabs = document.querySelector('[data-tabs]');
  if (tabs) {
    var list = tabs.querySelector('[role="tablist"]');
    var btns = Array.prototype.slice.call(tabs.querySelectorAll('[role="tab"]'));
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
})();
