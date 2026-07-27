/* ==============================================================
   VILLA SERENA — SUSTAV REZERVACIJE
   --------------------------------------------------------------
   • kalendar s odabirom raspona datuma i prikazom zauzetosti
   • izračun cijene po sezoni, popusti, boravišna pristojba
   • forma gosta + plaćanje (Stripe Checkout)
   --------------------------------------------------------------
   STRIPE: dok je STRIPE_PUBLIC_KEY prazan string, sustav radi u
   demo načinu (prikaže potvrdu bez naplate). Za pravo plaćanje:

     1) upiši svoj javni ključ ispod
     2) na serveru napravi endpoint koji kreira Checkout Session
        (Node primjer je u README.md ovog predloška)
     3) upiši putanju tog endpointa u CHECKOUT_ENDPOINT
     4) dodaj <script src="https://js.stripe.com/v3/"></script>
        u rezervacija.html

   Sve ostalo — iznosi, opis, metapodaci — već se šalje ispravno.
   ============================================================== */

(function () {
  "use strict";
  var VS = window.VS = window.VS || {};

  var STRIPE_PUBLIC_KEY  = "";                         /* npr. "pk_live_..." */
  var CHECKOUT_ENDPOINT  = "/api/create-checkout-session";

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- datumski helperi (sve u lokalnom vremenu) ---------- */
  function d2s(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }
  function s2d(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function sameDay(a, b) { return a && b && d2s(a) === d2s(b); }
  function nightsBetween(a, b) { return Math.round((b - a) / 86400000); }
  var today = (function () { var t = new Date(); t.setHours(0, 0, 0, 0); return t; })();

  /* ---------- stanje ---------- */
  var state = {
    unitId: null,
    start: null,
    end: null,
    adults: 2,
    children: 0,
    pets: false,
    pay: "deposit",
    offset: 0            /* pomak prikazanih mjeseci */
  };
  var MONTHS_AHEAD = 14;

  function unit() { return VS.units.filter(function (u) { return u.id === state.unitId; })[0] || VS.units[0]; }

  /* ---------- sezone i cijene ---------- */
  function seasonFor(date) {
    var s = d2s(date);
    for (var i = 0; i < VS.seasons.length; i++) {
      if (s >= VS.seasons[i].from && s <= VS.seasons[i].to) return VS.seasons[i];
    }
    return VS.seasons[VS.seasons.length - 1];
  }

  function isBooked(date, u) {
    var s = d2s(date);
    return (u || unit()).booked.some(function (r) { return s >= r[0] && s <= r[1]; });
  }

  /* ima li zauzetih dana unutar raspona (bez dana odlaska) */
  function rangeHasBooked(from, to) {
    for (var d = new Date(from); d < to; d = addDays(d, 1)) if (isBooked(d)) return true;
    return false;
  }

  VS.calcPrice = function () {
    if (!state.start || !state.end) return null;
    var u = unit();
    var nights = nightsBetween(state.start, state.end);
    if (nights < 1) return null;

    var accommodation = 0, minNights = 1;
    for (var d = new Date(state.start), i = 0; i < nights; d = addDays(d, 1), i++) {
      var s = seasonFor(d);
      accommodation += u.rates[s.id] != null ? u.rates[s.id] : u.rates.low;
      if (i === 0) minNights = s.minNights;
    }

    var discountPct = 0;
    VS.discounts.forEach(function (x) { if (nights >= x.minNights && x.percent > discountPct) discountPct = x.percent; });
    var discount = Math.round(accommodation * discountPct / 100);

    var cleaning = VS.property.cleaningFee;
    var tax = Math.round(state.adults * nights * VS.property.touristTax * 100) / 100;
    var total = accommodation - discount + cleaning + tax;
    var deposit = Math.round(total * VS.property.depositPercent / 100);

    return {
      nights: nights, minNights: minNights, accommodation: accommodation,
      discountPct: discountPct, discount: discount, cleaning: cleaning, tax: tax,
      total: total, deposit: deposit, rest: total - deposit,
      payNow: state.pay === "full" ? total : deposit
    };
  };

  /* ==============================================================
     KALENDAR
     ============================================================== */
  function monthName(date) {
    try {
      return new Intl.DateTimeFormat(VS.lang === "hr" ? "hr-HR" : VS.lang, { month: "long", year: "numeric" }).format(date);
    } catch (e) { return date.getFullYear() + "-" + (date.getMonth() + 1); }
  }
  function dowLabels() {
    var out = [], base = new Date(2024, 0, 1);  /* ponedjeljak */
    for (var i = 0; i < 7; i++) {
      try { out.push(new Intl.DateTimeFormat(VS.lang === "hr" ? "hr-HR" : VS.lang, { weekday: "short" }).format(addDays(base, i)).replace(".", "")); }
      catch (e) { out.push(["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"][i]); }
    }
    return out;
  }

  function renderCalendar() {
    var host = $("#calMonths");
    if (!host) return;
    var first = new Date(today.getFullYear(), today.getMonth() + state.offset, 1);
    var html = "";

    for (var m = 0; m < 2; m++) {
      var cur = new Date(first.getFullYear(), first.getMonth() + m, 1);
      var daysIn = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      var pad = (cur.getDay() + 6) % 7;

      html += '<div class="cal-month"><h4>' + monthName(cur) + "</h4>";
      html += '<div class="cal-dow">' + dowLabels().map(function (d) { return "<span>" + d + "</span>"; }).join("") + "</div>";
      html += '<div class="cal-days">';
      for (var p = 0; p < pad; p++) html += '<span class="empty"></span>';

      for (var day = 1; day <= daysIn; day++) {
        var date = new Date(cur.getFullYear(), cur.getMonth(), day);
        var ds = d2s(date);
        var past = date < today;
        var booked = isBooked(date);
        var cls = [];

        if (booked) cls.push("booked");
        if (state.start && state.end) {
          if (date > state.start && date < state.end) cls.push("in-range");
          if (sameDay(date, state.start)) cls.push("edge", sameDay(state.start, addDays(state.end, -0)) ? "only" : "start");
          if (sameDay(date, state.end)) cls.push("edge", "end");
        } else if (sameDay(date, state.start)) {
          cls.push("edge", "only");
        }

        html += '<button type="button" class="' + cls.join(" ") + '" data-date="' + ds + '"' +
                (past || booked ? " disabled" : "") + ' aria-label="' + ds + '">' + day + "</button>";
      }
      html += "</div></div>";
    }
    host.innerHTML = html;

    var prev = $("#calPrev"), next = $("#calNext");
    if (prev) prev.disabled = state.offset === 0;
    if (next) next.disabled = state.offset >= MONTHS_AHEAD - 2;
  }

  function pickDate(ds) {
    var date = s2d(ds);
    if (!state.start || (state.start && state.end)) {
      state.start = date; state.end = null;
    } else if (date <= state.start) {
      state.start = date; state.end = null;
    } else {
      if (rangeHasBooked(state.start, date)) {
        VS.toast(VS.t("book.err.overlap"));
        state.start = date; state.end = null;
      } else {
        state.end = date;
      }
    }
    renderCalendar();
    renderSummary();
  }

  /* ==============================================================
     SAŽETAK CIJENE
     ============================================================== */
  function renderSummary() {
    var host = $("#summaryBody");
    if (!host) return;
    var u = unit();
    var p = VS.calcPrice();

    var head = '' +
      '<div class="summary__unit">' +
        '<img src="' + u.images[0].replace(/w=\d+/, "w=200") + '" alt="' + VS.t(u.nameKey) + '" />' +
        '<div><b>' + VS.t(u.nameKey) + '</b><span>' + VS.t("common.upTo") + " " + u.capacity + " " + VS.t("common.persons") + '</span></div>' +
      '</div>';

    if (!p) {
      host.innerHTML = head + '<p class="sum-empty">' + VS.t("book.summary.empty") + "</p>";
      setSubmitEnabled(false);
      return;
    }

    var rows = '' +
      '<div class="sum-row"><span>' + VS.t("book.summary.checkin") + '</span><span>' + VS.dateLong(state.start) + '</span></div>' +
      '<div class="sum-row"><span>' + VS.t("book.summary.checkout") + '</span><span>' + VS.dateLong(state.end) + '</span></div>' +
      '<div class="sum-row"><span>' + VS.t("book.summary.stay") + '</span><span>' + p.nights + " " + VS.t(p.nights === 1 ? "common.night" : "common.nights") + '</span></div>' +
      '<hr class="rule" style="margin:.9rem 0" />' +
      '<div class="sum-row"><span>' + VS.t("book.summary.nights") + '</span><span>' + VS.money(p.accommodation) + '</span></div>';

    if (p.discount > 0) {
      rows += '<div class="sum-row discount"><span>' + VS.t("book.summary.discount") + " (" + p.discountPct + "%)</span><span>− " + VS.money(p.discount) + "</span></div>";
    }
    rows += '<div class="sum-row"><span>' + VS.t("book.summary.cleaning") + '</span><span>' + VS.money(p.cleaning) + '</span></div>' +
            '<div class="sum-row"><span>' + VS.t("book.summary.tax") + '</span><span>' + VS.money(p.tax) + '</span></div>' +
            '<div class="sum-total"><span>' + VS.t("book.summary.total") + '</span><b>' + VS.money(p.total) + '</b></div>';

    if (state.pay === "deposit") {
      rows += '<div class="sum-row" style="margin-top:.75rem"><span>' + VS.t("book.summary.deposit") + '</span><span><b>' + VS.money(p.deposit) + '</b></span></div>' +
              '<div class="sum-row"><span>' + VS.t("book.summary.rest") + '</span><span>' + VS.money(p.rest) + '</span></div>';
    }

    var warn = "";
    if (p.nights < p.minNights) {
      warn = '<p class="sum-note" style="color:#c2503a">' + VS.t("book.err.minNights", { n: p.minNights }) + "</p>";
    }
    var cap = "";
    if (state.adults + state.children > u.capacity) {
      cap = '<p class="sum-note" style="color:#c2503a">' + VS.t("book.err.capacity", { n: u.capacity }) + "</p>";
    }

    host.innerHTML = head + rows + warn + cap;
    setSubmitEnabled(p.nights >= p.minNights && state.adults + state.children <= u.capacity);
  }

  function setSubmitEnabled(on) {
    var b = $("#bookSubmit");
    if (b) { b.disabled = !on; b.setAttribute("aria-disabled", String(!on)); }
  }

  /* ==============================================================
     JEDINICE / GOSTI
     ============================================================== */
  function fillUnitSelect() {
    var sel = $("#bookUnit");
    if (!sel) return;
    sel.innerHTML = VS.units.map(function (u) {
      var min = Math.min.apply(null, Object.keys(u.rates).map(function (k) { return u.rates[k]; }));
      return '<option value="' + u.id + '"' + (u.id === state.unitId ? " selected" : "") + ">" +
             VS.t(u.nameKey) + " — " + VS.t("common.upTo") + " " + u.capacity + " " + VS.t("common.persons") +
             " · " + VS.t("common.from") + " " + VS.money(min) + "</option>";
    }).join("");
  }

  function fillGuestSelects() {
    var a = $("#bookAdults"), c = $("#bookChildren");
    if (a) {
      a.innerHTML = "";
      for (var i = 1; i <= 8; i++) a.insertAdjacentHTML("beforeend", '<option value="' + i + '"' + (i === state.adults ? " selected" : "") + ">" + i + "</option>");
    }
    if (c) {
      c.innerHTML = "";
      for (var j = 0; j <= 4; j++) c.insertAdjacentHTML("beforeend", '<option value="' + j + '"' + (j === state.children ? " selected" : "") + ">" + j + "</option>");
    }
  }

  /* ==============================================================
     PLAĆANJE
     ============================================================== */
  function reference() {
    return "VS-" + new Date().getFullYear() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  function openModal(html) {
    var m = $("#bookModal");
    $("#bookModalBody").innerHTML = html;
    m.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    $("#bookModal").classList.remove("open");
    document.body.style.overflow = "";
  }

  function checkout(payload) {
    /* ---------- PRAVI STRIPE TOK (aktivira se kad upišeš ključ) ----------
       Server treba vratiti { id: "cs_..." } ili { url: "https://checkout.stripe.com/..." }.

       fetch(CHECKOUT_ENDPOINT, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(payload)
       })
       .then(function (r) { return r.json(); })
       .then(function (session) {
         if (session.url) { window.location.href = session.url; return; }
         return Stripe(STRIPE_PUBLIC_KEY).redirectToCheckout({ sessionId: session.id });
       })
       .catch(function () { VS.toast("Greška pri otvaranju plaćanja. Pokušajte ponovno."); });
    --------------------------------------------------------------------- */

    if (STRIPE_PUBLIC_KEY) {
      window.location.href = CHECKOUT_ENDPOINT + "?ref=" + encodeURIComponent(payload.reference);
      return;
    }

    /* ---------- DEMO NAČIN ---------- */
    openModal(
      '<div class="center"><div class="spinner" style="margin:0 auto 1rem;border-color:var(--border);border-top-color:var(--gold)"></div>' +
      "<p>" + VS.t("book.modal.paying") + "</p></div>"
    );

    setTimeout(function () {
      var p = payload.price;
      openModal(
        '<div class="modal__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>' +
        "<h3>" + VS.t("book.modal.title") + "</h3>" +
        "<p>" + VS.t("book.modal.p") + "</p>" +
        '<div class="modal__recap">' +
          '<div class="sum-row"><span>' + VS.t("book.modal.ref") + "</span><span><b>" + payload.reference + "</b></span></div>" +
          '<div class="sum-row"><span>' + VS.t("book.unit.label") + "</span><span>" + payload.unitName + "</span></div>" +
          '<div class="sum-row"><span>' + VS.t("book.summary.checkin") + "</span><span>" + payload.checkin + "</span></div>" +
          '<div class="sum-row"><span>' + VS.t("book.summary.checkout") + "</span><span>" + payload.checkout + "</span></div>" +
          '<div class="sum-row"><span>' + VS.t("common.guests") + "</span><span>" + payload.adults + " + " + payload.children + "</span></div>" +
          '<div class="sum-row"><span>' + VS.t("book.summary.total") + "</span><span>" + VS.money(p.total) + "</span></div>" +
          '<div class="sum-row"><span>' + VS.t("book.summary.deposit") + "</span><span><b>" + VS.money(p.payNow) + "</b></span></div>" +
        "</div>" +
        '<p class="dev-note">' + VS.t("book.modal.dev") + "</p>" +
        '<div class="modal__actions"><button type="button" class="btn btn-primary" id="modalClose">' + VS.t("cta.close") + "</button></div>"
      );
    }, 1400);
  }

  /* ==============================================================
     FORMA
     ============================================================== */
  function initForm() {
    var form = $("#bookForm");
    if (!form) return;

    form.addEventListener("input", function (e) {
      var f = e.target.closest(".field");
      if (f) f.classList.remove("invalid");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var p = VS.calcPrice();
      if (!p) { VS.toast(VS.t("book.err.dates")); return; }
      if (p.nights < p.minNights) { VS.toast(VS.t("book.err.minNights", { n: p.minNights })); return; }

      var u = unit();
      if (state.adults + state.children > u.capacity) { VS.toast(VS.t("book.err.capacity", { n: u.capacity })); return; }

      var fn = $("#bFirst"), ln = $("#bLast"), em = $("#bEmail"), cons = $("#bConsent");
      var ok = true;
      var mark = function (el, bad) { el.closest(".field").classList.toggle("invalid", bad); if (bad) ok = false; };
      mark(fn, fn.value.trim().length < 2);
      mark(ln, ln.value.trim().length < 2);
      mark(em, !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(em.value.trim()));
      if (!cons.checked) { VS.toast(VS.t("book.err.consent")); ok = false; }
      if (!ok) return;

      checkout({
        reference: reference(),
        unitId: u.id,
        unitName: VS.t(u.nameKey),
        checkin: d2s(state.start),
        checkout: d2s(state.end),
        adults: state.adults,
        children: state.children,
        pets: state.pets,
        payMode: state.pay,
        amount: Math.round(p.payNow * 100),        /* Stripe traži iznos u centima */
        currency: VS.property.currency,
        price: p,
        guest: {
          firstName: fn.value.trim(), lastName: ln.value.trim(),
          email: em.value.trim(), phone: $("#bPhone").value.trim(),
          country: $("#bCountry").value.trim(), arrival: $("#bArrival").value,
          notes: $("#bNotes").value.trim()
        },
        lang: VS.lang
      });
    });
  }

  /* ==============================================================
     INIT / RENDER (poziva ga app.js, i ponovo pri promjeni jezika)
     ============================================================== */
  VS.renderBooking = function () {
    if (!$("#calMonths")) return;

    if (!state.unitId) {
      var q = new URLSearchParams(location.search).get("unit");
      state.unitId = (q && VS.units.some(function (u) { return u.id === q; })) ? q : VS.units[0].id;
    }

    fillUnitSelect();
    fillGuestSelects();
    renderCalendar();
    renderSummary();

    if (VS.renderBooking._bound) return;
    VS.renderBooking._bound = true;

    $("#calMonths").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-date]");
      if (b && !b.disabled) pickDate(b.dataset.date);
    });
    $("#calPrev").addEventListener("click", function () { if (state.offset > 0) { state.offset--; renderCalendar(); } });
    $("#calNext").addEventListener("click", function () { if (state.offset < MONTHS_AHEAD - 2) { state.offset++; renderCalendar(); } });

    $("#bookUnit").addEventListener("change", function (e) {
      state.unitId = e.target.value;
      /* ako je novi termin zauzet za novu jedinicu, poništi odabir */
      if (state.start && state.end && rangeHasBooked(state.start, state.end)) { state.start = null; state.end = null; }
      renderCalendar(); renderSummary();
    });
    $("#bookAdults").addEventListener("change", function (e) { state.adults = +e.target.value; renderSummary(); });
    $("#bookChildren").addEventListener("change", function (e) { state.children = +e.target.value; renderSummary(); });
    var pets = $("#bookPets");
    if (pets) pets.addEventListener("change", function (e) { state.pets = e.target.checked; });

    $$('input[name="pay"]').forEach(function (r) {
      r.addEventListener("change", function (e) { state.pay = e.target.value; renderSummary(); });
    });

    document.addEventListener("click", function (e) {
      if (e.target.id === "modalClose" || e.target.closest("#modalClose")) closeModal();
      if (e.target.id === "bookModal") closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && $("#bookModal").classList.contains("open")) closeModal();
    });

    initForm();
  };
})();
