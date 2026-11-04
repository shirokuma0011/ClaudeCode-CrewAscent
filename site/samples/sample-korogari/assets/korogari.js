/* ころがり商会（架空）見本  korogari.js  v2
   ・トップ：寸法・用途・材質から3分類を絞り込み、「該当 n／3分類」の数字だけを切り替える
   ・上端の帯：分類の色帯のうち、いま該当する分類だけを濃くする
   ・問い合わせ：入口の切り替え、依頼票の書き換え、入力中・エラー・送信中・送信後の状態
   JavaScriptが動かなくても、すべての情報と入力欄は読める。外部へは何も送らない。 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CATS = ['b', 'p', 'g'];
  var NAME = { b: 'ベアリング', p: '空圧継手', g: 'リニアガイド' };
  var RANGE = { b: [3, 50], p: [4, 12], g: [100, 1000] };
  var MAT = { steel: ['b', 'g'], sus: ['b', 'p', 'g'], brass: ['p'], resin: ['p'] };

  function bands(on) {
    $$('[data-catband]').forEach(function (band) {
      $$('span', band).forEach(function (s, i) { s.classList.toggle('is-on', on.indexOf(CATS[i]) > -1); });
    });
  }
  function num(v) {
    var m = String(v || '').replace(/[０-９．]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).replace(/,/g, '').match(/\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  /* ---------- トップ：絞り込み ---------- */
  var finder = $('[data-finder]');
  if (finder) {
    var size = $('#f-size'), use = $('#f-use'), mat = $('#f-mat');
    var countEl = $('[data-count]', finder), msg = $('[data-finder-msg]', finder), go = $('[data-finder-go]', finder);
    var items = $$('.index__item');
    var last = 3;
    var run = function () {
      var n = num(size.value), u = use.value, m = mat.value;
      var touched = n !== null || u || m;
      var hit = CATS.filter(function (c) {
        if (n !== null && (n < RANGE[c][0] || n > RANGE[c][1])) return false;
        if (u && u !== c) return false;
        if (m && MAT[m].indexOf(c) < 0) return false;
        return true;
      });
      items.forEach(function (el) {
        var c = el.getAttribute('data-cat'), ok = hit.indexOf(c) > -1;
        el.classList.toggle('is-out', touched && !ok);
        el.classList.toggle('is-hit', touched && ok);
        var st = $('[data-state]', el);
        if (st) st.textContent = !touched ? '' : ok ? 'この条件に合う分類です' : 'この条件の範囲の外です';
      });
      if (hit.length !== last) {
        countEl.classList.add('is-swap');
        setTimeout(function () { countEl.textContent = hit.length; countEl.classList.remove('is-swap'); }, 160);
        last = hit.length;
      }
      msg.textContent = !touched ? '' : hit.length ? '該当：' + hit.map(function (c) { return NAME[c]; }).join('・') + '。このまま問い合わせると、条件が入力欄に入ります。'
        : '3分類の範囲に入りません。範囲の外の寸法も、使う場所と一緒にお問い合わせください。';
      bands(touched ? hit : CATS);
      var q = [];
      if (n !== null) q.push('size=' + encodeURIComponent(size.value.trim()));
      if (hit.length === 1) q.push('cat=' + hit[0]);
      if (m) q.push('mat=' + m);
      go.setAttribute('href', 'contact.html' + (q.length ? '?' + q.join('&') : '') + '#unknown');
    };
    [size, use, mat].forEach(function (el) { el.addEventListener('input', run); el.addEventListener('change', run); });
    finder.addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); run(); });
    var qp = new URLSearchParams(location.search).get('size');
    if (qp) size.value = qp;
    run();
  } else {
    bands([]);
  }

  /* ---------- 上端の検索窓 ---------- */
  $$('[data-qsearch]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopPropagation();
      var v = $('input', f).value.trim();
      if (finder) {
        var s = $('#f-size');
        if (/回転/.test(v)) $('#f-use').value = 'b'; else if (/空気|空圧|エア/.test(v)) $('#f-use').value = 'p'; else if (/直線|まっすぐ|レール/.test(v)) $('#f-use').value = 'g';
        if (num(v) !== null) s.value = v;
        s.dispatchEvent(new Event('input'));
        finder.scrollIntoView({ block: 'start' });
        s.focus({ preventScroll: true });
      } else {
        location.href = 'index.html' + (v ? '?size=' + encodeURIComponent(v) : '') + '#finder';
      }
    });
  });

  /* 用語の説明：スマホでは閉じて始める */
  var gl = $('[data-gl]');
  if (gl && window.matchMedia('(max-width: 720px)').matches) gl.open = false;
  if (gl) $('summary', gl).addEventListener('click', function (e) { if (!window.matchMedia('(max-width: 720px)').matches) e.preventDefault(); });

  /* ---------- スマホの固定ボタン：最初の画面を過ぎてから出す ---------- */
  var dock = $('[data-dock]'), first = $('.fv, .sub-fv');
  if (dock && first && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { dock.classList.toggle('is-on', !es[0].isIntersecting); }).observe(first);
  }

  /* ---------- 問い合わせ ---------- */
  var form = $('[data-qform]');
  if (!form) return;
  var panels = $$('[data-panel]', form), dims = $$('[data-dim]', form);
  var errsum = $('[data-errsum]', form), errlist = $('[data-errlist]', form), result = $('[data-result]', form), send = $('[data-send]', form);
  var door = function () { var r = $('input[name="door"]:checked', form); return r ? r.value : 'unknown'; };
  var cat = function () { var r = $('input[name="cat"]:checked', form); return r ? r.value : ''; };
  var active = function () { return $$('[data-req]', form).filter(function (el) { return !el.closest('[hidden]'); }); };
  var set = function (k, v, empty) { var o = $('[data-out="' + k + '"]', form.parentNode); if (!o) return; o.textContent = v || empty; o.classList.toggle('empty', !v); };

  function layout() {
    var d = door(), c = cat();
    panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== d; });
    dims.forEach(function (el) { var k = el.getAttribute('data-dim'); el.hidden = k === 'any' ? !!c : k !== c; });
    $$('[data-row]', form.parentNode).forEach(function (r) { var k = r.getAttribute('data-row'); r.hidden = d === 'known' ? k !== 'part' : k === 'part'; });
    $('[data-slip-door]').textContent = d === 'known' ? '品番が分かる' : '品番が分からない';
    bands(d === 'unknown' && c ? [c] : []);
    $$('[data-req-total]').forEach(function (el) { el.textContent = active().length; });
  }
  function slip() {
    var d = door(), c = cat();
    set('part', $('#k-part').value.trim(), '未入力');
    set('cat', c ? NAME[c] : '', '分からない');
    var ds = [];
    if (c) $$('[data-dim="' + c + '"] [data-dim-f]', form).forEach(function (el) { if (el.value.trim()) ds.push(el.getAttribute('data-dim-f') + ' ' + el.value.trim() + ' mm'); });
    else if ($('#d-any').value.trim()) ds.push($('#d-any').value.trim());
    set('dims', ds.join('／'), '未入力');
    set('mat', $('#u-mat').value, '分からない');
    set('use', $('#u-use').value.trim(), '未入力');
    set('qty', (d === 'known' ? $('#k-qty') : $('#u-qty')).value.trim(), '未入力');
    set('when', $('#c-when').value.replace(/-/g, '.'), '未入力');
    set('company', $('#c-co').value.trim(), '未入力');
    var done = active().filter(function (el) { return el.value.trim(); }).length;
    $('[data-req-done]', form).textContent = done;
    result.classList.remove('is-on');
  }
  function check(el) {
    var v = el.value.trim(), ok = !!v;
    if (ok && el.hasAttribute('data-num')) ok = num(v) !== null;
    if (ok && el.hasAttribute('data-mail')) ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    var f = el.closest('.field'); if (f) f.classList.toggle('is-err', !ok);
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }
  form.addEventListener('input', function (e) { if (e.target.closest('.field.is-err')) check(e.target); slip(); });
  form.addEventListener('change', function (e) { if (e.target.name === 'door' || e.target.name === 'cat') layout(); slip(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault(); e.stopPropagation();
    var bad = active().filter(function (el) { return !check(el); });
    errlist.innerHTML = '';
    if (bad.length) {
      bad.forEach(function (el) { var li = document.createElement('li'); var a = document.createElement('a'); a.href = '#' + el.id; a.textContent = el.getAttribute('data-req'); li.appendChild(a); errlist.appendChild(li); });
      errsum.classList.add('is-on'); errsum.focus();
      return;
    }
    errsum.classList.remove('is-on');
    send.disabled = true; var label = send.textContent; send.textContent = '送信中…';
    setTimeout(function () { send.disabled = false; send.textContent = label; result.classList.add('is-on'); result.focus(); }, 1100);
  });

  /* トップの絞り込みと、#known／#unknown から来たとき */
  var p = new URLSearchParams(location.search);
  if (location.hash === '#known') $('input[name="door"][value="known"]', form).checked = true;
  if (p.get('cat') && NAME[p.get('cat')]) { var r = $('input[name="cat"][value="' + p.get('cat') + '"]', form); if (r) r.checked = true; }
  var MATN = { steel: '軸受鋼', sus: 'ステンレス', brass: '真ちゅう', resin: '樹脂' };
  if (p.get('mat') && MATN[p.get('mat')]) $('#u-mat').value = MATN[p.get('mat')];
  if (p.get('size')) {
    var c0 = p.get('cat'), target = c0 === 'b' ? '#d-d' : c0 === 'p' ? '#d-t' : c0 === 'g' ? '#d-L' : '#d-any';
    var v0 = p.get('size'); $(target).value = target === '#d-any' ? v0 : (num(v0) !== null ? String(num(v0)) : v0);
  }
  layout(); slip();
})();
