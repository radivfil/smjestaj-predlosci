/* ==============================================================
   VILLA EMILIA — VLASNIČKI PANEL
   --------------------------------------------------------------
   Alat za vlasnicu: pregled rezervacija, ručno blokiranje termina
   i pregled sinkronizacije s portalima.

   ⚠ SIGURNOSNA NAPOMENA
   PIN ispod je samo demo-zaštita da panel ne bude otvoren slučajnom
   posjetitelju. Prava zaštita zahtijeva prijavu na serveru (README).
   Podaci se u ovoj verziji spremaju u preglednik (localStorage) —
   vidljivi su samo na uređaju na kojem se unose, zato postoji izvoz
   i uvoz podataka.
   ============================================================== */

(function () {
  "use strict";
  var VS = window.VS = window.VS || {};

  var PIN = "1234";                     /* ZAMIJENI (demo zaštita) */
  var K_BLOCKS = "ve-admin-blocks";
  var K_BOOKINGS = "ve-bookings";
  var K_AUTH = "ve-admin-ok";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var MONTHS = ["Siječanj","Veljača","Ožujak","Travanj","Svibanj","Lipanj","Srpanj","Kolovoz","Rujan","Listopad","Studeni","Prosinac"];
  var DOW = ["Pon","Uto","Sri","Čet","Pet","Sub","Ned"];

  function d2s(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }
  function s2d(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  var today = (function () { var t = new Date(); t.setHours(0, 0, 0, 0); return t; })();

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { alert("Preglednik ne dopušta spremanje podataka."); }
  }

  var state = { unit: null, offset: 0, synced: {}, syncedAt: null };

  /* ==============================================================
     PRIJAVA
     ============================================================== */
  function initAuth() {
    var ok = sessionStorage.getItem(K_AUTH) === "1";
    $("#gate").style.display = ok ? "none" : "grid";
    $("#panel").style.display = ok ? "block" : "none";
    if (ok) initPanel();

    $("#gateForm").addEventListener("submit", function (e) {
      e.preventDefault();
      if ($("#pin").value.trim() === PIN) {
        sessionStorage.setItem(K_AUTH, "1");
        $("#gate").style.display = "none";
        $("#panel").style.display = "block";
        initPanel();
      } else {
        $("#gateErr").style.display = "block";
      }
    });
    $("#logout").addEventListener("click", function () {
      sessionStorage.removeItem(K_AUTH);
      location.reload();
    });
  }

  /* ==============================================================
     KALENDAR ZAUZETOSTI
     ============================================================== */
  function ranges(unitId) {
    var u = VS.units.filter(function (x) { return x.id === unitId; })[0];
    var manual = (u && u.booked) || [];
    var portal = state.synced[unitId] || [];
    var own = (load(K_BLOCKS, {})[unitId]) || [];
    return { manual: manual, portal: portal, own: own };
  }

  function inRanges(ds, list) {
    return list.some(function (r) { return ds >= r[0] && ds <= r[1]; });
  }

  function statusOf(ds, unitId) {
    var r = ranges(unitId);
    if (inRanges(ds, r.own)) return "own";
    if (inRanges(ds, r.portal)) return "portal";
    if (inRanges(ds, r.manual)) return "manual";
    return "free";
  }

  function renderCalendar() {
    var host = $("#adminCal");
    var first = new Date(today.getFullYear(), today.getMonth() + state.offset, 1);
    var html = "";

    for (var m = 0; m < 3; m++) {
      var cur = new Date(first.getFullYear(), first.getMonth() + m, 1);
      var daysIn = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      var pad = (cur.getDay() + 6) % 7;

      html += '<div class="cal-month"><h4>' + MONTHS[cur.getMonth()] + " " + cur.getFullYear() + "</h4>";
      html += '<div class="cal-dow">' + DOW.map(function (d) { return "<span>" + d + "</span>"; }).join("") + "</div>";
      html += '<div class="cal-days">';
      for (var p = 0; p < pad; p++) html += '<span class="empty"></span>';
      for (var day = 1; day <= daysIn; day++) {
        var date = new Date(cur.getFullYear(), cur.getMonth(), day);
        var ds = d2s(date);
        var st = statusOf(ds, state.unit);
        var past = date < today;
        html += '<button type="button" class="ad-day ad-' + st + (past ? " ad-past" : "") + '" data-date="' + ds + '" ' +
                'title="' + ds + " — " + ({ free: "slobodno", own: "ručno blokirano", portal: "s portala", manual: "iz data.js" })[st] + '">' +
                day + "</button>";
      }
      html += "</div></div>";
    }
    host.innerHTML = html;
    $("#calRange").textContent = MONTHS[first.getMonth()] + " " + first.getFullYear();
  }

  function toggleDay(ds) {
    var st = statusOf(ds, state.unit);
    if (st === "portal" || st === "manual") {
      alert("Ovaj datum dolazi s portala ili iz datoteke data.js i ne može se ovdje otključati.\n\n" +
            "Termin s Booking.com-a/Airbnb-a otkazuje se na portalu, a nakon sinkronizacije nestaje i ovdje.");
      return;
    }
    var all = load(K_BLOCKS, {});
    var list = all[state.unit] || [];
    if (st === "own") {
      list = list.filter(function (r) { return !(ds >= r[0] && ds <= r[1]); });
    } else {
      list.push([ds, ds]);
    }
    all[state.unit] = list;
    save(K_BLOCKS, all);
    renderCalendar();
    renderStats();
  }

  /* ==============================================================
     REZERVACIJE
     ============================================================== */
  function renderBookings() {
    var list = load(K_BOOKINGS, []);
    var host = $("#bookingsList");
    if (!list.length) {
      host.innerHTML = '<p class="muted">Još nema zabilježenih rezervacija. Napravite probnu rezervaciju na stranici ' +
                       '<a href="rezervacija.html">Rezervacija</a> i vratite se ovdje.</p>';
      return;
    }
    host.innerHTML =
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      "<th>Broj</th><th>Apartman</th><th>Termin</th><th>Gost</th><th>Osoba</th><th>Iznos</th><th>Uplaćeno</th><th></th>" +
      "</tr></thead><tbody>" +
      list.map(function (b) {
        return "<tr>" +
          "<td><b>" + b.ref + "</b><br /><span class='muted'>" + b.source + "</span></td>" +
          "<td>" + b.unitName + "</td>" +
          "<td>" + b.checkin + "<br />→ " + b.checkout + "</td>" +
          "<td>" + b.guest + "<br /><a href='mailto:" + b.email + "'>" + b.email + "</a></td>" +
          "<td>" + b.adults + (b.children ? " + " + b.children : "") + "</td>" +
          "<td>" + Math.round(b.total) + " €</td>" +
          "<td>" + Math.round(b.paid) + " €<br /><span class='muted'>" + (b.payMode === "full" ? "cijeli iznos" : "akontacija") + "</span></td>" +
          "<td><button class='btn btn-ghost btn-sm' data-del='" + b.ref + "'>Obriši</button></td>" +
        "</tr>";
      }).join("") + "</tbody></table></div>";
  }

  function deleteBooking(ref) {
    if (!confirm("Obrisati rezervaciju " + ref + "?")) return;
    save(K_BOOKINGS, load(K_BOOKINGS, []).filter(function (b) { return b.ref !== ref; }));
    renderBookings();
    renderStats();
  }

  /* ==============================================================
     STATISTIKA
     ============================================================== */
  function renderStats() {
    var bookings = load(K_BOOKINGS, []);
    var blocks = load(K_BLOCKS, {});
    var blockedDays = Object.keys(blocks).reduce(function (s, k) { return s + blocks[k].length; }, 0);
    var revenue = bookings.reduce(function (s, b) { return s + (b.total || 0); }, 0);
    $("#statBookings").textContent = bookings.length;
    $("#statRevenue").textContent = Math.round(revenue) + " €";
    $("#statBlocked").textContent = blockedDays;
    var portalDays = Object.keys(state.synced).reduce(function (s, k) { return s + state.synced[k].length; }, 0);
    $("#statPortal").textContent = portalDays;
  }

  /* ==============================================================
     IZVOZ / UVOZ
     ============================================================== */
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  /* .ics izvoz — datoteka koju Booking.com i Airbnb mogu uvesti,
     da i oni vide termine rezervirane direktno preko stranice. */
  function exportIcs() {
    var bookings = load(K_BOOKINGS, []).filter(function (b) { return !state.unit || b.unit === state.unit; });
    var blocks = (load(K_BLOCKS, {})[state.unit]) || [];
    var stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Villa Emilia//Kalendar//HR", "CALSCALE:GREGORIAN"];

    function ev(uid, from, to, summary) {
      lines.push("BEGIN:VEVENT", "UID:" + uid + "@villa-emilia-vir.hr", "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + from.replace(/-/g, ""),
        /* DTEND je u iCal-u ekskluzivan → dan nakon odlaska */
        "DTEND;VALUE=DATE:" + d2s(addDays(s2d(to), 1)).replace(/-/g, ""),
        "SUMMARY:" + summary, "END:VEVENT");
    }
    bookings.forEach(function (b) { ev(b.ref, b.checkin, b.checkout, "Rezervirano — " + b.guest); });
    blocks.forEach(function (r, i) { ev("blok-" + state.unit + "-" + i, r[0], r[1], "Nedostupno"); });
    lines.push("END:VCALENDAR");
    download("villa-emilia-" + state.unit + ".ics", lines.join("\r\n"), "text/calendar;charset=utf-8");
  }

  function exportJson() {
    download("villa-emilia-podaci.json", JSON.stringify({
      exportedAt: new Date().toISOString(),
      blocks: load(K_BLOCKS, {}),
      bookings: load(K_BOOKINGS, [])
    }, null, 2), "application/json");
  }

  function importJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (data.blocks) save(K_BLOCKS, data.blocks);
        if (data.bookings) save(K_BOOKINGS, data.bookings);
        renderCalendar(); renderBookings(); renderStats();
        alert("Podaci su uvezeni.");
      } catch (e) { alert("Datoteka nije ispravna."); }
    };
    reader.readAsText(file);
  }

  /* Tekst za data.js — trajno upisivanje blokiranih termina */
  function showSnippet() {
    var blocks = load(K_BLOCKS, {});
    var out = VS.units.map(function (u) {
      var own = blocks[u.id] || [];
      var all = (u.booked || []).concat(own);
      return "  /* " + u.id + " */ booked: " + JSON.stringify(all).replace(/","/g, '", "').replace(/\],\[/g, "], [") + ",";
    }).join("\n");
    $("#snippet").textContent = out || "// nema blokiranih termina";
    $("#snippetBox").style.display = "block";
  }

  /* ==============================================================
     SINKRONIZACIJA
     ============================================================== */
  function loadSync() {
    var url = (VS.property && VS.property.availabilityUrl) || "";
    var info = $("#syncStatus");
    if (!url || location.protocol === "file:") {
      info.innerHTML = "<b>Sinkronizacija nije aktivna.</b> Otvorite stranicu preko web adrese (https), " +
                       "a ne s diska, i postavite <code>availability.json</code> prema uputama u README-u.";
      renderStats();
      return;
    }
    fetch(url, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.units) throw 0;
        state.synced = data.units;
        state.syncedAt = data.generatedAt;
        var d = new Date(data.generatedAt);
        info.innerHTML = "<b>Sinkronizacija radi.</b> Zadnje usklađivanje: " +
          (isNaN(d) ? data.generatedAt : d.toLocaleString("hr-HR")) +
          ". Izvori: " + (data.sources || []).join(", ") + ".";
        renderCalendar(); renderStats();
      })
      .catch(function () {
        info.innerHTML = "<b>Datoteka availability.json nije pronađena.</b> Termini s portala se ne prikazuju — " +
                         "postavite sinkronizaciju prema uputama u README-u.";
        renderStats();
      });
  }

  /* ==============================================================
     START
     ============================================================== */
  function initPanel() {
    if (initPanel._done) return;
    initPanel._done = true;

    /* Panel je vlasničin alat — nazivi uvijek na hrvatskom,
       neovisno o jeziku koji je odabran na javnoj stranici. */
    var hr = (VS.i18n && VS.i18n.hr) || {};
    var unitName = function (u) { return hr[u.nameKey] || VS.t(u.nameKey); };

    state.unit = VS.units[0].id;
    $("#adminUnit").innerHTML = VS.units.map(function (u) {
      return '<option value="' + u.id + '">' + unitName(u) + "</option>";
    }).join("");

    $("#adminUnit").addEventListener("change", function (e) {
      state.unit = e.target.value;
      renderCalendar();
    });
    $("#calPrev").addEventListener("click", function () { if (state.offset > 0) { state.offset--; renderCalendar(); } });
    $("#calNext").addEventListener("click", function () { if (state.offset < 12) { state.offset++; renderCalendar(); } });
    $("#adminCal").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-date]");
      if (b) toggleDay(b.dataset.date);
    });
    $("#bookingsList").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-del]");
      if (b) deleteBooking(b.dataset.del);
    });

    $("#expIcs").addEventListener("click", exportIcs);
    $("#expJson").addEventListener("click", exportJson);
    $("#showSnippet").addEventListener("click", showSnippet);
    $("#impJson").addEventListener("change", function (e) { if (e.target.files[0]) importJson(e.target.files[0]); });

    $$(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".tab-btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        $$(".tab").forEach(function (t) { t.classList.toggle("hidden", t.id !== "tab-" + btn.dataset.tab); });
      });
    });

    renderCalendar();
    renderBookings();
    renderStats();
    loadSync();
  }

  document.addEventListener("DOMContentLoaded", initAuth);
})();
