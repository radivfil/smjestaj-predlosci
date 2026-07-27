/* ==============================================================
   VILLA SERENA — ZAJEDNIČKA LOGIKA ZA SVE STRANICE
   1) jezici (i18n)   2) tema   3) navigacija   4) scroll reveal
   5) lightbox        6) galerija + filteri     7) jedinice
   8) recenzije       9) okolica (POI)          10) forme
   ============================================================== */

(function () {
  "use strict";
  var VS = window.VS = window.VS || {};

  /* ---------- mali helperi ---------- */
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var IMG = "https://images.unsplash.com/";           /* baza za Unsplash slike iz data.js */
  var img = function (id, w, q) { return IMG + id + "?auto=format&fit=crop&w=" + (w || 800) + "&q=" + (q || 72); };

  /* ==============================================================
     1. JEZICI
     ============================================================== */
  var DEFAULT_LANG = "hr";
  var supported = (VS.langs || []).map(function (l) { return l.code; });

  function detectLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q && supported.indexOf(q) > -1) return q;
    var saved = store.get("vs-lang");
    if (saved && supported.indexOf(saved) > -1) return saved;
    var nav = (navigator.language || "hr").slice(0, 2).toLowerCase();
    return supported.indexOf(nav) > -1 ? nav : DEFAULT_LANG;
  }

  VS.lang = detectLang();

  /* prijevod: t("kljuc", {n: 3}) */
  VS.t = function (key, vars) {
    var dict = (VS.i18n && VS.i18n[VS.lang]) || {};
    var base = (VS.i18n && VS.i18n[DEFAULT_LANG]) || {};
    var s = dict[key] != null ? dict[key] : (base[key] != null ? base[key] : key);
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]); });
    return s;
  };

  VS.money = function (amount) {
    try {
      return new Intl.NumberFormat(VS.lang === "hr" ? "hr-HR" : VS.lang, {
        style: "currency", currency: VS.property.currency, maximumFractionDigits: 0
      }).format(amount);
    } catch (e) { return VS.property.currencySymbol + Math.round(amount); }
  };

  VS.dateLong = function (d) {
    try { return new Intl.DateTimeFormat(VS.lang === "hr" ? "hr-HR" : VS.lang, { day: "numeric", month: "long", year: "numeric" }).format(d); }
    catch (e) { return d.toISOString().slice(0, 10); }
  };

  function applyI18n() {
    document.documentElement.setAttribute("lang", VS.lang);
    $$("[data-i18n]").forEach(function (el) { el.textContent = VS.t(el.dataset.i18n); });
    $$("[data-i18n-html]").forEach(function (el) { el.innerHTML = VS.t(el.dataset.i18nHtml); });
    $$("[data-i18n-placeholder]").forEach(function (el) { el.placeholder = VS.t(el.dataset.i18nPlaceholder); });
    $$("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", VS.t(el.dataset.i18nAria)); });
    $$("[data-i18n-content]").forEach(function (el) { el.setAttribute("content", VS.t(el.dataset.i18nContent)); });
    $$("[data-i18n-title]").forEach(function (el) { el.setAttribute("title", VS.t(el.dataset.i18nTitle)); });
  }

  VS.setLang = function (code) {
    if (supported.indexOf(code) < 0) return;
    VS.lang = code;
    store.set("vs-lang", code);
    applyI18n();
    buildLangMenu();
    document.dispatchEvent(new CustomEvent("vs:lang", { detail: { lang: code } }));
  };

  function buildLangMenu() {
    var btn = $("#langBtn"), menu = $("#langMenu");
    if (!btn || !menu) return;
    var cur = (VS.langs || []).filter(function (l) { return l.code === VS.lang; })[0] || VS.langs[0];
    $("#langCurrent").textContent = cur.short;
    menu.innerHTML = VS.langs.map(function (l) {
      return '<button type="button" data-lang="' + l.code + '" aria-current="' + (l.code === VS.lang) + '">' +
             l.label + '<i>' + l.short + '</i></button>';
    }).join("");
  }

  function initLang() {
    buildLangMenu();
    applyI18n();
    var btn = $("#langBtn"), menu = $("#langMenu");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
    menu.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-lang]");
      if (!b) return;
      VS.setLang(b.dataset.lang);
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("click", function () { menu.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { menu.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });
  }

  /* ==============================================================
     2. TEMA
     ============================================================== */
  function initTheme() {
    var root = document.documentElement;
    var saved = store.get("vs-theme");
    if (saved) root.setAttribute("data-theme", saved);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.setAttribute("data-theme", "dark");
    var t = $("#themeToggle");
    if (!t) return;
    t.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store.set("vs-theme", next);
    });
  }

  /* ==============================================================
     3. NAVIGACIJA
     ============================================================== */
  function initNav() {
    var header = $("#header");
    if (header) {
      var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 40); };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    var toggle = $("#navToggle"), links = $("#navLinks"), scrim = $("#navScrim");
    if (!toggle || !links) return;
    var set = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      links.classList.toggle("open", open);
      if (scrim) scrim.classList.toggle("on", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", function () { set(toggle.getAttribute("aria-expanded") !== "true"); });
    if (scrim) scrim.addEventListener("click", function () { set(false); });
    links.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
  }

  /* ==============================================================
     4. SCROLL REVEAL
     ============================================================== */
  function initReveal() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .06 });
    els.forEach(function (el) { io.observe(el); });
  }
  VS.observeReveal = function (scope) {
    $$(".reveal", scope).forEach(function (el) { el.classList.add("in"); });
  };

  /* ==============================================================
     5. LIGHTBOX (radi sa svakim [data-lightbox] kontejnerom)
     ============================================================== */
  function initLightbox() {
    var lb = $("#lightbox");
    if (!lb) return;
    var lbImg = $("#lbImg"), lbCap = $("#lbCap");
    var items = [], idx = 0, lastFocus = null;

    function collect(container) {
      items = $$("button[data-full]", container).filter(function (b) { return !b.classList.contains("hide"); });
    }
    function show(i) {
      idx = (i + items.length) % items.length;
      var b = items[idx];
      lbImg.src = b.dataset.full;
      lbImg.alt = b.dataset.cap || "";
      lbCap.textContent = (b.dataset.cap || "") + "  (" + (idx + 1) + "/" + items.length + ")";
    }
    function open(container, i) {
      collect(container); show(i);
      lastFocus = document.activeElement;
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
      $("#lbClose").focus();
    }
    function close() {
      lb.classList.remove("open");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-lightbox] button[data-full]");
      if (!btn) return;
      var container = btn.closest("[data-lightbox]");
      collect(container);
      open(container, items.indexOf(btn));
    });
    $("#lbClose").addEventListener("click", close);
    $("#lbPrev").addEventListener("click", function () { show(idx - 1); });
    $("#lbNext").addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    var tx = 0;
    lb.addEventListener("touchstart", function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      var d = e.changedTouches[0].clientX - tx;
      if (Math.abs(d) > 50) show(idx + (d < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ==============================================================
     6. GALERIJA (crta se iz VS.gallery)
     ============================================================== */
  function renderGallery() {
    var host = $("#galleryGrid");
    if (!host) return;
    var limit = parseInt(host.dataset.limit || "0", 10);
    var list = limit ? VS.gallery.slice(0, limit) : VS.gallery;
    host.innerHTML = list.map(function (g) {
      return '<button type="button" class="' + (g.span || "") + '" data-cat="' + g.cat + '" ' +
             'data-full="' + img(g.src, 1600, 78) + '" data-cap="' + VS.t(g.capKey) + '">' +
             '<img src="' + img(g.src, 800, 70) + '" alt="' + VS.t(g.capKey) + '" loading="lazy" />' +
             '<span>' + VS.t(g.capKey) + '</span></button>';
    }).join("");
  }

  function initGalleryFilters() {
    var bar = $("#galleryFilters");
    if (!bar) return;
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-filter]");
      if (!b) return;
      $$("button", bar).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      var f = b.dataset.filter;
      $$("#galleryGrid button").forEach(function (item) {
        item.classList.toggle("hide", f !== "all" && item.dataset.cat !== f);
      });
    });
  }

  /* ==============================================================
     7. SMJEŠTAJNE JEDINICE (crtaju se iz VS.units)
     ============================================================== */
  function lowestRate(u) {
    return Math.min.apply(null, Object.keys(u.rates).map(function (k) { return u.rates[k]; }));
  }

  function renderUnits() {
    var host = $("#unitsList");
    if (host) {
      host.innerHTML = VS.units.map(function (u, i) {
        return '' +
        '<article class="unit reveal" id="' + u.id + '">' +
          '<div class="unit__media">' +
            '<div class="unit__main"><img src="' + u.images[0] + '" alt="' + VS.t(u.nameKey) + '" loading="lazy" id="main-' + u.id + '" /></div>' +
            '<div class="unit__thumbs" data-unit="' + u.id + '">' +
              u.images.map(function (src, j) {
                return '<button type="button" data-src="' + src + '" aria-current="' + (j === 0) + '" aria-label="' + VS.t(u.nameKey) + ' — ' + (j + 1) + '">' +
                       '<img src="' + src.replace(/w=\d+/, "w=320") + '" alt="" loading="lazy" /></button>';
              }).join("") +
            '</div>' +
          '</div>' +
          '<div class="unit__text">' +
            '<div class="unit__head">' +
              '<h2>' + VS.t(u.nameKey) + '</h2>' +
              '<div class="unit__price"><strong>' + VS.money(lowestRate(u)) + '</strong><span>' + VS.t("common.from") + " · " + VS.t("common.perNight") + '</span></div>' +
            '</div>' +
            '<div class="unit__facts">' +
              '<span class="badge">' + u.size + " " + VS.t("common.sqm") + '</span>' +
              '<span class="badge">' + VS.t("common.upTo") + " " + u.capacity + " " + VS.t("common.persons") + '</span>' +
              '<span class="badge">' + u.bedrooms + " " + VS.t("common.bedrooms") + '</span>' +
              '<span class="badge">' + u.bathrooms + " " + VS.t("common.bathrooms") + '</span>' +
            '</div>' +
            '<p>' + VS.t(u.descKey) + '</p>' +
            '<ul class="unit__list">' + u.featureKeys.map(function (f) {
              return '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>' + VS.t(f) + '</li>';
            }).join("") + '</ul>' +
            '<div class="unit__cta">' +
              '<a class="btn btn-primary" href="rezervacija.html?unit=' + u.id + '">' + VS.t("cta.reserve") + '</a>' +
              '<a class="btn btn-ghost" href="galerija.html">' + VS.t("cta.viewGallery") + '</a>' +
            '</div>' +
          '</div>' +
        '</article>';
      }).join("");
      VS.observeReveal(host);

      host.addEventListener("click", function (e) {
        var b = e.target.closest(".unit__thumbs button");
        if (!b) return;
        var wrap = b.parentElement;
        var main = $("#main-" + wrap.dataset.unit);
        main.style.opacity = "0";
        setTimeout(function () { main.src = b.dataset.src; main.style.opacity = "1"; }, 140);
        $$("button", wrap).forEach(function (x) { x.setAttribute("aria-current", String(x === b)); });
      });
    }

    /* Kratki pregled jedinica na početnoj */
    var teaser = $("#unitsTeaser");
    if (teaser) {
      teaser.innerHTML = VS.units.map(function (u) {
        return '' +
        '<article class="card reveal">' +
          '<a href="smjestaj.html#' + u.id + '">' +
            '<img src="' + u.images[0].replace(/w=\d+/, "w=700") + '" alt="' + VS.t(u.nameKey) + '" loading="lazy" ' +
            'style="border-radius:var(--radius-sm);aspect-ratio:3/2;object-fit:cover;width:100%;margin-bottom:1.1rem" />' +
          '</a>' +
          '<h3>' + VS.t(u.nameKey) + '</h3>' +
          '<div class="unit__facts" style="margin:.6rem 0 .9rem">' +
            '<span class="badge">' + u.size + " " + VS.t("common.sqm") + '</span>' +
            '<span class="badge">' + VS.t("common.upTo") + " " + u.capacity + " " + VS.t("common.persons") + '</span>' +
          '</div>' +
          '<p>' + VS.t(u.descKey).split(". ")[0] + '.</p>' +
          '<p style="margin-top:1rem;color:var(--gold);font-family:var(--font-display);font-size:1.4rem">' +
            VS.money(lowestRate(u)) + ' <span style="font-family:var(--font-body);font-size:.8rem;color:var(--text-muted)">' + VS.t("common.perNight") + '</span></p>' +
        '</article>';
      }).join("");
      VS.observeReveal(teaser);
    }
  }

  /* ==============================================================
     8. RECENZIJE
     ============================================================== */
  function renderReviews() {
    var host = $("#reviewsList");
    var teaser = $("#reviewsTeaser");
    if (!host && !teaser) return;

    var stars = function (n) { return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); };
    var card = function (r) {
      return '' +
      '<article class="review">' +
        '<div class="review__stars" aria-label="' + r.stars + '/5">' + stars(r.stars) + '</div>' +
        '<p>„' + VS.t(r.textKey) + '"</p>' +
        '<div class="review__who">' +
          '<i>' + r.name.charAt(0) + '</i>' +
          '<div><b>' + r.name + '</b><span>' + r.country + " · " + r.date.replace("-", ". ") + '</span></div>' +
          '<span class="review__src">' + r.source + '</span>' +
        '</div>' +
      '</article>';
    };

    if (host) host.innerHTML = VS.reviews.map(card).join("");
    if (teaser) teaser.innerHTML = VS.reviews.slice(0, 3).map(card).join("");

    /* prosjek i histogram */
    var avgEl = $("#revAvg");
    if (avgEl) {
      var total = VS.reviews.reduce(function (s, r) { return s + r.stars; }, 0);
      var avg = total / VS.reviews.length;
      avgEl.textContent = (avg * 2).toFixed(1).replace(".", VS.lang === "en" ? "." : ",");
      var cnt = $("#revCount");
      if (cnt) cnt.textContent = VS.t("rev.basedOn", { n: 148 });
      $$(".bar .fill").forEach(function (f) {
        setTimeout(function () { f.style.width = f.dataset.value + "%"; }, 300);
      });
    }
  }

  /* ==============================================================
     9. OKOLICA (POI)
     ============================================================== */
  var POI_ICONS = {
    beach:     '<path d="M2 17c1.5 0 2.5-1 4-1s2.5 1 4 1 2.5-1 4-1 2.5 1 4 1 2.5-1 4-1"/><path d="M7 12l5-7 5 7"/>',
    food:      '<path d="M5 3v8a3 3 0 0 0 6 0V3M8 11v10M17 3c-1.5 2-2 4-2 6h4c0-2-.5-4-2-6zM17 9v12"/>',
    culture:   '<path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6M3 20h18"/>',
    activity:  '<path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    transport: '<path d="M2 12l9-1 3-7 2 1-1 6 6-1v3l-6-1 1 6-2 1-3-7-9-1z"/>'
  };

  function renderPoi() {
    var host = $("#poiList");
    if (!host) return;
    host.innerHTML = VS.poi.map(function (p) {
      return '' +
      '<li data-type="' + p.type + '">' +
        '<span class="poi__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + POI_ICONS[p.type] + '</svg></span>' +
        '<div><b>' + VS.t(p.nameKey) + '</b><p>' + VS.t(p.descKey) + '</p></div>' +
        '<span class="poi__dist">' + p.dist + '</span>' +
      '</li>';
    }).join("");

    var bar = $("#poiFilters");
    if (bar && !bar.dataset.bound) {
      bar.dataset.bound = "1";
      bar.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-filter]");
        if (!b) return;
        $$("button", bar).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var f = b.dataset.filter;
        $$("#poiList li").forEach(function (li) { li.classList.toggle("hide", f !== "all" && li.dataset.type !== f); });
      });
    }
  }

  /* ==============================================================
     10. KONTAKT FORMA (mailto; zamjenjivo Formspreeom ili PHP-om)
     ============================================================== */
  VS.toast = function (msg) {
    var t = $("#toast");
    if (!t) { alert(msg); return; }
    $("#toastMsg").textContent = msg;
    t.classList.add("show");
    clearTimeout(VS.toast._t);
    VS.toast._t = setTimeout(function () { t.classList.remove("show"); }, 6500);
  };

  function initContactForm() {
    var form = $("#contactForm");
    if (!form) return;
    form.addEventListener("input", function (e) {
      var f = e.target.closest(".field");
      if (f) f.classList.remove("invalid");
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#cName"), email = $("#cEmail"), msg = $("#cMessage"), consent = $("#cConsent");
      var ok = true;
      var mark = function (el, bad) { el.closest(".field").classList.toggle("invalid", bad); if (bad) ok = false; };
      mark(name, name.value.trim().length < 2);
      mark(email, !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.value.trim()));
      mark(msg, msg.value.trim().length < 5);
      if (!consent.checked) { VS.toast(VS.t("book.err.consent")); ok = false; }
      if (!ok) return;

      var body = [
        $("#cSubject").options[$("#cSubject").selectedIndex].text,
        "",
        VS.t("contact.form.name") + ": " + name.value.trim(),
        VS.t("contact.phone") + ": " + ($("#cPhone").value.trim() || "-"),
        VS.t("contact.email") + ": " + email.value.trim(),
        "",
        msg.value.trim()
      ].join("\n");

      window.location.href = "mailto:" + VS.property.email +
        "?subject=" + encodeURIComponent("[" + VS.property.name + "] " + $("#cSubject").options[$("#cSubject").selectedIndex].text) +
        "&body=" + encodeURIComponent(body);
      VS.toast(VS.t("contact.ok"));
      form.reset();
    });
  }

  /* ==============================================================
     11. STATIČNI PODACI U ZAGLAVLJU/PODNOŽJU
     ============================================================== */
  function fillProperty() {
    var p = VS.property;
    $$("[data-prop]").forEach(function (el) {
      var key = el.dataset.prop;
      var val = p[key];
      if (val == null) return;
      if (el.tagName === "A") {
        if (key === "phone" || key === "phoneHref") el.href = "tel:" + p.phoneHref;
        else if (key === "email") el.href = "mailto:" + p.email;
        else if (key === "whatsapp") el.href = "https://wa.me/" + p.whatsapp;
        if (el.dataset.propText !== "false") el.textContent = val;
      } else {
        el.textContent = val;
      }
    });
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    $$("a[data-wa]").forEach(function (el) { el.href = "https://wa.me/" + p.whatsapp; });
  }

  /* ==============================================================
     12. START
     ============================================================== */
  function renderDynamic() {
    renderGallery();
    renderUnits();
    renderReviews();
    renderPoi();
    if (VS.renderBooking) VS.renderBooking();   /* booking.js, samo na stranici rezervacije */
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initLang();
    initNav();
    fillProperty();
    renderDynamic();
    initGalleryFilters();
    initLightbox();
    initContactForm();
    initReveal();
  });

  /* pri promjeni jezika ponovo iscrtaj sve dinamičke dijelove */
  document.addEventListener("vs:lang", function () {
    renderDynamic();
    fillProperty();
  });
})();
