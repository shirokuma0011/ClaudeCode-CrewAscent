/* =====================================================================
   ヒアリング（consult-form.html＝はじめての方 / hearing-form.html＝本格）

   ・設問はHTMLにある（tools/build-questionnaires.mjs が data/questionnaires.json から作る）
   ・表示の条件: data-show-if='{"q":"b4","in":[…]}' / '{"q":"b17","notIn":[…]}' / '{"q":"b60","filled":true}' / '{"any":[…]}'
   ・受付番号: 確認画面を開いたときに作り（CA-月日-4桁）、件名と本文に入れる。完了画面で公式LINEへ案内する
   ・Web診断36の結果: この端末に結果があっても自動では入れない。本人が「この結果を送る」を押したときだけ入れる
   ・段階表示（data-qn-mode="steps"）: 1段階ずつ表示し、進み具合を出す
   ・下書き: この端末の localStorage にだけ保存（30日）。送る操作をするまで外部へ送らない
   ・確認画面 → 送り方:
       1) CREW_CONFIG.formEndpoint があれば、そこへ送信（自前のサーバー。server/README.md）
       2) なければ、メールアプリで送る（宛先は CREW_CONFIG.email）
       3) どちらでも「回答をコピー」「テキストで保存」ができる
   ===================================================================== */
(function () {
  'use strict';
  var form = document.getElementById('qn');
  if (!form) return;
  var cfg = window.CREW_CONFIG || {};
  var track = window.crewTrack || function () {};
  var FORM = form.getAttribute('data-qn');
  var STEPS = form.getAttribute('data-qn-mode') === 'steps';
  /* v2: 2026-10-25 設問を作り直した（旧IDの下書きは別の設問を指すため読まない） */
  var KEY = 'crewAscentQuestionnaire:v2:' + FORM;
  var TTL = 30 * 24 * 60 * 60 * 1000;
  var startedAt = Date.now();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var sections = $$('[data-qn-section]', form);
  var questions = $$('[data-qn-q]', form);
  var notes = $$('[data-qn-note]', form);
  var receipt = '';
  var review = $('[data-qn-review]'), done = $('[data-qn-done]'), progress = $('[data-qn-progress]');
  var step = 0, saveTimer = 0;
  var blocked = function (v) { return !v || v === 'PUBLISH_BLOCKER'; };
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------- 値 ---------- */
  function inputs(id) { return $$('[name="' + id + '"]', form); }
  function values(id) {
    var els = inputs(id);
    var q = form.querySelector('[data-qn-q="' + id + '"]');
    if (q && q.hasAttribute('data-qn-pairs')) {
      return $$('.qn-pair', q).map(function (row) {
        var picked = row.querySelector('input:checked');
        return picked ? row.getAttribute('aria-label') + '：' + picked.value : '';
      }).filter(Boolean);
    }
    if (!els.length) return [];
    var det = form.querySelector('[name="' + id + '__detail"]');
    var withDetail = function (list) {
      var t = det && !det.disabled ? det.value.trim() : '';
      return t ? (list.length ? list : ['（未選択）']).concat(['補足: ' + t]) : list;
    };
    if (els[0].type === 'radio' || els[0].type === 'checkbox') {
      return withDetail(els.filter(function (e) { return e.checked; }).map(function (e) {
        if (e.hasAttribute('data-qn-other-toggle')) {
          var o = form.querySelector('[name="' + id + '__other"]');
          return o && o.value.trim() ? 'その他（' + o.value.trim() + '）' : 'その他';
        }
        return e.value;
      }));
    }
    var v = els[0].value.trim();
    return v ? [v] : [];
  }
  function labelOf(q) {
    var l = q.querySelector('.qn-q__label');
    if (!l) return '';
    var c = l.cloneNode(true);
    $$('.qn-req, .qn-opt-tag, .qn-multi', c).forEach(function (n) { n.remove(); });
    return c.textContent.trim();
  }

  /* ---------- 表示の条件 ---------- */
  function test(c) {
    if (c.any) return c.any.some(test);
    var v = values(c.q);
    if (c.filled) return v.length > 0;
    if (c.in) return c.in.some(function (x) { return v.indexOf(x) >= 0; });
    if (c.notIn) return !c.notIn.some(function (x) { return v.indexOf(x) >= 0; });
    return true;
  }
  function cond(el) {
    var raw = el.getAttribute('data-show-if');
    if (!raw) return true;
    try { return test(JSON.parse(raw)); } catch (e) { /* 条件が読めないときは表示する */ }
    return true;
  }
  function applyConditions() {
    notes.forEach(function (n) { n.hidden = !cond(n); });
    sections.concat(questions).forEach(function (el) {
      var on = cond(el);
      el.setAttribute('data-qn-on', on ? '1' : '0');
      $$('input, textarea, select', el).forEach(function (i) { if (i.name !== 'website') i.disabled = !on; });
    });
    questions.forEach(function (q) { if (q.getAttribute('data-qn-on') === '1') q.hidden = false; else q.hidden = true; });
    $$('[data-qn-other-toggle]', form).forEach(function (t) {
      var other = form.querySelector('[name="' + t.name + '__other"]');
      if (other) { other.hidden = !t.checked; other.disabled = !t.checked || t.disabled; }
    });
  }
  function liveSections() { return sections.filter(function (s) { return s.getAttribute('data-qn-on') !== '0'; }); }

  /* ---------- 段階 ---------- */
  function render(focus) {
    var live = liveSections();
    if (step >= live.length) step = live.length - 1;
    if (step < 0) step = 0;
    sections.forEach(function (s) {
      s.hidden = s.getAttribute('data-qn-on') === '0' || (STEPS && s !== live[step]);
    });
    if (STEPS) {
      var last = step === live.length - 1;
      $('[data-qn-prev]', form).hidden = step === 0;
      $('[data-qn-next]', form).hidden = last;
      $('[data-qn-review-btn]', form).hidden = !last;
      if (progress) {
        progress.hidden = false;
        var title = live[step].querySelector('.qn-sec__title').lastChild.textContent;
        $('[data-qn-progress-text]').textContent = '段階 ' + (step + 1) + ' / ' + live.length + '　' + title;
        $('[data-qn-progress-bar]').style.width = Math.round((step + 1) / live.length * 100) + '%';
        var toc = $('[data-qn-toc]');
        toc.innerHTML = '';
        live.forEach(function (s, i) {
          var li = document.createElement('li'), b = document.createElement('button');
          b.type = 'button'; b.className = 'qn-toc__btn' + (i === step ? ' is-current' : '');
          b.textContent = s.querySelector('.qn-sec__title').lastChild.textContent;
          if (i === step) b.setAttribute('aria-current', 'step');
          b.addEventListener('click', function () { if (i > step && !validate([live[step]])) return; step = i; render(true); save(true); });
          li.appendChild(b); toc.appendChild(li);
        });
      }
      if (focus) { var h = live[step].querySelector('.qn-sec__title'); h.focus(); h.scrollIntoView({ block: 'start', behavior: 'auto' }); window.scrollBy(0, -90); }
    }
  }

  /* ---------- 入力の確認 ---------- */
  function setError(q, msg) {
    var id = q.getAttribute('data-qn-q'), e = $('#e-' + id);
    if (e) e.textContent = msg || '';
    $$('input, textarea, select', q).forEach(function (i) { if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); });
    q.classList.toggle('is-error', !!msg);
    if (msg) q.classList.remove('is-fixed');
  }
  function validate(scope) {
    var bad = [];
    (scope || liveSections()).forEach(function (s) {
      $$('[data-qn-q]', s).forEach(function (q) {
        if (q.hidden) { setError(q, ''); return; }
        var id = q.getAttribute('data-qn-q'), v = values(id), first = $('input, textarea, select', q);
        var msg = '';
        var need = (first && first.required) || q.hasAttribute('data-qn-required');
        if (need && !v.length) msg = first && first.type === 'checkbox' && first.required ? '内容を確認し、同意にチェックを入れてください。' : (first && first.type === 'radio' ? '選んでください。' : '入力してください。');
        else if (first && first.type === 'email' && v.length && !EMAIL.test(v[0])) msg = 'メールアドレスの形を確かめてください（例: name@example.com）。';
        setError(q, msg);
        if (msg) bad.push({ q: q, s: s, label: labelOf(q) });
      });
    });
    var box = $('[data-qn-errors]', form);
    if (bad.length) {
      box.hidden = false;
      box.textContent = '入力が必要な項目があります: ' + bad.map(function (b) { return b.label; }).join('、');
      var f = $('input, textarea, select', bad[0].q); if (f) f.focus();
      return false;
    }
    box.hidden = true; box.textContent = '';
    $$('.is-fixed', form).forEach(function (q) { q.classList.remove('is-fixed'); });
    return true;
  }

  /* ---------- 下書き ---------- */
  function snapshot() {
    var data = {};
    $$('input, textarea, select', form).forEach(function (i) {
      if (!i.name || i.name === 'website') return;
      if (i.type === 'radio' || i.type === 'checkbox') { if (i.checked) (data[i.name] = data[i.name] || []).push(i.value); }
      else if (i.value) data[i.name] = i.value;
    });
    return data;
  }
  /* 入力中は少し待ってまとめて保存。段階を移るとき・ページを離れるときは、すぐ保存する */
  function writeDraft() {
    clearTimeout(saveTimer); saveTimer = 0;
    if (!done.hidden) return;   /* 送り終えたあとは保存し直さない */
    try { localStorage.setItem(KEY, JSON.stringify({ v: 2, savedAt: Date.now(), step: step, receipt: receipt, data: snapshot() })); } catch (e) { /* 保存できなくても入力は続けられる */ }
  }
  function save(now) {
    if (now) { writeDraft(); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeDraft, 300);
  }
  window.addEventListener('pagehide', function () { if (saveTimer) writeDraft(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && saveTimer) writeDraft(); });
  function restore() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw || raw.v !== 2 || !raw.data) return false;
    if (Date.now() - raw.savedAt > TTL) { try { localStorage.removeItem(KEY); } catch (e) {} return false; }
    Object.keys(raw.data).forEach(function (name) {
      var v = raw.data[name];
      inputs(name).forEach(function (i) {
        if (i.type === 'radio' || i.type === 'checkbox') i.checked = Array.isArray(v) && v.indexOf(i.value) >= 0;
        else i.value = v;
      });
    });
    step = raw.step || 0;
    if (typeof raw.receipt === 'string' && /^CA-\d{4}-\d{4}$/.test(raw.receipt)) receipt = raw.receipt;
    var d = new Date(raw.savedAt);
    var box = $('[data-qn-draft]');
    if (box) {
      $('[data-qn-draft-text]').textContent = '前回の入力（' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0') + '）を、この端末の下書きから戻しました。';
      box.hidden = false;
    }
    return true;
  }
  function clearDraft() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    form.reset(); step = 0; receipt = '';
    var box = $('[data-qn-draft]'); if (box) box.hidden = true;
    review.hidden = true; done.hidden = true; form.hidden = false; intro(true);
    prefillType(); applyConditions(); render(false);
    window.scrollTo(0, 0);
  }

  /* 診断の結果（URLの ?type= か、この端末に残る結果）があれば「この結果を送る」を出す。
     結果は端末の中にだけ置く約束なので、本人が押すまでは回答に入れない */
  function prefillType() {
    var sel = $('[data-qn-types]', form), found = $('[data-qn-shindan-found]', form);
    if (!sel || !found) return;
    var m = location.search.match(/[?&]type=([a-z0-9-]+)/);
    var slug = m ? m[1] : null;
    if (!slug) { try { var r = JSON.parse(localStorage.getItem('crewAscentResult:v1') || 'null'); if (r && typeof r.slug === 'string') slug = r.slug; } catch (e) {} }
    var opt = slug ? $('option[data-slug="' + slug + '"]', sel) : null;
    found.hidden = !opt || sel.value === opt.value;
    if (!opt) return;
    $('[data-qn-shindan-name]', found).textContent = opt.value;
    $('[data-qn-shindan-use]', found).onclick = function () {
      sel.value = opt.value; found.hidden = true; applyConditions(); save(true); sel.focus();
    };
  }

  /* 受付番号: CA-月日-4桁。LINEの宛名とフォームの回答を結びつけるためのもの（個人を表す情報は入れない） */
  function makeReceipt() {
    if (receipt) return receipt;
    var d = new Date(), n = 0;
    try { var a = new Uint16Array(1); crypto.getRandomValues(a); n = a[0] % 10000; } catch (e) { n = Math.floor(Math.random() * 10000); }
    receipt = 'CA-' + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(n).padStart(4, '0');
    return receipt;
  }

  /* ---------- 確認画面 ---------- */
  function compose() {
    var lines = [], name = values(questions[0].getAttribute('data-qn-q'))[0] || '';
    var org = values(questions[1].getAttribute('data-qn-q'))[0] || '';
    var subject = form.getAttribute('data-qn-subject') + receipt + ' ' + (org ? org + ' ' : '') + (name ? name + '様' : '');
    var now = new Date();
    lines.push(form.getAttribute('data-qn-title') + '（クルーアセント）');
    lines.push('受付番号: ' + receipt);
    lines.push('記入日時: ' + now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0'));
    lines.push('');
    liveSections().forEach(function (s) {
      var rows = [];
      $$('[data-qn-q]', s).forEach(function (q) {
        if (q.hidden) return;
        var v = values(q.getAttribute('data-qn-q'));
        if (!v.length) return;
        var text = v.join('、');
        rows.push('・' + labelOf(q) + (text.indexOf('\n') >= 0 ? '\n' + text.replace(/^/gm, '    ') : '：' + text));
      });
      if (rows.length) { lines.push('■ ' + s.querySelector('.qn-sec__title').lastChild.textContent); lines = lines.concat(rows); lines.push(''); }
    });
    lines.push('（未回答の項目は省いています）');
    var reply = '';
    questions.some(function (q) { var i = $('input[type="email"]', q); if (i && EMAIL.test(i.value.trim())) { reply = i.value.trim(); return true; } return false; });
    return { subject: subject, text: lines.join('\n'), replyTo: reply };
  }
  function showReview() {
    makeReceipt(); save(true);
    var pv = $('[data-qn-receipt-preview]'); if (pv) pv.textContent = receipt;
    var list = $('[data-qn-review-list]');
    list.innerHTML = '';
    liveSections().forEach(function (s, idx) {
      var box = document.createElement('div'); box.className = 'qn-review__sec';
      var h = document.createElement('h3'); h.textContent = s.querySelector('.qn-sec__title').lastChild.textContent;
      var edit = document.createElement('button'); edit.type = 'button'; edit.className = 'qn-review__edit'; edit.textContent = '修正する';
      edit.setAttribute('aria-label', h.textContent + 'を修正する');
      edit.addEventListener('click', function () { back(idx); });
      var head = document.createElement('div'); head.className = 'qn-review__head'; head.appendChild(h); head.appendChild(edit);
      var dl = document.createElement('dl');
      $$('[data-qn-q]', s).forEach(function (q) {
        if (q.hidden) return;
        var dt = document.createElement('dt'); dt.textContent = labelOf(q);
        var dd = document.createElement('dd'); var v = values(q.getAttribute('data-qn-q'));
        if (v.length) dd.textContent = v.join('、'); else { dd.textContent = '（未回答）'; dd.className = 'is-empty'; }
        var row = document.createElement('div'); row.appendChild(dt); row.appendChild(dd); dl.appendChild(row);
      });
      box.appendChild(head); box.appendChild(dl); list.appendChild(box);
    });
    buildSend();
    form.hidden = true; if (progress) progress.hidden = true;
    review.hidden = false; done.hidden = true; intro(false);
    var t = $('#qn-review-title'); t.focus(); t.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90);
    track('questionnaire_review', { form: FORM });
  }
  function intro(on) { $$('[data-qn-intro], [data-qn-draft]').forEach(function (el) { if (!on) el.hidden = true; else if (el.hasAttribute('data-qn-intro')) el.hidden = false; }); }
  function back(idx) {
    review.hidden = true; form.hidden = false; intro(true);
    if (STEPS) { step = typeof idx === 'number' ? idx : step; render(true); }
    else { var s = liveSections()[idx || 0]; if (s) { var h = s.querySelector('.qn-sec__title'); h.focus(); h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90); } }
  }

  /* ---------- 送り方 ---------- */
  function button(text, cls, fn) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + cls; b.textContent = text;
    b.addEventListener('click', fn); return b;
  }
  function msg(text) { $('[data-qn-send-msg]').textContent = text; }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, ng) {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy') ? ok() : ng(); } catch (e) { ng(e); } finally { t.remove(); }
    });
  }
  function showDone() {
    review.hidden = true; done.hidden = false; intro(false);
    $('[data-qn-receipt]').textContent = receipt;
    /* はじめての方で、確認PDFをメールで受け取る方 */
    if (values('a3').indexOf('メール') >= 0) {
      var after = $('[data-qn-after]');
      if (after) after.textContent = '足りない内容をメール（必要なら Zoom）で伺い、そろったら確認PDFをメールでお送りします。LINEを追加していただいた場合は、LINEでも受け付けます。';
    }
    track('questionnaire_done', { form: FORM });
    var t = $('#qn-done-title'); t.focus(); t.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90);
  }
  function buildSend() {
    var box = $('[data-qn-send-actions]'); box.innerHTML = ''; msg('');
    var c = compose(), to = blocked(cfg.email) || !EMAIL.test(cfg.email) ? '' : cfg.email;
    var endpoint = blocked(cfg.formEndpoint) ? '' : cfg.formEndpoint;
    var toEl = $('[data-qn-to]'); if (to && toEl) toEl.textContent = to;
    var full = c.subject + '\n\n' + c.text;

    if (endpoint) {
      box.appendChild(button('この内容で送信する', 'btn--primary', function (e) {
        var b = e.currentTarget; b.disabled = true; msg('送信しています…');
        fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
          body: JSON.stringify({ form: FORM, receipt: receipt, subject: c.subject, text: c.text, replyTo: c.replyTo, website: (form.website || {}).value || '', elapsed: Math.round((Date.now() - startedAt) / 1000) })
        }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || r.status); }); })
          .then(function () {
            track('questionnaire_send', { form: FORM, method: 'endpoint' });
            try { localStorage.removeItem(KEY); } catch (e2) {}
            showDone();
          })
          .catch(function () { b.disabled = false; msg('送信できませんでした。下の「メールアプリで送る」か「回答をコピー」をお使いください。'); });
      }));
    }
    var mail = button('メールアプリで送る', endpoint ? 'btn--line' : 'btn--primary', function () {
      var body = c.text, note = '';
      var href = 'mailto:' + to + '?subject=' + encodeURIComponent(c.subject) + '&body=' + encodeURIComponent(body);
      if (href.length > 1800) {
        /* 長い本文はメールアプリによって途中で切れるため、本文はコピーして貼ってもらう */
        body = '（アンケートの回答をコピーしました。この下に貼り付けて送ってください）\n\n';
        href = 'mailto:' + to + '?subject=' + encodeURIComponent(c.subject) + '&body=' + encodeURIComponent(body);
        note = '回答が長いため、本文はコピーしました。開いたメールに貼り付けて送ってください。';
        copyText(c.text).catch(function () { note = 'メールが開いたら、「回答をコピーする」で写してから貼り付けてください。'; msg(note); });
      }
      track('questionnaire_send', { form: FORM, method: 'mail' });
      window.location.href = href;
      msg((note ? note + ' ' : '') + 'メールアプリが開きます。送信が済んだら「送りました」を押してください。');
      if (!$('[data-qn-sent]', box)) {
        var sent = button('送りました', 'btn--line', function () { try { localStorage.removeItem(KEY); } catch (e) {} showDone(); });
        sent.setAttribute('data-qn-sent', ''); box.appendChild(sent);
      }
    });
    if (!to) { mail.disabled = true; mail.title = '送信先のメールアドレスは公開前に設定します'; }
    box.appendChild(mail);
    box.appendChild(button('回答をコピーする', 'btn--line', function () {
      copyText(full).then(function () { msg('回答をコピーしました。メールに貼り付けて送ってください。'); track('questionnaire_send', { form: FORM, method: 'copy' }); },
        function () { msg('コピーできませんでした。「テキストで保存する」をお使いください。'); });
    }));
    box.appendChild(button('テキストで保存する', 'btn--line', function () {
      var blob = new Blob([full], { type: 'text/plain;charset=utf-8' });
      var a = document.createElement('a'), d = new Date();
      a.href = URL.createObjectURL(blob);
      a.download = 'crewascent-' + FORM + '-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.txt';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      msg('テキストファイルを保存しました。メールに添付して送ることもできます。');
      track('questionnaire_send', { form: FORM, method: 'download' });
    }));
    if (!to && !endpoint) msg('送信先のメールアドレスは公開前に設定します。それまでは「回答をコピー」「テキストで保存」で控えを残せます。');
  }

  /* ---------- つなぐ ---------- */
  form.addEventListener('input', function () { applyConditions(); save(); });
  form.addEventListener('change', function (e) {
    applyConditions(); save();
    /* 直したところは、その場でエラーを消す。ただし高さは変えない（直後に押すボタンがずれないように）。
       上のまとめの表示は「次へ」「確認」を押したときだけ更新する */
    var q = e.target.closest && e.target.closest('[data-qn-q]');
    if (q && q.classList.contains('is-error')) {
      var id = q.getAttribute('data-qn-q'), v = values(id), first = $('input, textarea, select', q);
      var fixed = v.length && !(first && first.type === 'email' && !EMAIL.test(v[0]));
      if (fixed) { setError(q, ''); q.classList.add('is-fixed'); }
    }
    if (STEPS) render(false);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var live = liveSections();
    if (!validate(live)) {
      if (STEPS) {
        var firstBad = live.findIndex(function (s) { return s.querySelector('.is-error'); });
        if (firstBad >= 0 && firstBad !== step) { step = firstBad; render(true); validate([live[step]]); }
      }
      return;
    }
    showReview();
  });
  if (STEPS) {
    $('[data-qn-next]', form).addEventListener('click', function () {
      if (!validate([liveSections()[step]])) return;
      step += 1; render(true); save(true);
      track('questionnaire_step', { form: FORM, step: step + 1 });
    });
    $('[data-qn-prev]', form).addEventListener('click', function () { step -= 1; render(true); save(true); });
  }
  $$('[data-qn-clear]').forEach(function (b) { b.addEventListener('click', clearDraft); });
  $('[data-qn-back]').addEventListener('click', function () { back(STEPS ? step : 0); });
  $('[data-qn-receipt-copy]').addEventListener('click', function () {
    copyText(receipt).then(function () { $('[data-qn-receipt-msg]').textContent = 'コピーしました。LINEのトークに貼り付けて送ってください。'; },
      function () { $('[data-qn-receipt-msg]').textContent = 'コピーできませんでした。番号を書き写してください。'; });
  });
  var lineBtn = $('[data-qn-line]');
  if (lineBtn) lineBtn.addEventListener('click', function () { track('line_add_click', { form: FORM }); });

  var restored = restore();
  prefillType();
  applyConditions();
  render(false);
  track('questionnaire_open', { form: FORM, restored: restored });
})();
