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
| `zgrada.jpg` | **hero pozadina** |
| `petrcane-zaljev-dron.jpg` | sekcija O nama, og:image, thumbnail u portfelju |
| `petrcane-luka-dron.jpg` | sekcija Lokacija + galerija |
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
| E-mail `info@mare-gumbek.hr` | kontakt, footer, `KONTAKT_MAIL` u skripti | ❌ domena ne postoji — vidi niže |
| WhatsApp `wa.me/38598751522` | kontakt, footer, sticky traka, poruka o grešci | ✅ aktivan |
| Koordinate karte | `bbox` i `marker` u OSM `<iframe>` | ⚠️ marker na centru naselja |
| Kapacitet apartmana | `.unit-specs` u obje kartice | ⚠️ procjena s fotografija |
| Vrijeme prijave/odjave | `.checkin-note` | ⚠️ piše „dogovaramo unaprijed" |
| Recenzije | maknute | vratiti kad stignu prave s Bookinga |

## WhatsApp

**Aktivan** na četiri mjesta: kontakt lista, footer socials, sticky traka na
mobitelu i poruka o grešci u formi.

```
https://wa.me/38598751522?text=Pozdrav%2C%20zanima%20me%20dostupnost%20apartmana%20Mare%20i%20Gumbek.
```

Broj je formatiran po wa.me pravilu — `+385 98 751 522` → `38598751522`, bez
plusa, razmaka i vodeće nule. Svi linkovi imaju `target="_blank"` i
`rel="noopener noreferrer"`. Pre-filled poruka ide kroz `?text=` parametar,
URL-encoded (zarez `%2C`, razmaci `%20`).

Nema slidera s desne strane ekrana — WhatsApp CTA je u fiksnoj traci na **dnu**
(`.mobile-cta`, vidljiva ispod 720 px), uz „Pošalji upit" i „Nazovite".

## E-mail — otvoreno pitanje

Sva tri `mailto:` linka **sintaktički su ispravna** (`<a href="mailto:…">`,
klik otvara zadani mail klijent). Problem je adresa:

```
$ nslookup mare-gumbek.hr      → Non-existent domain
$ nslookup -type=MX mare-gumbek.hr → Non-existent domain
```

`mare-gumbek.hr` **ne postoji** — nema A ni MX zapisa. Svaka poruka poslana na
`info@mare-gumbek.hr` odbija se. To pogađa i fallback forme: dok je
`FORMSPREE_ID` prazan, forma otvara `mailto:` prema toj adresi, pa upiti
nigdje ne stižu.

Adresa **nije izmišljena niti zamijenjena** — čeka se prava od klijenta. Kad
stigne, mijenja se na 4 mjesta: tri `mailto:` linka + `KONTAKT_MAIL` u skripti.
Do tada je telefon jedini kanal koji radi.

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

U sekciji **O nama** stoji **ukupna ocjena gostiju 10/10**, na temelju 5
recenzija. Odnosi se na oglas „Mare 9 Cozy Apartment with Garden" — atribucija
to navodi jer Gumbek ima svoj zaseban oglas i svoju ocjenu.

Ako se ocjena promijeni, ažurirati na dva mjesta: `.score` blok u `#about` i
oznaku u `.hero__tags`.

## Otvoreno pitanje: jedna zgrada ili dvije

Uvodni tekst tvrdi da su oba apartmana **u istoj zgradi** — tako je potvrdio
klijent. Fotografije to ne potvrđuju: `images/zgrada.jpg` (iz mape Mare)
prikazuje zgradu sa zaobljenim balkonskim erkerom i kosim crijepnim krovom, a
`images/gumbek/gumbek-06-zgrada.jpg` blokastu bijelu zgradu s metalnim ogradama
i tendama. Zato je na stranici prikazana samo prva. Ako se pokaže da su ipak
dvije susjedne zgrade, treba prilagoditi uvod u sekciji „O nama", hero podnaslov
i sekciju „Za koga su".

## Čitljivost teksta nad slikom

Hero je isprva imao dronsku snimku, ali je naslov preko nje bio slabo čitljiv.
Sada je tamo fotografija zgrade — bijela fasada na suncu, što je za bijeli tekst
najgori mogući slučaj:

| Overlay | Kontrast bijelog teksta | WCAG AA (4.5:1) |
| --- | --- | --- |
| bez overlaya | 1.05:1 | ✗ |
| `rgba(0,0,0,.35)` | 2.54:1 | ✗ |
| `rgba(0,0,0,.15)` | 1.48:1 | ✗ |
| **`rgba(9,32,38,.66)`** (najsvjetlija točka gradijenta) | **5.62:1** | ✓ |
| `rgba(9,32,38,.78)` (vrh) | 8.47:1 | ✓ |
| `rgba(9,32,38,.86)` (dno) | 11.15:1 | ✓ |

Minimalna alpha za 4.5:1 nad bijelom fasadom je **0.60**, pa gradijent nigdje
ne ide ispod 0.66. Ako se hero fotografija ikad zamijeni svjetlijom, ove brojke
treba ponovno provjeriti.

Traka dolazak/odlazak (`.book-bar`) više nema sliku iza sebe — prebačena je s
poluprozirne podloge na čistu svijetlu karticu, jer su datumi stajali direktno
nad fotografijom.
