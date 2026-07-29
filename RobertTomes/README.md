# Apartmani Mare i Gumbek — Robert Tomes

Jednostranična prezentacija privatnog smještaja nadomak Zadra (Dalmacija).
Samostalni `index.html` — bez build koraka, bez vanjskih biblioteka.

**Live:** https://radivfil.github.io/smjestaj-predlosci/RobertTomes/

## Sadržaj stranice

- Hero s brzom trakom upita (dolazak / odlazak / broj gostiju)
- **2 jedinice** — Apartman Mare (do 4 os.) i Studio Gumbek (do 2 os.),
  svaka s vlastitim fotografijama i cjenikom po sezoni
- Sadržaji, usporedni cjenik po sezoni, galerija s lightboxom
- **Self check-in vodič** — 4 koraka + praktične napomene za dolazak
- Lokacija s OSM kartom i udaljenostima do Zadra
- Upitna forma (ime, e-mail, datum dolaska/odlaska, broj gostiju, jedinica, poruka)
- Tamna tema, sticky WhatsApp CTA na mobitelu

Namjerno **nema** online plaćanja ni kalendara dostupnosti — to je premium tier
(vidi `07-premium-villa-serena` i `08-premium-villa-emilia`).

## Što treba zamijeniti prije predaje klijentu

Sve je označeno komentarom `✏️` u `index.html`:

| Što | Gdje |
| --- | --- |
| `FORMSPREE_ID` | dno `<script>`, konstanta na vrhu IIFE-a |
| Telefon `+385 91 000 0000` | kontakt lista, footer, WhatsApp linkovi (`wa.me/...`) |
| E-mail `info@mare-gumbek.hr` | kontakt lista, footer, `KONTAKT_MAIL` u skripti |
| Adresa i koordinate karte | `bbox` i `marker` u OSM `<iframe>` |
| **Recenzije** | sekcija „Recenzije gostiju" — sada su popuna |
| **Cijene** | cjenik po jedinici + usporedna tablica |
| Fotografije | trenutno Unsplash URL-ovi; zamijeniti pravima kad stignu |

## Forma

Dok je `FORMSPREE_ID` prazan, forma validira unos i otvara e-mail klijent s
pripremljenom porukom. Nakon upisa Formspree ID-a šalje se u pozadini,
bez napuštanja stranice.
