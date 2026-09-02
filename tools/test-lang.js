/* Mini test bez preglednika: pokrece assets/lang.js nad laznim DOM-om
   i provjerava kamo (ne) preusmjerava. */
const fs = require("fs");
const src = fs.readFileSync("assets/lang.js", "utf8");

function run({ pageLang, menuLangs, saved, navLangs, sessionSeen }) {
  const stubEl = () => ({
    addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    classList: { toggle() {} }, contains() { return false; }, focus() {}
  });
  const options = menuLangs.map((c) => ({
    getAttribute: (n) => (n === "data-lang" ? c : null),
    addEventListener() {}, focus() {}
  }));
  const menu = Object.assign(stubEl(), { querySelectorAll: () => options });
  const document = {
    documentElement: { getAttribute: (n) => (n === "lang" ? pageLang : null) },
    getElementById: (id) => (id === "langMenu" ? menu : stubEl()),
    addEventListener() {}
  };
  const ls = { _d: saved ? { "lota-lang": saved } : {},
    getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; } };
  const ss = { _d: sessionSeen ? { "lota-lang-redirected": "1" } : {},
    getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; } };
  let redirect = null;
  const location = { hash: "", replace(u) { redirect = u; } };
  const navigator = { languages: navLangs, language: navLangs[0] };
  new Function("document", "navigator", "location", "localStorage", "sessionStorage", src)
    (document, navigator, location, ls, ss);
  return { redirect, stored: ls._d["lota-lang"] || null };
}

const T = [
  ["HR stranica, njemacki preglednik, /de/ NE postoji",
   { pageLang: "hr", menuLangs: ["en"], navLangs: ["de-DE", "de"] }, null],
  ["HR stranica, engleski preglednik, /en/ postoji",
   { pageLang: "hr", menuLangs: ["en"], navLangs: ["en-GB", "en"] }, "/en/"],
  ["HR stranica, hrvatski preglednik",
   { pageLang: "hr", menuLangs: ["en"], navLangs: ["hr-HR", "hr"] }, null],
  ["HR stranica, spremljen izbor EN",
   { pageLang: "hr", menuLangs: ["en"], saved: "en", navLangs: ["hr"] }, "/en/"],
  ["HR stranica, spremljen izbor HR (korisnik se vratio na hrvatski)",
   { pageLang: "hr", menuLangs: ["en"], saved: "hr", navLangs: ["en"] }, null],
  ["HR stranica, vec preusmjereno u ovoj sesiji",
   { pageLang: "hr", menuLangs: ["en"], navLangs: ["en"], sessionSeen: true }, null],
  ["EN stranica — nikad ne preusmjerava dalje",
   { pageLang: "en", menuLangs: ["hr"], navLangs: ["de"] }, null],
  ["HR stranica, svi jezici u pogonu, njemacki preglednik",
   { pageLang: "hr", menuLangs: ["en", "de", "es", "it", "sl"], navLangs: ["de-AT", "de"] }, "/de/"],
  ["HR stranica, slovenski preglednik, /sl/ postoji",
   { pageLang: "hr", menuLangs: ["en", "de", "es", "it", "sl"], navLangs: ["sl-SI", "sl"] }, "/sl/"],
  ["SL stranica — nikad ne preusmjerava dalje",
   { pageLang: "sl", menuLangs: ["hr", "en"], navLangs: ["de"] }, null]
];

let bad = 0;
T.forEach(([name, cfg, expected]) => {
  const r = run(cfg);
  const ok = r.redirect === expected;
  if (!ok) bad++;
  console.log((ok ? "  OK   " : "  PAO  ") + name +
    "  ->  " + (r.redirect || "bez preusmjeravanja") +
    (ok ? "" : "   (ocekivano: " + (expected || "bez preusmjeravanja") + ")"));
});
console.log(bad ? "\n" + bad + " testova palo" : "\nsvih " + T.length + " testova prolazi");
process.exit(bad ? 1 : 0);
