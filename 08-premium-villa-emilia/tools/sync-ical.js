#!/usr/bin/env node
/* ==============================================================
   VILLA EMILIA — SINKRONIZACIJA KALENDARA S PORTALIMA
   --------------------------------------------------------------
   Čita iCal linkove Booking.com-a, Airbnb-a (i bilo kojeg drugog
   kalendara koji nudi .ics), pretvara ih u zauzete termine i
   zapisuje ih u availability.json koji stranica čita.

   Uz to izvozi vlastite termine iz data.js u kalendar/<jedinica>.ics
   da ih portali mogu uvesti.

   POKRETANJE
     VE_ICAL_SOURCES='{"a1":{"booking":"https://...","airbnb":"https://..."}}' \
       node tools/sync-ical.js

   U praksi ga pokreće GitHub Action svaka tri sata
   (.github/workflows/sync-kalendar.yml) — vidi README.

   Bez vanjskih biblioteka; traži Node 18+ (ugrađeni fetch).
   ============================================================== */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_JSON = path.join(ROOT, "availability.json");
const ICS_DIR = path.join(ROOT, "kalendar");
const DATA_JS = path.join(ROOT, "assets", "js", "data.js");

/* --------------------------------------------------------------
   1. IZVORI
   Linkovi se čitaju iz varijable okoline VE_ICAL_SOURCES (JSON),
   a ako nje nema — iz polja `ical` u data.js.
   -------------------------------------------------------------- */
function loadUnitsFromDataJs() {
  const src = fs.readFileSync(DATA_JS, "utf8");
  // data.js je običan objekt bez ovisnosti — izvršavamo ga u praznom kontekstu
  const win = {};
  new Function("window", "var VS = window.VS = {};\n" + src.replace(/window\.VS = window\.VS \|\| \{\};/, ""))(win);
  return win.VS;
}

function loadSources(VS) {
  if (process.env.VE_ICAL_SOURCES) {
    try {
      return JSON.parse(process.env.VE_ICAL_SOURCES);
    } catch (e) {
      console.error("VE_ICAL_SOURCES nije ispravan JSON:", e.message);
      process.exit(1);
    }
  }
  const out = {};
  (VS.units || []).forEach((u) => {
    const links = {};
    Object.entries(u.ical || {}).forEach(([k, v]) => { if (v) links[k] = v; });
    if (Object.keys(links).length) out[u.id] = links;
  });
  return out;
}

/* --------------------------------------------------------------
   2. MINIMALNI iCal PARSER
   Podržava DTSTART/DTEND u oba oblika (VALUE=DATE i s vremenom),
   preskače otkazane događaje i spojene (folded) retke.
   -------------------------------------------------------------- */
function unfold(text) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function parseIcsDate(value) {
  // 20260704  ili  20260704T140000Z
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

function d2s(d) {
  return d.toISOString().slice(0, 10);
}

function parseIcal(text) {
  const events = [];
  const lines = unfold(text).split("\n");
  let cur = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur && cur.start && cur.end && cur.status !== "CANCELLED") events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;

    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const name = line.slice(0, idx).split(";")[0].toUpperCase();
    const value = line.slice(idx + 1);

    if (name === "DTSTART") cur.start = parseIcsDate(value);
    else if (name === "DTEND") cur.end = parseIcsDate(value);
    else if (name === "SUMMARY") cur.summary = value;
    else if (name === "STATUS") cur.status = value.toUpperCase();
    else if (name === "UID") cur.uid = value;
  }
  return events;
}

/* iCal DTEND je ekskluzivan → zadnja zauzeta noć je dan prije. */
function eventToRange(ev) {
  const from = d2s(ev.start);
  const lastNight = new Date(ev.end.getTime() - 86400000);
  const to = d2s(lastNight < ev.start ? ev.start : lastNight);
  return [from, to];
}

/* --------------------------------------------------------------
   3. SPAJANJE RASPONA (preklapajući i susjedni se spajaju)
   -------------------------------------------------------------- */
function mergeRanges(ranges) {
  const sorted = ranges
    .filter((r) => r && r[0] && r[1])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (!last) { out.push([r[0], r[1]]); continue; }
    const nextDay = d2s(new Date(new Date(last[1] + "T00:00:00Z").getTime() + 86400000));
    if (r[0] <= nextDay) {
      if (r[1] > last[1]) last[1] = r[1];
    } else {
      out.push([r[0], r[1]]);
    }
  }
  return out;
}

/* --------------------------------------------------------------
   4. DOHVAT
   -------------------------------------------------------------- */
async function fetchIcal(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "villa-emilia-sync/1.0" }
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const text = await res.text();
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("odgovor nije iCal datoteka");
  return text;
}

function readPrevious() {
  try { return JSON.parse(fs.readFileSync(OUT_JSON, "utf8")); } catch (e) { return null; }
}

/* --------------------------------------------------------------
   5. IZVOZ VLASTITIH TERMINA U .ics (smjer prema portalima)
   -------------------------------------------------------------- */
function writeOwnIcs(VS) {
  if (!fs.existsSync(ICS_DIR)) fs.mkdirSync(ICS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  (VS.units || []).forEach((u) => {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Villa Emilia//Kalendar//HR", "CALSCALE:GREGORIAN"];
    (u.booked || []).forEach((r, i) => {
      const endExclusive = d2s(new Date(new Date(r[1] + "T00:00:00Z").getTime() + 86400000));
      lines.push(
        "BEGIN:VEVENT",
        "UID:" + u.id + "-" + i + "-" + r[0] + "@villa-emilia-vir.hr",
        "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + r[0].replace(/-/g, ""),
        "DTEND;VALUE=DATE:" + endExclusive.replace(/-/g, ""),
        "SUMMARY:Nedostupno",
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    fs.writeFileSync(path.join(ICS_DIR, u.id + ".ics"), lines.join("\r\n") + "\r\n");
  });
  console.log("• izvezeni vlastiti kalendari u kalendar/*.ics");
}

/* --------------------------------------------------------------
   6. GLAVNI TOK
   -------------------------------------------------------------- */
(async function main() {
  const VS = loadUnitsFromDataJs();
  const sources = loadSources(VS);
  const previous = readPrevious();

  const unitIds = (VS.units || []).map((u) => u.id);
  if (!Object.keys(sources).length) {
    console.log("Nema upisanih iCal linkova — sinkronizacija se preskače.");
    console.log("Postavite tajnu VE_ICAL_SOURCES ili polje `ical` u data.js (vidi README).");
    writeOwnIcs(VS);
    return;
  }

  const out = {
    _upute: "Datoteku generira tools/sync-ical.js (GitHub Action). Ne uređivati ručno.",
    generatedAt: new Date().toISOString(),
    sources: [],
    units: {},
    errors: []
  };

  const seenSources = new Set();

  for (const unitId of unitIds) {
    const links = sources[unitId] || {};
    let ranges = [];
    let failed = false;

    for (const [portal, url] of Object.entries(links)) {
      if (!url) continue;
      try {
        const text = await fetchIcal(url);
        const events = parseIcal(text);
        ranges = ranges.concat(events.map(eventToRange));
        seenSources.add(portal);
        console.log("✓ " + unitId + " / " + portal + ": " + events.length + " termina");
      } catch (e) {
        failed = true;
        out.errors.push({ unit: unitId, source: portal, message: String(e.message || e) });
        console.error("✗ " + unitId + " / " + portal + ": " + e.message);
      }
    }

    if (failed && previous && previous.units && previous.units[unitId]) {
      // Ako portal trenutno ne odgovara, zadržavamo zadnje poznato stanje
      // da kalendar ne bi lažno prikazao slobodne termine.
      const keep = previous.units[unitId];
      console.log("  ↳ zadržano zadnje poznato stanje za " + unitId + " (" + keep.length + " raspona)");
      ranges = ranges.concat(keep);
    }

    out.units[unitId] = mergeRanges(ranges);
  }

  const NAMES = { booking: "Booking.com iCal", airbnb: "Airbnb iCal", google: "Google Calendar iCal" };
  out.sources = Array.from(seenSources).map((s) => NAMES[s] || s);

  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + "\n");
  console.log("• zapisano " + path.relative(ROOT, OUT_JSON) +
    " (" + Object.values(out.units).reduce((s, r) => s + r.length, 0) + " raspona, " +
    out.errors.length + " grešaka)");

  writeOwnIcs(VS);

  // Ako baš nijedan izvor nije uspio, javi neuspjeh da Action pošalje obavijest.
  if (out.errors.length && !seenSources.size) process.exit(1);
})();
