/* マドノヒ（架空）見本サイト — 時刻で変わる窓の光・営業中の札・一日の時間割・今日のおすすめ・問い合わせ欄。外部へは何も送らない */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var now = new Date();
  var h = now.getHours() + now.getMinutes() / 60;
  var day = now.getDay(); /* 0=日 … 3=水（定休） */
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var clock = now.getHours() + ':' + pad(now.getMinutes());
  var NAMES = { morning: '朝', noon: '昼', evening: '夕' };

  /* 署名の動き：見る時刻で窓の光の色が変わる（読み込み時に1回だけ。動き続けない） */
  var byClock = (h >= 5 && h < 10) ? 'morning' : ((h >= 10 && h < 15) ? 'noon' : 'evening');
  var initial = reduce ? 'noon' : byClock;
  var note = $('#win-note');
  var setTime = function (t, why) {
    root.setAttribute('data-time', t);
    var r = $('.times input[value="' + t + '"]');
    if (r) r.checked = true;
    if (note) note.textContent = why || ('「' + NAMES[t] + '」の窓の光で表示しています。');
  };
  var firstWhy = reduce ? '動きを減らす設定のため、昼の光で表示しています。' : '端末の時刻（' + clock + '）に合わせて、' + NAMES[initial] + 'の光にしています。';
  setTime('noon', firstWhy);
  if (initial !== 'noon') setTimeout(function () { setTime(initial, firstWhy); }, 400);
  $$('.times input').forEach(function (r) { r.addEventListener('change', function () { setTime(r.value); }); });

  /* 営業中の札（端末の時刻で判断。見本上の営業時間 8:00〜18:00・水曜定休） */
  var state = $('#open-state'), sub = $('#open-sub'), sign = $('.sign');
  var open = day !== 3 && h >= 8 && h < 18;
  if (state) {
    var main, small;
    if (day === 3) { main = '本日は定休日'; small = '水曜はお休み・木曜8:00から'; }
    else if (open) { main = 'いま営業中'; small = h >= 17.5 ? 'ラストオーダーは17:30' : '18:00まで・水曜定休'; }
    else if (h < 8) { main = '準備中'; small = '8:00から'; }
    else { main = '本日の営業は終了'; small = (day === 2 ? '明日は定休日' : '明日は8:00から'); }
    state.textContent = main;
    if (sub) sub.textContent = small;
    if (sign) sign.classList.toggle('is-open', open);
  }

  /* 一日の時間割：いまの位置と、いまの窓 */
  var slot = h >= 8 && h < 10 ? 'morning' : (h >= 10 && h < 15 ? 'noon' : (h >= 15 && h < 18 ? 'evening' : ''));
  if (open && slot) {
    var seg = $('.bar__seg[data-slot="' + slot + '"]');
    if (seg) seg.classList.add('is-now');
    var mark = $('#bar-now');
    if (mark) { mark.style.left = ((h - 8) / 10 * 100) + '%'; mark.hidden = false; }
  }
  var wd = $('.week li[data-day="' + day + '"]');
  if (wd) { wd.classList.add('is-today'); wd.setAttribute('aria-current', 'date'); }

  /* 今日のおすすめ（曜日ごとの見本。水曜は定休日なので翌日の分を出す） */
  var TODAY = {
    0: ['スコーン', '外は香ばしく、中はほろり。自家製のりんごジャムを添えます。', '300'],
    1: ['スコーン', '外は香ばしく、中はほろり。自家製のりんごジャムを添えます。', '300'],
    2: ['フィナンシェ', '焦がしバターの香りが立つ、焼き上がりから半日がいちばんの菓子。浅煎りの酸味とよく合います。', '300'],
    4: ['バナナブレッド', 'よく熟したバナナを、粉より多く入れています。厚めに切って、軽く温めて出します。', '350'],
    5: ['フィナンシェ', '焦がしバターの香りが立つ、焼き上がりから半日がいちばんの菓子。浅煎りの酸味とよく合います。', '300'],
    6: ['季節のタルト', 'その時期の果物を並べて焼くタルト。土曜だけ、6切れ分を焼きます。', '480']
  };
  var DAYS = ['日', '月', '火', '水', '木', '金', '土'];
  var box = $('#today');
  if (box) {
    var d = day === 3 ? 4 : day;
    var it = TODAY[d];
    $('[data-t="day"]', box).textContent = (day === 3 ? '明日' : '今日') + '（' + DAYS[d] + '）のおすすめ';
    $('[data-t="name"]', box).textContent = it[0];
    $('[data-t="text"]', box).textContent = it[1];
    $('[data-t="price"]', box).textContent = it[2];
  }

  /* 問い合わせ欄：入力中・エラー・送信中・送信後（見本のため送信しない）
     止めるのは「入力が足りないとき」と「送信中の二度押し」だけ。正しい送信は共通の枠（crew-frame.js）へ届け、見本ダイアログを出す */
  $$('form[data-sample-form]').forEach(function (form) {
    var st = $('[data-form-state]', form);
    var btn = $('button[type="submit"]', form);
    var label = btn ? btn.querySelector('span').textContent : '';
    var busy = false;
    var dialog = document.getElementById('ca-sample-dialog');
    $$('input, select, textarea', form).forEach(function (el) {
      var f = el.closest('.field');
      var on = function () { if (f) { f.classList.add('is-typing'); if (el.checkValidity()) f.classList.remove('is-error'); } if (st && st.classList.contains('is-sent')) { st.className = 'form__state'; st.textContent = ''; } };
      el.addEventListener('input', on);
      el.addEventListener('change', on);
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
    });
    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      var bad = [];
      $$('input, select, textarea', form).forEach(function (el) {
        var f = el.closest('.field'); var ok = el.checkValidity();
        if (f) f.classList.toggle('is-error', !ok);
        if (!ok) bad.push(el);
      });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        st.className = 'form__state is-error';
        st.textContent = '入力が足りない項目が ' + bad.length + ' つあります。赤い文字の案内をご確認ください。';
        bad[0].focus();
        return;
      }
      /* 正しい入力：送信中にして、そのまま共通の枠へ（ダイアログが開く） */
      busy = true;
      btn.disabled = true; btn.querySelector('span').textContent = '送信しています…';
      st.className = 'form__state is-busy';
      st.textContent = '送信しています。';
      var done = function () {
        busy = false;
        btn.disabled = false; btn.querySelector('span').textContent = label;
        st.className = 'form__state is-sent';
        st.textContent = 'この見本では送信していません。入力した内容は、どこにも保存されていません。';
      };
      if (dialog && typeof dialog.showModal === 'function') {
        var onClose = function () { dialog.removeEventListener('close', onClose); done(); };
        dialog.addEventListener('close', onClose);
        /* ダイアログが開いている間は、見本側の文は「送信しています」のまま（二重に出さない） */
      } else {
        setTimeout(done, 600);
      }
    }, true);
  });
})();
