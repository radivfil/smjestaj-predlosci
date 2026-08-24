# Chat widget — Apartmani Mare i Gumbek

Virtualni asistent u donjem desnom kutu stranice. Bez builda, bez
biblioteka — tri datoteke koje se šalju na server kao i sve ostalo.

| Datoteka | Što je |
| --- | --- |
| `knowledge.md` | **Baza znanja.** Jedini izvor činjenica. Ovdje se uređuje sadržaj. |
| `widget.css` | Izgled. Naslanja se na design tokene iz `index.html`, prati i tamnu temu. |
| `widget.js` | Logika. Na vrhu je `CFG` — jedino mjesto s postavkama. |
| `test-demo.js` | `node chatbot/test-demo.js` — 32 pitanja na 6 jezika. |

Uključeno je u `index.html` dvjema linijama: `<link>` u `<head>` i
`<script defer>` prije `</body>`.

---

## Trenutno stanje: demo način

`CFG.API_URL` je prazan, pa widget **ne zove nikakav API**. Odgovara
lokalno, iz tablice `DEMO_ODGOVORI` u `widget.js`, i u prozoru pokazuje
napomenu da nije riječ o živom asistentu. Sve što odgovara izvedeno je
iz `knowledge.md`.

Demo pokriva 10 tema (apartmani, prijava/odjava, parking, plaža, cijena,
oprema, lokacija, djeca, nepoznato, kontakt) na hrvatskom, engleskom,
njemačkom, francuskom, talijanskom i španjolskom. Za sve ostalo upućuje
na telefon.

---

## Uključivanje pravog Claude asistenta

Treba backend jer **API ključ ne smije biti u frontend kodu** — stranica
se posluje s Plesk hostinga koji ne pokreće serverless funkcije, pa
backend ide zasebno (npr. besplatan Vercel projekt spojen na ovaj repo).

Kad backend postoji, mijenja se **jedna linija** u `widget.js`:

```js
API_URL: 'https://ime-projekta.vercel.app/api/chat',
```

Demo traka tada nestaje sama. Widget šalje `POST` s tijelom:

```json
{ "message": "Gibt es einen Parkplatz?",
  "history": [{ "role": "user", "content": "…" },
              { "role": "assistant", "content": "…" }] }
```

i očekuje natrag `{ "reply": "…" }`. Backend sastavlja system prompt od
`knowledge.md` i dodaje uputu o jeziku:

> Detektiraj jezik korisnikove poruke i odgovori isključivo na tom istom
> jeziku. Podržani jezici: hrvatski, engleski, njemački, francuski,
> talijanski, španjolski. Ako korisnik piše na nekom drugom jeziku,
> odgovori na engleskom.

Baza znanja ostaje na hrvatskom — Claude je sam prevodi u odgovoru.

---

## Kako dodati ili ispraviti informaciju

**U pravom načinu rada** dovoljno je urediti `knowledge.md`. Nikakav
kod se ne dira.

**U demo načinu** treba i `DEMO_ODGOVORI` u `widget.js`, jer demo ne
čita `knowledge.md` (frontend nema pristup datoteci). Svaka tema ima:

```js
{
  id: 'parking',
  jaki:  ['parking', 'parkplatz', …],   // 3 boda po pogotku
  kljuc: ['auto', 'garage', …],         // 1 bod po pogotku
  txt: { hr: '…', en: '…', de: '…', fr: '…', it: '…', es: '…' }
}
```

Bira se tema s najviše bodova; bez ijednog pogotka ide `FALLBACK`.
Ključne riječi pišu se **bez kvačica i malim slovima** — poruka se prije
usporedbe normalizira (`bezKvacica`).

Nakon izmjene: `node chatbot/test-demo.js`.

---

## Kako dodati sedmi jezik

1. `RIJECI` — popis čestih riječi tog jezika (bez kvačica, mala slova).
2. `MARKERI` — po potrebi znak ili izraz koji se javlja samo u tom jeziku.
3. `txt` u svakoj temi u `DEMO_ODGOVORI` + u `FALLBACK`.
4. `test-demo.js` — nekoliko slučajeva i potpisi u `POTPIS`.

U pravom načinu rada dovoljno je dopisati jezik u uputu system prompta.
Sučelje widgeta ostaje na hrvatskom u oba slučaja — mijenja se u `UI`.

---

## Što još nije riješeno

- **Backend nije napravljen** — čeka odluku o hostingu.
- `knowledge.md`, odjeljak 10, popisuje **17 podataka kojih nema na
  stranici** (broj ležajeva, kućni ljubimci, pušenje, minimalni boravak,
  način plaćanja, otkazivanje…). Dok se ne dopune, i demo i pravi
  asistent na ta pitanja upućuju na telefon.
- E-mail `info@mare-gumbek.hr` **ne radi** (domena bez MX zapisa), pa ga
  asistent namjerno ne spominje.
