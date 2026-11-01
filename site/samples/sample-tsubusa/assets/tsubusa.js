/* つぶさ設備（見本）: 目次の現在地を示し、読み終えた章の四角にレ点を付ける（JSなしでも目次は使える） */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  if (!('IntersectionObserver' in window)) return;
  function update() {
    var y = window.scrollY + window.innerHeight * 0.35, cur = 0;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top + window.scrollY <= y) cur = i; });
    links.forEach(function (a, i) {
      a.classList.toggle('is-done', i < cur);
      if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); } }, { passive: true });
  update();
})();
