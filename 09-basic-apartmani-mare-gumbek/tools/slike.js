#!/usr/bin/env node
/* ==============================================================
   APARTMANI MARE I GUMBEK — naslovne fotografije (hero + og:image)
   --------------------------------------------------------------
   Iz dvije izvorne fotografije gradi:
     images/hero/mare-hero-960.webp    images/hero/mare-hero-1600.webp
     images/hero/mare-hero-960.jpg     images/hero/mare-hero-1600.jpg
     (isto za gumbek)
     images/og-mare-gumbek.jpg         1200x630 za dijeljenje linka

   HTML ih vec referencira (<picture> u heroju, preload u <head>,
   og:image), pa ZAMJENA NASLOVNIH FOTOGRAFIJA IDE OVAKO:
     1) nove fotografije stavi u images/mare/ i images/gumbek/
     2) promijeni dvije putanje u IZVORI ispod
     3) node tools/slike.js
     4) po zelji osvjezi alt tekst (hero.mare.alt / hero.gumbek.alt)
   Izvor treba biti pejzazni, barem 1600 px sirok. Drugaciji omjer
   od 3:2 je u redu — slika se kropa (object-fit: cover u heroju).

   OVISNOST: sharp (samo za ovaj alat, stranica ga ne treba).
     npm install --no-save --prefix tools sharp
   tools/node_modules je u .gitignore.
   ============================================================== */
"use strict";

const path = require("path");
const fs = require("fs");

/* ✏️ Jedino ovo se mijenja kad stignu nove fotografije */
const IZVORI = {
  mare: "images/mare/mare-01-terasa.jpg",
  gumbek: "images/gumbek/gumbek-03-balkon.jpg"
};

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "images", "hero");
const SIRINE = [960, 1600];      // polovica desktopa / puna sirina mobitela na 2x
const OMJER = 1066 / 1600;       // mora odgovarati width/height atributima u HTML-u

let sharp;
try { sharp = require("sharp"); }
catch (e) {
  console.error("Nedostaje sharp. Pokreni:  npm install --no-save --prefix tools sharp");
  process.exit(1);
}

async function hero() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [ime, izvor] of Object.entries(IZVORI)) {
    const src = path.join(ROOT, izvor);
    for (const w of SIRINE) {
      const base = sharp(src).rotate().resize(w, Math.round(w * OMJER), { fit: "cover", position: "centre" });
      const webp = path.join(OUT, `${ime}-hero-${w}.webp`);
      const jpg = path.join(OUT, `${ime}-hero-${w}.jpg`);
      await base.clone().webp({ quality: 78, effort: 6 }).toFile(webp);
      await base.clone().jpeg({ quality: 80, mozjpeg: true, progressive: true }).toFile(jpg);
      console.log(`  ${path.relative(ROOT, webp)}  ${kb(webp)}   ${path.relative(ROOT, jpg)}  ${kb(jpg)}`);
    }
  }
}

/* og:image — isti split kao hero. Tekst je samo ono sto se ne prevodi
   (imena i mjesto), jer je slika jedna za sve jezicne verzije. */
async function og() {
  const W = 1200, H = 630, gap = 4, half = (W - gap) / 2;
  const crop = (f) => sharp(path.join(ROOT, f)).rotate().resize(half, H, { fit: "cover" }).toBuffer();
  const [mare, gumbek] = await Promise.all([crop(IZVORI.mare), crop(IZVORI.gumbek)]);
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#092026" stop-opacity=".55"/>
    <stop offset=".45" stop-color="#092026" stop-opacity=".05"/>
    <stop offset=".62" stop-color="#092026" stop-opacity=".25"/>
    <stop offset="1" stop-color="#092026" stop-opacity=".9"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <g font-family="Georgia, 'Times New Roman', serif" fill="#fff" font-weight="600">
    <text x="${W / 2}" y="78" text-anchor="middle" font-size="40" font-style="italic">Petrčane · Zadar</text>
    <text x="44" y="${H - 44}" font-size="76">Mare</text>
    <text x="${W - 44}" y="${H - 44}" text-anchor="end" font-size="76">Gumbek</text>
  </g></svg>`;
  const file = path.join(ROOT, "images", "og-mare-gumbek.jpg");
  await sharp({ create: { width: W, height: H, channels: 3, background: "#ffffff" } })
    .composite([
      { input: mare, left: 0, top: 0 },
      { input: gumbek, left: half + gap, top: 0 },
      { input: Buffer.from(svg), left: 0, top: 0 }
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(file);
  console.log(`  ${path.relative(ROOT, file)}  ${kb(file)}`);
}

const kb = (f) => Math.round(fs.statSync(f).size / 1024) + " KB";

(async () => {
  console.log("hero:");
  await hero();
  console.log("og:image:");
  await og();
})().catch((e) => { console.error(e.message); process.exit(1); });
