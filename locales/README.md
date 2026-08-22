# Prijevodi

Izvor istine za hrvatski je **`/index.html`**. Hrvatski tekst se uređuje
izravno u njemu, kao i dosad — `locales/hr/*.json` se iz njega **generira**
i ne uređuje se ručno.

## Kako dodati ili promijeniti prijevod

1. Otvori `locales/<jezik>/<datoteka>.json` (npr. `locales/en/paketi.json`).
2. Prepiši vrijednost. Ključevi se ne diraju.
3. Commitaj i pushaj — GitHub Action regenerira `/en/`, `/de/`, `/es/`, `/it/`.

Mape `/en/`, `/de/`, `/es/`, `/it/` su **generirane** — ručna izmjena u njima
nestaje pri sljedećem buildu.

## Pravila

- **Ključ koji nedostaje pada na hrvatski**, ne na praznu vrijednost.
- **Jezik bez ijednog prijevoda se ne gradi** — cijela bi stranica bila
  hrvatska pod stranim `hreflang`-om, što Google čita kao duplikat.
- `{p0}`, `{p1}`… su **cijene**. Ne upisuj iznose u prijevod — broj stoji u
  `data-price` atributu u `index.html`, a `Intl.NumberFormat` ga formatira po
  jeziku (`399 €` u HR, `€399` u EN, `1.199 €` u DE, `1199 €` u ES).
- HTML u vrijednostima (`<strong>`, `<em>`, `<br />`) mora ostati — nosi
  prijelome i naglaske u dizajnu.

## Ručno pokretanje

```
node tools/i18n.js extract   # index.html -> locales/hr/
node tools/i18n.js verify    # provjera da HR ostaje identičan
node tools/i18n.js build     # gradi jezične verzije
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
