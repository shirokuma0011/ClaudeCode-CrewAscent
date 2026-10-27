/* =====================================================================
   トップ: 36タイプ空間の選択欄・一覧・詳細ダイアログ
   引き継ぎ（2026-10-14）の app.js を実サイトへ移植したもの。

   移植で変えたこと
   ・クラス名に atl- を付けた（共通CSSの .map-cell / .eyebrow 等と衝突させない）
   ・仮URL existing/*.html を実ルートへ（type-{slug}.html / diagnosis.html?mode=quick）
   ・モバイルメニューは共通ヘッダー（main.js）に任せ、ここでは扱わない
   ・要素が無いページでは何もしない
   ===================================================================== */
(() => {
  'use strict';
  const source = window.CrewAtelierTypes;
  const dialog = document.getElementById('direction-dialog');
  if (!Array.isArray(source) || !document.getElementById('type-map') || !dialog) return;

  const types = [...source].sort((a, b) => a.id.localeCompare(b.id));
  const $ = (selector) => document.querySelector(selector);
  const review = $('.atl-design-review');
  if (review) review.hidden = new URLSearchParams(location.search).get('review') !== '1';

  let selected = types.find((t) => t.id === 'CA09'), opener, archivePage = 0, filtered = types;

  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  /* 4つの領域の色。上（先進）/ 下（王道）× 左（実用）/ 右（ブランド） */
  function decorate(el, type) {
    const colors = type.yIndex >= 3 ? ['var(--atl-q1)', 'var(--atl-q2)'] : ['var(--atl-q3)', 'var(--atl-q4)'];
    el.style.setProperty('--point-color', colors[type.xIndex < 3 ? 0 : 1]);
    return el;
  }
  function positionDiagram(type) {
    const map = decorate(element('span', 'atl-position-diagram'), type);
    map.setAttribute('aria-hidden', 'true');
    for (let n = 0; n < 36; n++) map.append(element('i', n === (5 - type.yIndex) * 6 + type.xIndex ? 'atl-position-active' : ''));
    return map;
  }
  function openType(type, source) {
    opener = source;
    $('#detail-id').textContent = 'WEB診断36 / ' + type.id;
    $('#detail-title').textContent = type.name;
    $('#detail-one').textContent = type.oneLiner;
    $('#detail-summary').textContent = type.summary;
    $('#detail-tradeoff').textContent = type.tradeoff;
    $('#detail-tags').replaceChildren(...type.designKeywords.slice(0, 4).map((t) => element('span', '', t)));
    const di = $('#detail-industries');
    if (di) di.textContent = (type.industries || []).join('、');
    $('#detail-link').href = 'type-' + type.slug + '.html';
    const position = element('div', 'atl-position-description');
    position.append(
      element('strong', '', type.id),
      element('span', '', '実用・情報 ↔ ブランド・魅力'),
      element('small', '', '横の位置 ' + (type.xIndex + 1) + ' / 6'),
      element('span', '', '王道・信頼 ↔ 先進・新しさ'),
      element('small', '', '縦の位置 ' + (type.yIndex + 1) + ' / 6'));
    $('#dialog-position').replaceChildren(positionDiagram(type), position);
    const pages = element('ol', 'atl-structure-list');
    type.pages.forEach((p) => pages.append(element('li', '', p)));
    $('#layout-preview').replaceChildren(pages);
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.classList.add('atl-dialog-open');
    $('.atl-dialog-close').focus({ preventScroll: true });
  }
  function typeButton(type, className) {
    const b = element('button', className);
    b.type = 'button';
    b.dataset.id = type.id;
    b.setAttribute('aria-label', type.id + ' ' + type.name + 'の設計方針を読む');
    b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', () => openType(type, b));
    return b;
  }
  function selectType(type) {
    selected = type;
    $('#direction-id').textContent = '設計の方向 / ' + type.id;
    $('#direction-name').textContent = type.name;
    $('#direction-summary').textContent = type.oneLiner;
    $('#direction-keywords').replaceChildren(...type.strengths.slice(0, 2).map((s) => element('span', '', s)));
    $('#selection-name').textContent = type.id + ' / ' + type.name;
    const ind = $('#direction-industries');
    if (ind) ind.textContent = (type.industries || []).slice(0, 4).join('、');
    $('#selection-detail').setAttribute('aria-label', type.id + ' ' + type.name + 'の設計ポイントを見る');
    document.querySelectorAll('.atl-map-cell').forEach((b) => {
      const active = b.dataset.id === type.id;
      b.setAttribute('aria-pressed', String(active));
      b.tabIndex = active ? 0 : -1;
    });
    $('#direction-detail').setAttribute('aria-label', type.id + ' ' + type.name + 'の設計ポイントを見る');
  }

  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
    const type = types.find((t) => t.xIndex === col && t.yIndex === 5 - row);
    const b = decorate(element('button', 'atl-map-cell'), type);
    b.type = 'button';
    b.dataset.id = type.id;
    const mark = element('span', 'atl-tile-coordinate');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.setProperty('--coordinate-x', type.xIndex);
    mark.style.setProperty('--coordinate-y', 5 - type.yIndex);
    b.append(mark, element('span', 'atl-tile-id', type.id));
    b.setAttribute('aria-label', type.id + ' ' + type.name + 'を表示');
    b.dataset.name = type.name;   /* マウスを重ねる・キーで選ぶと名前の札を出す（CSS） */
    b.addEventListener('click', () => selectType(type));
    $('#type-map').append(b);
  }
  selectType(selected);
  $('#direction-detail').addEventListener('click', () => openType(selected, $('#direction-detail')));
  $('#selection-detail').addEventListener('click', () => openType(selected, $('#selection-detail')));

  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth');
  /* ---------------- 一覧（検索・絞り込み・12件ずつ） ---------------- */
  /* トップから一覧を外した版でも動くよう、一覧の部品があるときだけ組み立てる */
  if ($('#archive-grid')) {
    function renderArchive() {
      const slice = filtered.slice(archivePage * 12, archivePage * 12 + 12);
      $('#archive-grid').replaceChildren(...slice.map((type) => {
        const b = typeButton(type, 'atl-archive-card');
        const heading = element('span', 'atl-direction-card-heading');
        const identity = element('span', 'atl-direction-identity');
        identity.append(element('small', '', type.id), element('strong', '', type.name));
        heading.append(positionDiagram(type), identity, element('span', 'atl-card-arrow', '↗'));
        const content = element('span', 'atl-direction-card-summary', type.oneLiner);
        const purpose = element('span', 'atl-direction-card-purpose', type.strengths[0]);
        b.append(heading, content, purpose);
        return b;
      }));
      $('#empty-results').hidden = filtered.length > 0;
      $('#result-count').textContent = filtered.length
        ? filtered.length + 'タイプ中 ' + (archivePage * 12 + 1) + '–' + (archivePage * 12 + slice.length) + 'を表示'
        : '該当するタイプ：0件';
      $('#archive-page').textContent = filtered.length ? (archivePage + 1) + ' / ' + Math.ceil(filtered.length / 12) : '0 / 0';
      $('#archive-prev').disabled = archivePage === 0;
      $('#archive-next').disabled = (archivePage + 1) * 12 >= filtered.length;
    }
    /* 全角「ＣＡ０９」でも当たるよう NFKC で寄せる */
    const normalize = (value) => value.normalize('NFKC').toLocaleLowerCase('ja').trim();
    function filterArchive() {
      const query = normalize($('#type-search').value), x = $('#filter-x').value, y = $('#filter-y').value;
      filtered = types.filter((t) => (x === '' || t.xIndex === Number(x)) && (y === '' || t.yIndex === Number(y))
        && normalize([t.id, t.name, t.oneLiner, ...t.designKeywords, ...t.strengths].join(' ')).includes(query));
      archivePage = 0;
      renderArchive();
    }
    $('#type-search-form').addEventListener('submit', (e) => e.preventDefault());
    $('#type-search').addEventListener('input', filterArchive);
    ['#filter-x', '#filter-y'].forEach((s) => $(s).addEventListener('change', filterArchive));
    $('#filter-reset').addEventListener('click', () => { $('#type-search-form').reset(); filterArchive(); });
    function turnArchive(delta) {
      archivePage += delta;
      renderArchive();
      $('#collection-title').focus({ preventScroll: true });
      $('#collection').scrollIntoView({ behavior: smooth() });
    }
    $('#archive-prev').addEventListener('click', () => { if (archivePage > 0) turnArchive(-1); });
    $('#archive-next').addEventListener('click', () => { if ((archivePage + 1) * 12 < filtered.length) turnArchive(1); });
    renderArchive();
  }

  /* ---------------- 詳細ダイアログ（閉じる・Escape・背景クリック・フォーカス復帰） ---------------- */
  $('.atl-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('atl-dialog-open');
    if (opener) opener.focus({ preventScroll: true });
  });

  /* ---------------- 制作確認用: 背景の比較（?review=1 のときだけ） ---------------- */
  document.querySelectorAll('[data-direction]').forEach((button) => button.addEventListener('click', () => {
    const direction = button.dataset.direction;
    $('.atl-room').dataset.room = direction;
    document.querySelectorAll('[data-direction]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b === button));
      b.querySelector('.atl-direction-check').textContent = b === button ? '✓' : '↗';
    });
    $('#direction-status').textContent = '現在：' + (direction === 'atelier' ? 'Warm Atelier' : 'Quiet Gallery') + '。空間は生成したコンセプト画像です。';
    $('.atl-room').scrollIntoView({ behavior: smooth() });
  }));
})();
