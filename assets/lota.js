/* ============================================================
   LOTA STUDIO — dijeljena interakcija
   Reveal na scroll, sjena navigacije, mobilni izbornik.
   ============================================================ */
(function () {
  "use strict";

  /* Reveal na scroll */
  var els = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(els, function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  /* Obrub ispod navigacije nakon scrolla */
  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("is-stuck", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobilni izbornik */
  var burger = document.getElementById("burger");
  var drawer = document.getElementById("drawer");
  if (burger && drawer) {
    var close = function () {
      document.body.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };
    burger.addEventListener("click", function () {
      var open = !document.body.classList.contains("is-open");
      document.body.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
    drawer.addEventListener("click", function (e) { if (e.target.tagName === "A") close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 860) close(); });
  }

  /* Godina u footeru */
  var y = document.getElementById("year");
  if (y) { y.textContent = new Date().getFullYear(); }
})();
