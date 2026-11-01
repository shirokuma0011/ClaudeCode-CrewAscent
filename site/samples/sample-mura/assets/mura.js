/* ムラ（架空）見本  mura.js  v1
   宣言の「履歴」の下のステッチを、ひと針ずつ1回だけ縫う（署名の動き）。
   JSが動かなくても、すべての文章は読める。動きを減らす設定では最初から縫い終わった状態。 */
(function () {
  'use strict';
  var h = document.querySelector('.hero');
  if (!h) return;
  requestAnimationFrame(function () { requestAnimationFrame(function () { h.classList.add('is-sewn'); }); });
})();
