/* ハウスクリーニング ぬぐい（見本）: 料金の目安の計算。JSがないときは、初期の選択（台所＋浴室）の合計を表示したまま */
(function () {
  var f = document.getElementById('calc');
  if (!f) return;
  var out = f.querySelector('output b');
  function yen(n) { return n.toLocaleString('ja-JP'); }
  function calc() {
    var places = f.querySelectorAll('input[name="p"]:checked'), sum = 0;
    places.forEach(function (i) { sum += +i.value; });
    var dirt = f.querySelector('input[name="dirt"]');
    if (dirt.checked) sum += +dirt.value * places.length;
    var park = f.querySelector('input[name="park"]');
    if (park.checked && places.length) sum += +park.value;
    out.textContent = yen(sum);
  }
  f.addEventListener('change', calc);
  calc();
})();
