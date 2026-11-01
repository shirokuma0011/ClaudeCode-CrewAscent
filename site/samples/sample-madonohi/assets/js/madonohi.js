/* マドノヒ（架空）見本サイト — 時間帯の窓・営業中の表示・今日のおすすめ。外部へは何も送らない */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var now = new Date();
  var h = now.getHours() + now.getMinutes() / 60;
  var day = now.getDay(); /* 0=日 … 3=水（定休） */
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var clock = now.getHours() + ':' + pad(now.getMinutes());
  var NAMES = { morning: '朝', noon: '昼', evening: '夕' };

  /* 署名: 時間帯の窓（読み込み時に1回だけ決める。動き続けない） */
  var byClock = (h >= 5 && h < 10.5) ? 'morning' : ((h >= 10.5 && h < 15) ? 'noon' : 'evening');
  var initial = reduce ? 'noon' : byClock;
  var note = document.getElementById('win-note');
  var setTime = function (t, why) {
    root.setAttribute('data-time', t);
    var r = document.querySelector('.times input[value="' + t + '"]');
    if (r) r.checked = true;
    if (note) note.textContent = why || ('いまは「' + NAMES[t] + '」の窓を表示しています。');
  };
  /* 少し待ってから光を入れる（最初は昼の光 → その時刻の光へ、ゆっくり変わる） */
  setTime('noon', '');
  var firstWhy = reduce ? '動きを減らす設定のため、昼の光で表示しています。' : '端末の時刻（' + clock + '）に合わせて、' + NAMES[initial] + 'の光にしています。';
  if (initial === 'noon') setTime('noon', firstWhy);
  else setTimeout(function () { setTime(initial, firstWhy); }, 350);
  document.querySelectorAll('.times input').forEach(function (r) {
    r.addEventListener('change', function () { setTime(r.value); });
  });

  /* 営業中かどうか（端末の時刻で判断。見本上の営業時間 8:00〜18:00・水曜定休） */
  var state = document.getElementById('open-state');
  var open = day !== 3 && h >= 8 && h < 18;
  if (state) {
    var txt;
    if (day === 3) txt = '今日は定休日（水曜）';
    else if (open) txt = 'いま営業中・18:00まで';
    else if (h < 8) txt = '準備中・8:00から';
    else txt = '本日の営業は終了しました';
    state.textContent = txt;
    state.classList.toggle('is-open', open);
  }

  /* 営業時間の窓と曜日に「いま」を付ける */
  var slot = h >= 8 && h < 10 ? 'morning' : (h >= 10 && h < 15 ? 'noon' : (h >= 15 && h < 18 ? 'evening' : ''));
  if (open && slot) {
    var li = document.querySelector('.hours li[data-slot="' + slot + '"]');
    if (li) { li.classList.add('is-now'); var tag = li.querySelector('.now'); if (tag) tag.hidden = false; }
  }
  var wd = document.querySelector('.week li[data-day="' + day + '"]');
  if (wd) { wd.classList.add('is-today'); wd.setAttribute('aria-current', 'date'); }

  /* 今日のおすすめ（曜日ごとの見本。水曜は定休日なので翌日の分を出す） */
  var TODAY = {
    0: ['スコーン', 'けさ焼いた', '外は香ばしく、中はほろり。クロテッドクリームの代わりに、自家製のりんごジャムを添えます。', '300'],
    1: ['スコーン', 'けさ焼いた', '外は香ばしく、中はほろり。クロテッドクリームの代わりに、自家製のりんごジャムを添えます。', '300'],
    2: ['フィナンシェ', 'けさ焼いた', '焦がしバターの香りが立つ、焼き上がりから半日がいちばんの菓子。浅煎りの酸味とよく合います。', '300'],
    4: ['バナナブレッド', 'けさ焼いた', 'よく熟したバナナを、粉より多く入れています。厚めに切って、軽く温めて出します。', '350'],
    5: ['フィナンシェ', 'けさ焼いた', '焦がしバターの香りが立つ、焼き上がりから半日がいちばんの菓子。浅煎りの酸味とよく合います。', '300'],
    6: ['季節のタルト', '土曜だけ', 'その時期の果物を並べて焼くタルト。土曜だけ、6切れ分を焼きます。', '480']
  };
  var DAYS = ['日', '月', '火', '水', '木', '金', '土'];
  var box = document.getElementById('today');
  if (box) {
    var d = day === 3 ? 4 : day;
    var it = TODAY[d];
    box.querySelector('[data-t="day"]').textContent = (day === 3 ? '今日は定休日。明日（' + DAYS[d] + '）' : '今日（' + DAYS[d] + '）') + 'のおすすめ';
    box.querySelector('[data-t="en"]').textContent = it[1];
    box.querySelector('[data-t="name"]').textContent = it[0];
    box.querySelector('[data-t="text"]').textContent = it[2];
    box.querySelector('[data-t="price"]').textContent = it[3];
  }

  /* 補助: 湯気は画面に入っているときだけ揺らす */
  var steams = document.querySelectorAll('.steam');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('is-on', e.isIntersecting); });
    });
    steams.forEach(function (s) { io.observe(s); });
  }
})();
