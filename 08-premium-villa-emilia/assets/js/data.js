/* ==============================================================
   VILLA EMILIA, VIR — SADRŽAJ NA JEDNOM MJESTU
   --------------------------------------------------------------
   Ovo je jedina datoteka koju vlasnica mijenja za redovno
   ažuriranje: cijene, zauzeti termini, jedinice, recenzije, okolica.
   Nije potrebno poznavanje HTML-a.

   ⚠ DEMO PODACI — prije objave provjeriti i zamijeniti:
      • broj jedinica, kvadrature, kapaciteti i cijene
      • kontakt podaci, OIB i broj rješenja o kategorizaciji
      • točne udaljenosti do plaža i sadržaja
      • recenzije (sada su ogledne)
   ============================================================== */

window.VS = window.VS || {};

/* --------------------------------------------------------------
   1. OSNOVNI PODACI OBJEKTA
   -------------------------------------------------------------- */
VS.property = {
  name: "Villa Emilia",
  place: "Vir, Zadarska rivijera",
  address: "Luka XIII 10A, 23234 Vir",
  phone: "+385 91 000 0000",              /* ZAMIJENI */
  phoneHref: "+385910000000",             /* ZAMIJENI */
  whatsapp: "385910000000",               /* ZAMIJENI */
  email: "info@villa-emilia-vir.hr",      /* ZAMIJENI */
  oib: "00000000000",                     /* ZAMIJENI */
  regId: "HR-23234-0000000000",           /* ZAMIJENI: broj rješenja o kategorizaciji */
  /* Koordinate su približne za Luku na Viru — provjeriti na Google Maps
     (desni klik na kuću → "Što je ovdje?" → kopirati brojeve). */
  geo: { lat: 44.3062, lng: 15.0552 },
  mapQuery: "Luka XIII 10A, 23234 Vir, Hrvatska",
  currency: "EUR",
  currencySymbol: "€",
  touristTax: 1.86,                       /* € po odrasloj osobi i noći */
  cleaningFee: 45,                        /* € jednokratno */
  depositPercent: 30,                     /* % akontacije kod online plaćanja */
  distanceToSea: "250 m",
  walkToSea: "5 min",

  /* --------------------------------------------------------------
     SINKRONIZACIJA KALENDARA (Booking.com / Airbnb / vlastiti)
     --------------------------------------------------------------
     availabilityUrl → JSON datoteka koju popunjava serverska skripta
     iz iCal linkova portala. Dok je nema, stranica koristi termine iz
     VS.units[].booked i one upisane u vlasničkom panelu (admin.html).
     Upute: README.md, poglavlje "Sinkronizacija kalendara".
  -------------------------------------------------------------- */
  availabilityUrl: "availability.json",
  syncIntervalHours: 3
};

/* --------------------------------------------------------------
   2. SEZONE I CIJENE
   Datumi su uključivi. Cijena se računa po noći i po jedinici.
   -------------------------------------------------------------- */
VS.seasons = [
  { id: "low",  from: "2026-01-01", to: "2026-05-31", minNights: 2, labelKey: "season.low" },
  { id: "mid",  from: "2026-06-01", to: "2026-06-30", minNights: 3, labelKey: "season.mid" },
  { id: "high", from: "2026-07-01", to: "2026-08-25", minNights: 7, labelKey: "season.high" },
  { id: "mid2", from: "2026-08-26", to: "2026-09-30", minNights: 3, labelKey: "season.mid" },
  { id: "low2", from: "2026-10-01", to: "2027-12-31", minNights: 2, labelKey: "season.low" }
];

/* Popusti na duži boravak (postotak) */
VS.discounts = [
  { minNights: 14, percent: 10 },
  { minNights: 7,  percent: 5 }
];

/* --------------------------------------------------------------
   3. SMJEŠTAJNE JEDINICE  ⚠ DEMO — uskladiti sa stvarnim stanjem
   rates  : cijena po noći za svaku sezonu (id iz VS.seasons)
   booked : ručno upisani zauzeti termini [od, do] — uključivo
   ical   : linkovi s portala za automatsku sinkronizaciju (README)
   -------------------------------------------------------------- */
VS.units = [
  {
    id: "a1",
    nameKey: "unit.a1.name",
    descKey: "unit.a1.desc",
    size: 55, capacity: 4, bedrooms: 2, bathrooms: 1, floor: 0,
    rates: { low: 75, mid: 105, high: 155, mid2: 105, low2: 75 },
    images: [
      "assets/img/vila-03-terasa.jpg",
      "assets/img/vila-06-dvoriste.jpg",
      "assets/img/vila-02-vrt.jpg"
    ],
    featureKeys: ["feat.terrace", "feat.ac", "feat.kitchen", "feat.garden", "feat.parking", "feat.wifi"],
    booked: [["2026-07-04", "2026-07-18"], ["2026-08-08", "2026-08-22"]],
    ical: { booking: "", airbnb: "" }      /* ZALIJEPI iCal linkove — vidi README */
  },
  {
    id: "a2",
    nameKey: "unit.a2.name",
    descKey: "unit.a2.desc",
    size: 60, capacity: 5, bedrooms: 2, bathrooms: 1, floor: 1,
    rates: { low: 85, mid: 120, high: 175, mid2: 120, low2: 85 },
    images: [
      "assets/img/vila-05-balkon.jpg",
      "assets/img/vila-07-balkoni.jpg",
      "assets/img/vila-01-fasada.jpg"
    ],
    featureKeys: ["feat.balcony", "feat.ac", "feat.kitchen", "feat.seaglimpse", "feat.parking", "feat.washer"],
    booked: [["2026-07-11", "2026-07-25"], ["2026-08-01", "2026-08-15"]],
    ical: { booking: "", airbnb: "" }
  },
  {
    id: "a3",
    nameKey: "unit.a3.name",
    descKey: "unit.a3.desc",
    size: 40, capacity: 2, bedrooms: 1, bathrooms: 1, floor: 2,
    rates: { low: 60, mid: 85, high: 125, mid2: 85, low2: 60 },
    images: [
      "assets/img/vila-04-bocna.jpg",
      "assets/img/vila-08-smokva.jpg",
      "assets/img/vila-10-zalazak.jpg"
    ],
    featureKeys: ["feat.couples", "feat.ac", "feat.kitchen", "feat.quiet", "feat.parking", "feat.wifi"],
    booked: [["2026-07-25", "2026-08-08"]],
    ical: { booking: "", airbnb: "" }
  }
];

/* --------------------------------------------------------------
   4. GALERIJA
   cat: interior | exterior | surroundings | activities
   ⚠ Nedostaju fotografije interijera — dodati čim budu snimljene
     (sobe, kuhinja, kupaonica) i staviti ih u kategoriju "interior".
   -------------------------------------------------------------- */
VS.gallery = [
  { src: "assets/img/vila-01-fasada.jpg",   cat: "exterior",     capKey: "gal.facade",  span: "w2" },
  { src: "assets/img/vila-03-terasa.jpg",   cat: "exterior",     capKey: "gal.terrace" },
  { src: "assets/img/vila-02-vrt.jpg",      cat: "exterior",     capKey: "gal.garden" },
  { src: "assets/img/vila-05-balkon.jpg",   cat: "exterior",     capKey: "gal.balcony", span: "h2" },
  { src: "assets/img/vila-04-bocna.jpg",    cat: "exterior",     capKey: "gal.side" },
  { src: "assets/img/vila-06-dvoriste.jpg", cat: "exterior",     capKey: "gal.yard" },
  { src: "assets/img/vila-07-balkoni.jpg",  cat: "exterior",     capKey: "gal.balconies" },
  { src: "assets/img/vila-08-smokva.jpg",   cat: "exterior",     capKey: "gal.fig",     span: "w2" },
  { src: "assets/img/vila-09-limuni.jpg",   cat: "surroundings", capKey: "gal.lemons" },
  { src: "assets/img/vila-10-zalazak.jpg",  cat: "surroundings", capKey: "gal.sunset" }
];

/* --------------------------------------------------------------
   5. RECENZIJE  ⚠ OGLEDNE — zamijeniti stvarnima ili obrisati niz
   -------------------------------------------------------------- */
VS.reviews = [
  { name: "Familie Krause", country: "DE", stars: 5, date: "2025-08", source: "Booking.com", unit: "a2", textKey: "rev.1" },
  { name: "Ivana i Damir",  country: "HR", stars: 5, date: "2025-07", source: "Direktno",    unit: "a1", textKey: "rev.2" },
  { name: "Andrea B.",      country: "IT", stars: 5, date: "2025-09", source: "Google",      unit: "a3", textKey: "rev.3" },
  { name: "Familie Gruber", country: "AT", stars: 5, date: "2025-06", source: "Airbnb",      unit: "a1", textKey: "rev.4" },
  { name: "Marta i Josip",  country: "HR", stars: 4, date: "2024-08", source: "Direktno",    unit: "a2", textKey: "rev.5" },
  { name: "Sofia & Erik",   country: "EN", stars: 5, date: "2024-07", source: "Google",      unit: "a3", textKey: "rev.6" }
];

/* --------------------------------------------------------------
   6. OKOLICA — Vir i Zadarska rivijera
   type: beach | food | culture | activity | transport
   ⚠ Udaljenosti provjeriti na karti prije objave.
   -------------------------------------------------------------- */
VS.poi = [
  { type: "beach",     nameKey: "poi.sea.name",       descKey: "poi.sea.desc",       dist: "250 m" },
  { type: "beach",     nameKey: "poi.jadro.name",     descKey: "poi.jadro.desc",     dist: "1,5 km" },
  { type: "beach",     nameKey: "poi.sabunike.name",  descKey: "poi.sabunike.desc",  dist: "9 km" },
  { type: "food",      nameKey: "poi.market.name",    descKey: "poi.market.desc",    dist: "600 m" },
  { type: "food",      nameKey: "poi.konoba.name",    descKey: "poi.konoba.desc",    dist: "1 km" },
  { type: "culture",   nameKey: "poi.kastelina.name", descKey: "poi.kastelina.desc", dist: "3 km" },
  { type: "culture",   nameKey: "poi.nin.name",       descKey: "poi.nin.desc",       dist: "14 km" },
  { type: "activity",  nameKey: "poi.bike.name",      descKey: "poi.bike.desc",      dist: "u mjestu" },
  { type: "activity",  nameKey: "poi.zadar.name",     descKey: "poi.zadar.desc",     dist: "35 km" },
  { type: "activity",  nameKey: "poi.paklenica.name", descKey: "poi.paklenica.desc", dist: "55 km" },
  { type: "transport", nameKey: "poi.bridge.name",    descKey: "poi.bridge.desc",    dist: "4 km" },
  { type: "transport", nameKey: "poi.airport.name",   descKey: "poi.airport.desc",   dist: "45 km" }
];
