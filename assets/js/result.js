/* result.js — 診断結果の描画。マップ/近いタイプ/傾向を types.tsv 由来データから生成。
   3状態: personal（端末内に本人スコア）/ shared（タイプslugのみ）/ invalid（不明slug）。
 * 通常スクリプト。file:// で直接開いても動くよう ESモジュールにしない。
 * 依存: diagnosis-data.js → diagnosis-engine.js の順で先に読み込むこと。 */
(function () {
  'use strict';
  var E = globalThis.CrewEngine;
  if (!E) throw new Error('diagnosis-engine.js を先に読み込んでください');
  var TYPES = E.TYPES;

  var RESULT_KEY = 'crewAscentResult:v1';
  var CATS = [
    { key: 'practical', label: '実用・情報', hint: '必要な情報へ迷わずたどり着けるか' },
    { key: 'brand',     label: 'ブランド・魅力', hint: 'らしさや価値が印象に残るか' },
    { key: 'trust',     label: '王道・安心', hint: '誠実さや安定感が伝わるか' },
    { key: 'modern',    label: '先進・新しさ', hint: '今らしさや成長性が伝わるか' },
  ];
  var AREA = {
    'area-tl': { name: '実用・情報 × 先進・新しさ', color: 'var(--area-tl)' },
    'area-tr': { name: 'ブランド・魅力 × 先進・新しさ', color: 'var(--area-tr)' },
    'area-bl': { name: '実用・情報 × 王道・安心', color: 'var(--area-bl)' },
    'area-br': { name: 'ブランド・魅力 × 王道・安心', color: 'var(--area-br)' },
  };

  /* レポートの目次。細目を並べすぎず、読む目的ごとにまとめる。 */
  var SECTION_INDEX = [
    ['rs-map', '01 今回の位置と回答傾向'],
    ['rs-strength', '02 この方針が活きる場面'],
    ['rs-firstview', '03 サイト設計のたたき台'],
    ['rs-tone', '04 文章とデザインの方向'],
    ['rs-seo', '05 検索・運用・業種の考え方'],
    ['rs-near', '06 近いタイプと相談準備'],
    ['rs-plans', '07 プラン比較と相談'],
  ];

  var root = document.getElementById('result-root');
  if (root) render();

  function qs(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }
  function readPersonal() {
    try {
      var raw = localStorage.getItem(RESULT_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || d.version !== 1 || typeof d.slug !== 'string') return null;
      return d;
    } catch (e) { return null; }
  }
  function areaClass(x, y) {
    var right = x >= 3, top = y >= 3;
    if (top && !right) return 'area-tl';
    if (top && right) return 'area-tr';
    if (!top && !right) return 'area-bl';
    return 'area-br';
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function polishCopy(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/([ぁ-んァ-ヶ一-龠]) ([ぁ-んァ-ヶ一-龠])/g, '$1。$2');
  }
  function polishFlow(value) {
    var text = polishCopy(value);
    var suffix = 'から問い合わせへ進む';
    if (text && text.slice(-suffix.length) === suffix) {
      return '「' + text.slice(0, -suffix.length).replace(/[「」]/g, '') + '」を選び、問い合わせへ進む';
    }
    return text;
  }
  function section(cls, containerCls) {
    /* rvsec: 画面に入ったとき、章の罫を左から引く（サイト共通の見え方） */
    var s = el('section', (cls || 'band band--sm band--paper') + ' rvsec');
    var c = el('div', containerCls || 'container');
    s.appendChild(c);
    return { sec: s, box: c };
  }
  function idxHead(no, title, sub) {
    var h = el('div', 'idx-head');
    h.appendChild(el('span', 'idx-head__no', no));
    var d = el('div');
    d.appendChild(el('h2', null, title));
    if (sub) d.appendChild(el('p', 'caption', sub));
    h.appendChild(d);
    return h;
  }
  function head(eyebrow, title, modifier) {
    var f = document.createDocumentFragment();
    if (eyebrow) f.appendChild(el('p', 'eyebrow' + (modifier ? ' ' + modifier : ''), eyebrow));
    f.appendChild(el('h2', null, title));
    return f;
  }

  function render() {
    var slug = qs('type');
    var type = slug ? E.typeBySlug(slug) : null;
    if (!type) return renderInvalid();

    var personal = readPersonal();
    var isPersonal = !!(personal && personal.slug === slug);
    var X = isPersonal ? personal.X : E.CELL_CENTERS[type.xIndex];
    var Y = isPersonal ? personal.Y : E.CELL_CENTERS[type.yIndex];
    var near = E.nearestTypes(type, X, Y);
    var ac = areaClass(type.xIndex, type.yIndex);

    document.title = '診断結果: ' + type.name + ' | クルーアセント';
    root.innerHTML = '';

    /* 回答から方向を読み取れなかったとき（全問中立など）。
       これまでは中央のCA21を「あなたのタイプ」として言い切っていたが、
       中立の回答は親切案内型への支持ではないので、断定してはいけない。 */
    var undetermined = isPersonal && personal.state === 'undetermined';
    if (undetermined) {
      renderUndetermined(personal);
      return;
    }

    /* ---------- 結果マストヘッド ---------- */
    var mast = el('section', 'rs-mast rs-mast--' + ac.replace('area-', ''));
    var mc = el('div', 'container rs-mast__inner');
    mc.appendChild(el('p', 'rs-mast__label', isPersonal ? '今回の診断結果' : '共有されたタイプ'));
    mc.appendChild(el('p', 'rs-mast__id', type.id));
    mc.appendChild(el('h1', 'rs-mast__name', type.name));
    mc.appendChild(el('p', 'rs-mast__oneliner', type.oneLiner));

    var goType = el('a', 'alink rs-mast__go', 'このタイプの設計方針を詳しく見る');
    goType.href = 'type-' + type.slug + '.html';
    mc.appendChild(goType);

    var coords = el('dl', 'rs-coords');
    coords.appendChild(coordCell('AREA', AREA[ac].name));
    coords.appendChild(coordCell('X / 実用 ⇄ 魅力',
      (type.xIndex <= 2 ? '実用・情報より' : 'ブランド・魅力より') + '（' + (type.xIndex + 1) + ' / 6）'));
    coords.appendChild(coordCell('Y / 王道 ⇄ 先進',
      (type.yIndex <= 2 ? '王道・安心より' : '先進・新しさより') + '（' + (type.yIndex + 1) + ' / 6）'));
    mc.appendChild(coords);

    if (isPersonal && personal.clarity && personal.clarity.message) {
      var cl = el('p', 'hint');
      cl.style.marginTop = 'var(--s4)';
      cl.textContent = '傾向の読み方: ' + personal.clarity.message;
      mc.appendChild(cl);
    }
    if (!isPersonal) {
      var sh = el('p', 'note note--info');
      sh.style.marginTop = 'var(--s4)';
      sh.textContent = 'これは共有用のタイプ説明です。あなた自身の回答傾向は表示されません。ご自身で診断すると、回答傾向を含む結果を確認できます。';
      mc.appendChild(sh);
    }
    mast.appendChild(mc);
    root.appendChild(mast);

    /* ---------- 最初に見る要点 + 目次 ---------- */
    var D = type.detail || {};
    var sum = section('band band--sm band--surface');
    sum.sec.id = 'rs-summary';
    var sumWrap = el('div', 'rs-summary');
    var sumMain = el('div');
    sumMain.appendChild(el('p', 'rs-summary__label', '最初に見る要点'));
    var overview = type.name + 'は、' + ((D.position && D.position.area) || type.area) + 'を重視する方向です。' +
      type.oneLiner +
      (D.contentPriority && D.ctaStrategy
        ? '最初に決めたいのは「' + D.contentPriority[0] + '」、サイトで促す主な行動は「' + D.ctaStrategy.primaryCTA + '」です。'
        : '');
    sumMain.appendChild(el('p', 'rs-summary__text', polishCopy(overview)));
    var quick = el('dl', 'rs-quick');
    quick.appendChild(coordCell('この方向が向く状況', polishCopy(type.summary || D.recommendedPurpose || type.oneLiner)));
    if (D.ctaStrategy) quick.appendChild(coordCell('サイトで促す主な行動', D.ctaStrategy.primaryCTA + '（補助: ' + D.ctaStrategy.secondaryCTA + '）'));
    if (D.contentPriority) quick.appendChild(coordCell('最初に置く情報', polishCopy(D.contentPriority[0])));
    sumMain.appendChild(quick);
    sumWrap.appendChild(sumMain);

    var toc = el('nav', 'rs-toc');
    toc.setAttribute('aria-label', 'このレポートの目次');
    toc.appendChild(el('p', 'rs-toc__title', 'このレポートの内容'));
    var tocList = el('ol');
    SECTION_INDEX.forEach(function (it) {
      var li = el('li');
      var a = el('a', null, it[1]);
      a.href = '#' + it[0];
      li.appendChild(a);
      tocList.appendChild(li);
    });
    toc.appendChild(tocList);
    var printBtn = el('button', 'btn btn--secondary btn--sm rs-print', '結果を印刷・PDF保存');
    printBtn.type = 'button';
    printBtn.addEventListener('click', function () { window.print(); });
    toc.appendChild(printBtn);
    sumWrap.appendChild(toc);
    sum.box.appendChild(sumWrap);
    root.appendChild(sum.sec);

    // 読み上げ順の補助（マップ画像に依存せず結果が分かる）
    var sr = el('p', 'visually-hidden',
      '診断結果は ' + type.id + '、' + type.name + 'です。' +
      (type.xIndex <= 2 ? '実用・情報より' : 'ブランド・魅力より') + 'で、' +
      (type.yIndex <= 2 ? '王道・安心より' : '先進・新しさより') + 'の領域にあります。');
    root.appendChild(sr);

    /* ---------- マップ + 読み方（2カラム） ---------- */
    var m = section('band band--sm band--paper');
    m.sec.id = 'rs-map';
    m.box.appendChild(idxHead('01', 'マップで今回の方向を確認する', '回答時点で、四つの視点のどこを優先したかを示します。'));
    var grid = el('div', 'rs-mapgrid');
    grid.appendChild(buildMap(type, near));
    grid.appendChild(buildReadPanel(type, near, ac));
    m.box.appendChild(grid);
    root.appendChild(m.sec);

    /* ---------- 回答傾向（personalのみ） ---------- */
    if (isPersonal && personal.categoryPercents) {
      var t = section('band band--sm band--ink');
      t.sec.id = 'rs-trend';
      t.box.appendChild(idxHead('02', '四つの回答傾向', '回答尺度を0〜100に置き換えた値です。能力、順位、市場適合率、成功率を表す割合ではありません。'));
      var panel = el('div', 'trend-panel');
      panel.style.marginTop = 'var(--s4)';
      CATS.forEach(function (c) {
        var pct = personal.categoryPercents[c.key];
        var cell = el('div', 'trend');
        cell.appendChild(el('div', 'trend__label', c.label));
        cell.appendChild(el('div', 'trend__val', pct + '%'));
        var track = el('div', 'trend__track');
        var fill = el('div', 'trend__fill');
        fill.style.width = pct + '%';
        track.appendChild(fill);
        cell.appendChild(track);
        cell.appendChild(el('p', null, c.hint));
        panel.appendChild(cell);
      });
      t.box.appendChild(panel);
      if (personal.note) {
        var n = el('p', 'note');
        n.style.marginTop = 'var(--s4)';
        n.textContent = personal.note;
        t.box.appendChild(n);
      }
      root.appendChild(t.sec);
    }

    /* ---------- 強み / 意識したいバランス ---------- */
    var s = section('band band--sm band--paper');
    s.sec.id = 'rs-strength';
    s.box.appendChild(idxHead('03', 'この方針が活きる場面と、偏りを防ぐ視点'));
    var pair = el('div', 'pair');
    var colA = el('div', 'pair__col');
    colA.appendChild(el('h3', null, 'この方針が活きる場面'));
    var ulA = el('ul', 'marker-list');
    type.strengths.forEach(function (x) {
      var li = el('li');
      li.innerHTML = '<span class="mk mk--plus" aria-hidden="true"></span>';
      li.appendChild(el('span', null, x));
      ulA.appendChild(li);
    });
    colA.appendChild(ulA);
    var colB = el('div', 'pair__col pair__col--balance');
    colB.appendChild(el('h3', null, '偏りを防ぐための注意'));
    colB.appendChild(el('p', null, type.tradeoff));
    pair.appendChild(colA);
    pair.appendChild(colB);
    s.box.appendChild(pair);
    root.appendChild(s.sec);

    /* ---------- 04 想定する訪問状況 / 05 ファーストビュー設計 ---------- */
    if (D.targetVisitor && D.firstViewPlan) {
      var fv = section('band band--sm band--surface');
      fv.sec.id = 'rs-firstview';
      fv.box.appendChild(idxHead('04', 'ファーストビューの設計', '最初の一画面で何を見せるかの方針です。'));
      var fvGrid = el('div', 'ed ed--5-7');
      var fvL = el('div');
      fvL.appendChild(el('h3', 'h-sm', '想定する訪問状況'));
      fvL.appendChild(el('p', null, polishCopy(D.targetVisitor)));
      var fvR = el('dl', 'spec-dl');
      [['見出しの役割', D.firstViewPlan.headlineRole],
       ['そばに置く情報', D.firstViewPlan.supportingInformation],
       ['確かめられる事実', D.firstViewPlan.proofElement],
       ['主要な行動', D.firstViewPlan.primaryAction]].forEach(function (r) {
        var d = el('div');
        d.appendChild(el('dt', null, r[0]));
        d.appendChild(el('dd', null, polishCopy(r[1])));
        fvR.appendChild(d);
      });
      fvGrid.appendChild(fvL);
      fvGrid.appendChild(fvR);
      fv.box.appendChild(fvGrid);
      root.appendChild(fv.sec);
    }

    /* ---------- 05 情報の優先順 / 06 問い合わせまでの経路 ---------- */
    if (D.contentPriority && D.conversionFlow) {
      var pr = section('band band--sm band--paper');
      pr.sec.id = 'rs-priority';
      pr.box.appendChild(idxHead('05', '情報の優先順と、問い合わせまでの経路', '上から順に置くと、読み手が判断しやすくなります。'));
      var prGrid = el('div', 'split');
      var prL = el('div');
      prL.appendChild(el('h3', 'h-sm', '情報の優先順（上から）'));
      var ol = el('ol', 'rank-list rank-list--lg');
      D.contentPriority.forEach(function (v) { ol.appendChild(el('li', null, polishCopy(v))); });
      prL.appendChild(ol);
      var prR = el('div');
      prR.appendChild(el('h3', 'h-sm', '問い合わせまでの経路'));
      var fl2 = el('ol', 'step-flow');
      D.conversionFlow.forEach(function (v) { fl2.appendChild(el('li', null, polishFlow(v))); });
      prR.appendChild(fl2);
      prGrid.appendChild(prL);
      prGrid.appendChild(prR);
      pr.box.appendChild(prGrid);
      root.appendChild(pr.sec);
    }

    /* ---------- 06 文章の調子 ---------- */
    if (D.toneGuide) {
      var tg = section('band band--sm band--ink');
      tg.sec.id = 'rs-tone';
      tg.box.appendChild(idxHead('06', '文章の調子', '同じ内容でも、書き方で伝わり方が変わります。'));
      var tgGrid = el('div', 'ed ed--5-7');
      var tgL = el('div');
      tgL.appendChild(el('h3', 'h-sm', '目指す調子'));
      tgL.appendChild(el('p', 'lead', polishCopy(D.toneGuide.recommendedTone)));
      tgL.appendChild(el('h3', 'h-sm', '書き方'));
      tgL.appendChild(el('p', null, polishCopy(D.toneGuide.sentenceStyle)));
      var tgR = el('div', 'split');
      tgR.appendChild(wordCol('使いたい言葉', D.toneGuide.wordsToPrefer, 'is-yes'));
      tgR.appendChild(wordCol('避けたい言葉', D.toneGuide.wordsToAvoid, 'is-no'));
      tgGrid.appendChild(tgL);
      tgGrid.appendChild(tgR);
      tg.box.appendChild(tgGrid);
      root.appendChild(tg.sec);
    }

    /* ---------- 07 配色・文字・画像・動き ---------- */
    if (D.visualRecipe) {
      var vr = section('band band--sm band--paper');
      vr.sec.id = 'rs-visual';
      vr.box.appendChild(idxHead('07', '配色、文字、画像、動き', 'デザインを依頼するときに、そのまま渡せる指針です。'));
      var vrDl = el('dl', 'spec-dl spec-dl--2');
      [['レイアウト', D.visualRecipe.layout], ['色の使い方', D.visualRecipe.colorUse],
       ['文字', D.visualRecipe.typography], ['画像', D.visualRecipe.imagery],
       ['動き', D.visualRecipe.motion]].forEach(function (r) {
        var d = el('div');
        d.appendChild(el('dt', null, r[0]));
        d.appendChild(el('dd', null, polishCopy(r[1])));
        vrDl.appendChild(d);
      });
      vr.box.appendChild(vrDl);
      root.appendChild(vr.sec);
    }

    /* ---------- ページ構成 / 機能 ---------- */
    var p = section('band band--sm band--surface');
    p.sec.id = 'rs-build';
    p.box.appendChild(idxHead('08', 'サイトの組み立てと問い合わせ導線', '向いているページ構成と機能、デザインの方向です。'));

    // ページ構成は横に流れる図なので全幅で置く
    var pgWrap = el('div', 'build-row');
    pgWrap.appendChild(el('h3', 'h-sm', 'ページ構成のたたき台'));
    var sm = el('ol', 'sitemap');
    type.pages.forEach(function (pg) {
      var li = el('li');
      li.appendChild(el('span', 'pg', pg));
      sm.appendChild(li);
    });
    pgWrap.appendChild(sm);
    p.box.appendChild(pgWrap);

    // 機能とデザインの方向は横並び。1列に伸びて右が空くのを避ける
    var sp = el('div', 'split build-row');
    var left = el('div');
    left.appendChild(el('h3', 'h-sm', '検討しやすい機能'));
    var fl = el('ul', 'marker-list');
    type.functions.forEach(function (fn) {
      var li = el('li');
      li.innerHTML = '<span class="mk mk--plus" aria-hidden="true"></span>';
      li.appendChild(el('span', null, fn));
      fl.appendChild(li);
    });
    left.appendChild(fl);
    var right = el('div');
    right.appendChild(el('h3', 'h-sm', 'デザインの方向'));
    var dkl = el('ul', 'tag-row');
    type.designKeywords.forEach(function (k, i) {
      var li = el('li');
      li.appendChild(el('span', 'tag' + (i < 2 ? ' tag--lead' : ''), k));
      dkl.appendChild(li);
    });
    right.appendChild(dkl);
    sp.appendChild(left);
    sp.appendChild(right);
    p.box.appendChild(sp);

    var ind = el('div', 'split build-row');
    ind.appendChild(industryCol('相性を考えやすい業種例', type.primaryIndustries, true));
    ind.appendChild(industryCol('この業種にもおすすめ', type.alsoIndustries, false));
    p.box.appendChild(ind);
    root.appendChild(p.sec);

    /* ---------- 09 基本SEOの考え方 ---------- */
    if (D.seoApproach) {
      var seo = section('band band--sm band--paper');
      seo.sec.id = 'rs-seo';
      seo.box.appendChild(idxHead('09', '基本SEOの考え方', '順位の予測ではありません。検索する人が何を知りたいかの方向です。'));
      var seoGrid = el('div', 'ed ed--5-7');
      var seoL = el('div');
      seoL.appendChild(el('h3', 'h-sm', '想定される検索意図'));
      seoL.appendChild(el('p', null, polishCopy(D.seoApproach.likelySearchIntent)));
      seoL.appendChild(el('h3', 'h-sm', '所在地・対応地域の扱い'));
      seoL.appendChild(el('p', 'mb-0', polishCopy(D.seoApproach.localSeoFit)));
      var seoR = el('div');
      seoR.appendChild(el('h3', 'h-sm', '情報のまとまり'));
      var kw = el('ul', 'tag-row');
      D.seoApproach.keywordThemes.forEach(function (k, i) {
        var li = el('li');
        li.appendChild(el('span', 'tag' + (i < 2 ? ' tag--lead' : ''), k));
        kw.appendChild(li);
      });
      seoR.appendChild(kw);
      seoR.appendChild(el('h3', 'h-sm', '用意したいページの話題'));
      var pt = el('ul', 'tag-row');
      D.seoApproach.pageTopics.forEach(function (k) {
        var li = el('li');
        li.appendChild(el('span', 'tag', k));
        pt.appendChild(li);
      });
      seoR.appendChild(pt);
      seoGrid.appendChild(seoL);
      seoGrid.appendChild(seoR);
      seo.box.appendChild(seoGrid);
      var seoC = el('p', 'note note--warn');
      seoC.style.marginTop = 'var(--s5)';
      seoC.textContent = polishCopy(D.seoApproach.caution);
      seo.box.appendChild(seoC);
      root.appendChild(seo.sec);
    }

    /* ---------- 10 避けたい構成・表現 / 11 公開後の運用 ---------- */
    if (D.avoidPatterns && D.operationTips) {
      var av = section('band band--sm band--surface');
      av.sec.id = 'rs-avoid';
      av.box.appendChild(idxHead('10', '避けたい構成と、公開後にすること'));
      var avGrid = el('div', 'split');
      var avL = el('div');
      avL.appendChild(el('h3', 'h-sm', 'このタイプで避けたい構成・表現'));
      var avU = el('ul', 'marker-list');
      D.avoidPatterns.forEach(function (v) {
        var li = el('li');
        li.innerHTML = '<span class="mk mk--minus" aria-hidden="true"></span>';
        li.appendChild(el('span', null, v));
        avU.appendChild(li);
      });
      avL.appendChild(avU);
      var avR = el('div');
      avR.appendChild(el('h3', 'h-sm', '公開後に優先して確認すること'));
      var opU = el('ul', 'marker-list');
      D.operationTips.forEach(function (v) {
        var li = el('li');
        li.innerHTML = '<span class="mk mk--plus" aria-hidden="true"></span>';
        li.appendChild(el('span', null, v));
        opU.appendChild(li);
      });
      avR.appendChild(opU);
      avGrid.appendChild(avL);
      avGrid.appendChild(avR);
      av.box.appendChild(avGrid);
      root.appendChild(av.sec);
    }

    /* ---------- 12 合いやすい業種と、その理由 ---------- */
    if (D.industryReasons) {
      var ir = section('band band--sm band--paper');
      ir.sec.id = 'rs-industry';
      ir.box.appendChild(idxHead('11', '合いやすい業種と、その理由', '業種そのものではなく、Webサイト上の課題との相性で見ています。'));
      var irDl = el('dl', 'spec-dl');
      [['主な見本業種', D.industryReasons.primary], ['他に合いやすい業種', D.industryReasons.also]].forEach(function (r) {
        var d = el('div');
        d.appendChild(el('dt', null, r[0]));
        d.appendChild(el('dd', null, polishCopy(r[1])));
        irDl.appendChild(d);
      });
      ir.box.appendChild(irDl);
      var irC = el('p', 'hint');
      irC.style.marginTop = 'var(--s4)';
      irC.textContent = polishCopy(D.industryReasons.caution);
      ir.box.appendChild(irC);
      root.appendChild(ir.sec);
    }

    /* ---------- 近い3タイプ ---------- */
    var nz = section('band band--sm band--paper');
    nz.sec.id = 'rs-near';
    nz.box.appendChild(idxHead('12', '考え方が近いタイプ', '次点や精度ではありません。方向性が近いタイプなので、比較の参考にできます。'));
    var nl = el('div', 'near-list');
    nl.style.marginTop = 'var(--s4)';
    near.forEach(function (n) {
      /* 36タイプの個別ページを作ったので、そこへ渡す */
      var c = el('a', 'near-card');
      c.href = 'type-' + n.type.slug + '.html';
      c.appendChild(el('div', 'cid', n.type.id));
      c.appendChild(el('div', 'cname', n.type.name));
      c.appendChild(el('p', null, n.type.oneLiner));
      c.appendChild(el('span', 'near-card__go', 'このタイプを詳しく見る'));
      nl.appendChild(c);
    });
    nz.box.appendChild(nl);
    root.appendChild(nz.sec);

    /* ---------- 14 制作相談で確認する質問 + 見出しテンプレート ---------- */
    if (D.consultationQuestions && D.starterCopy) {
      var cq = section('band band--sm band--surface');
      cq.sec.id = 'rs-consult';
      cq.box.appendChild(idxHead('13', '制作相談で確認する質問', 'そのまま持ち込めます。答えが決まっていなくても構いません。'));
      var cqGrid = el('div', 'ed ed--7-5');
      var cqL = el('div');
      var cqOl = el('ol', 'rank-list rank-list--lg');
      D.consultationQuestions.forEach(function (v) { cqOl.appendChild(el('li', null, polishCopy(v))); });
      cqL.appendChild(cqOl);
      var cqR = el('div', 'starter');
      cqR.appendChild(el('h3', 'h-sm', '見出しの組み立て方（テンプレート）'));
      var st = el('div', 'starter__box');
      st.appendChild(el('p', 'starter__h1', D.starterCopy.h1));
      st.appendChild(el('p', 'starter__sub', D.starterCopy.sub));
      cqR.appendChild(st);
      cqR.appendChild(el('p', 'hint', D.starterCopy.note));
      cqGrid.appendChild(cqL);
      cqGrid.appendChild(cqR);
      cq.box.appendChild(cqGrid);
      root.appendChild(cq.sec);
    }

    /* ---------- プラン導線（中立） + 注意書き ---------- */
    var c2 = section('band band--sm band--bl');
    c2.sec.id = 'rs-plans';
    c2.box.appendChild(idxHead('14', '制作プランを比べる'));
    c2.box.appendChild(el('p', 'lead',
      '診断結果から料金プランを自動で決めることはありません。ページ数、原稿・画像の準備状況、納期を比べて、今の状況に近い進め方を選べます。'));
    var cta = el('div', 'cta-row');
    var a1 = el('a', 'btn btn--primary btn--lg', '4つのプランを比較する');
    a1.href = 'plans.html';
    a1.addEventListener('click', function () { if (window.crewTrack) window.crewTrack('result_plans_click', { result_type_slug: type.slug }); });
    var a2 = el('a', 'btn btn--secondary', '診断結果をもとに相談する');
    a2.href = 'contact.html?type=' + encodeURIComponent(type.slug);
    a2.addEventListener('click', function () { if (window.crewTrack) window.crewTrack('result_contact_click', { result_type_slug: type.slug }); });
    var b3 = el('button', 'btn btn--quiet', '結果を共有する');
    b3.type = 'button';
    b3.addEventListener('click', function () { doShare(type); });
    var a4 = el('a', 'btn btn--quiet', 'もう一度診断する');
    a4.href = 'diagnosis.html';
    cta.appendChild(a1); cta.appendChild(a2); cta.appendChild(b3); cta.appendChild(a4);
    c2.box.appendChild(cta);

    var caution = el('p', 'caption');
    caution.style.marginTop = 'var(--s5)';
    caution.textContent = 'この診断は、Webサイトの方向性を整理するための目安です。心理検査や経営診断ではなく、成果や検索順位を保証するものではありません。結果は事業内容、顧客、予算、運用方法に合わせて調整できます。';
    c2.box.appendChild(caution);
    root.appendChild(c2.sec);

    ['rs-tone', 'rs-visual', 'rs-seo', 'rs-avoid', 'rs-industry'].forEach(function (id) {
      makeExpandable(id);
    });

    /* 節はここで初めてDOMに載るので、出現の監視をやり直してもらう */
    if (typeof window.CREW_REVEAL === 'function') window.CREW_REVEAL();
  }

  function makeExpandable(id) {
    var sec = document.getElementById(id);
    if (!sec) return;
    var box = sec.firstElementChild;
    if (!box || box.children.length < 2) return;
    var details = el('details', 'rs-more');
    var summary = el('summary', 'rs-more__summary', 'この内容を詳しく見る');
    details.appendChild(summary);
    while (box.children.length > 1) details.appendChild(box.children[1]);
    box.appendChild(details);
    if (location.hash === '#' + id) details.open = true;
    var link = document.querySelector('.rs-toc a[href="#' + id + '"]');
    if (link) link.addEventListener('click', function () { details.open = true; });
  }

  function wordCol(title, words, cls) {
    var d = el('div');
    d.appendChild(el('h3', 'h-sm', title));
    var ul = el('ul', 'word-list');
    words.forEach(function (w) {
      var li = el('li', cls);
      li.appendChild(el('span', null, w));
      ul.appendChild(li);
    });
    d.appendChild(ul);
    return d;
  }

  function coordCell(k, v) {
    var d = el('div');
    d.appendChild(el('dt', null, k));
    d.appendChild(el('dd', null, v));
    return d;
  }

  function industryCol(title, items, lead) {
    var d = el('div');
    d.appendChild(el('h3', 'h-sm', title));
    var ul = el('ul', 'tag-row');
    items.forEach(function (x) {
      var li = el('li');
      li.appendChild(el('span', 'tag' + (lead ? ' tag--lead' : ''), x));
      ul.appendChild(li);
    });
    d.appendChild(ul);
    return d;
  }

  function buildMap(type, near) {
    var nearSet = {};
    near.forEach(function (n) { nearSet[n.type.slug] = true; });

    var fig = el('figure', 'map-figure');
    fig.appendChild(el('figcaption', 'map-axis map-axis--top', '↑ 先進・新しさ'));

    var ol = el('ol', 'result-map');
    ol.setAttribute('aria-label', '36タイプの位置。今回の診断位置を強調しています。');
    // 視覚順 = 読み上げ順: 上段(yIndex5) → 下段(yIndex0)、各行 x0..x5
    for (var y = 5; y >= 0; y--) {
      for (var x = 0; x <= 5; x++) {
        var t = findType(x, y);
        var li = el('li', 'map-cell ' + areaClass(x, y));
        if (t.slug === type.slug) {
          li.classList.add('is-current');
          li.setAttribute('aria-current', 'true');
          li.appendChild(el('span', 'you', 'あなた'));
        } else if (nearSet[t.slug]) {
          li.classList.add('is-near');
        }
        /* 個別ページができたので、自分のマス以外はそこへ渡す */
        var inner = (t.slug === type.slug) ? el('span', 'map-cell__in') : el('a', 'map-cell__in');
        if (inner.tagName === 'A') inner.href = 'type-' + t.slug + '.html';
        inner.appendChild(el('span', 'cid', t.id));
        inner.appendChild(el('span', 'cname', t.name.replace(/型サイト$/, '')));
        li.appendChild(inner);
        ol.appendChild(li);
      }
    }
    fig.appendChild(ol);
    fig.appendChild(el('figcaption', 'map-axis map-axis--bottom', '↓ 王道・安心'));
    var xa = el('div', 'map-axis map-axis-x');
    xa.appendChild(el('span', null, '← 実用・情報'));
    xa.appendChild(el('span', null, 'ブランド・魅力 →'));
    fig.appendChild(xa);
    return fig;
  }

  function findType(x, y) {
    for (var i = 0; i < TYPES.length; i++) {
      if (TYPES[i].xIndex === x && TYPES[i].yIndex === y) return TYPES[i];
    }
    return null;
  }

  function buildReadPanel(type, near, ac) {
    var wrap = el('div');
    wrap.appendChild(el('h3', 'h-sm', '今回の位置の読み方'));
    var list = el('div', 'rs-read');

    list.appendChild(readRow('今回の位置', type.id, AREA[ac].color,
      type.name, '太い枠と「あなた」の表示が今回の診断位置です。色は4つの領域を見分けるためのもので、優劣は示しません。'));
    list.appendChild(readRow('横軸', 'X', 'var(--muted)', '実用・情報 ⇄ ブランド・魅力',
      type.xIndex <= 2
        ? '左寄りです。情報の見つけやすさや説明の分かりやすさを優先する構成が向きます。'
        : '右寄りです。第一印象や世界観づくりを優先する構成が向きます。'));
    list.appendChild(readRow('縦軸', 'Y', 'var(--muted)', '王道・安心 ⇄ 先進・新しさ',
      type.yIndex <= 2
        ? '下寄りです。見慣れた構成と安定感を大切にした設計が向きます。'
        : '上寄りです。今らしさや成長性を感じる設計が向きます。'));
    list.appendChild(readRow('近い', '3', 'var(--coral)', '考え方が近い3タイプ',
      near.map(function (n) { return n.type.name; }).join(' / ') + '。細い枠で示しています。'));

    wrap.appendChild(list);
    return wrap;
  }

  function readRow(keyLabel, keyText, color, title, desc) {
    var row = el('div', 'rs-read__row');
    var k = el('div', 'rs-read__key', keyText);
    k.style.background = color;
    k.setAttribute('aria-hidden', 'true');
    var body = el('div');
    body.appendChild(el('b', null, keyLabel + '：' + title));
    body.appendChild(el('p', 'caption', desc));
    row.appendChild(k);
    row.appendChild(body);
    return row;
  }

  function doShare(type) {
    var url = location.origin + location.pathname + '?type=' + encodeURIComponent(type.slug);
    if (navigator.share) {
      navigator.share({ title: 'クルーアセント 診断タイプ: ' + type.name, url: url }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        function () { alert('共有URLをコピーしました:\n' + url); },
        function () { window.prompt('共有URL', url); });
    } else {
      window.prompt('共有URL', url);
    }
  }

  /* 方向が読み取れなかったときの画面。
     どれか一つを答えとして出さず、中央の4タイプを同じ重みで並べる。 */
  function renderUndetermined(personal) {
    document.title = '診断結果: 方向を一緒に整理する | クルーアセント';
    root.innerHTML = '';

    var s = el('section', 'sec sec--ink rs-none');
    var g = el('div', 'rs-none__arch'); g.setAttribute('aria-hidden', 'true');
    s.appendChild(g);
    var c = el('div', 'wrap rs-none__inner');
    c.appendChild(el('p', 'rs-none__en', 'Result'));
    c.appendChild(el('h1', 'rs-none__h', '優先する方向は、まだひとつに絞れません。'));
    c.appendChild(el('p', 'rs-none__lead',
      '「どちらともいえない」が多いときや、四つの観点を同じ重みで選んだときに起こります。'
      + 'どれか一つを答えとして出すことはしません。回答が足りないのではなく、'
      + '今はどちらも同じくらい大事、という状態です。'));

    var ul = el('ul', 'rs-none__why');
    [['もう一度、選び直す', '「良いと思うか」ではなく、Webサイトで今どちらを先にしたいかで選ぶと差が出ます。'],
     ['84問版で答える', '設問が増えると、16問では表れなかった差が出ることがあります。']
    ].forEach(function (r) {
      var li = el('li');
      li.appendChild(el('b', null, r[0]));
      li.appendChild(el('p', null, r[1]));
      ul.appendChild(li);
    });
    c.appendChild(ul);
    s.appendChild(c);
    root.appendChild(s);

    /* 中央の4タイプを、順位を付けずに並べる */
    var slugs = (personal && personal.centralSlugs) || [];
    var types = slugs.map(function (sl) { return E.typeBySlug(sl); }).filter(Boolean);
    if (types.length) {
      var sec = section('band band--sm band--paper rvsec');
      sec.sec.id = 'rs-central';
      sec.box.appendChild(idxHead('01', '中央にある4つのタイプ',
        '順位ではありません。方向が定まっていないときは、この4つのどれもが当てはまり得ます。'));
      var nl = el('div', 'near-list');
      nl.style.marginTop = 'var(--s4)';
      types.forEach(function (t) {
        var a = el('a', 'near-card');
        a.href = 'type-' + t.slug + '.html';
        a.appendChild(el('div', 'cid', t.id));
        a.appendChild(el('div', 'cname', t.name));
        a.appendChild(el('p', null, t.oneLiner));
        a.appendChild(el('span', 'near-card__go', 'このタイプを詳しく見る'));
        nl.appendChild(a);
      });
      sec.box.appendChild(nl);
      var cta = el('div', 'cta-row');
      cta.style.marginTop = 'var(--s6)';
      var a1 = el('a', 'btn btn--primary', 'もう一度診断する'); a1.href = 'diagnosis.html';
      var a2 = el('a', 'btn btn--secondary', '診断の仕組みを読む'); a2.href = 'diagnosis-guide.html';
      cta.appendChild(a1); cta.appendChild(a2);
      sec.box.appendChild(cta);
      root.appendChild(sec.sec);
    }
    if (typeof window.CREW_REVEAL === 'function') window.CREW_REVEAL();
  }

  /* 結果が無いときの画面。
     型B（診断まわり）は濃色から始まる決まりなので、ここも濃色で組む。
     「読み込めませんでした」とだけ出すのではなく、
     考えられる理由と、保存の仕組みまで書く。 */
  function renderInvalid() {
    document.title = '診断結果 | クルーアセント';
    root.innerHTML = '';

    var s = el('section', 'sec sec--ink rs-none');
    var g = el('div', 'rs-none__arch'); g.setAttribute('aria-hidden', 'true');
    s.appendChild(g);

    var c = el('div', 'wrap rs-none__inner');
    c.appendChild(el('p', 'rs-none__en', 'Result'));
    c.appendChild(el('h1', 'rs-none__h', 'この端末には、まだ診断結果が残っていません'));
    c.appendChild(el('p', 'rs-none__lead',
      '結果はサーバーではなく、診断した端末の中に30日間だけ保存しています。'
      + 'そのため、次のどちらかに当てはまると、この画面になります。'));

    var ul = el('ul', 'rs-none__why');
    [['まだ診断していない、または別の端末・別のブラウザで診断した',
      '保存はこの端末のこのブラウザの中だけです。持ち出されることはありません。'],
     ['共有されたリンクが途中で切れている',
      'タイプを共有するURLは末尾に ?type=… が付きます。ここが欠けると、どのタイプかを特定できません。']
    ].forEach(function (r) {
      var li = el('li');
      li.appendChild(el('b', null, r[0]));
      li.appendChild(el('p', null, r[1]));
      ul.appendChild(li);
    });
    c.appendChild(ul);

    var cta = el('div', 'cta-row rs-none__cta');
    var a1 = el('a', 'btn btn--primary btn--lg', '無料診断を始める'); a1.href = 'diagnosis.html';
    var a2 = el('a', 'btn btn--onink', '診断の仕組みを読む'); a2.href = 'diagnosis-guide.html';
    cta.appendChild(a1); cta.appendChild(a2);
    c.appendChild(cta);

    c.appendChild(el('p', 'rs-none__note',
      '16問なら2〜3分、84問なら10〜15分です。登録もログインも必要ありません。'));

    s.appendChild(c);
    root.appendChild(s);
  }
}());
