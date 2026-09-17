#!/usr/bin/env node
/* ==============================================================
   APARTMANI MARE I GUMBEK — i18n alat (bez vanjskih ovisnosti)
   --------------------------------------------------------------
   ZASTO OVAKO: stranica je staticni HTML na GitHub Pagesu, bez
   frameworka i bez servera. Za prave locale URL-ove (/en/, /de/,
   /it/) i hreflang po jeziku netko mora generirati datoteku po
   jeziku — to radi ovaj skript u build vremenu, pa stranica ostaje
   obicni staticni HTML. Isti pristup kao alat u korijenu repoa.

   IZVOR ISTINE JE index.html (hrvatski). Prevodivi tekst je oznacen
   data-i18n atributima; locales/hr/*.json se GENERIRA iz njega i ne
   uredjuje se rucno.

   NACINI RADA:
     node tools/i18n.js extract  index.html -> locales/hr/*.json
     node tools/i18n.js build    index.html + locales/* -> /en/ /de/ /it/
                                 + assets/js/dict.js (rjecnik za prekidac)
     node tools/i18n.js verify   round-trip: gradi HR i usporeduje s izvorom
     node tools/i18n.js status   koliko je kljuceva prevedeno po jeziku
     node tools/i18n.js seal [j] zapecati prijevode kao uskladene s HR
     node tools/i18n.js all      extract + verify + build

   GENERIRANI BLOKOVI u <head> (prepisuju se pri buildu, na svim jezicima):
     <!-- i18n:alternates -->   canonical, og:url, og:locale, hreflang
     <!-- i18n:jsonld -->       schema.org LodgingBusiness po apartmanu,
                                iz data/objekti.json + prevedenog naziva/opisa
   Build pise i sitemap.xml (sve jezicne verzije s hreflang poveznicama).

   ATRIBUTI (iste konvencije kao u ostatku repoa):
     data-i18n="k"              -> textContent elementa
     data-i18n-html="k"         -> innerHTML (kad tekst nosi <strong>, <br>)
     data-i18n-content="k"      -> atribut content (meta tagovi)
     data-i18n-aria="k"         -> atribut aria-label
     data-i18n-alt="k"          -> atribut alt
     data-i18n-placeholder="k"  -> atribut placeholder
     data-i18n-title="k"        -> atribut title
     data-i18n-caption="k"      -> atribut data-caption (natpisi u galeriji)

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
const DICT_OUT = path.join(ROOT, "assets", "js", "dict.js");
const OBJEKTI = path.join(ROOT, "data", "objekti.json");
const SITEMAP_OUT = path.join(ROOT, "sitemap.xml");

const SITE = "https://lotastudio.eu";
const BASE = "/09-basic-apartmani-mare-gumbek";   // predlozak zivi u podmapi repoa
const DEFAULT_LANG = "hr";

/* Jezici. dir:"" znaci korijen predloska (hrvatski). */
const LANGS = [
  { code: "hr", native: "Hrvatski", short: "HR", intl: "hr-HR", og: "hr_HR", dir: "" },
  { code: "en", native: "English",  short: "EN", intl: "en-GB", og: "en_GB", dir: "en" },
  { code: "de", native: "Deutsch",  short: "DE", intl: "de-DE", og: "de_DE", dir: "de" },
  { code: "it", native: "Italiano", short: "IT", intl: "it-IT", og: "it_IT", dir: "it" }
];

/* Prefiks kljuca -> datoteka u kojoj zivi (namespace). */
const NS = {
  meta: "common", nav: "common", brand: "common", foot: "common", lang: "common",
  cta: "common", a11y: "common", mobile: "common", lightbox: "common", js: "common",
  hero: "hero", quick: "hero",
  about: "units", units: "units", amen: "units",
  gal: "gallery",
  price: "info", steps: "info", know: "info", loc: "info", who: "info",
  form: "form",
  chat: "chat"
};
const NS_FILES = Array.from(new Set(Object.values(NS)));

const urlFor = (l) => (l.dir ? SITE + BASE + "/" + l.dir + "/" : SITE + BASE + "/");
const langBy = (c) => LANGS.filter((l) => l.code === c)[0];

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

const ATTR_KEYS = [
  ["keyContent", "data-i18n-content", "content"],
  ["keyAria", "data-i18n-aria", "aria-label"],
  ["keyAlt", "data-i18n-alt", "alt"],
  ["keyPh", "data-i18n-placeholder", "placeholder"],
  ["keyTitle", "data-i18n-title", "title"],
  ["keyCaption", "data-i18n-caption", "data-caption"]
];

/* Svi elementi s nekim data-i18n atributom, redom pojavljivanja. */
function findNodes(html) {
  const re = /<([a-zA-Z][\w-]*)\b([^>]*\bdata-i18n(?:-html|-content|-aria|-alt|-placeholder|-title|-caption)?\s*=\s*"[^"]*"[^>]*)>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const tag = m[1], attrs = m[2];
    const get = (name) => {
      const a = new RegExp("(?<![-\\w])" + name + '\\s*=\\s*"([^"]*)"').exec(attrs);
      return a ? a[1] : null;
    };
    const node = {
      tag,
      openStart: m.index,
      attrs,
      key: get("data-i18n"),
      keyHtml: get("data-i18n-html")
    };
    ATTR_KEYS.forEach(([prop, dataAttr]) => { node[prop] = get(dataAttr); });
    out.push(node);
  }
  return out;
}

const SCRIPT_RE = /<script[\s\S]*?<\/script>/g;
const TAG_RE = /<[^>]+>/g;
const collapse = (s) => s.replace(/\s+/g, " ").trim();
const esc = (s) => String(s).replace(/"/g, "&quot;");

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
    ATTR_KEYS.forEach(([prop, , htmlAttr]) => {
      if (!n[prop]) return;
      const v = new RegExp("(?<![-\\w])" + htmlAttr + '\\s*=\\s*"([^"]*)"').exec(n.attrs);
      if (v) flat[n[prop]] = v[1];
    });
    const key = n.key || n.keyHtml;
    if (!key) return;
    const r = innerRange(html, n.openStart, n.tag);
    if (!r) { console.warn("  ! nije nadeno zatvaranje za " + key); return; }
    let inner = collapse(html.slice(r.start, r.end));
    if (n.key) inner = inner.replace(TAG_RE, "");   // cisti tekst
    flat[key] = inner;
  });

  /* Tekstovi koje ispisuje skripta (poruke obrasca, brojac galerije).
     Zive u <script> bloku, pa ih ne hvata findNodes — citamo ih iz
     JS_KEYS objekta u index.html. */
  Object.assign(flat, extractScriptKeys(html));

  saveLocale(DEFAULT_LANG, flat);
  console.log("extract: " + Object.keys(flat).length + " kljuceva -> locales/hr/ (" +
    NS_FILES.length + " datoteka)");
  return flat;
}

/* Blok u index.html:  /* i18n:js * / const JS_TEXT = { "kljuc": "tekst", ... }; */
function extractScriptKeys(html) {
  const m = /\/\* i18n:js \*\/\s*const JS_TEXT = (\{[\s\S]*?\n  \});/.exec(html);
  if (!m) return {};
  const out = {};
  const re = /"([\w.]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let k;
  while ((k = re.exec(m[1]))) out[k[1]] = k[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  return out;
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
      if (r) out = out.slice(0, r.start) + t(key) + out.slice(r.end);
    }
    /* atributi se mijenjaju u otvarajucem tagu */
    const openTag = out.slice(n.openStart, out.indexOf(">", n.openStart) + 1);
    let newOpen = openTag;
    ATTR_KEYS.forEach(([prop, , htmlAttr]) => {
      if (!n[prop]) return;
      newOpen = newOpen.replace(new RegExp("(?<![-\\w])" + htmlAttr + '\\s*=\\s*"[^"]*"'),
        htmlAttr + '="' + esc(t(n[prop])) + '"');
    });
    if (newOpen !== openTag) {
      out = out.slice(0, n.openStart) + newOpen + out.slice(n.openStart + openTag.length);
    }
  });

  out = replaceScriptKeys(out, t, base);
  out = out.replace(/(id="langCurrent"[^>]*>)[^<]*/, "$1" + lang.short);
  out = out.replace(/<html lang="[^"]*"/, '<html lang="' + lang.code + '"');
  out = out.replace(/(<html[^>]*\sdata-i18n-lang=")[^"]*"/, "$1" + lang.code + '"');
  out = replaceBlock(out, "i18n:alternates", alternatesBlock(lang, avail));
  out = replaceBlock(out, "i18n:langmenu", langMenuBlock(lang, avail));
  out = replaceBlock(out, "i18n:jsonld", jsonldBlock(lang, t));
  if (lang.dir) out = absolutizePaths(out);
  return out;
}

/* JS_TEXT blok se prepisuje cijeli, prevedenim vrijednostima.
   Kljuceve uzimamo iz samog bloka, pa nisu vezani uz jedan prefiks. */
function replaceScriptKeys(html, t, base) {
  return html.replace(/(\/\* i18n:js \*\/\s*const JS_TEXT = )\{[\s\S]*?\n  \}/, (m, head) => {
    const keys = Object.keys(extractScriptKeys(html)).sort();
    const body = keys.map((k) =>
      '    "' + k + '": "' + String(t(k)).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'
    ).join(",\n");
    return head + "{\n" + body + "\n  }";
  });
}

function replaceBlock(html, marker, content) {
  const re = new RegExp("(<!-- " + marker + " -->)[\\s\\S]*?(<!-- /" + marker + " -->)");
  return html.replace(re, (m, open, close) => open + "\n" + content + "\n  " + close);
}

/* Podstranice (/en/) su jednu razinu dublje, pa relativne putanje pucaju.
   Pretvaramo ih u apsolutne, racunajuci od korijena domene. */
function absolutizePaths(html) {
  const abs = (val) => val.indexOf("../") === 0 ? "/" + val.replace(/^(\.\.\/)+/, "") : BASE + "/" + val;
  const isRel = (val) => !/^(https?:|\/\/|\/|#|mailto:|tel:|data:)/.test(val);
  /* srcset i imagesrcset su popisi "putanja sirina, putanja sirina" —
     bez ovoga bi /en/ trazio images/hero/... ispod /en/ i dobio 404 */
  html = html.replace(/\b(srcset|imagesrcset)="([^"]+)"/g, (m, attr, list) =>
    attr + '="' + list.split(",").map((part) => {
      const p = part.trim().split(/\s+/);
      if (p[0] && isRel(p[0])) p[0] = abs(p[0]);
      return p.join(" ");
    }).join(", ") + '"');
  return html.replace(/\b(href|src)="(?!https?:|\/\/|\/|#|mailto:|tel:|data:)([^"]+)"/g,
    (m, attr, val) => {
      /* "../favicon.ico" iz predloska gleda u korijen repoa, ne u BASE */
      if (val.indexOf("../") === 0) return attr + '="/' + val.replace(/^(\.\.\/)+/, "") + '"';
      return attr + '="' + BASE + "/" + val + '"';
    });
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
  lines.push('  <link rel="alternate" hreflang="x-default" href="' +
    urlFor(langBy(DEFAULT_LANG)) + '" />');
  return lines.join("\n");
}

/* Izbornik nosi sve jezike (i aktivni) — prekidac oznacava trenutni s
   aria-current, a href vodi na pravi URL ako skripta ne radi. */
function langMenuBlock(lang, avail) {
  return avail.map((l) =>
    '    <li role="none"><a role="option" hreflang="' + l.code + '" lang="' + l.code +
    '" href="' + (l.dir ? BASE + "/" + l.dir + "/" : BASE + "/") +
    '" data-lang="' + l.code + '"' +
    (l.code === lang.code ? ' aria-selected="true"' : ' aria-selected="false"') +
    "><span>" + l.native + "</span><small>" + l.short + "</small></a></li>").join("\n");
}

/* ---------- JSON-LD: svaki apartman je zaseban objekt ----------
   Mare i Gumbek su na dvije razlicite adrese, pa svaki dobiva vlastiti
   LodgingBusiness s adresom i koordinatama. @id je isti na svim jezicima
   (ista stvarna jedinica), a naziv, opis i url prate jezik stranice.
   Namjerno bez aggregateRating: Google ne prikazuje samoobjavljene ocjene
   za LocalBusiness, a ocjene zive na Bookingu. */
function jsonldBlock(lang, t) {
  let data;
  try { data = JSON.parse(fs.readFileSync(OBJEKTI, "utf8")); }
  catch (e) { console.warn("  ! data/objekti.json nije procitan — JSON-LD preskocen"); return ""; }
  const text = (k) => collapse(String(t(k) || "").replace(TAG_RE, " "));
  const abs = (p) => SITE + BASE + "/" + p;
  const graph = data.objekti.map((o) => {
    const node = {
      "@type": "LodgingBusiness",
      "@id": SITE + BASE + "/#" + o.id,
      name: text(o.kljucNaziv),
      alternateName: o.bookingNaziv,
      description: text(o.kljucOpis),
      url: urlFor(lang) + "#" + o.sidro,
      image: o.slike.map(abs),
      telephone: data.telefon,
      address: {
        "@type": "PostalAddress",
        streetAddress: o.adresa.ulica,
        addressLocality: o.adresa.mjesto,
        postalCode: o.adresa.postanskiBroj,
        addressRegion: o.adresa.regija,
        addressCountry: "HR"
      }
    };
    if (Array.isArray(o.geo) && o.geo.length === 2) {
      node.geo = { "@type": "GeoCoordinates", latitude: o.geo[0], longitude: o.geo[1] };
      node.hasMap = "https://www.google.com/maps/search/?api=1&query=" + o.geo[0] + "%2C" + o.geo[1];
    }
    if (o.prijava) node.checkinTime = o.prijava;
    if (o.odjava) node.checkoutTime = o.odjava;
    if (o.kucniLjubimci != null) node.petsAllowed = o.kucniLjubimci;
    node.numberOfRooms = o.spavaonice;
    node.amenityFeature = o.sadrzaji.map((n) => ({ "@type": "LocationFeatureSpecification", name: n, value: true }));
    node.containsPlace = {
      "@type": "Apartment",
      name: text(o.kljucNaziv),
      numberOfBedrooms: o.spavaonice,
      numberOfBathroomsTotal: o.kupaonice,
      floorSize: { "@type": "QuantitativeValue", value: o.povrsinaM2, unitCode: "MTK" }
    };
    return node;
  });
  /* "<" kao \u003c: tekst s "</script>" ne smije zatvoriti blok */
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2)
    .replace(/</g, "\\u003c");
  return '  <script type="application/ld+json">\n' +
    json.split("\n").map((l) => "  " + l).join("\n") + "\n  </script>";
}

/* ---------- rjecnik za prekidac bez ponovnog ucitavanja ---------- */
function writeDict(base, avail) {
  const keys = Object.keys(base).sort();
  const data = {};
  avail.forEach((l) => {
    const d = l.code === DEFAULT_LANG ? base : loadLocale(l.code);
    const bucket = {};
    keys.forEach((k) => { bucket[k] = d[k] != null && d[k] !== "" ? d[k] : base[k]; });
    data[l.code] = bucket;
  });
  const head =
    "/* GENERIRANO — node tools/i18n.js build. Ne uredjivati rucno.\n" +
    "   Rjecnik za prebacivanje jezika bez ponovnog ucitavanja stranice.\n" +
    "   Ucitava se lijeno, tek na prvi dodir prekidaca jezika. */\n";
  fs.mkdirSync(path.dirname(DICT_OUT), { recursive: true });
  fs.writeFileSync(DICT_OUT,
    head + "window.MG_DICT = " + JSON.stringify(data, null, 1) + ";\n", "utf8");
  console.log("build: assets/js/dict.js  (" + avail.length + " jezika x " + keys.length + " kljuceva)");
}

/* ---------- BUILD ---------- */
function build() {
  const html = fs.readFileSync(SRC, "utf8");
  const base = loadLocale(DEFAULT_LANG);
  const total = Object.keys(base).length;
  const has = (l) => Object.keys(loadLocale(l.code)).some((k) => base[k] != null);
  const avail = LANGS.filter((l) => !l.dir || has(l));
  console.log("build: jezici u pogonu -> " + avail.map((l) => l.short).join(", "));

  LANGS.filter((l) => l.dir).forEach((lang) => {
    const dir = path.join(ROOT, lang.dir);
    const dict = loadLocale(lang.code);
    const have = Object.keys(base).filter((k) => dict[k] != null && dict[k] !== "").length;
    /* Jezik bez ijednog prijevoda se ne gradi — cijela stranica bila bi
       hrvatska pod stranim hreflangom, sto Google cita kao duplikat. */
    if (!have) {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
      console.log("build: /" + lang.dir + "/ preskoceno — nema prijevoda");
      return;
    }
    const stale = staleKeys(lang.code, base, dict, loadState());
    if (stale.length) {
      console.log("  ! " + lang.short + " ima " + stale.length + " zastarjelih prijevoda: " +
        stale.slice(0, 4).join(", "));
    }
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), render(html, lang, dict, base, avail), "utf8");
    console.log("build: /" + lang.dir + "/index.html  (" + have + "/" + total +
      " prevedeno" + (have < total ? ", ostalo pada na HR" : "") + ")");
  });

  /* HR stranica dobiva isti popis jezika — hreflang i izbornik moraju biti
     jednaki na svim verzijama, inace ih Google ignorira. */
  const hr = langBy(DEFAULT_LANG);
  let root = fs.readFileSync(SRC, "utf8");
  root = replaceBlock(root, "i18n:alternates", alternatesBlock(hr, avail));
  root = replaceBlock(root, "i18n:langmenu", langMenuBlock(hr, avail));
  root = replaceBlock(root, "i18n:jsonld", jsonldBlock(hr, (k) => (base[k] != null ? base[k] : "")));
  fs.writeFileSync(SRC, root, "utf8");
  console.log("build: osvjezen hreflang i izbornik u index.html");

  writeDict(base, avail);
  writeSitemap(avail);
}

/* ---------- SITEMAP ----------
   Jedan <url> po jezicnoj verziji, svaki s istim popisom xhtml:link
   alternativa (ukljucujuci sebe i x-default) — Google trazi da skup bude
   potpun i jednak na svakom URL-u. Jezik bez prijevoda nije u "avail",
   pa ne ulazi ni u sitemap. Bez <lastmod>: build se vrti na svaki push i
   datum bi se mijenjao i kad se sadrzaj nije promijenio.
   robots.txt koji upucuje na ovu datoteku je u korijenu repoa, jer
   trazilice citaju robots.txt samo s korijena domene. */
function writeSitemap(avail) {
  const links = avail.map((l) =>
    '    <xhtml:link rel="alternate" hreflang="' + l.code + '" href="' + urlFor(l) + '" />').join("\n") +
    '\n    <xhtml:link rel="alternate" hreflang="x-default" href="' + urlFor(langBy(DEFAULT_LANG)) + '" />';
  const urls = avail.map((l) =>
    "  <url>\n    <loc>" + urlFor(l) + "</loc>\n" + links + "\n  </url>").join("\n");
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    "<!-- GENERIRANO — node tools/i18n.js build. Ne uredjivati rucno. -->\n" +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls + "\n</urlset>\n";
  fs.writeFileSync(SITEMAP_OUT, xml, "utf8");
  console.log("build: sitemap.xml  (" + avail.length + " URL-ova)");
}

/* ---------- VERIFY: HR kroz cijeli lanac mora dati isti tekst ---------- */
function verify() {
  const html = fs.readFileSync(SRC, "utf8");
  const base = loadLocale(DEFAULT_LANG);
  const hr = langBy(DEFAULT_LANG);
  const has = (l) => Object.keys(loadLocale(l.code)).some((k) => base[k] != null);
  const avail = LANGS.filter((l) => !l.dir || has(l));
  const out = render(html, hr, base, base, avail);
  /* Generirane blokove izuzimamo: mijenjaju se kad se doda jezik, a nisu prijevod. */
  const stripGen = (x) => {
    ["alternates", "langmenu"].forEach((m) => {
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
  if (a === b) {
    console.log("verify: OK — HR round-trip je identican (" + a.split(" ").length + " rijeci)");
    return true;
  }
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
   Nakon sto prijevod osvjezis:  node tools/i18n.js seal <jezik>
   ------------------------------------------------ */
const STATE = path.join(LOCALES, "_state.json");
const fingerprint = (v) => crypto.createHash("sha1").update(String(v), "utf8").digest("hex").slice(0, 10);

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, "utf8")); }
  catch (e) {
    return { _opis: "Otisci hrvatskog izvornika u trenutku prijevoda. Generira tools/i18n.js, ne uredivati rucno.", hashes: {} };
  }
}
function saveState(st) {
  Object.keys(st.hashes).forEach((l) => {
    const sorted = {};
    Object.keys(st.hashes[l]).sort().forEach((k) => (sorted[k] = st.hashes[l][k]));
    st.hashes[l] = sorted;
  });
  fs.writeFileSync(STATE, JSON.stringify(st, null, 2) + "\n", "utf8");
}
function staleKeys(langCode, base, dict, st) {
  const h = (st.hashes && st.hashes[langCode]) || {};
  return Object.keys(base).filter((k) =>
    dict[k] != null && dict[k] !== "" && h[k] !== fingerprint(base[k]));
}
function seal(only) {
  const base = loadLocale(DEFAULT_LANG);
  const st = loadState();
  LANGS.filter((l) => l.dir).filter((l) => !only || l.code === only).forEach((l) => {
    const d = loadLocale(l.code);
    st.hashes[l.code] = st.hashes[l.code] || {};
    let n = 0;
    Object.keys(base).forEach((k) => {
      if (d[k] != null && d[k] !== "") { st.hashes[l.code][k] = fingerprint(base[k]); n++; }
    });
    Object.keys(st.hashes[l.code]).forEach((k) => { if (!(k in base)) delete st.hashes[l.code][k]; });
    console.log("seal: " + l.short + " — zapecaceno " + n + " prijevoda");
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
      (missing.length ? "  nedostaje: " + missing.slice(0, 5).join(", ") +
        (missing.length > 5 ? " (+" + (missing.length - 5) + ")" : "") : "") +
      (stale.length ? "  ZASTARJELO (" + stale.length + "): " + stale.slice(0, 5).join(", ") +
        (stale.length > 5 ? " (+" + (stale.length - 5) + ")" : "") : ""));
    total += stale.length;
  });
  if (total) {
    console.log("\nZastarjelih prijevoda: " + total +
      ". Osvjezi tekst pa pokreni: node tools/i18n.js seal <jezik>");
  }
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
