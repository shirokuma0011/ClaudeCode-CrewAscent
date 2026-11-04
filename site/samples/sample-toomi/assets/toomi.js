/* とおみ事務所（架空）見本  toomi.js  v2
   1. 左の目次で、いま読んでいる章を示す（現在地の表示）。これが唯一の動き。JSがなくても目次と本文は読める
   2. 相談の予約フォーム: 入力中・エラー・送信中・送信後。正しい入力は共通の枠（crew-frame.js）の見本ダイアログへ渡す */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 1. 目次の現在地 */
  if ('IntersectionObserver' in window) {
    var links = {};
    $$('.toc a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var toc = document.querySelector('.toc');
    var shiori = toc && toc.querySelector('.toc__shiori');
    var head = toc && toc.querySelector('.toc__h');
    /* 栞: 目次の上の罫から、現在の行の下端まで垂らす（長さを変えるだけで、動きはつけない） */
    var mark = function (a) {
      if (!shiori || !head) return;
      if (!a) { shiori.style.height = '0'; return; }
      var top = head.offsetTop + head.offsetHeight;
      var li = a.parentNode;
      shiori.style.top = top + 'px';
      shiori.style.height = Math.max(0, li.offsetTop + li.offsetHeight - top) + 'px';
    };
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
        var a = links[e.target.id]; if (a) a.setAttribute('aria-current', 'true');
        mark(a || null);
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(links).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    /* 表紙と章扉が見えているあいだは、どの章にも印をつけない */
    $$('.cover, .door').forEach(function (el) { io.observe(el); });
  }

  /* 2. 相談の予約フォーム */
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('span');
    var idle = label.textContent;
    var busy = false;
    var fields = $$('input, select, textarea', form);
    var holder = function (el) { return el.closest('.field'); };
    var groupOk = function (el) {
      if (el.type !== 'radio') return el.checkValidity();
      return !!form.querySelector('input[name="' + el.name + '"]:checked');
    };
    fields.forEach(function (el) {
      var ev = (el.type === 'radio' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(ev, function () {
        var f = holder(el); if (!f) return;
        if (el.type !== 'radio') f.classList.add('is-typing');
        if (groupOk(el)) f.classList.remove('is-error');
        if (state.classList.contains('is-sent') || state.classList.contains('is-error')) { state.className = 'form__state'; state.textContent = ''; }
      });
      el.addEventListener('blur', function () { var f = holder(el); if (f) f.classList.remove('is-typing'); });
    });
    /* 入力が足りないときと、送信中の二度押しだけ止める。正しい入力は crew-frame.js（document の submit）へ届ける */
    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      var badFields = [];
      fields.forEach(function (el) {
        var f = holder(el); var ok = groupOk(el);
        if (f) { if (!ok && badFields.indexOf(f) < 0) badFields.push(f); }
      });
      $$('.field', form).forEach(function (f) { f.classList.toggle('is-error', badFields.indexOf(f) >= 0); });
      if (badFields.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + badFields.length + ' つあります。赤い文字の案内をご確認ください。';
        var first = badFields[0].querySelector('input, select, textarea'); if (first) first.focus();
        return;
      }
      busy = true;
      btn.disabled = true;
      label.textContent = '送信しています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。';
    });
    /* ダイアログを閉じたあとに、送信後の表示へ（ダイアログと同時には出さない） */
    var dialog = document.getElementById('ca-sample-dialog');
    var finish = function () {
      if (!busy) return;
      busy = false;
      btn.disabled = false;
      label.textContent = idle;
      state.className = 'form__state is-sent';
      state.textContent = 'この見本では、内容を送信していません。入力した内容は、どこにも保存していません。';
      state.focus();
    };
    if (dialog && typeof dialog.showModal === 'function') dialog.addEventListener('close', finish);
    else form.addEventListener('submit', function (e) { e.preventDefault(); setTimeout(finish, 600); });
  });
})();
