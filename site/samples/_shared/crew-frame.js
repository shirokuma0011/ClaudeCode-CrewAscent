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

/* ページを開いたら、いつも一番上から（ページ内の #場所 へのリンクを除く）。
   プレビューなどの枠の中では、枠の外側の画面もこのページの先頭へ合わせる。 */
(function () {
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  var framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  var moved = false;
  window.addEventListener('wheel', function () { moved = true; }, { passive: true, once: true });
  window.addEventListener('touchmove', function () { moved = true; }, { passive: true, once: true });
  function toTop(force) {
    if (location.hash && location.hash.length > 1) return;
    if (moved && !force) return;
    window.scrollTo(0, 0);
    if (!framed || !document.body) return;
    try {
      var probe = document.createElement('span');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;pointer-events:none;';
      document.body.appendChild(probe);
      probe.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      document.body.removeChild(probe);
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { toTop(true); });
  else toTop(true);
  window.addEventListener('load', function () { toTop(false); });
  window.addEventListener('pageshow', function (ev) { if (ev.persisted) { moved = false; toTop(true); } });
})();
