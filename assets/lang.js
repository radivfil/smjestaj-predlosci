/* ============================================================
   LOTA STUDIO — odabir jezika
   Dropdown (ARIA listbox), pamcenje izbora i detekcija jezika
   preglednika. Ucitava ga samo pocetna stranica i njezine jezicne
   verzije; /predlosci/ i demo predlosci ga ne koriste.

   NAPOMENA: stranica je staticna (GitHub Pages), pa Accept-Language
   header nije dostupan — jezik preglednika citamo iz navigator.languages.
   ============================================================ */
(function () {
  "use strict";

  /* Popis jezika NE upisujemo rucno: build u izbornik stavlja samo jezike
     koji stvarno postoje, pa ga citamo odande. Inace bismo posjetitelja s
     njemackim preglednikom poslali na /de/ prije nego ta verzija postoji. */
  var menu = document.getElementById("langMenu");
  var opts = menu ? Array.prototype.slice.call(menu.querySelectorAll('[role="option"]')) : [];
  var current = (document.documentElement.getAttribute("lang") || "hr").slice(0, 2).toLowerCase();
  var LANGS = [current].concat(opts.map(function (a) { return a.getAttribute("data-lang"); }))
    .filter(function (v, i, arr) { return v && arr.indexOf(v) === i; });
  var KEY = "lota-lang";
  var SESSION_KEY = "lota-lang-redirected";

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  /* Ako sessionStorage nije dostupan, vracamo "1" = preusmjeravanje se preskace. */
  var seen = {
    get: function () { try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return "1"; } },
    set: function () { try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {} }
  };

  var pathFor = function (code) { return code === "hr" ? "/" : "/" + code + "/"; };
  var closest = function (el, sel) {
    return el && el.closest ? el.closest(sel) : null;
  };

  /* ---------- 1. dropdown ---------- */
  var wrap = document.getElementById("lang");
  var btn = document.getElementById("langBtn");

  if (wrap && btn && menu) {
    var isOpen = function () { return btn.getAttribute("aria-expanded") === "true"; };
    var setOpen = function (open) {
      wrap.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    };
    var close = function (backToButton) { setOpen(false); if (backToButton) btn.focus(); };
    var focusAt = function (i) {
      if (!opts.length) return;
      opts[(i + opts.length) % opts.length].focus();
    };

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !isOpen();
      setOpen(open);
      if (open) setTimeout(function () { focusAt(0); }, 0);
    });

    /* strelica prema dolje/gore otvara listu i skace na prvu/zadnju stavku */
    btn.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      setOpen(true);
      var last = e.key === "ArrowUp";
      setTimeout(function () { focusAt(last ? opts.length - 1 : 0); }, 0);
    });

    menu.addEventListener("keydown", function (e) {
      var i = opts.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); focusAt(i + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); focusAt(i - 1); }
      else if (e.key === "Home") { e.preventDefault(); focusAt(0); }
      else if (e.key === "End") { e.preventDefault(); focusAt(opts.length - 1); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") { close(false); }
      else if (e.key === " " || e.key === "Spacebar") {
        /* Enter na <a> radi sam od sebe, razmak ne — dodajemo ga rucno */
        var a = closest(e.target, '[role="option"]');
        if (a) { e.preventDefault(); a.click(); }
      }
    });

    /* Izbor se pamti, a navigaciju obavlja sam link (obicni <a href>). */
    menu.addEventListener("click", function (e) {
      var a = closest(e.target, "[data-lang]");
      if (a) store.set(KEY, a.getAttribute("data-lang"));
    });

    document.addEventListener("click", function (e) {
      if (isOpen() && !wrap.contains(e.target)) close(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) close(true);
    });
  }

  /* ---------- 2. pamcenje jezika ---------- */
  /* Dolazak na jezicnu verziju racuna se kao korisnikov izbor. */
  if (LANGS.indexOf(current) !== -1 && current !== "hr") store.set(KEY, current);

  /* ---------- 3. jezik preglednika (samo prvi posjet) ----------
     Preusmjeravamo iskljucivo s hrvatske (korijenske) verzije i najvise
     jednom po sesiji, da tipka Natrag ne vrti posjetitelja u krug.
     Spremljeni izbor uvijek ima prednost pred jezikom preglednika. */
  if (current === "hr" && !seen.get()) {
    var saved = store.get(KEY);
    var target = null;

    if (saved && LANGS.indexOf(saved) !== -1) {
      if (saved !== "hr") target = saved;
    } else if (!saved) {
      var prefs = navigator.languages || [navigator.language || "hr"];
      for (var i = 0; i < prefs.length; i++) {
        var code = String(prefs[i]).slice(0, 2).toLowerCase();
        if (LANGS.indexOf(code) !== -1) {
          if (code !== "hr") target = code;
          break;
        }
      }
    }
    if (target) {
      seen.set();
      location.replace(pathFor(target) + location.hash);
    }
  }
})();
