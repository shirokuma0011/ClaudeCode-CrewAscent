/* ひとうね農園（架空）見本  hitoune.js  v1
   1) 「とってから並ぶまで」の時間の帯を、画面に入ったときに1回伸ばす（署名の動き）
   2) 営業日の帯で、今日の曜日に印をつける（ローカル時刻）
   JSが動かなくても、すべての文章は読める。動きを減らす設定では伸ばさない（最初から表示）。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clock = document.querySelector('.clock');
  if (clock) {
    if (reduce || !('IntersectionObserver' in window)) clock.classList.add('is-in');
    else {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { clock.classList.add('is-in'); io.disconnect(); }
      }, { threshold: 0.8 });
      io.observe(clock);
    }
  }
  var li = document.querySelector('.days__row li[data-day="' + new Date().getDay() + '"]');
  if (li) { li.classList.add('is-today'); li.setAttribute('aria-current', 'date'); }
})();
