/* ムラ（架空）見本  mura.js  v2
   1) 写真の注記：番号に触れる・選ぶと、同じ内容の注記が写真の上に現れる（一覧は常に読める）
   2) ご相談のフォーム：入力中・エラー・送信中・送信後の状態（実際には送信しない）
   JS が動かなくても、注記の一覧とフォームの項目はすべて読める。 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 1) 写真の注記 */
  $$('[data-notes] .pin').forEach(function (pin) {
    var id = pin.getAttribute('aria-describedby');
    var src = id && document.getElementById(id);
    if (!src) return;
    var note = document.createElement('span');
    note.className = 'pin__note';
    note.setAttribute('aria-hidden', 'true');
    var em = src.querySelector('em, .goods__n');
    var rest = src.cloneNode(true);
    $$('b.fe', rest).forEach(function (b) { if (!b.closest('.goods__p')) b.remove(); });
    if (em) {
      var t = document.createElement('b'); t.textContent = em.textContent; note.appendChild(t);
      var e2 = rest.querySelector('em, .goods__n'); if (e2) e2.remove();
    }
    note.appendChild(document.createTextNode(rest.textContent.replace(/\s+/g, ' ').trim() + (src.closest('.goods') ? '（税込）' : '')));
    pin.appendChild(note);
    var x = parseFloat(pin.style.getPropertyValue('--x')) || 0;
    if (x > 55) pin.classList.add('pin--l');
    var hot = function (on) { src.classList.toggle('is-hot', on); };
    pin.addEventListener('mouseenter', function () { hot(true); });
    pin.addEventListener('mouseleave', function () { if (!pin.classList.contains('is-open')) hot(false); });
    pin.addEventListener('focus', function () { hot(true); });
    pin.addEventListener('blur', function () { pin.classList.remove('is-open'); hot(false); });
    pin.addEventListener('click', function () {
      var open = !pin.classList.contains('is-open');
      $$('.pin.is-open').forEach(function (p) { p.classList.remove('is-open'); });
      pin.classList.toggle('is-open', open); hot(open);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') $$('.pin.is-open').forEach(function (p) { p.classList.remove('is-open'); p.blur(); });
  });

  /* 2) ご相談のフォーム */
  var form = $('[data-form]');
  if (!form) return;
  var errsum = $('[data-errsum]', form), errlist = $('[data-errlist]', form);
  var result = $('[data-result]', form), send = $('[data-send]', form);
  var body = $('#f-body', form), count = $('[data-count]', form);
  var kind = function () { var r = $('input[name="kind"]:checked', form); return r ? r.value : 'order'; };
  var layout = function () {
    var k = kind();
    $$('[data-for]', form).forEach(function (el) { el.hidden = el.getAttribute('data-for').split(' ').indexOf(k) < 0; });
    var lab = $('label[for="f-body"]', form);
    if (lab) lab.firstChild.nodeValue = k === 'visit' ? '見たい革や、相談したいこと' : '使い方や、入れたいもの';
  };
  var valid = function (el) {
    var v = el.value.trim();
    if (el.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (el.id === 'f-body') return v.length >= 10;
    return v.length > 0;
  };
  var check = function (el) {
    var ok = valid(el), f = el.closest('.field');
    if (f) { f.classList.toggle('is-err', !ok); f.classList.toggle('is-ok', ok); }
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  };
  var reqs = function () { return $$('[data-req]', form).filter(function (el) { return !el.closest('[hidden]'); }); };
  var p = new URLSearchParams(location.search);
  if (p.get('k')) { var r = $('input[name="kind"][value="' + p.get('k') + '"]', form); if (r) r.checked = true; }
  layout();
  form.addEventListener('change', function (e) { if (e.target.name === 'kind') layout(); });
  form.addEventListener('input', function (e) {
    result.classList.remove('is-on');
    if (e.target === body && count) count.textContent = body.value.length + ' / 800字';
    if (e.target.closest('.field.is-err, .field.is-ok')) check(e.target);
  });
  form.addEventListener('focusout', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-req') && e.target.value) check(e.target); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.classList.contains('is-sending')) { e.stopPropagation(); return; }
    var bad = reqs().filter(function (el) { return !check(el); });
    errlist.innerHTML = '';
    if (bad.length) {
      bad.forEach(function (el) {
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = '#' + el.id; a.textContent = el.getAttribute('data-req'); li.appendChild(a); errlist.appendChild(li);
      });
      e.stopPropagation(); /* 足りないときは見本ダイアログを出さず、足りない項目を示す */
      errsum.classList.add('is-on'); errsum.focus();
      return;
    }
    errsum.classList.remove('is-on');
    var label = send.textContent;
    send.disabled = true; send.textContent = '送信中…'; form.classList.add('is-sending'); form.setAttribute('aria-busy', 'true');
    setTimeout(function () {
      send.disabled = false; send.textContent = label; form.classList.remove('is-sending'); form.removeAttribute('aria-busy');
      result.classList.add('is-on'); result.focus();
    }, 1100);
  });
})();
