/* sample-result.js — 診断ガイドページに、実物の結果レポートの一部をそのまま描く。
   スクリーンショット画像ではなく、result.js と同じデータから組み立てる。 */
(function () {
  'use strict';
  var host = document.getElementById('sample-result');
  if (!host || !window.CrewData) return;
  var slug = host.getAttribute('data-sample-type') || 'helpful-guidance';
  var t = null;
  for (var i = 0; i < window.CrewData.TYPES.length; i++) {
    if (window.CrewData.TYPES[i].slug === slug) { t = window.CrewData.TYPES[i]; break; }
  }
  if (!t || !t.detail) return;
  var d = t.detail;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function li(a) { return a.map(function (v) { return '<li>' + esc(v) + '</li>'; }).join(''); }

  var cells = '';
  for (var r = 5; r >= 0; r--) {
    for (var c = 0; c < 6; c++) {
      var area = (r >= 3 ? (c < 3 ? 'tl' : 'tr') : (c < 3 ? 'bl' : 'br'));
      var on = (c === t.xIndex && r === t.yIndex);
      cells += '<i class="' + (on ? 'on' : area) + '"></i>';
    }
  }

  host.innerHTML =
    '<div class="sr-demo">' +
      '<div class="sr-demo__mast">' +
        '<p class="sr-demo__label">診断結果の例</p>' +
        '<p class="sr-demo__id">' + esc(t.id) + '</p>' +
        '<h3 class="sr-demo__name">' + esc(t.name) + '</h3>' +
        '<p class="sr-demo__one">' + esc(t.oneLiner) + '</p>' +
      '</div>' +
      '<div class="sr-demo__body">' +
        '<div><h4>36タイプ上の位置</h4><div class="mini-map" aria-hidden="true">' + cells + '</div>' +
          '<p class="hint">' + esc(d.position.xStep) + '<br>' + esc(d.position.yStep) + '</p></div>' +
        '<div><h4>3分で読む要約</h4><p>' + esc(d.position.summary3min) + '</p>' +
          '<h4>ファーストビューの設計</h4><p class="mb-0">' + esc(d.firstViewPlan.headlineRole) + '。' + esc(d.firstViewPlan.supportingInformation) + '。</p></div>' +
        '<div><h4>情報の優先順（上から）</h4><ol class="rank-list">' + li(d.contentPriority.slice(0, 5)) + '</ol>' +
          '<h4>避けたい構成</h4><ul class="plain-list">' + li(d.avoidPatterns.slice(0, 2)) + '</ul></div>' +
      '</div>' +
      '<p class="sr-demo__foot">実際の結果ページでは、このほかに四つの回答傾向、文章の調子、配色・文字・画像・動きの方針、基本SEOの考え方、公開後の運用、合いやすい業種の理由、近い3タイプ、制作相談で確認する質問を表示します。</p>' +
    '</div>';
}());
