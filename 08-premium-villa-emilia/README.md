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

Sinkronizacija je **napisana i radi — bez servera**. Portali ne dopuštaju
čitanje kalendara izravno iz preglednika (CORS), pa posao obavlja
`tools/sync-ical.js`, a pokreće ga **GitHub Action** svaka tri sata
(`.github/workflows/sync-kalendar.yml`). Rezultat je `availability.json` koji
stranica čita pri svakom otvaranju.

### Postavljanje (jednokratno, ~10 minuta)

1. **Booking.com** extranet → *Stopa i dostupnost → Sinkronizacija kalendara →
   Izvezi* → kopirajte iCal link svakog apartmana.
2. **Airbnb** → *Kalendar → Dostupnost → Povežite kalendare → Izvezi kalendar* →
   kopirajte link.
3. U GitHub repozitoriju: *Settings → Secrets and variables → Actions →
   New repository secret*, ime **`VE_ICAL_SOURCES`**, vrijednost:

   ```json
   {"a1":{"booking":"https://ical.booking.com/v1/export?t=...","airbnb":"https://www.airbnb.com/calendar/ical/123.ics?s=..."},
    "a2":{"booking":"...","airbnb":"..."},
    "a3":{"booking":"...","airbnb":"..."}}
   ```

   Linkovi su tajni (tko ih ima, vidi kalendar), zato idu u Secrets, a ne u kod.
   Alternativa bez GitHuba: iste linkove upisati u polje `ical` u `data.js` i
   skriptu pokretati cronom na bilo kojem hostingu.

4. Kartica *Actions* → **Sinkronizacija kalendara** → *Run workflow* da provjerite
   prolazi li. Dalje ide samo, u 00, 03, 06… sati (UTC).

Ručno pokretanje s vlastitog računala:

```bash
cd 08-premium-villa-emilia
VE_ICAL_SOURCES='{"a1":{"booking":"https://…","airbnb":"https://…"}}' node tools/sync-ical.js
```

### Što skripta radi

- čita iCal s više izvora po apartmanu i spaja ih u jedan popis zauzetih dana;
- ispravno tumači `DTEND` (u iCal-u je ekskluzivan — zadnja zauzeta noć je dan prije);
- preskače otkazane termine (`STATUS:CANCELLED`) i razumije prelomljene retke;
- spaja preklapajuće i susjedne termine (04.–11. 7. + 12.–14. 7. → 04.–14. 7.);
- ako portal ne odgovori, **zadržava zadnje poznato stanje** i upiše grešku u
  `availability.json`, pa se zauzet termin nikad ne prikaže kao slobodan;
  upozorenje se vidi u vlasničkom panelu, kartica *Sinkronizacija*;
- usput izvozi vlastite termine u `kalendar/a1.ics`, `a2.ics`, `a3.ics`.

### Smjer prema portalima (export)

Adrese izvezenih datoteka:

```
https://<domena>/kalendar/a1.ics
https://<domena>/kalendar/a2.ics
https://<domena>/kalendar/a3.ics
```

Zalijepite ih na Booking.com (*Sinkronizacija kalendara → Uvezi*) i Airbnb
(*Povežite kalendare → Uvezi kalendar*). Tako portali vide termine blokirane na
vašoj strani. Te datoteke osvježava ista Action skripta iz `booked` polja u
`data.js`; termine iz vlasničkog panela prenesete tako da u panelu
(*Izvoz podataka → Prikaži termine za data.js*) kopirate isječak u `data.js`.
Kad se uključi Stripe i baza, taj korak nestaje — rezervacije idu ravno u
kalendar.

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
| Sinkronizacija | **gotova** — GitHub Action, treba samo upisati iCal linkove | isto (ili cron na hostingu) |
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
