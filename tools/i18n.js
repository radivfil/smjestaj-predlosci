#!/usr/bin/env node
/* ==============================================================
   LOTA STUDIO — i18n alat (bez vanjskih ovisnosti)
   --------------------------------------------------------------
   ZASTO OVAKO: stranica je staticni HTML na GitHub Pagesu, bez
   frameworka i bez servera. next-intl / react-i18next otpadaju jer
   nema Reacta. Za prave locale URL-ove (/en/, /de/...) i hreflang
   po jeziku netko mora generirati datoteku po jeziku — to radi ovaj
   skript u build vremenu, pa je stranica i dalje obicni staticni HTML.

   IZVOR ISTINE JE index.html (hrvatski). Prevodivi tekst je oznacen
   data-i18n atributima; locales/hr/*.json se GENERIRA iz njega.

   NACINI RADA:
     node tools/i18n.js extract   index.html  -> locales/hr/*.json (+ HR JSON-LD)
     node tools/i18n.js build     index.html + locales/* -> /en/ /de/ /es/ /it/
     node tools/i18n.js verify    round-trip test: gradi HR u .tmp i usporeduje
     node tools/i18n.js status    koliko je kljuceva prevedeno po jeziku

   ATRIBUTI (iste konvencije kao assets/js/i18n.js u villa predloscima):
     data-i18n="k"          -> textContent elementa
     data-i18n-html="k"     -> innerHTML (kad tekst sadrzi <em>, <br>, <strong>)
     data-i18n-content="k"  -> atribut content (meta tagovi)
     data-i18n-aria="k"     -> atribut aria-label
     data-i18n-alt="k"      -> atribut alt
     data-price="399,20"    -> {p0}, {p1}... u tekstu; formatira Intl.NumberFormat

   PRAVILO: element s data-i18n atributom ne smije sadrzavati drugi
   element s data-i18n atributom (ugnijezdeni kljucevi se ne podrzavaju).
   ============================================================== */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "index.html");
const LOCALES = path.join(ROOT, "locales");
const SITE = "https://lotastudio.eu";
const DEFAULT_LANG = "hr";

/* Jezici. dir:"" znaci korijen (hrvatski). */
const LANGS = [
  { code: "hr", native: "Hrvatski", short: "HR", intl: "hr-HR", og: "hr_HR", dir: "" },
  { code: "en", native: "English",  short: "EN", intl: "en-GB", og: "en_GB", dir: "en" },
  { code: "de", native: "Deutsch",  short: "DE", intl: "de-DE", og: "de_DE", dir: "de" },
  { code: "es", native: "Español",  short: "ES", intl: "es-ES", og: "es_ES", dir: "es" },
  { code: "it", native: "Italiano", short: "IT", intl: "it-IT", og: "it_IT", dir: "it" }
];

/* Prefiks kljuca -> datoteka u kojoj zivi (namespace). */
const NS = {
  meta: "common", nav: "common", drawer: "common", foot: "common", lang: "common", cta: "common",
  hero: "hero", trust: "hero",
  onama: "onama", vidljivost: "vidljivost", usluge: "usluge", promocija: "promocija",
  radovi: "radovi", paketi: "paketi", proces: "proces", faq: "faq", kontakt: "kontakt"
};
const NS_FILES = Array.from(new Set(Object.values(NS)));

const urlFor = (l) => (l.dir ? SITE + "/" + l.dir + "/" : SITE + "/");
const langBy = (c) => LANGS.filter((l) => l.code === c)[0];

/* ---------- cijene ---------- */
function fmtPrice(n, intlCode) {
  return new Intl.NumberFormat(intlCode, {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(Number(n));
}
/* Intl stavlja tvrdi razmak ispred €; za usporedbu s HTML-om normaliziramo. */
const nbsp = (s) => s.replace(/[  ]/g, " ");

/* ---------- mini HTML alat ---------- */
/* Nade zatvarajuci tag za tag koji pocinje na openStart. */
function innerRange(html, openStart, tagName) {
  const openEnd = html.indexOf(">", openStart);
  if (openEnd === -1) return null;
  if (html[openEnd - 1] === "/") return { start: openEnd + 1, end: openEnd + 1 }; // self-closing
  const open = new RegExp("<" + tagName + "[\\s>]", "gi");
  const close = new RegExp("</" + tagName + "\\s*>", "gi");
  let depth = 1, i = openEnd + 1;
  while (i < html.length) {
    open.lastIndex = i; close.lastIndex = i;
    const mo = open.exec(html), mc = close.exec(html);
    if (!mc) return null;
    if (mo && mo.index < mc.index) { depth++; i = mo.index + 1; continue; }
    depth--;
    if (depth === 0) return { start: openEnd + 1, end: mc.index };
    i = mc.index + 1;
  }
  return null;
}

/* Svi elementi s nekim data-i18n atributom, redom pojavljivanja. */
function findNodes(html) {
  const re = /<([a-zA-Z][\w-]*)\b([^>]*\bdata-i18n(?:-html|-content|-aria|-alt)?\s*=\s*"[^"]*"[^>]*)>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const tag = m[1], attrs = m[2];
    const get = (name) => {
      const a = new RegExp("\\b" + name + '\\s*=\\s*"([^"]*)"').exec(attrs);
      return a ? a[1] : null;
    };
    out.push({
      tag,
      openStart: m.index,
      openEnd: m.index + m[0].length,
      attrs,
      key: get("data-i18n"),
      keyHtml: get("data-i18n-html"),
      keyContent: get("data-i18n-content"),
      keyAria: get("data-i18n-aria"),
      keyAlt: get("data-i18n-alt"),
      prices: get("data-price") ? get("data-price").split(",").map((s) => s.trim()) : null
    });
  }
  return out;
}

const SCRIPT_RE = new RegExp(String.raw`<script[sS]*?</script>`, "g");
const TAG_RE = new RegExp(String.raw`<[^>]+>`, "g");
const collapse = (s) => s.replace(/\s+/g, " ").trim();

/* Tekst -> predlozak s {p0}, {p1}... umjesto formatiranih cijena. */
function toTemplate(text, prices) {
  if (!prices) return text;
  let out = nbsp(text);
  prices.forEach((p, i) => {
    const formatted = nbsp(fmtPrice(p, langBy(DEFAULT_LANG).intl));
    if (out.indexOf(formatted) !== -1) out = out.replace(formatted, "{p" + i + "}");
  });
  return out;
}
/* Predlozak -> tekst s cijenama formatiranim za trazeni jezik. */
function fromTemplate(tpl, prices, intlCode) {
  if (!prices) return tpl;
  let out = tpl;
  prices.forEach((p, i) => {
    out = out.split("{p" + i + "}").join(fmtPrice(p, intlCode));
  });
  return out;
}

/* ---------- JSON pomocnici (nested <-> flat) ---------- */
function flatten(obj, prefix, out) {
  out = out || {}; prefix = prefix || "";
  Object.keys(obj).forEach((k) => {
    const v = obj[k], key = prefix ? prefix + "." + k : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  });
  return out;
}
function unflatten(flat) {
  const out = {};
  Object.keys(flat).forEach((key) => {
    const parts = key.split(".");
    let cur = out;
    parts.forEach((p, i) => {
      if (i === parts.length - 1) cur[p] = flat[key];
      else cur = (cur[p] = cur[p] && typeof cur[p] === "object" ? cur[p] : {});
    });
  });
  return out;
}
function loadLocale(code) {
  const dir = path.join(LOCALES, code);
  if (!fs.existsSync(dir)) return {};
  let flat = {};
  fs.readdirSync(dir).filter((f) => f.endsWith(".json")).forEach((f) => {
    Object.assign(flat, flatten(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))));
  });
  return flat;
}
function saveLocale(code, flat) {
  const dir = path.join(LOCALES, code);
  fs.mkdirSync(dir, { recursive: true });
  const buckets = {};
  NS_FILES.forEach((f) => (buckets[f] = {}));
  Object.keys(flat).sort().forEach((k) => {
    const file = NS[k.split(".")[0]] || "common";
    buckets[file][k] = flat[k];
  });
  Object.keys(buckets).forEach((file) => {
    const keys = Object.keys(buckets[file]);
    if (!keys.length) return;
    fs.writeFileSync(path.join(dir, file + ".json"),
      JSON.stringify(unflatten(buckets[file]), null, 2) + "\n", "utf8");
  });
}

/* ---------- EXTRACT ---------- */
function extract() {
  const html = fs.readFileSync(SRC, "utf8");
  const flat = {};
  findNodes(html).forEach((n) => {
    if (n.keyContent) {
      const v = /(?<![-\w])content\s*=\s*"([^"]*)"/.exec(n.attrs);
      if (v) flat[n.keyContent] = v[1];
    }
    if (n.keyAria) {
      const v = /\baria-label\s*=\s*"([^"]*)"/.exec(n.attrs);
      if (v) flat[n.keyAria] = v[1];
    }
    if (n.keyAlt) {
      const v = /(?<![-\w])alt\s*=\s*"([^"]*)"/.exec(n.attrs);
      if (v) flat[n.keyAlt] = v[1];
    }
    const key = n.key || n.keyHtml;
    if (!key) return;
    const r = innerRange(html, n.openStart, n.tag);
    if (!r) { console.warn("  ! nije nadeno zatvaranje za", key); return; }
    let inner = collapse(html.slice(r.start, r.end));
    if (n.key) inner = inner.replace(/<[^>]+>/g, "");  // cisti tekst
    flat[key] = toTemplate(inner, n.prices);
  });
  /* Opis iz ProfessionalService bloka nema svoj element, citamo ga izravno. */
  const biz = /<!-- i18n:ldbiz -->[\s\S]*?"description":\s*"([^"]*)"/.exec(html);
  if (biz) flat["meta.schemaDescription"] = biz[1];

  saveLocale(DEFAULT_LANG, flat);
  const n = Object.keys(flat).length;
  console.log("extract: " + n + " kljuceva -> locales/hr/ (" + NS_FILES.length + " datoteka)");

  /* HR FAQPage schema se regenerira iz vidljivih pitanja, da tekst u
     strukturiranim podacima nikad ne odluta od teksta na stranici. */
  const t = (k) => (flat[k] != null ? flat[k] : "");
  const updated = replaceBlock(html, "i18n:ldfaq", ldFaq(t));
  if (updated !== html) {
    fs.writeFileSync(SRC, updated, "utf8");
    console.log("extract: osvjezen FAQPage JSON-LD u index.html");
  }
  return flat;
}

/* ---------- render jedne jezicne verzije ---------- */
function render(html, lang, dict, base, avail) {
  const t = (k) => (dict[k] != null && dict[k] !== "" ? dict[k] : base[k] != null ? base[k] : "");
  const nodes = findNodes(html).sort((a, b) => b.openStart - a.openStart); // straga naprijed
  let out = html;

  nodes.forEach((n) => {
    const key = n.key || n.keyHtml;
    if (key) {
      const r = innerRange(out, n.openStart, n.tag);
      if (r) {
        const val = fromTemplate(t(key), n.prices, lang.intl);
        out = out.slice(0, r.start) + val + out.slice(r.end);
      }
    }
    /* atributi se mijenjaju u otvarajucem tagu */
    const openTag = out.slice(n.openStart, out.indexOf(">", n.openStart) + 1);
    let newOpen = openTag;
    if (n.keyContent) newOpen = newOpen.replace(/(?<![-\w])content\s*=\s*"[^"]*"/, 'content="' + esc(t(n.keyContent)) + '"');
    if (n.keyAria) newOpen = newOpen.replace(/\baria-label\s*=\s*"[^"]*"/, 'aria-label="' + esc(t(n.keyAria)) + '"');
    if (n.keyAlt) newOpen = newOpen.replace(/(?<![-\w])alt\s*=\s*"[^"]*"/, 'alt="' + esc(t(n.keyAlt)) + '"');
    if (newOpen !== openTag) out = out.slice(0, n.openStart) + newOpen + out.slice(n.openStart + openTag.length);
  });

  /* kratica na gumbu switchera (HR / EN / DE ...) */
  out = out.replace(/(id="langCurrent">)[^<]*/, "$1" + lang.short);
  out = out.replace(/<html lang="[^"]*"/, '<html lang="' + lang.code + '"');
  out = replaceBlock(out, "i18n:alternates", alternatesBlock(lang, avail));
  out = replaceBlock(out, "i18n:langmenu", langMenuBlock(lang, avail));
  out = replaceBlock(out, "i18n:ldbiz", ldBusiness(t));
  out = replaceBlock(out, "i18n:ldfaq", ldFaq(t));
  if (lang.dir) out = absolutizePaths(out);
  return out;
}
const esc = (s) => String(s).replace(/"/g, "&quot;");

function replaceBlock(html, marker, content) {
  const re = new RegExp("(<!-- " + marker + " -->)[\\s\\S]*?(<!-- /" + marker + " -->)");
  return html.replace(re, "$1\n" + content + "\n  $2");
}

/* Podstranice (/en/) trebaju apsolutne putanje do assetsa i predlozaka. */
function absolutizePaths(html) {
  return html.replace(/\b(href|src)="(?!https?:|\/\/|\/|#|mailto:|tel:|data:)([^"]+)"/g,
    (m, attr, val) => attr + '="/' + val + '"');
}

/* Samo jezici koji stvarno postoje — hreflang na nepostojeci URL je greska. */
function alternatesBlock(lang, avail) {
  const lines = [
    '  <link rel="canonical" href="' + urlFor(lang) + '" />',
    '  <meta property="og:url" content="' + urlFor(lang) + '" />',
    '  <meta property="og:locale" content="' + lang.og + '" />'
  ];
  avail.filter((l) => l.code !== lang.code).forEach((l) =>
    lines.push('  <meta property="og:locale:alternate" content="' + l.og + '" />'));
  avail.forEach((l) =>
    lines.push('  <link rel="alternate" hreflang="' + l.code + '" href="' + urlFor(l) + '" />'));
  lines.push('  <link rel="alternate" hreflang="x-default" href="' + urlFor(langBy(DEFAULT_LANG)) + '" />');
  return lines.join("\n");
}

/* Dropdown: aktivni jezik se izostavlja iz liste, ostali idu izvornim nazivom. */
function langMenuBlock(lang, avail) {
  return avail.filter((l) => l.code !== lang.code).map((l) =>
    '    <li role="none"><a role="option" tabindex="-1" hreflang="' + l.code + '" lang="' + l.code +
    '" href="' + (l.dir ? "/" + l.dir + "/" : "/") + '" data-lang="' + l.code + '">' +
    l.native + "</a></li>").join("\n");
}

function ldBusiness(t) {
  const data = {
    "@context": "https://schema.org", "@type": "ProfessionalService", name: "Lota Studio",
    description: t("meta.schemaDescription"), url: SITE + "/", email: "info@lotastudio.eu",
    telephone: ["+385924631565", "+385924631717"], areaServed: "HR",
    contactPoint: ["+385924631565", "+385924631717"].map((tel) => ({
      "@type": "ContactPoint", contactType: "sales", email: "info@lotastudio.eu",
      telephone: tel, availableLanguage: LANGS.map((l) => l.code)
    }))
  };
  return '  <script type="application/ld+json">\n  ' +
    JSON.stringify(data, null, 2).split("\n").join("\n  ") + "\n  <\/script>";
}

function ldFaq(t) {
  const items = [];
  for (let i = 1; ; i++) {
    const q = t("faq.q" + i), a = t("faq.a" + i);
    if (!q || !a) break;
    items.push({ "@type": "Question", name: strip(q), acceptedAnswer: { "@type": "Answer", text: strip(a) } });
  }
  const data = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items };
  return '  <script type="application/ld+json">\n  ' +
    JSON.stringify(data, null, 2).split("\n").join("\n  ") + "\n  <\/script>";
}
const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/* ---------- BUILD ---------- */
function build() {
  const html = fs.readFileSync(SRC, "utf8");
  const base = loadLocale(DEFAULT_LANG);
  const total = Object.keys(base).length;
  const has = (l) => Object.keys(loadLocale(l.code)).some((k) => base[k] != null);
  const avail = LANGS.filter((l) => !l.dir || has(l));
  console.log("build: jezici u pogonu -> " + avail.map((l) => l.short).join(", "));
  LANGS.filter((l) => l.dir).forEach((lang) => {
    const dict = loadLocale(lang.code);
    const have = Object.keys(base).filter((k) => dict[k] != null && dict[k] !== "").length;
    const stale = staleKeys(lang.code, base, dict, loadState());
    if (stale.length) console.log("  ! " + lang.short + " ima " + stale.length + " zastarjelih prijevoda: " + stale.slice(0, 4).join(", "));
    /* Jezik bez ijednog prijevoda se ne gradi — cijela stranica bi bila
       hrvatska pod stranim hreflangom, sto je za Google duplikat. */
    if (!have) { console.log("build: /" + lang.dir + "/ preskoceno — nema prijevoda"); return; }
    const dir = path.join(ROOT, lang.dir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), render(html, lang, dict, base, avail), "utf8");
    console.log("build: /" + lang.dir + "/index.html  (" + have + "/" + total +
      " prevedeno" + (have < total ? ", ostalo pada na HR" : "") + ")");
  });

  /* HR stranica dobiva isti popis jezika — hreflang i izbornik moraju
     biti jednaki na svim verzijama, inace ih Google ignorira. */
  const hr = langBy(DEFAULT_LANG);
  let root = fs.readFileSync(SRC, "utf8");
  root = replaceBlock(root, "i18n:alternates", alternatesBlock(hr, avail));
  root = replaceBlock(root, "i18n:langmenu", langMenuBlock(hr, avail));
  fs.writeFileSync(SRC, root, "utf8");
  console.log("build: osvjezen hreflang i izbornik u index.html");
}

/* ---------- VERIFY: HR kroz cijeli lanac mora dati isti tekst ---------- */
function verify() {
  const html = fs.readFileSync(SRC, "utf8");
  const base = loadLocale(DEFAULT_LANG);
  const hr = langBy(DEFAULT_LANG);
  const has = (l) => Object.keys(loadLocale(l.code)).some((k) => base[k] != null);
  const avail = LANGS.filter((l) => !l.dir || has(l));
  const out = render(html, { ...hr, dir: "" }, base, base, avail);
  /* Generirane blokove (hreflang, izbornik jezika, JSON-LD) izuzimamo:
     mijenjaju se kad se doda jezik, a nisu prijevod sadrzaja. */
  const stripGen = (x) => {
    ["alternates", "langmenu", "ldbiz", "ldfaq"].forEach((m) => {
      const open = "<!-- i18n:" + m + " -->", close = "<!-- /i18n:" + m + " -->";
      let i;
      while ((i = x.indexOf(open)) !== -1) {
        const j = x.indexOf(close, i);
        if (j === -1) break;
        x = x.slice(0, i) + x.slice(j + close.length);
      }
    });
    return x;
  };
  const textOf = (str) => collapse(
    stripGen(str).split("<body>")[1].replace(SCRIPT_RE, "").replace(TAG_RE, " ")
  );
  const a = textOf(html), b = textOf(out);
  if (a === b) { console.log("verify: OK — HR round-trip je identican (" + a.split(" ").length + " rijeci)"); return true; }
  const wa = a.split(" "), wb = b.split(" ");
  for (let i = 0; i < Math.max(wa.length, wb.length); i++) {
    if (wa[i] !== wb[i]) {
      console.error("verify: RAZLIKA na rijeci " + i);
      console.error("  index.html: ..." + wa.slice(Math.max(0, i - 6), i + 8).join(" "));
      console.error("  render:     ..." + wb.slice(Math.max(0, i - 6), i + 8).join(" "));
      break;
    }
  }
  process.exitCode = 1;
  return false;
}


/* ---------- OTISCI HRVATSKOG IZVORNIKA ----------
   Kad se promijeni hrvatska vrijednost postojeceg kljuca, prijevodi tiho
   ostanu stari — kljuc postoji, pa ih nijedna provjera ne prijavi. Zato uz
   svaki prijevod pamtimo otisak hrvatskog teksta u trenutku prevodenja.
   Ne poklapa li se s danasnjim, prijevod je ZASTARJEO.

   Nakon sto prijevod osvjezis, zapecati ga:  node tools/i18n.js seal <jezik>
   ------------------------------------------------ */
const STATE = path.join(LOCALES, '_state.json');
const fingerprint = (v) => crypto.createHash('sha1').update(String(v), 'utf8').digest('hex').slice(0, 10);

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); }
  catch (e) { return { _opis: 'Otisci hrvatskog izvornika u trenutku prijevoda. Generira tools/i18n.js, ne uredivati rucno.', hashes: {} }; }
}
function saveState(st) {
  Object.keys(st.hashes).forEach((l) => {
    const sorted = {};
    Object.keys(st.hashes[l]).sort().forEach((k) => (sorted[k] = st.hashes[l][k]));
    st.hashes[l] = sorted;
  });
  fs.writeFileSync(STATE, JSON.stringify(st, null, 2) + String.fromCharCode(10), 'utf8');
}
/* Kljucevi koji imaju prijevod, ali je hrvatski izvornik u meduvremenu izmijenjen. */
function staleKeys(langCode, base, dict, st) {
  const h = (st.hashes && st.hashes[langCode]) || {};
  return Object.keys(base).filter((k) =>
    dict[k] != null && dict[k] !== '' && h[k] !== fingerprint(base[k]));
}
/* Oznaci trenutne prijevode kao uskladene s danasnjim hrvatskim tekstom. */
function seal(only) {
  const base = loadLocale(DEFAULT_LANG);
  const st = loadState();
  LANGS.filter((l) => l.dir).filter((l) => !only || l.code === only).forEach((l) => {
    const d = loadLocale(l.code);
    st.hashes[l.code] = st.hashes[l.code] || {};
    let n = 0;
    Object.keys(base).forEach((k) => {
      if (d[k] != null && d[k] !== '') { st.hashes[l.code][k] = fingerprint(base[k]); n++; }
    });
    Object.keys(st.hashes[l.code]).forEach((k) => { if (!(k in base)) delete st.hashes[l.code][k]; });
    console.log('seal: ' + l.short + ' — zapecaceno ' + n + ' prijevoda');
  });
  saveState(st);
}
/* ---------- STATUS ---------- */
function status() {
  const base = loadLocale(DEFAULT_LANG);
  const keys = Object.keys(base);
  const st = loadState();
  let total = 0;
  console.log("kljuceva u HR izvoru: " + keys.length);
  LANGS.filter((l) => l.dir).forEach((l) => {
    const d = loadLocale(l.code);
    const have = keys.filter((k) => d[k] != null && d[k] !== "").length;
    const missing = keys.filter((k) => d[k] == null || d[k] === "");
    const stale = staleKeys(l.code, base, d, st);
    console.log("  " + l.short + ": " + have + "/" + keys.length +
      (missing.length ? "  nedostaje: " + missing.slice(0, 5).join(", ") + (missing.length > 5 ? " (+" + (missing.length - 5) + ")" : "") : "") +
      (stale.length ? "  ZASTARJELO (" + stale.length + "): " + stale.slice(0, 5).join(", ") + (stale.length > 5 ? " (+" + (stale.length - 5) + ")" : "") : ""));
    total += stale.length;
  });
  if (total) console.log(String.fromCharCode(10) + 'Zastarjelih prijevoda: ' + total +
    '. Osvjezi tekst pa pokreni: node tools/i18n.js seal <jezik>');
  return total;
}

const cmd = process.argv[2] || "help";
if (cmd === "extract") extract();
else if (cmd === "build") build();
else if (cmd === "verify") verify();
else if (cmd === "status") status();
else if (cmd === "seal") seal(process.argv[3]);
else if (cmd === "all") { extract(); if (verify()) build(); }
else console.log("Koristi: node tools/i18n.js extract|build|verify|status|seal [jezik]|all");
