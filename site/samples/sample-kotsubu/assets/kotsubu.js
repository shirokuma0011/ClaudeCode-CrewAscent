/* こつぶ動物病院（架空）見本  kotsubu.js  v1
   最初の画面の「診療時間」に、今日がいま診療中か・休みかを小さく添える（ローカル時刻）。
   水・日の午後、祝日は休み（祝日は判定しない）。JSが動かなくても、すべての文章は読める。動きはない。 */
(function () {
  'use strict';
  var dd = document.querySelector('.three div:first-child small');
  if (!dd) return;
  var now = new Date(), d = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
  var am = m >= 540 && m < 720, pm = m >= 960 && m < 1140, pmOff = (d === 0 || d === 3);
  var open = am || (pm && !pmOff);
  var s = document.createElement('span');
  s.className = 'now ' + (open ? 'is-open' : 'is-closed');
  s.textContent = open ? 'いま診療中' : 'いまは診療時間外';
  dd.parentNode.insertBefore(s, dd);
})();
