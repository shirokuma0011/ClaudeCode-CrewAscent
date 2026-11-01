/* ゆずり湯（架空）見本  yuzuriyu.js  v1
   1) ヘッダーの営業時間を、今日の曜日に合わせて「本日」「本日休み」に書き換える（月曜休み・日曜は朝湯つき）
   2) 読みものの章が画面に入ったら、目地の線を上から下へ1回だけ描く（署名の動き）
   JSが動かなくても、すべての文章は読める。動きを減らす設定では描かない。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var h = document.querySelector('.head__hours');
  if (h) {
    var d = new Date().getDay();
    h.innerHTML = d === 1 ? '<span>本日</span>休み' : (d === 0 ? '<span>本日</span>朝湯と15:00–24:00' : '<span>本日</span>15:00–24:00');
  }
  var bento = document.querySelector('.bento');
  if (bento && !reduce && 'IntersectionObserver' in window) {
    bento.classList.add('is-ready');
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { bento.classList.add('is-in'); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(bento);
  }
})();
