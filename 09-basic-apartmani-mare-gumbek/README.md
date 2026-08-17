# Apartmani Mare i Gumbek — Petrčane

Jednostranična prezentacija dvaju apartmana u istoj zgradi u Petrčanima
(Zadarska županija). Samostalni `index.html` — bez build koraka, bez vanjskih
biblioteka. Jedine vanjske ovisnosti su Google Fonts (Newsreader + Inter) i
OpenStreetMap iframe za kartu.

**Live:** https://lotastudio.eu/09-basic-apartmani-mare-gumbek/

## Objekt

| | Apartman Mare | Apartman Gumbek |
| --- | --- | --- |
| Booking oglas | „Mare 9 Cozy Two Bedroom Apartment with Garden" | „Gumbek11, Two Story, Two-Bedroom Apartment by the Sea" |
| Etaža | prizemlje, bez stepenica | dvije etaže, spiralno stubište |
| Spavaonice | 2 | 2 |
| Kapacitet | do 6 *(procjena)* | do 4 *(procjena)* |
| Vanjski prostor | vrt + natkrivena terasa s vanjskom kuhinjom i kamenim kaminom | balkon s tendom |
| Posebno | perilica rublja, ravnina s dvorištem | pogled na more, spavaonice pod krovnim prozorom |

Zajedničko: klima, besplatan parking u dvorištu, Wi-Fi, puna kuhinja
(pećnica, ploča, perilica posuđa, mikrovalna, aparat za kavu), TV.
Plaža Donje Petrčane 800 m (~9 min hoda), centar Zadra 12 km.

## Sadržaj stranice

- Hero s dronskom fotografijom zaljeva + brza traka upita (dolazak / odlazak / gosti)
- **O nama** — jedinstven uvod: dva apartmana, ista zgrada, zajedno ili odvojeno
- **2 apartmana** — Mare i Gumbek, svaki s vlastitim fotografijama i CTA-om
- Sadržaji, **cijena na upit** (bez fiksnog cjenika), galerija s lightboxom
- **Za koga su** — tri profila gostiju umjesto recenzija
- Dolazak u 4 koraka, lokacija s dronskom fotografijom i OSM kartom
- Upitna forma, tamna tema, sticky CTA traka na mobitelu

Namjerno **nema** online plaćanja ni kalendara dostupnosti — to je premium tier
(vidi `07-premium-villa-serena` i `08-premium-villa-emilia`).

## Fotografije

`images/mare/` i `images/gumbek/` — po apartmanu. U `images/` su tri zajedničke:

| Datoteka | Gdje se koristi |
| --- | --- |
| `petrcane-zaljev-dron.jpg` | hero pozadina, og:image, thumbnail u portfelju |
| `petrcane-luka-dron.jpg` | sekcija Lokacija + galerija |
| `zgrada.jpg` | sekcija O nama |
| `mare/mare-07-vrt.jpg` | suptilna pozadinska tekstura (`body::before`, 5.5 % opacity) |

`gumbek/gumbek-06-zgrada.jpg` **nije** referenciran — prikazuje fasadu koja se
razlikuje od one na `zgrada.jpg`. Vidi napomenu pri dnu.

## Što treba zamijeniti prije predaje klijentu

Sve je označeno komentarom `✏️` u `index.html`:

| Što | Gdje | Status |
| --- | --- | --- |
| Telefon `+385 98 751 522` | kontakt, footer, sticky traka | ✅ postavljen |
| Adresa `Petrčane IX 2a, 23231 Petrčane` | kontakt, footer, ispod karte | ✅ postavljena |
| `FORMSPREE_ID` | dno `<script>`, konstanta na vrhu IIFE-a | ❌ prazan — vidi niže |
| E-mail `info@mare-gumbek.hr` | kontakt, footer, `KONTAKT_MAIL` u skripti | ❌ placeholder |
| Koordinate karte | `bbox` i `marker` u OSM `<iframe>` | ⚠️ marker na centru naselja |
| Kapacitet apartmana | `.unit-specs` u obje kartice | ⚠️ procjena s fotografija |
| Vrijeme prijave/odjave | `.checkin-note` | ⚠️ piše „dogovaramo unaprijed" |
| Recenzije | maknute | vratiti kad stignu prave s Bookinga |

## WhatsApp

WhatsApp CTA-ovi (kontakt lista, footer socials, sticky traka) **namjerno su
deaktivirani** do daljnje najave — zadržani vizualno, ali kao `<span>` bez
`href`-a, uz `aria-disabled="true"`, `title` s objašnjenjem i `.is-disabled`
stil. Za aktivaciju: vratiti `<a href="https://wa.me/38598751522" target="_blank"
rel="noopener">` i maknuti klasu `.is-disabled`. Telefonski `tel:` link je
aktivan.

## Forma i Formspree

Dok je `FORMSPREE_ID` prazan, forma validira unos i otvara e-mail klijent s
pripremljenom porukom na `KONTAKT_MAIL`. Nakon upisa ID-a šalje se u pozadini,
bez napuštanja stranice.

Aktivacija (jedini korak koji zahtijeva klijentov e-mail, zato nije odrađen):

1. Besplatan račun na [formspree.io](https://formspree.io)
2. **New Form** → naziv „Apartmani Mare i Gumbek"
3. Upisati e-mail na koji upiti trebaju stizati i **potvrditi ga** iz inboxa
4. Iz endpointa `https://formspree.io/f/XXXXXXXX` kopirati zadnjih 8 znakova
   u `const FORMSPREE_ID` na vrhu `<script>` bloka

Besplatni plan pokriva 50 poruka mjesečno. Ako Formspree odbije poruku
(nepotvrđen e-mail, potrošena kvota), razlog se ispisuje u konzoli preglednika.

Ugrađena zaštita od spama: honeypot polje `_gotcha` (pomaknuto izvan ekrana, ne
`display:none`, jer neki botovi preskaču skrivena polja). Naslov e-maila
(`_subject`) skripta prije slanja popuni terminom, jedinicom i brojem gostiju.

## Ocjena s Booking.coma

U sekciji Lokacija stoji **ocjena lokacije 10/10** za oglas „Mare 9 Cozy
Apartment with Garden", na temelju 5 recenzija. To je **ocjena lokacije, ne
ukupna ocjena objekta** — atribucija je namjerno ispisana u cijelosti da se ne
pročita krivo. Ako se ocjena promijeni, ažurirati `.score` blok i hero oznaku.

## Otvoreno pitanje: jedna zgrada ili dvije

Uvodni tekst tvrdi da su oba apartmana **u istoj zgradi** — tako je potvrdio
klijent. Fotografije to ne potvrđuju: `images/zgrada.jpg` (iz mape Mare)
prikazuje zgradu sa zaobljenim balkonskim erkerom i kosim crijepnim krovom, a
`images/gumbek/gumbek-06-zgrada.jpg` blokastu bijelu zgradu s metalnim ogradama
i tendama. Zato je na stranici prikazana samo prva. Ako se pokaže da su ipak
dvije susjedne zgrade, treba prilagoditi uvod u sekciji „O nama", hero podnaslov
i sekciju „Za koga su".
