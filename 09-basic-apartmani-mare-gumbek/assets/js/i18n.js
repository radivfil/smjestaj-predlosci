/* ==============================================================
   APARTMANI MARE I GUMBEK — prekidac jezika (runtime)
   --------------------------------------------------------------
   Svaka jezicna verzija je vlastita staticna stranica (/en/, /de/,
   /it/) koju gradi tools/i18n.js — to je ono sto Google indeksira.
   Ova skripta sluzi samo gostu koji je vec na stranici: prebacuje
   tekst BEZ ponovnog ucitavanja, pa ostaju netaknuti scroll polozaj,
   otvorena galerija, otvoren chat i vec ispunjena polja obrasca.

   ZASTO NEMA AUTOMATSKOG PREUSMJERAVANJA
   Googlebot izvrsava JavaScript. Kad bismo po navigator.language
   tiho zamijenili sadrzaj, robot bi na hrvatskom URL-u zatekao
   engleski tekst i procitao ga kao nesklad s canonicalom. Zato se
   pri prvom posjetu pojavljuje nenametljiva traka s ponudom, a
   promjenu radi gost. Vec zapamcen odabir (localStorage) je izricita
   odluka gosta i primjenjuje se odmah, bez pitanja.
   ============================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var BASE = root.getAttribute("data-i18n-base") || "";
  var KEY = "mg-lang";
  var DEFAULT = "hr";

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  var menu = document.getElementById("langMenu");
  var btn = document.getElementById("langBtn");
  var cur = document.getElementById("langCurrent");
  var box = document.getElementById("lang");
  if (!menu || !btn || !box) return;

  /* Jezici citamo iz generiranog izbornika — jedan izvor istine. */
  var LANGS = [].slice.call(menu.querySelectorAll("a[data-lang]")).map(function (a) {
    return {
      code: a.getAttribute("data-lang"),
      href: a.getAttribute("href"),
      native: a.querySelector("span") ? a.querySelector("span").textContent : a.getAttribute("data-lang"),
      short: a.querySelector("small") ? a.querySelector("small").textContent : a.getAttribute("data-lang").toUpperCase()
    };
  });
  var codes = LANGS.map(function (l) { return l.code; });
  var langBy = function (c) { return LANGS.filter(function (l) { return l.code === c; })[0]; };

  var current = root.getAttribute("data-i18n-lang") || root.lang || DEFAULT;

  /* ---------- ucitavanje rjecnika (lijeno, tek kad zatreba) ---------- */
  var dictPromise = null;
  function loadDict() {
    if (window.MG_DICT) return Promise.resolve(window.MG_DICT);
    if (dictPromise) return dictPromise;
    dictPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      /* Ista datoteka za sve jezicne verzije. Na posluzitelju ide od
         korijena domene; otvori li netko predlozak s diska (file://),
         putanju izvodimo iz adrese ove skripte, jer tamo apsolutna ne radi. */
      var self = document.querySelector('script[src*="assets/js/i18n.js"]');
      s.src = (location.protocol === "file:" && self)
        ? self.getAttribute("src").replace(/i18n\.js.*$/, "dict.js")
        : BASE + "/assets/js/dict.js";
      s.onload = function () { window.MG_DICT ? resolve(window.MG_DICT) : reject(new Error("prazan rjecnik")); };
      s.onerror = function () { reject(new Error("rjecnik se nije ucitao")); };
      document.head.appendChild(s);
    });
    return dictPromise;
  }

  /* ---------- primjena prijevoda ---------- */
  var ATTRS = [
    ["data-i18n-content", "content"],
    ["data-i18n-aria", "aria-label"],
    ["data-i18n-alt", "alt"],
    ["data-i18n-placeholder", "placeholder"],
    ["data-i18n-title", "title"],
    ["data-i18n-caption", "data-caption"]
  ];

  function apply(code, dict) {
    var d = dict[code] || {};
    var t = function (k) { return d[k] != null ? d[k] : ""; };

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"));
      if (v !== "") el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n-html"));
      if (v !== "") el.innerHTML = v;
    });
    ATTRS.forEach(function (pair) {
      document.querySelectorAll("[" + pair[0] + "]").forEach(function (el) {
        var v = t(el.getAttribute(pair[0]));
        if (v !== "") el.setAttribute(pair[1], v);
      });
    });

    /* Tekstovi koje ispisuje glavna skripta (poruke obrasca, aria oznake). */
    if (window.MG_JS_TEXT) {
      Object.keys(window.MG_JS_TEXT).forEach(function (k) {
        if (d[k] != null && d[k] !== "") window.MG_JS_TEXT[k] = d[k];
      });
    }

    root.setAttribute("lang", code);
    root.setAttribute("data-i18n-lang", code);
    current = code;

    var l = langBy(code);
    if (cur && l) cur.textContent = l.short;
    menu.querySelectorAll("a[data-lang]").forEach(function (a) {
      a.setAttribute("aria-selected", String(a.getAttribute("data-lang") === code));
    });

    /* URL prati jezik, pa podijeljeni link vodi na pravu staticnu verziju.
       replaceState ne dira scroll polozaj ni povijest natrag. */
    if (l && location.protocol.indexOf("http") === 0) {
      try { history.replaceState(null, "", l.href + location.search + location.hash); } catch (e) {}
    }

    document.dispatchEvent(new CustomEvent("mg:lang", { detail: { lang: code } }));
  }

  function setLang(code, remember) {
    if (!code || code === current || codes.indexOf(code) === -1) return;
    loadDict().then(function (dict) {
      apply(code, dict);
      if (remember !== false) store.set(KEY, code);
    }).catch(function () {
      /* Bez rjecnika ostaje obican prijelaz na jezicnu verziju. */
      var l = langBy(code);
      if (l) { store.set(KEY, code); location.href = l.href; }
    });
  }

  /* ---------- otvaranje i zatvaranje izbornika ---------- */
  function openMenu(open) {
    box.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    if (open) menu.focus();
  }

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    openMenu(!box.classList.contains("open"));
  });

  menu.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-lang]");
    if (!a) return;
    e.preventDefault();
    openMenu(false);
    btn.focus();
    setLang(a.getAttribute("data-lang"));
  });

  document.addEventListener("click", function (e) {
    if (!box.contains(e.target)) openMenu(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !box.classList.contains("open")) return;
    openMenu(false);
    btn.focus();
  });

  /* Strelice kroz popis jezika — izbornik je listbox, ne obican meni. */
  menu.addEventListener("keydown", function (e) {
    var items = [].slice.call(menu.querySelectorAll("a[data-lang]"));
    var i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      var next = e.key === "ArrowDown" ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
      items[next].focus();
    }
  });

  /* ---------- prvi posjet: ponuda jezika preglednika ---------- */
  function browserLang() {
    var list = navigator.languages && navigator.languages.length
      ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < list.length; i++) {
      var c = String(list[i]).slice(0, 2).toLowerCase();
      if (codes.indexOf(c) !== -1) return c;
    }
    return null;
  }

  function offerLang(code) {
    var l = langBy(code);
    if (!l) return;
    loadDict().then(function (dict) {
      var d = dict[code] || {};
      var bar = document.createElement("div");
      bar.className = "lang-offer";
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-label", d["lang.label"] || "Language");

      var txt = document.createElement("p");
      txt.textContent = d["lang.offer"] || "";
      var yes = document.createElement("button");
      yes.type = "button";
      yes.className = "btn btn-primary";
      yes.textContent = d["lang.offerYes"] || l.native;
      var no = document.createElement("button");
      no.type = "button";
      no.className = "lang-offer__no";
      no.textContent = d["lang.offerNo"] || "×";
      no.setAttribute("aria-label", d["lang.offerNoAria"] || "Zatvori");

      bar.appendChild(txt); bar.appendChild(yes); bar.appendChild(no);
      document.body.appendChild(bar);
      requestAnimationFrame(function () { bar.classList.add("show"); });

      var close = function () { bar.classList.remove("show"); setTimeout(function () { bar.remove(); }, 300); };
      yes.addEventListener("click", function () { close(); setLang(code); });
      /* Odbijanje se pamti kao odabir trenutnog jezika — traka se vise ne javlja. */
      no.addEventListener("click", function () { close(); store.set(KEY, current); });
    }).catch(function () {});
  }

  var saved = store.get(KEY);
  if (saved && saved !== current && codes.indexOf(saved) !== -1) {
    setLang(saved, false);            // gost je vec birao — postuj bez pitanja
  } else if (!saved) {
    var guess = browserLang();
    if (guess && guess !== current) offerLang(guess);
  }
})();
