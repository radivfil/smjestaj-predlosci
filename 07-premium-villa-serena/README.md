# Villa Serena — PREMIUM predložak

Multi-page web stranica za privatni smještaj koji želi smanjiti ovisnost o
Booking.com/Airbnb provizijama i graditi vlastiti brend.

**Demo objekt:** Villa Serena, Rovinj (Istra) — obnovljena kamena vila iz 1826.
s četiri smještajne jedinice, bazenom i pogledom na more.

---

## Što paket sadrži

| Stranica | Datoteka | Svrha |
|---|---|---|
| Početna | `index.html` | prvi dojam, 4 ključne prednosti, preview jedinica, galerije i recenzija, CTA |
| O nama | `o-nama.html` | priča vlasnika, vremenska crta obnove, filozofija, citat domaćina |
| Smještaj | `smjestaj.html` | svaka jedinica zasebno: mini-galerija, opis, kapacitet, cijena/noć |
| Galerija | `galerija.html` | fotogalerija s kategorijama (interijer, eksterijer, okolica, aktivnosti) + lightbox |
| Rezervacija | `rezervacija.html` | kalendar s odabirom raspona, izračun cijene, forma gosta, plaćanje |
| Lokacija | `lokacija.html` | Google karta, 12 točaka u okolici s filterima i udaljenostima |
| Recenzije | `recenzije.html` | prosjek, histogram po kategorijama, kartice recenzija s izvorom |
| Kontakt | `kontakt.html` | forma, telefon, e-mail, WhatsApp, radno vrijeme za odgovore |

Uz to: jezični switcher **HR / EN / DE / IT**, dark/light tema, sticky header,
scroll animacije, napredni SEO (Open Graph, hreflang, JSON-LD structured data),
Google Analytics placeholder.

## Razlika prema ostalim paketima

| | Basic | Standard | **Premium** |
|---|---|---|---|
| Struktura | jedna stranica, osnovne sekcije | jedna stranica, 8 sekcija | **8 zasebnih stranica** |
| Galerija | jednostavan grid | grid + lightbox | **kategorije + lightbox** |
| Kalendar | — | statični prikaz zauzetosti | **odabir raspona + izračun cijene** |
| Rezervacija | — | upit e-mailom | **rezervacija s plaćanjem (Stripe)** |
| Jezici | 1 | 1 | **4 (HR/EN/DE/IT)** |
| Recenzije | — | — | **zasebna stranica s ocjenama** |
| SEO | osnovni meta | meta + JSON-LD | **meta + OG + hreflang + JSON-LD po stranici** |

---

## Uređivanje sadržaja

Gotovo sve što se mijenja kroz sezonu nalazi se u **`assets/js/data.js`**:

- `VS.property` — naziv, adresa, telefon, e-mail, boravišna pristojba, čišćenje, % akontacije
- `VS.seasons` — razdoblja sezona i minimalni broj noćenja
- `VS.units` — jedinice: cijene po sezoni, kapacitet, fotografije, **zauzeti termini** (`booked`)
- `VS.gallery` — fotografije i kategorije
- `VS.reviews` — recenzije (spremno za ručni unos ili uvoz s Googlea/Bookinga)
- `VS.poi` — okolica: plaže, restorani, kultura, aktivnosti, dolazak

Zauzete termine upisujete ovako (datumi uključivi):

```js
booked: [["2026-07-04", "2026-07-18"], ["2026-08-01", "2026-08-15"]]
```

Tekstovi se mijenjaju u **`assets/js/i18n.js`** — svaki ključ postoji u sva
četiri jezika. Za novi jezik kopirajte blok `en`, prevedite i dodajte jezik u
`VS.langs`.

## Uključivanje pravog plaćanja (Stripe)

Sustav radi u **demo načinu** dok je `STRIPE_PUBLIC_KEY` u
`assets/js/booking.js` prazan — gost prođe cijeli tok i dobije potvrdu, ali se
ništa ne naplaćuje. Za pravu naplatu:

1. U `assets/js/booking.js` upišite javni ključ i putanju endpointa:

   ```js
   var STRIPE_PUBLIC_KEY = "pk_live_...";
   var CHECKOUT_ENDPOINT = "/api/create-checkout-session";
   ```

2. U `rezervacija.html` dodajte Stripe biblioteku:

   ```html
   <script src="https://js.stripe.com/v3/"></script>
   ```

3. Na serveru napravite endpoint koji kreira Checkout Session (Node primjer):

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
           unit_amount: b.amount,                  // iznos u centima
           product_data: { name: `${b.unitName} · ${b.checkin} – ${b.checkout}` }
         }
       }],
       metadata: {
         reference: b.reference, unit: b.unitId,
         checkin: b.checkin, checkout: b.checkout,
         adults: b.adults, children: b.children, payMode: b.payMode
       },
       success_url: "https://vasa-domena.hr/rezervacija.html?ok=1",
       cancel_url:  "https://vasa-domena.hr/rezervacija.html?cancel=1"
     });
     res.json({ url: session.url });
   });
   ```

4. U `booking.js` otkomentirajte pravi `fetch` tok (označen je u komentaru).

Nakon uspješne uplate obavezno upišite termin u `booked` niz jedinice ili
povežite webhook koji to radi automatski.

## Google Analytics

U `<head>` svake stranice nalazi se zakomentiran GA4 snippet — otkomentirajte
ga i zamijenite `G-XXXXXXXXXX` svojim ID-em.

## Prije objave — zamijeniti

- fotografije (sada su Unsplash placeholderi) i `og:image`
- domenu `villaserena-rovinj.hr` u `canonical`, `hreflang` i JSON-LD
- Google Maps embed u `lokacija.html`
- kontakt podatke i OIB u `assets/js/data.js`
- kontakt formu (`kontakt.html`) s `mailto:` na Formspree ili vlastiti PHP

## Tehnički

Bez build koraka i bez vanjskih biblioteka — čisti HTML, CSS i JavaScript.
Jedina vanjska ovisnost su Google Fonts i fotografije. Stranica se objavljuje
kopiranjem mape na bilo koji hosting.
