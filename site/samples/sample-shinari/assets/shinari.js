/* しなり（架空）見本  shinari.js
   1) 最初の画面のしなる線を描く（1回）
   2) 章の区切りの線が、画面に入ったときに1回しなって戻る（署名の動き）
   3) 受付時間の表で、今日の行を強調する（ローカル時刻）
   JSが動かなくても、すべての文章は読める。動きを減らす設定では動かさない。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1) 最初の画面の線 */
  var curve = document.querySelector('.hero__curve');
  if (curve) requestAnimationFrame(function () { curve.classList.add('is-drawn'); });

  /* 2) 章の区切り */
  var bends = document.querySelectorAll('.bend');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: [0, 0.6, 1], rootMargin: '0px 0px -12% 0px' });
    bends.forEach(function (b) { io.observe(b); });
  }

  /* 3) 今日の受付時間 */
  var day = new Date().getDay();
  var row = document.querySelector('.hours tr[data-day="' + day + '"]');
  if (row) {
    row.classList.add('is-today');
    var st = row.querySelector('.st');
    var closed = row.classList.contains('is-closed');
    if (st) st.innerHTML = '<span class="today-mark' + (closed ? ' is-off' : '') + '">' + (closed ? '本日休み' : '本日営業') + '</span>';
    row.setAttribute('aria-current', 'date');
    if (!reduce && 'IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { row.classList.add('glow'); io2.disconnect(); }
      }, { threshold: 1 });
      io2.observe(row);
    }
  }
})();
