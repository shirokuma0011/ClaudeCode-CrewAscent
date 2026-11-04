/* 木組みの家 たてまえ工務店（架空）— 見本サイトの動き v5
   ・家づくりの流れ: 段取りの一覧を読み進めると、右の線画の家が段階に合わせて組み上がる
   ・よくある質問: 印刷するときは全部の答えを開く
   ・相談フォーム: 入力中・エラー・送信中・送信後。正しく入力された送信は共通の枠（crew-frame.js）へ渡し、見本のダイアログを出す
   動きを減らす設定・JSなし: 線画は完成形で静止。 */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 印刷のときは答えを開く */
  window.addEventListener('beforeprint', function () { $$('.faq details').forEach(function (d) { d.open = true; }); });

  /* 家づくりの流れ: 組み上がる家 */
  (function () {
    var fig = document.querySelector('.frame[data-build="stage"]');
    var steps = $$('.step[data-stage]');
    if (!fig || !steps.length) return;
    var parts = $$('[data-s]', fig);
    var now = document.querySelector('[data-now-out]');
    var current = 0;
    function setStage(n) {
      if (n === current) return;
      current = n;
      parts.forEach(function (p) { p.classList.toggle('on', Number(p.getAttribute('data-s')) <= n); });
      steps.forEach(function (s, i) { s.classList.toggle('is-now', i === n - 1); });
      var st = steps[n - 1];
      if (now && st) {
        var t = st.getAttribute('data-now').split(' — ');
        now.textContent = '';
        var b = document.createElement('b'); b.textContent = t[0]; now.appendChild(b);
        if (t[1]) now.appendChild(document.createTextNode(' — ' + t[1]));
      }
    }
    var narrow = window.matchMedia('(max-width: 700px)').matches;
    if (reduce || narrow || !('IntersectionObserver' in window)) {
      setStage(10); steps[9].classList.remove('is-now');
      if (now) now.textContent = '上棟で立ち上がった木の軸組の図です。';
      return;
    }
    setStage(1);
    var tick = false, visible = false;
    function update() {
      tick = false;
      var line = window.innerHeight * 0.55, last = 1;
      steps.forEach(function (s, i) { if (s.getBoundingClientRect().top < line) last = i + 1; });
      setStage(last);
    }
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) update(); }).observe(steps[0].parentNode);
    window.addEventListener('scroll', function () { if (visible && !tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
  })();

  /* 相談フォーム */
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.textContent : '';
    var busy = false;
    var dialog = document.getElementById('ca-sample-dialog');
    function fieldOf(el) { return el.closest('.field'); }
    form.setAttribute('novalidate', '');
    $$('input, select, textarea', form).forEach(function (el) {
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
      $$('input, select, textarea', form).forEach(function (el) {
        var f = fieldOf(el), ok = el.checkValidity();
        if (f && !ok) f.classList.add('is-error');
        if (f && ok && el.type !== 'checkbox') f.classList.remove('is-error');
        if (!ok) bad.push(el);
      });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        state.className = 'form__state is-error';
        var nf = bad.map(fieldOf).filter(function (f, i, a) { return f && a.indexOf(f) === i; }).length || bad.length;
        state.textContent = '入力が足りない項目が ' + nf + ' つあります。赤い文字の案内をご確認ください。';
        bad[0].focus();
        return;
      }
      /* 正しい入力: 送信中にして、共通の枠のダイアログへ渡す（ここでは止めない） */
      busy = true;
      btn.disabled = true; btn.textContent = '送信しています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。';
      function done() {
        busy = false;
        btn.disabled = false; btn.textContent = label;
        state.className = 'form__state is-sent';
        state.textContent = '入力はそろっています。この見本では、内容を送信していません。';
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
