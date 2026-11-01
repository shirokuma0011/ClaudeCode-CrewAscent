/* =====================================================================
   クルーアセント 見本サイト共通の枠  crew-frame.js  v2026-10-15
   置き場所: site/samples/_shared/crew-frame.js（10件の見本で共有）

   見本サイトの「予約する」「購入する」「送信する」などは実際には動かない。
   代わりに、見本であることを伝えるダイアログを出す。
     <a href="#" data-sample-action="予約">予約する</a>
     <form data-sample-form> … </form>   … 送信を止めてダイアログを出す
   ・外部へは何も送らない。記録もしない
   ・ダイアログは <dialog>。Escape で閉じ、開いたボタンへフォーカスを戻す
   ===================================================================== */
(function () {
  'use strict';
  var dialog = document.getElementById('ca-sample-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  var text = dialog.querySelector('[data-ca-dialog-text]');
  var opener = null;

  function open(label, from) {
    opener = from || null;
    if (text) {
      text.textContent = '「' + (label || 'この操作') + '」は、見本のため実際には行われません。' +
        '実際の制作では、予約サービスや問い合わせフォームなど、事業者が使っている窓口へつなぎます。';
    }
    dialog.showModal();
    var close = dialog.querySelector('[data-ca-close]');
    if (close) close.focus();
  }
  dialog.addEventListener('close', function () {
    if (opener && typeof opener.focus === 'function') opener.focus();
    opener = null;
  });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();               /* 背景を押すと閉じる */
    if (e.target.closest && e.target.closest('[data-ca-close]')) dialog.close();
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-sample-action]');
    if (!el) return;
    e.preventDefault();
    open(el.getAttribute('data-sample-action'), el);
  });
  document.addEventListener('submit', function (e) {
    var form = e.target.closest && e.target.closest('[data-sample-form]');
    if (!form) return;
    e.preventDefault();
    open(form.getAttribute('data-sample-form') || '送信', document.activeElement);
  });
})();
