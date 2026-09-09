/* diagnosis-ui.js — 診断の操作フロー（1ページ6問方式）。
 * 計算は diagnosis-engine.js（検証済み）へ委譲し、ここではロジックを持たない。
 *
 * 通常スクリプト。file:// で直接開いても動くよう ESモジュールにしない。
 * 依存: diagnosis-data.js → diagnosis-engine.js の順で先に読み込むこと。
 *
 * 方式:
 *  - 1ページに6問を縦に並べる（16問 = 6/6/4 の3ページ、48問 = 6×8ページ）。
 *  - 回答しても自動遷移しない。ページ送りは「次へ」だけ。
 *  - 進捗は現在ページではなく実際の回答済み件数から計算する。
 *  - localStorage の構造（version/mode/currentIndex/answers）は従来のまま。
 *    currentIndex はそのページの先頭設問インデックスとして保存する。
 */
(function () {
  'use strict';
  var E = globalThis.CrewEngine;
  if (!E) throw new Error('diagnosis-engine.js を先に読み込んでください');

  var PER_PAGE = 6;
  var RESULT_KEY = 'crewAscentResult:v1';
  var STORAGE_KEY = E.STORAGE_KEY;

  // 表示順は「近い」から「近くない」。値は仕様のまま（+2 … -2）
  // v3: 対比形の設問に対して、自分との距離を答える語を使う
  var OPTIONS = [
    { v: 2,  label: 'とても近い' },
    { v: 1,  label: 'やや近い' },
    { v: 0,  label: 'どちらともいえない' },
    { v: -1, label: 'あまり近くない' },
    { v: -2, label: 'まったく近くない' },
  ];
  var CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.55 17.05 4.5 12l1.5-1.5 3.55 3.5 8-8L19.05 7.5z"/></svg>';
  var WARN_SVG = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 1 21h22zm0 5 7.5 12h-15zM11 10h2v5h-2zm0 6h2v2h-2z"/></svg>';
  var SAVE_SVG = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.55 17.05 4.5 12l1.5-1.5 3.55 3.5 8-8L19.05 7.5z"/></svg>';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var els = {
    start: document.getElementById('dg-start'),
    app: document.getElementById('dg-app'),
    resume: document.getElementById('dg-resume'),
    header: document.querySelector('.site-header'),
  };

  var state = null;      // { version, mode, currentIndex, answers, startedAt, updatedAt }
  var questions = [];    // モードに対応する設問配列
  var pageIndex = 0;     // 0-based ページ番号
  var milestone = { 25: false, 50: false, 75: false };

  if (els.app) init();

  /* ------------------------- 保存 ------------------------- */
  function readSaved() {
    try { return E.parseStoredState(localStorage.getItem(STORAGE_KEY), Date.now()); }
    catch (e) { return null; }
  }
  function save() {
    if (!state) return;
    state.currentIndex = pageIndex * PER_PAGE; // ページ先頭の設問インデックス
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 保存不可でも継続 */ }
  }
  function clearSaved() { try { localStorage.removeItem(STORAGE_KEY); } catch (e) {} }

  /* ------------------------- 起動 ------------------------- */
  function init() {
    var saved = readSaved();
    if (saved && Object.keys(saved.answers).length > 0 && els.resume) {
      showResume(saved);
    }
    var starters = document.querySelectorAll('[data-start-mode]');
    Array.prototype.forEach.call(starters, function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-start-mode');
        track('diagnosis_mode_select', { mode: mode });
        var prev = readSaved();
        if (prev && prev.mode !== mode && Object.keys(prev.answers).length > 0) {
          // 別モードの回答がある場合、共通16問（ID1〜16）だけ引き継ぐ（従来仕様）
          var carry = confirm('別のモードの回答があります。共通する16問の回答を引き継いで開始しますか？（キャンセルで新規開始）');
          var fresh = E.makeInitialState(mode, new Date().toISOString());
          if (carry) {
            Object.keys(prev.answers).forEach(function (k) {
              if (Number(k) <= 16) fresh.answers[k] = prev.answers[k];
            });
          }
          start(mode, fresh);
          return;
        }
        start(mode, null);
      });
    });
  }

  function showResume(saved) {
    /* 件数はエンジンの出題数から取る。設問数を変えてもここを直さなくて済む */
    var total = E.getQuestionsForMode(saved.mode).length;
    var modeLabel = (saved.mode === 'quick' ? 'かんたん診断（' : 'じっくり診断（') + total + '問）';
    var answered = Object.keys(saved.answers).length;
    els.resume.hidden = false;
    els.resume.innerHTML =
      '<div><b>前回の続きがあります。</b><br>' +
      '<span class="caption">' + modeLabel + ' ・ ' + answered + ' / ' + total + '問まで回答済み</span></div>' +
      '<div class="cta-row">' +
      '<button type="button" class="btn btn--primary btn--sm" id="dg-resume-yes">続きから</button>' +
      '<button type="button" class="btn btn--secondary btn--sm" id="dg-resume-no">最初からやり直す</button></div>';
    document.getElementById('dg-resume-yes').addEventListener('click', function () { start(saved.mode, saved); });
    document.getElementById('dg-resume-no').addEventListener('click', function () {
      if (confirm('保存された回答を削除して最初からやり直しますか？')) {
        clearSaved();
        els.resume.hidden = true;
      }
    });
  }

  function start(mode, seed) {
    state = seed || E.makeInitialState(mode, new Date().toISOString());
    state.mode = mode;
    questions = E.getQuestionsForMode(mode);
    milestone = { 25: false, 50: false, 75: false };

    // 再開位置: 最初の未回答を含むページ。全問回答済みなら最終ページ。
    var firstUn = E.firstUnansweredIndex(state.answers, mode);
    pageIndex = firstUn === -1 ? totalPages() - 1 : Math.floor(firstUn / PER_PAGE);

    if (els.start) els.start.hidden = true;
    if (els.resume) els.resume.hidden = true;
    els.app.hidden = false;
    if (els.header) {
      els.header.classList.add('site-header--focus');
      if (!els.header.querySelector('.focus-exit')) {
        var exit = document.createElement('a');
        exit.className = 'focus-exit';
        exit.href = 'index.html';
        exit.innerHTML = '<span class="long">診断をやめてトップへ戻る</span><span class="short">診断をやめる</span>';
        var inner = els.header.querySelector('.site-header__inner');
        if (inner) inner.appendChild(exit);
      }
    }
    document.body.setAttribute('data-diagnosing', 'true');

    save();
    track('diagnosis_start', { mode: mode });
    buildShell();
    renderPage(false);
    scrollToQuizTop();
  }

  function totalPages() { return Math.ceil(questions.length / PER_PAGE); }
  function pageQuestions() { return questions.slice(pageIndex * PER_PAGE, pageIndex * PER_PAGE + PER_PAGE); }
  function answeredCount() {
    var n = 0;
    for (var i = 0; i < questions.length; i++) if (E.isValidAnswer(state.answers[questions[i].id])) n++;
    return n;
  }

  /* ------------------------- 骨組み ------------------------- */
  function buildShell() {
    els.app.innerHTML =
      '<div class="dg-bar"><div class="container container--quiz dg-bar__inner">' +
      '  <div class="dg-bar__row">' +
      '    <span class="dg-bar__mode" id="dg-mode"></span>' +
      '    <span class="dg-bar__count" id="dg-count"></span>' +
      '  </div>' +
      '  <div class="dg-track"><div class="dg-fill" id="dg-fill"></div></div>' +
      '  <div id="dg-pbar" role="progressbar" class="visually-hidden" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>' +
      '</div></div>' +
      /* 回答するたびに診断上の位置が動く座標欄。性格診断ではなく優先方向を整理する作業であることを、
         画面の側からも示す。全問そろうまでは「暫定」と明記する。 */
      '<div class="dg-coord" id="dg-coord" aria-live="polite">' +
      '  <div class="container container--quiz dg-coord__in">' +
      '    <div class="dg-coord__map"><div class="dg-coord__grid" id="dg-coord-grid"></div></div>' +
      '    <div class="dg-coord__tx">' +
      '      <span class="dg-coord__lbl" id="dg-coord-lbl">回答中の方向</span>' +
      '      <p class="dg-coord__nm"><span id="dg-coord-id">--</span><span id="dg-coord-name">回答するとここに出ます</span></p>' +
      '      <dl class="dg-coord__ax">' +
      '        <div><dt>横軸</dt><dd id="dg-coord-x">- / 6</dd></div>' +
      '        <div><dt>縦軸</dt><dd id="dg-coord-y">- / 6</dd></div>' +
      '      </dl>' +
      '    </div>' +
      '  </div>' +
      '</div>' +
      '<div class="dg-page"><div class="container container--quiz">' +
      '  <div class="dg-page__head">' +
      '    <h1 id="dg-heading" tabindex="-1"></h1>' +
      '    <p class="caption" id="dg-sub"></p>' +
      '  </div>' +
      '  <form id="dg-form" novalidate><div class="q-list" id="dg-qlist"></div></form>' +
      '  <div class="dg-nav">' +
      '    <button type="button" class="btn btn--secondary" id="dg-prev">前へ</button>' +
      '    <button type="button" class="btn btn--primary" id="dg-next">次へ</button>' +
      '    <span class="dg-nav__spacer"></span>' +
      '    <button type="button" class="dg-restart" id="dg-restart">最初からやり直す</button>' +
      '  </div>' +
      '  <p class="caption" id="dg-saved-note" style="margin-top:12px"></p>' +
      '</div></div>';

    document.getElementById('dg-prev').addEventListener('click', goPrev);
    document.getElementById('dg-next').addEventListener('click', goNext);
    document.getElementById('dg-restart').addEventListener('click', function () {
      if (confirm('保存された回答を削除して最初からやり直しますか？')) { clearSaved(); location.reload(); }
    });
  }

  /* ------------------------- 描画 ------------------------- */
  function renderPage(moveFocus) {
    var qs = pageQuestions();
    var first = pageIndex * PER_PAGE + 1;
    var last = pageIndex * PER_PAGE + qs.length;
    var modeLabel = state.mode === 'quick' ? 'かんたん診断' : 'じっくり診断';

    document.getElementById('dg-mode').innerHTML =
      modeLabel + '<span>全' + questions.length + '問</span>';
    document.getElementById('dg-heading').textContent =
      'ページ ' + (pageIndex + 1) + ' / ' + totalPages();
    document.getElementById('dg-sub').textContent =
      '質問 ' + first + '〜' + last + ' / ' + questions.length +
      '　どちらともいえない、も有効な回答です。どちらを先に見せたいかで選んでください。';

    var list = document.getElementById('dg-qlist');
    list.innerHTML = '';
    qs.forEach(function (q, i) { list.appendChild(buildQuestion(q, first + i)); });
    /* 6問がまとめて入れ替わるので、入れ替わったことが分かるように短く重ねる */
    if (!reduceMotion && document.documentElement.classList.contains('motion')) {
      list.classList.remove('is-turning');
      void list.offsetWidth;                 /* 同じアニメを続けて流すための再起動 */
      list.classList.add('is-turning');
    }

    var prev = document.getElementById('dg-prev');
    prev.disabled = pageIndex === 0;
    var next = document.getElementById('dg-next');
    next.textContent = pageIndex === totalPages() - 1 ? '結果を見る' : '次へ';

    updateProgress();

    if (moveFocus) {
      var h = document.getElementById('dg-heading');
      h.focus({ preventScroll: true });
      scrollToQuizTop();
    }
  }

  /* 設問の並びの先頭へ位置を合わせる。

     以前は「診断を始める」を押しても位置を動かしていなかった。
     開始ボタンはモード比較カードの中、つまりページのかなり下にあるため、
     案内文が消えて紙面が縮んだあと、そのままの位置に取り残される。
     390pxでは最初の設問が画面の1170px上、つまり
     「操作ボタンとフッターだけが見える」状態で始まっていた。

     紙面の一番上（top: 0）へ戻すのも違う。診断中の画面は
     進捗バーと座標欄が上に貼り付く作りなので、その二つの直前、
     つまり診断領域の先頭に合わせるのが正しい。 */
  function scrollToQuizTop() {
    if (!els.app) return;
    var y = window.scrollY + els.app.getBoundingClientRect().top;
    var hdr = document.querySelector('.hdr');
    if (hdr && getComputedStyle(hdr).position === 'fixed') y -= hdr.getBoundingClientRect().height;
    y = Math.max(0, Math.round(y) - 8);
    try { window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' }); }
    catch (e) { window.scrollTo(0, y); }
  }

  function buildQuestion(q, displayNo) {
    var fs = document.createElement('fieldset');
    fs.className = 'q-item';
    fs.id = 'q-' + q.id;
    if (E.isValidAnswer(state.answers[q.id])) fs.classList.add('is-answered');

    var legend = document.createElement('legend');
    legend.className = 'q-item__legend';
    legend.id = 'qlab-' + q.id;
    var num = document.createElement('span');
    num.className = 'q-item__num';
    num.textContent = 'Q' + displayNo;
    var txt = document.createElement('span');
    // 設問カテゴリ名は表示しない（採点軸を見せて回答を誘導しないため）
    txt.textContent = q.statement;
    legend.appendChild(num);
    legend.appendChild(txt);
    fs.appendChild(legend);

    // 軸の両端ラベル。円の大小ではなく「軸のどこに置くか」で答える形にしている。
    var scale = document.createElement('div');
    scale.className = 'scale';

    var ends = document.createElement('div');
    ends.className = 'scale__ends';
    ends.setAttribute('aria-hidden', 'true');
    ends.innerHTML = '<span class="scale__end scale__end--agree">近い</span>'
                   + '<span class="scale__end scale__end--disagree">近くない</span>';
    scale.appendChild(ends);

    var opts = document.createElement('div');
    opts.className = 'scale__opts';
    OPTIONS.forEach(function (opt) {
      var wrap = document.createElement('label');
      wrap.className = 'scale__opt';
      wrap.setAttribute('data-v', String(opt.v));

      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'q' + q.id;
      input.value = String(opt.v);
      // 各入力の完全な名前をアクセシブルラベルとして保持する
      input.setAttribute('aria-label', opt.label);
      if (state.answers[q.id] === opt.v) input.checked = true;
      input.addEventListener('change', function () { onAnswer(q.id, opt.v, fs); });

      var bubble = document.createElement('span');
      bubble.className = 'bubble';

      wrap.appendChild(input);
      wrap.appendChild(bubble);
      opts.appendChild(wrap);
    });
    scale.appendChild(opts);
    fs.appendChild(scale);

    // 選択内容を文字でも示す（色だけに依存しない）
    var ans = document.createElement('p');
    ans.className = 'scale__answer';
    ans.id = 'qans-' + q.id;
    ans.setAttribute('aria-live', 'polite');
    setAnswerText(ans, state.answers[q.id]);
    fs.appendChild(ans);

    return fs;
  }

  function setAnswerText(el, value) {
    if (!E.isValidAnswer(value)) { el.innerHTML = ''; return; }
    var label = '';
    for (var i = 0; i < OPTIONS.length; i++) if (OPTIONS[i].v === value) label = OPTIONS[i].label;
    el.innerHTML = '回答: <b>' + label + '</b>';
  }

  /* ------------------------- 操作 ------------------------- */
  function onAnswer(qid, value, fieldset) {
    if (!E.isValidAnswer(value)) return;
    state.answers[qid] = value;      // 0（どちらともいえない）も回答済みとして扱う
    save();

    fieldset.classList.add('is-answered');
    fieldset.classList.remove('is-error');
    var err = fieldset.querySelector('.q-error');
    if (err) err.remove();
    var legend = fieldset.querySelector('.q-item__legend');
    if (legend) legend.removeAttribute('aria-describedby');

    setAnswerText(document.getElementById('qans-' + qid), value);
    updateProgress();
    // 自動遷移はしない。フォーカスも移動しない。
  }

  /* 未回答は0として扱い、途中でも位置を出す。全問そろうまでは「暫定」。 */
  function updateCoord() {
    var grid = document.getElementById('dg-coord-grid');
    if (!grid) return;
    if (!grid.childNodes.length) {
      var frag = document.createDocumentFragment();
      for (var r = 0; r < 6; r++) {
        for (var c = 0; c < 6; c++) {
          var i = document.createElement('i');
          i.className = (r < 3 ? (c < 3 ? 'q1' : 'q2') : (c < 3 ? 'q3' : 'q4'));
          frag.appendChild(i);
        }
      }
      grid.appendChild(frag);
    }
    var filled = {};
    questions.forEach(function (q) {
      var v = state.answers[q.id];
      filled[q.id] = (typeof v === 'number') ? v : 0;
    });
    var sc;
    try { sc = E.computeScores(filled, state.mode); } catch (e) { return; }
    var xi = E.bandIndex(sc.X), yi = E.bandIndex(sc.Y);
    var t = E.typeForIndices ? E.typeForIndices(xi, yi) : null;
    var row = 5 - yi;
    Array.prototype.forEach.call(grid.children, function (el, n) {
      el.classList.toggle('on', n === row * 6 + xi);
    });
    var n = answeredCount();
    var done = n === questions.length;
    document.getElementById('dg-coord-lbl').textContent = done ? '今回の方向' : '回答中の方向';
    document.getElementById('dg-coord-id').textContent = (n === 0 || !t) ? '--' : t.id;
    document.getElementById('dg-coord-name').textContent =
      n === 0 ? '回答すると、ここに今優先したい方向の目安が出ます' : (t ? t.name : '');
    document.getElementById('dg-coord-x').textContent = n === 0 ? '- / 6' : (xi + 1) + ' / 6';
    document.getElementById('dg-coord-y').textContent = n === 0 ? '- / 6' : (yi + 1) + ' / 6';
    document.getElementById('dg-coord').classList.toggle('is-empty', n === 0);
    document.getElementById('dg-coord').classList.toggle('is-done', done);
  }

  function updateProgress() {
    var n = answeredCount();
    var pct = Math.round((n / questions.length) * 100);
    document.getElementById('dg-count').innerHTML =
      '回答済み <b>' + n + '</b> / ' + questions.length + '（' + pct + '%）';
    document.getElementById('dg-fill').style.width = pct + '%';
    updateCoord();
    var pbar = document.getElementById('dg-pbar');
    pbar.setAttribute('aria-valuenow', String(pct));
    pbar.textContent = '進捗 ' + pct + 'パーセント。' + questions.length + '問中' + n + '問回答済み。';

    var note = document.getElementById('dg-saved-note');
    if (note) {
      note.innerHTML = n > 0
        ? '<span class="dg-saved">' + SAVE_SVG + 'この端末に自動保存しました。あとから続きを再開できます。</span>'
        : 'この端末に自動保存されます。氏名やメールアドレスは必要ありません。';
    }

    [25, 50, 75].forEach(function (m) {
      if (!milestone[m] && pct >= m) {
        milestone[m] = true;
        track('diagnosis_progress_' + m, { mode: state.mode });
      }
    });
  }

  function goPrev() {
    if (pageIndex === 0) return;
    pageIndex--;
    save();
    renderPage(true);
  }

  function goNext() {
    var qs = pageQuestions();
    var firstMissing = null;
    qs.forEach(function (q) {
      var fs = document.getElementById('q-' + q.id);
      if (!fs) return;
      if (!E.isValidAnswer(state.answers[q.id])) {
        if (!firstMissing) firstMissing = fs;
        markError(fs, q);
      }
    });

    if (firstMissing) {
      // ページ上部へ戻さず、最初の未回答設問へ移動してフォーカスする
      firstMissing.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      var radio = firstMissing.querySelector('input[type="radio"]');
      if (radio) radio.focus({ preventScroll: true });
      return;
    }

    if (pageIndex < totalPages() - 1) {
      pageIndex++;
      save();
      renderPage(true);
    } else {
      finish();
    }
  }

  function markError(fs, q) {
    fs.classList.add('is-error');
    if (fs.querySelector('.q-error')) return;
    var p = document.createElement('p');
    p.className = 'q-error';
    p.id = 'qerr-' + q.id;
    p.setAttribute('role', 'alert');
    p.innerHTML = WARN_SVG + '<span>この質問にお答えください。「どちらともいえない」も選べます。</span>';
    fs.appendChild(p);
    var legend = fs.querySelector('.q-item__legend');
    if (legend) legend.setAttribute('aria-describedby', p.id);
  }

  function finish() {
    var un = E.firstUnansweredIndex(state.answers, state.mode);
    if (un !== -1) {
      pageIndex = Math.floor(un / PER_PAGE);
      save();
      renderPage(true);
      window.setTimeout(goNext, 0); // 未回答をエラー表示させる
      return;
    }
    var result = E.evaluate(state.answers, state.mode);
    // 端末内へ保存。URLへ個人情報・回答配列を入れない。
    try {
      localStorage.setItem(RESULT_KEY, JSON.stringify({
        version: 1,
        slug: result.type.slug,
        mode: state.mode,
        X: result.scores.X,
        Y: result.scores.Y,
        categoryPercents: result.categoryPercents,
        clarity: result.clarity,
        /* 「この位置になった理由」に使う。観点ごとの合計と、効いた回答。
           全設問の明細は端末に残さない（結果表示に使わないため） */
        axes: slimAxes(result.axes),
        /* single / boundary / undetermined。結果ページの見せ方を変えるために保存する */
        state: result.state,
        centralSlugs: result.centralTypes.map(function (t) { return t.slug; }),
        note: result.note,
        nearSlugs: result.near.map(function (n) { return n.type.slug; }),
        savedAt: new Date().toISOString(),
      }));
    } catch (e) { /* 保存不可でも結果表示は続行 */ }
    track('diagnosis_complete', {
      mode: state.mode,
      result_type_slug: result.type.slug,
      result_state: result.state,
    });
    location.href = 'result.html?type=' + encodeURIComponent(result.type.slug);
  }

  /* 保存するのは表示に使う分だけ。設問の明細（items）は落とす。 */
  function slimAxes(axes) {
    if (!axes) return null;
    function side(x) {
      return { key: x.key, label: x.label, sum: x.sum, count: x.count, neutral: x.neutral, top: x.top };
    }
    function ax(a) {
      return { name: a.name, note: a.note, diff: a.diff, leaning: a.leaning,
        neutralRate: a.neutralRate, left: side(a.left), right: side(a.right) };
    }
    return { x: ax(axes.x), y: ax(axes.y), answered: axes.answered, total: axes.total };
  }

  function track(ev, params) { if (window.crewTrack) window.crewTrack(ev, params); }
}());
