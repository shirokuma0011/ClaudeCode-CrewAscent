/* カリモノ屋（架空）見本  karimonoya.js  v2
   1) 品目ごとの料金のタブ（矢印キーでも移動）。JSが動かないときはタブを出さず、2つの表を縦に並べて全部読める。
   2) 目次の現在地: いま読んでいる章に、青緑の印を付ける。
   3) スマホの固定の窓口: 最初の画面のボタンが見えている間は隠し、重ならないようにする。
   4) 見積もりと予約のページのフォーム: 入力中の確認 → エラー → 送信中 → 送信後（見本・送信しない）／送れなかったとき。 */
(function () {
  'use strict';
  var d = document;

  /* 1) タブ */
  var list = d.getElementById('list');
  var tablist = list && list.querySelector('[role="tablist"]');
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        d.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tablist.hidden = false;
    list.classList.add('has-tabs');
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    select(tabs[0], false);
    window.addEventListener('beforeprint', function () { tabs.forEach(function (t) { d.getElementById(t.getAttribute('aria-controls')).hidden = false; }); });
  }

  if ('IntersectionObserver' in window) {
    /* 2) 目次の現在地 */
    var links = {};
    d.querySelectorAll('.toc a[data-toc]').forEach(function (a) { links[a.getAttribute('data-toc')] = a; });
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        if (current === id) return;
        if (current && links[current]) links[current].removeAttribute('aria-current');
        if (links[id]) {
          links[id].setAttribute('aria-current', 'true');
          var ol = links[id].closest('ol');
          if (ol && ol.scrollWidth > ol.clientWidth) ol.scrollLeft += links[id].getBoundingClientRect().left - ol.getBoundingClientRect().left - 16;
        }
        current = id;
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(links).forEach(function (id) { var s = d.getElementById(id); if (s) io.observe(s); });

    /* 3) 固定の窓口 */
    /*    入力欄が画面にある間も、同じ行き先の固定ボタンは隠す */
    var dock = d.querySelector('.dock');
    var first = d.querySelector('.hero__acts, .door__title .btn');
    var formSec = d.getElementById('form');
    if (dock && first) {
      var offFirst = true, offForm = false;
      var upd = function () { dock.classList.toggle('is-off', offFirst || offForm); };
      new IntersectionObserver(function (en) {
        offFirst = en[0].isIntersecting || en[0].boundingClientRect.top > 0; upd();
      }).observe(first);
      if (formSec) new IntersectionObserver(function (en) { offForm = en[0].isIntersecting; upd(); }).observe(formSec);
    }
  }

  /* 4) フォーム */
  var form = d.getElementById('ask-form');
  if (!form) return;
  var box = d.getElementById('form-error');
  var done = d.getElementById('form-done');
  var fail = d.getElementById('form-fail');
  var demoFail = /[?&]demo=fail(&|$)/.test(window.location.search);
  var send = form.querySelector('[type="submit"]');
  var sendLabel = send ? send.textContent : '';
  var mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var fields = Array.prototype.slice.call(form.querySelectorAll('[data-required]'));

  function valueOf(f) {
    var radio = f.querySelector('input[type="radio"]');
    if (radio) return form.querySelector('input[name="' + radio.name + '"]:checked') ? 'ok' : '';
    var el = f.querySelector('input, textarea, select');
    return el ? el.value.trim() : '';
  }
  function okOf(f) {
    var v = valueOf(f);
    if (!v) return false;
    var m = f.querySelector('input[type="email"]');
    return m ? mailRe.test(v) : true;
  }
  function mark(f, show) {
    var ok = okOf(f);
    var err = d.getElementById(f.id + '-err');
    f.classList.toggle('is-ok', ok);
    if (show) {
      if (err && err.hasAttribute('data-empty')) err.textContent = valueOf(f) ? err.getAttribute('data-format') : err.getAttribute('data-empty');
      f.classList.toggle('is-error', !ok);
      if (err) err.hidden = ok;
    } else if (ok) {
      f.classList.remove('is-error');
      if (err) err.hidden = true;
    }
    f.querySelectorAll('input:not([type="radio"])').forEach(function (el) {
      if (f.classList.contains('is-error')) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    });
    return ok;
  }
  fields.forEach(function (f) {
    f.addEventListener('input', function () { mark(f, f.classList.contains('is-error')); });
    f.addEventListener('change', function () { mark(f, f.classList.contains('is-error')); });
    f.addEventListener('focusout', function (e) { if (!f.contains(e.relatedTarget)) mark(f, false); });
  });

  form.addEventListener('submit', function (e) {
    var bad = fields.filter(function (f) { return !mark(f, true); });
    if (bad.length) {
      e.preventDefault();
      e.stopPropagation();
      var ul = box.querySelector('ul');
      ul.innerHTML = '';
      bad.forEach(function (f) {
        var li = d.createElement('li');
        var a = d.createElement('a');
        a.href = '#' + f.id;
        a.textContent = f.getAttribute('data-label') + 'を確かめる';
        a.addEventListener('click', function (ev) { ev.preventDefault(); var el = f.querySelector('input, textarea, select'); if (el) el.focus(); });
        li.appendChild(a); ul.appendChild(li);
      });
      box.querySelector('.form-error__h').textContent = '入力が足りない項目が ' + bad.length + ' つあります';
      box.hidden = false;
      box.focus();
      return;
    }
    box.hidden = true;
    fail.hidden = true;
    form.setAttribute('aria-busy', 'true');
    if (send) { send.disabled = true; send.textContent = '送信中…'; }
    window.setTimeout(function () {
      form.removeAttribute('aria-busy');
      var dlg = d.getElementById('ca-sample-dialog');
      if (demoFail || navigator.onLine === false) {
        if (send) { send.disabled = false; send.textContent = sendLabel; }
        fail.hidden = false;
        if (!dlg || !dlg.open) fail.focus();
        return;
      }
      form.hidden = true;
      done.hidden = false;
      if (!dlg || !dlg.open) done.focus();
    }, 700);
  });
  var dlg = d.getElementById('ca-sample-dialog');
  if (dlg) dlg.addEventListener('close', function () {
    window.setTimeout(function () { if (!done.hidden) done.focus(); else if (!fail.hidden) fail.focus(); }, 0);
  });
  var back = d.querySelector('[data-form-back]');
  if (back) back.addEventListener('click', function () {
    done.hidden = true;
    form.hidden = false;
    if (send) { send.disabled = false; send.textContent = sendLabel; }
    var el = form.querySelector('input, textarea');
    if (el) el.focus();
  });
})();
