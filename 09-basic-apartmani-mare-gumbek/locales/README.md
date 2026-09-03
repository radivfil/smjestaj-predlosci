# Prijevodi — Apartmani Mare i Gumbek

Izvor istine za hrvatski je **`../index.html`**. Hrvatski tekst se uređuje
izravno u njemu, kao i dosad — `locales/hr/*.json` se iz njega **generira**
i ne uređuje se ručno.

Podržani jezici: **hrvatski** (zadani, u korijenu), **engleski** (`/en/`),
**njemački** (`/de/`) i **talijanski** (`/it/`).

## Kako promijeniti prijevod

1. Otvori `locales/<jezik>/<datoteka>.json` (npr. `locales/de/units.json`).
2. Prepiši vrijednost. Ključevi se ne diraju.
3. Commitaj i pushaj — GitHub Action regenerira `/en/`, `/de/` i `/it/`.

Mape `/en/`, `/de/`, `/it/` i `assets/js/dict.js` su **generirane** — ručna
izmjena u njima nestaje pri sljedećem buildu.

## Datoteke

| Datoteka       | Što sadrži |
|----------------|------------|
| `common.json`  | meta oznake, navigacija, podnožje, prekidač jezika, poruke skripte |
| `hero.json`    | naslovni blok i traka brzog upita |
| `units.json`   | „O nama", oba apartmana, sadržaji |
| `gallery.json` | natpisi i alt tekstovi fotografija |
| `info.json`    | cijena, dolazak, „Dobro je znati", lokacija, za koga su apartmani |
| `form.json`    | obrazac upita i poruke o pogreškama |

## Pravila

- **Ključ koji nedostaje pada na hrvatski**, ne na praznu vrijednost.
- **Jezik bez ijednog prijevoda se ne gradi** — cijela bi stranica bila
  hrvatska pod stranim `hreflang`-om, što Google čita kao duplikat.
- HTML u vrijednostima (`<strong>`, `<br />`) mora ostati — nosi prijelome i
  naglaske iz dizajna.
- `{in}`, `{out}`, `{unit}`, `{guests}`, `{lang}` u `js.*` ključevima su
  zamjenska mjesta koja skripta popunjava. Ne prevode se i ne izostavljaju.
- Vrijednosti opcija u obrascu (`mare`, `gumbek`, `oba`, `open`) **nisu**
  tekst i ne pojavljuju se ovdje — prevodi se samo ono što gost vidi.

## Ručno pokretanje

```
node tools/i18n.js extract   # index.html -> locales/hr/
node tools/i18n.js verify    # provjera da HR ostaje identičan
node tools/i18n.js build     # gradi /en/, /de/, /it/ i dict.js
node tools/i18n.js status    # koliko je prevedeno po jeziku
```

## Zastarjeli prijevodi

Kad se **promijeni hrvatski tekst** postojećeg ključa, prijevodi tiho ostanu
stari — ključ i dalje postoji, pa ga provjera „nedostaje li prijevod" ne vidi.
Zato `locales/_state.json` uz svaki prijevod pamti otisak hrvatskog izvornika
u trenutku prevođenja.

```
node tools/i18n.js status        # prijavljuje ZASTARJELO uz popis ključeva
node tools/i18n.js seal de       # zapečati njemački kao usklađen s hrvatskim
node tools/i18n.js seal          # zapečati sve jezike
```

Redoslijed je uvijek isti: promijeni hrvatski → `extract` → `status` pokaže
što je zastarjelo → osvježi te prijevode → `seal` → `build`.

`_state.json` generira alat; ne uređuje se ručno.

## Dodavanje novog jezika

1. U `tools/i18n.js`, u niz `LANGS`, dodaj redak (kod, naziv na tom jeziku,
   kratica, `intl`, `og`, ime mape).
2. Kopiraj `locales/hr/` u `locales/<kod>/` i prevedi vrijednosti.
3. `node tools/i18n.js build` — mapa se stvara sama, hreflang i prekidač
   jezika na svim verzijama dobivaju novi jezik.
