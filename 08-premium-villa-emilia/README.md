# Villa Emilia, Vir — Premium demo

Demo web stranice za **Villa Emilia, Luka XIII 10A, 23234 Vir** (Zadarska rivijera),
izrađen na Premium predlošku. More je udaljeno **250 m, oko 5 minuta pješice**.

Fotografije su vlasničine, snimljene na objektu. Ostali podaci (broj apartmana,
kvadrature, cijene, kontakt, recenzije) su **demo vrijednosti** i označene su u
kodu — treba ih zamijeniti stvarnima prije objave.

---

## Stranice

| Stranica | Datoteka |
|---|---|
| Početna | `index.html` |
| O nama | `o-nama.html` |
| Smještaj (3 apartmana) | `smjestaj.html` |
| Galerija | `galerija.html` |
| Rezervacija (kalendar + plaćanje) | `rezervacija.html` |
| Lokacija i okolica | `lokacija.html` |
| Recenzije | `recenzije.html` |
| Kontakt | `kontakt.html` |
| **Vlasnički panel** | `admin.html` (demo PIN **1234**) |

Jezici: **HR / EN / DE / IT**, prekidač je u zaglavlju. Odabrani jezik se pamti,
a može se otvoriti i izravno: `index.html?lang=de`.

---

## Vlasnički panel — praćenje rezervacija i kalendar

`admin.html` je alat za vlasnicu, odvojen od javne stranice (`noindex`):

- **Kalendar** — klik na datum ručno blokira ili otključava termin (obitelj u
  kući, održavanje, vlastiti odmor). Boje razlikuju izvor zauzeća:
  zlatno = ručno, plavo = Booking.com/Airbnb, sivo = upisano u `data.js`.
- **Rezervacije** — popis rezervacija napravljenih direktno preko stranice, s
  gostom, terminom, iznosom i uplaćenim dijelom.
- **Sinkronizacija** — status povezanosti s portalima i upute korak po korak.
- **Izvoz podataka** — `.ics` datoteka za Booking.com i Airbnb, izvoz/uvoz svih
  podataka u JSON i gotov isječak za trajni upis termina u `data.js`.

> U demo verziji panel podatke sprema u preglednik (localStorage) i štiti ih
> samo PIN-om. Za stvarni rad potrebna je prijava i baza na serveru — opisano
> niže u "Što treba za pravi rad".

---

## Sinkronizacija kalendara s Booking.com i Airbnb

Cilj: gost na stranici uvijek vidi **stvarno stanje**, bez dvostrukih rezervacija.

### Smjer 1 — s portala na stranicu (import)

1. **Booking.com** extranet → *Stopa i dostupnost → Sinkronizacija kalendara* →
   kopirajte iCal link svakog apartmana.
2. **Airbnb** → *Kalendar → Dostupnost → Povežite kalendare* → kopirajte iCal link.
3. Linkove upišite u `assets/js/data.js`, u polje `ical` svakog apartmana:

   ```js
   ical: {
     booking: "https://ical.booking.com/v1/export?t=...",
     airbnb:  "https://www.airbnb.com/calendar/ical/12345.ics?s=..."
   }
   ```

4. Skripta na serveru (cron svaka 3 sata) čita te linkove i piše
   `availability.json`. Portali ne dopuštaju čitanje izravno iz preglednika
   (CORS), zato je potreban server. Minimalni primjer (Node):

   ```js
   // sync.js — pokreće se cronom: node sync.js
   const fs = require("fs");
   const ical = require("node-ical");           // npm i node-ical
   const units = require("./units.json");        // { a1: {booking, airbnb}, ... }

   (async () => {
     const out = { generatedAt: new Date().toISOString(),
                   sources: ["Booking.com iCal", "Airbnb iCal"], units: {} };

     for (const [id, links] of Object.entries(units)) {
       const ranges = [];
       for (const url of Object.values(links).filter(Boolean)) {
         const events = await ical.async.fromURL(url);
         for (const ev of Object.values(events)) {
           if (ev.type !== "VEVENT") continue;
           const from = ev.start.toISOString().slice(0, 10);
           // DTEND je u iCal-u ekskluzivan → oduzmi jedan dan
           const end = new Date(ev.end.getTime() - 86400000).toISOString().slice(0, 10);
           ranges.push([from, end]);
         }
       }
       out.units[id] = ranges;
     }
     fs.writeFileSync("availability.json", JSON.stringify(out, null, 2));
   })();
   ```

   Datoteka `availability.json` u ovom demou sadrži ogledne termine da se vidi
   kako izgleda kad sinkronizacija radi.

### Smjer 2 — sa stranice na portale (export)

U vlasničkom panelu → *Izvoz podataka* → **Preuzmi .ics za portale**. Datoteku
postavite na server (npr. `/kalendar/a1.ics`) i njezinu adresu zalijepite u
Booking.com i Airbnb kao vanjski kalendar. Tako i portali vide direktne
rezervacije i ručno blokirane termine.

> Kad se uključi server s bazom (niže), ovaj se `.ics` generira automatski i ne
> treba ga ručno preuzimati.

---

## Plaćanje karticom (Stripe)

Sustav rezervacije već računa cijenu po sezoni, popuste, čišćenje i boravišnu
pristojbu te nudi plaćanje **akontacije 30 %** ili cijelog iznosa. Plaćanje radi
u **demo načinu** dok je `STRIPE_PUBLIC_KEY` u `assets/js/booking.js` prazan —
gost prođe cijeli tok i dobije broj rezervacije, ali se ništa ne naplaćuje.

Za pravu naplatu:

1. Otvoriti Stripe račun (za Hrvatsku podržan; naknada je oko 1,5 % + 0,25 € po
   transakciji za europske kartice).
2. U `assets/js/booking.js` upisati:

   ```js
   var STRIPE_PUBLIC_KEY = "pk_live_...";
   var CHECKOUT_ENDPOINT = "/api/create-checkout-session";
   ```

3. U `rezervacija.html` dodati `<script src="https://js.stripe.com/v3/"></script>`.
4. Na serveru napraviti endpoint koji kreira Checkout Session:

   ```js
   app.post("/api/create-checkout-session", async (req, res) => {
     const b = req.body;
     const session = await stripe.checkout.sessions.create({
       mode: "payment",
       customer_email: b.guest.email,
       line_items: [{
         quantity: 1,
         price_data: {
           currency: b.currency,
           unit_amount: b.amount,                 // iznos u centima
           product_data: { name: `${b.unitName} · ${b.checkin} – ${b.checkout}` }
         }
       }],
       metadata: {
         reference: b.reference, unit: b.unitId,
         checkin: b.checkin, checkout: b.checkout,
         adults: b.adults, children: b.children, payMode: b.payMode
       },
       success_url: "https://villa-emilia-vir.hr/rezervacija.html?ok=1",
       cancel_url:  "https://villa-emilia-vir.hr/rezervacija.html?cancel=1"
     });
     res.json({ url: session.url });
   });
   ```

5. U `booking.js` otkomentirati pravi `fetch` tok (označen u komentaru).
6. Na Stripe webhook `checkout.session.completed` upisati rezervaciju u bazu i
   u kalendar — time je termin odmah zauzet i za portale.

---

## Što treba za pravi rad (izvan ovog demoa)

| Funkcija | Demo verzija | Za produkciju |
|---|---|---|
| Naplata | simulirana potvrda | Stripe račun + endpoint na serveru |
| Rezervacije | spremljene u preglednik | baza na serveru (npr. Postgres/SQLite) |
| Prijava u panel | PIN u kodu | prijava s lozinkom na serveru |
| Sinkronizacija | ogledni `availability.json` | cron skripta + iCal linkovi portala |
| Slanje e-maila | otvara mail program gosta | SMTP / servis (npr. Postmark) |

Hosting: dovoljan je bilo koji hosting s Node podrškom (Vercel, Netlify + funkcije,
ili klasični VPS). Statični dio stranice radi i bez servera — server je potreban
samo za naplatu, bazu i sinkronizaciju.

---

## Prije objave — provjeriti i zamijeniti

- **Fotografije interijera** — trenutno ih nema; potrebne su sobe, kuhinja i kupaonice
  za svaki apartman (galerija već ima pripremljenu kategoriju "Interijer").
- **Broj apartmana, kvadrature, kapaciteti i cijene** u `assets/js/data.js`.
- **Kontakt podaci**: telefon, e-mail, OIB i broj rješenja o kategorizaciji.
- **Točne koordinate** kuće za kartu (`geo` u `data.js`).
- **Udaljenosti** u popisu okolice (plaže, trgovina, restorani).
- **Recenzije** — sada su ogledne; zamijeniti stvarnima ili obrisati niz.
- **Domena** `villa-emilia-vir.hr` u `canonical`, `hreflang` i structured data.
- **Google Analytics** — u `<head>` je zakomentiran GA4 snippet, upisati svoj ID.
- **Kontakt forma** — sada otvara mail program; prebaciti na Formspree ili PHP.

## Tehnički

Bez build koraka i bez vanjskih biblioteka: čisti HTML, CSS i JavaScript.
Vanjske ovisnosti su samo Google Fonts i Google Maps karta. Sve fotografije su
lokalne (`assets/img/`, ukupno oko 2,9 MB) i učitavaju se odgođeno.
