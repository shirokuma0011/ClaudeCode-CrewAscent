/* シマヲ（架空）見本  shimawo.js  v1
   署名の動き「縞」: 読み込み時に、宣言の下で縞が横へ流れ、名前が現れる（1回）。
   章の区切りの細い縞も、画面に入ったときに1回だけ横へ引かれる。
   JSが動かなければ、縞も名前も最初から表示される。動きを減らす設定では動かさない。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var root = document.documentElement;
  root.classList.add('sh-anim');
  requestAnimationFrame(function () { requestAnimationFrame(function () { document.body.classList.add('is-loaded'); }); });
  var rules = document.querySelectorAll('.stripe-rule');
  if (!('IntersectionObserver' in window)) { rules.forEach(function (r) { r.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  rules.forEach(function (r) { io.observe(r); });
})();
