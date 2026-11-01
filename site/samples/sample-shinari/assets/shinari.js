/* しなり（架空）見本  shinari.js  v4
   1) 表紙の写真の下で、しなる細い線を一度だけ引く（署名の動き）
   2) 受付時間の表で、今日の行に小さな印をつける（ローカル時刻）
   JSが動かなくても、すべての文章は読める。動きを減らす設定では動かさない（CSS側で止める）。 */
(function () {
  'use strict';
  var edge = document.querySelector('.cover__edge');
  if (edge) requestAnimationFrame(function () { requestAnimationFrame(function () { edge.classList.add('is-drawn'); }); });

  var day = new Date().getDay();
  var row = document.querySelector('.hours tr[data-day="' + day + '"]');
  if (row) {
    row.classList.add('is-today');
    row.setAttribute('aria-current', 'date');
    var st = row.querySelector('.st');
    var closed = row.classList.contains('is-closed');
    if (st) st.innerHTML = '<span class="today-mark' + (closed ? ' is-off' : '') + '">' + (closed ? '本日休み' : '本日営業') + '</span>';
  }
})();
