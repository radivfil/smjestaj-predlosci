/* ==============================================================
   VILLA SERENA — SADRŽAJ NA JEDNOM MJESTU
   --------------------------------------------------------------
   Ovo je jedina datoteka koju vlasnik mora dirati za redovno
   ažuriranje: cijene, zauzeti termini, recenzije, okolica.
   Ništa od ovoga ne zahtijeva poznavanje HTML-a.
   ============================================================== */

window.VS = window.VS || {};

/* --------------------------------------------------------------
   1. OSNOVNI PODACI OBJEKTA
   -------------------------------------------------------------- */
VS.property = {
  name: "Villa Serena",                      /* ZAMIJENI: [NAZIV OBJEKTA] */
  place: "Rovinj, Istra",                    /* ZAMIJENI: [MJESTO, REGIJA] */
  address: "Ulica Sv. Križa 24, 52210 Rovinj",
  phone: "+385 91 555 0123",
  phoneHref: "+385915550123",
  whatsapp: "385915550123",
  email: "welcome@villaserena-rovinj.hr",
  oib: "12345678901",
  regId: "HR-52210-2100000000",
  geo: { lat: 45.0811, lng: 13.6387 },
  currency: "EUR",
  currencySymbol: "€",
  touristTax: 1.86,                          /* € po odrasloj osobi i noći */
  cleaningFee: 85,                           /* € jednokratno */
  depositPercent: 30                         /* % akontacije kod online plaćanja */
};

/* --------------------------------------------------------------
   2. SEZONE I CIJENE
   Cijena se računa po noći, ovisno o sezoni i jedinici.
   Datumi su uključivi. Dodaj/uredi razdoblja slobodno.
   -------------------------------------------------------------- */
VS.seasons = [
  { id: "low",  from: "2026-01-01", to: "2026-05-14", minNights: 2, labelKey: "season.low" },
  { id: "mid",  from: "2026-05-15", to: "2026-06-30", minNights: 3, labelKey: "season.mid" },
  { id: "high", from: "2026-07-01", to: "2026-08-31", minNights: 7, labelKey: "season.high" },
  { id: "mid2", from: "2026-09-01", to: "2026-10-15", minNights: 3, labelKey: "season.mid" },
  { id: "low2", from: "2026-10-16", to: "2027-12-31", minNights: 2, labelKey: "season.low" }
];

/* Popusti na duži boravak (postotak) */
VS.discounts = [
  { minNights: 14, percent: 12 },
  { minNights: 7,  percent: 7 }
];

/* --------------------------------------------------------------
   3. SMJEŠTAJNE JEDINICE
   rates: cijena po noći za svaku sezonu (id iz VS.seasons)
   booked: zauzeti termini [od, do] — uključivo
   -------------------------------------------------------------- */
VS.units = [
  {
    id: "mare",
    nameKey: "unit.mare.name",
    descKey: "unit.mare.desc",
    size: 78, capacity: 4, bedrooms: 2, bathrooms: 2, floor: 2,
    rates: { low: 210, mid: 290, high: 420, mid2: 290, low2: 210 },
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=76",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=76",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=76"
    ],
    featureKeys: ["feat.seaview", "feat.terrace", "feat.ac", "feat.kitchen", "feat.nespresso", "feat.bathrobes"],
    booked: [["2026-07-04", "2026-07-18"], ["2026-08-01", "2026-08-15"], ["2026-09-05", "2026-09-12"]]
  },
  {
    id: "oliva",
    nameKey: "unit.oliva.name",
    descKey: "unit.oliva.desc",
    size: 62, capacity: 3, bedrooms: 1, bathrooms: 1, floor: 1,
    rates: { low: 165, mid: 225, high: 320, mid2: 225, low2: 165 },
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=76",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=76",
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1400&q=76"
    ],
    featureKeys: ["feat.garden", "feat.ac", "feat.kitchen", "feat.workspace", "feat.washer"],
    booked: [["2026-07-11", "2026-07-25"], ["2026-08-08", "2026-08-22"]]
  },
  {
    id: "bora",
    nameKey: "unit.bora.name",
    descKey: "unit.bora.desc",
    size: 96, capacity: 6, bedrooms: 3, bathrooms: 2, floor: 0,
    rates: { low: 265, mid: 355, high: 510, mid2: 355, low2: 265 },
    images: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1400&q=76",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=76",
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1400&q=76"
    ],
    featureKeys: ["feat.poolaccess", "feat.terrace", "feat.ac", "feat.kitchen", "feat.family", "feat.bbq"],
    booked: [["2026-06-20", "2026-06-27"], ["2026-07-25", "2026-08-08"], ["2026-08-22", "2026-08-29"]]
  },
  {
    id: "luna",
    nameKey: "unit.luna.name",
    descKey: "unit.luna.desc",
    size: 45, capacity: 2, bedrooms: 1, bathrooms: 1, floor: 3,
    rates: { low: 140, mid: 190, high: 275, mid2: 190, low2: 140 },
    images: [
      "https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=1400&q=76",
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1400&q=76",
      "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1400&q=76"
    ],
    featureKeys: ["feat.rooftop", "feat.seaview", "feat.ac", "feat.couples", "feat.nespresso"],
    booked: [["2026-07-18", "2026-07-25"], ["2026-08-15", "2026-08-29"]]
  }
];

/* --------------------------------------------------------------
   4. GALERIJA
   cat: interior | exterior | surroundings | activities
   -------------------------------------------------------------- */
VS.gallery = [
  { src: "photo-1499793983690-e29da59ef1c2", cat: "exterior",     capKey: "gal.terrace",  span: "w2" },
  { src: "photo-1600585154340-be6161a56a0c", cat: "interior",     capKey: "gal.living" },
  { src: "photo-1600566753086-00f18fb6b3ea", cat: "interior",     capKey: "gal.bedroom" },
  { src: "photo-1584132967334-10e028bd69f7", cat: "interior",     capKey: "gal.bathroom", span: "h2" },
  { src: "photo-1571896349842-33c89424de2d", cat: "exterior",     capKey: "gal.pool" },
  { src: "photo-1556911220-bff31c812dba",    cat: "interior",     capKey: "gal.kitchen" },
  { src: "photo-1516483638261-f4dbaf036963", cat: "surroundings", capKey: "gal.oldtown" },
  { src: "photo-1533105079780-92b9be482077", cat: "surroundings", capKey: "gal.beach",    span: "w2" },
  { src: "photo-1523531294919-4bcd7c65e216", cat: "activities",   capKey: "gal.boat" },
  { src: "photo-1507525428034-b723cf961d3e", cat: "surroundings", capKey: "gal.coast" },
  { src: "photo-1502943693086-33b5b1cfdf2f", cat: "activities",   capKey: "gal.cycling" },
  { src: "photo-1510812431401-41d2bd2722f3", cat: "activities",   capKey: "gal.wine" },
  { src: "photo-1505693314120-0d443867891c", cat: "interior",     capKey: "gal.suite" },
  { src: "photo-1560448204-e02f11c3d0e2",    cat: "interior",     capKey: "gal.lounge" }
];

/* --------------------------------------------------------------
   5. RECENZIJE
   Struktura je spremna za ručni unos ili uvoz s Googlea/Bookinga:
   samo dodaj objekt u niz. Prosjek i histogram se računaju sami.
   -------------------------------------------------------------- */
VS.reviews = [
  { name: "Familie Weber", country: "DE", stars: 5, date: "2025-08", source: "Booking.com", unit: "mare",
    textKey: "rev.1" },
  { name: "Marco & Giulia", country: "IT", stars: 5, date: "2025-07", source: "Google", unit: "bora",
    textKey: "rev.2" },
  { name: "Ivana P.", country: "HR", stars: 5, date: "2025-09", source: "Direktno", unit: "oliva",
    textKey: "rev.3" },
  { name: "Thomas H.", country: "AT", stars: 5, date: "2025-06", source: "Airbnb", unit: "luna",
    textKey: "rev.4" },
  { name: "Sarah & James", country: "EN", stars: 4, date: "2025-05", source: "Google", unit: "mare",
    textKey: "rev.5" },
  { name: "Petra K.", country: "HR", stars: 5, date: "2024-09", source: "Direktno", unit: "bora",
    textKey: "rev.6" },
  { name: "Familie Bauer", country: "AT", stars: 5, date: "2024-08", source: "Booking.com", unit: "bora",
    textKey: "rev.7" },
  { name: "Luca R.", country: "IT", stars: 4, date: "2024-07", source: "Airbnb", unit: "oliva",
    textKey: "rev.8" },
  { name: "Anne & Pierre", country: "FR", stars: 5, date: "2024-06", source: "Google", unit: "luna",
    textKey: "rev.9" }
];

/* --------------------------------------------------------------
   6. OKOLICA (lokacija)
   type: beach | food | culture | activity | transport
   -------------------------------------------------------------- */
VS.poi = [
  { type: "beach",     nameKey: "poi.lone.name",     descKey: "poi.lone.desc",     dist: "400 m" },
  { type: "beach",     nameKey: "poi.mulini.name",   descKey: "poi.mulini.desc",   dist: "1,2 km" },
  { type: "culture",   nameKey: "poi.euphemia.name", descKey: "poi.euphemia.desc", dist: "900 m" },
  { type: "culture",   nameKey: "poi.grisia.name",   descKey: "poi.grisia.desc",   dist: "850 m" },
  { type: "food",      nameKey: "poi.monte.name",    descKey: "poi.monte.desc",    dist: "1 km" },
  { type: "food",      nameKey: "poi.konoba.name",   descKey: "poi.konoba.desc",   dist: "600 m" },
  { type: "food",      nameKey: "poi.market.name",   descKey: "poi.market.desc",   dist: "700 m" },
  { type: "activity",  nameKey: "poi.zlatni.name",   descKey: "poi.zlatni.desc",   dist: "2,5 km" },
  { type: "activity",  nameKey: "poi.wine.name",     descKey: "poi.wine.desc",     dist: "8 km" },
  { type: "activity",  nameKey: "poi.brijuni.name",  descKey: "poi.brijuni.desc",  dist: "35 km" },
  { type: "transport", nameKey: "poi.airport.name",  descKey: "poi.airport.desc",  dist: "40 km" },
  { type: "transport", nameKey: "poi.trieste.name",  descKey: "poi.trieste.desc",  dist: "125 km" }
];
