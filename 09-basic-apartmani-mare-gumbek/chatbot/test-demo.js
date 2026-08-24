/* ============================================================
   TEST DEMO ODGOVORA — node chatbot/test-demo.js
   ------------------------------------------------------------
   Provjerava dvoje na svih 6 podrzanih jezika:
     1) je li jezik pitanja ispravno prepoznat,
     2) je li pogodena ocekivana tema odgovora.

   Isti oblik kao tools/test-lang.js u korijenu repozitorija:
   izlazi s kodom 1 ako ijedan slucaj padne, pa se moze objesiti
   na GitHub Actions bez ikakve dodatne opreme.
   ============================================================ */
'use strict';

var widget = require('./widget.js');
var detectLang = widget.detectLang;
var demoOdgovor = widget.demoOdgovor;

/* Ocekivana tema se prepoznaje po karakteristicnom nizu iz odgovora —
   demoOdgovor vraca gotov tekst, ne id teme. */
var POTPIS = {
  checkin: { hr: 'dogovaramo unaprijed', en: 'arranged in advance', de: 'im Voraus',
             fr: 'convient à l\'avance', it: 'in anticipo', es: 'con antelación' },
  parking: { hr: 'Parking je besplatan', en: 'Parking is free', de: 'kostenlos',
             fr: 'gratuit', it: 'gratuito', es: 'gratuito' },
  plaza:   { hr: '800 metara', en: '800 m', de: '800 m', fr: '800 m', it: '800 m', es: '800 m' },
  cijena:  { hr: 'ne objavljujemo', en: 'do not publish', de: 'keine Preise',
             fr: 'ne publions pas', it: 'Non pubblichiamo', es: 'No publicamos' },
  kapacitet: { hr: 'dva apartmana', en: 'two apartments', de: 'zwei Wohnungen',
               fr: 'deux appartements', it: 'due appartamenti', es: 'dos apartamentos' },
  oprema:  { hr: 'Wi-Fi', en: 'Wi-Fi', de: 'WLAN', fr: 'Wi-Fi', it: 'Wi-Fi', es: 'Wi-Fi' },
  lokacija: { hr: 'Petrčane IX 2a', en: 'Petrčane IX 2a', de: 'Petrčane IX 2a',
              fr: 'Petrčane IX 2a', it: 'Petrčane IX 2a', es: 'Petrčane IX 2a' },
  nepoznato: { hr: 'ne mogu potvrditi', en: 'cannot confirm', de: 'nicht bestätigen',
               fr: 'ne peux pas le confirmer', it: 'Non posso confermarlo',
               es: 'No puedo confirmarlo' },
  djeca:   { hr: 'Djeca su dobrodošla', en: 'Children are welcome', de: 'Kinder sind willkommen',
             fr: 'enfants sont les bienvenus', it: 'bambini sono i benvenuti',
             es: 'niños son bienvenidos' },
  kontakt: { hr: 'Najbrže', en: 'quickest', de: 'schnellsten', fr: 'plus rapide',
             it: 'più rapido', es: 'más rápida' }
};

/* [pitanje, ocekivani jezik, ocekivana tema] */
var SLUCAJEVI = [
  // --- hrvatski ---
  ['Kada je prijava?', 'hr', 'checkin'],
  ['Ima li parkinga?', 'hr', 'parking'],
  ['Koliko je do plaže?', 'hr', 'plaza'],
  ['Kolika je cijena za tjedan dana u kolovozu?', 'hr', 'cijena'],
  ['Koja je razlika između Mare i Gumbeka?', 'hr', 'kapacitet'],
  ['Imate li wifi i klimu?', 'hr', 'oprema'],
  ['Koliko je do zračne luke Zadar?', 'hr', 'lokacija'],
  ['Jesu li dozvoljeni kućni ljubimci?', 'hr', 'nepoznato'],

  // --- engleski (iz zadatka) ---
  ['What time is check-in?', 'en', 'checkin'],
  ['How far is the beach?', 'en', 'plaza'],
  ['Is there parking?', 'en', 'parking'],
  ['How much does it cost per night?', 'en', 'cijena'],
  ['Do you allow pets?', 'en', 'nepoznato'],
  ['How many people can stay in the apartment?', 'en', 'kapacitet'],

  // --- njemacki (iz zadatka) ---
  ['Gibt es einen Parkplatz?', 'de', 'parking'],
  ['Wie weit ist der Strand?', 'de', 'plaza'],
  ['Wann ist der Check-in?', 'de', 'checkin'],
  ['Was kostet eine Nacht?', 'de', 'cijena'],
  ['Wie weit ist der Flughafen Zadar?', 'de', 'lokacija'],

  // --- francuski (iz zadatka) ---
  ['Combien de temps jusqu\'à la plage?', 'fr', 'plaza'],
  ['Y a-t-il un parking?', 'fr', 'parking'],
  ['Quel est le prix par nuit?', 'fr', 'cijena'],
  ['À quelle heure est l\'arrivée?', 'fr', 'checkin'],

  // --- talijanski (iz zadatka) ---
  ['A che ora è il check-in?', 'it', 'checkin'],
  ['Quanto dista la spiaggia?', 'it', 'plaza'],
  ['C\'è il parcheggio?', 'it', 'parking'],
  ['Quanto costa a notte?', 'it', 'cijena'],

  // --- spanjolski (iz zadatka) ---
  ['¿Hay aparcamiento?', 'es', 'parking'],
  ['¿A qué hora es la entrada?', 'es', 'checkin'],
  ['¿Cuánto cuesta por noche?', 'es', 'cijena'],
  ['¿Está lejos la playa?', 'es', 'plaza'],
  ['¿Se admiten mascotas?', 'es', 'nepoznato']
];

var pao = 0;
var poJeziku = {};

console.log('Test demo odgovora — ' + SLUCAJEVI.length + ' pitanja na 6 jezika\n');

SLUCAJEVI.forEach(function (s) {
  var pitanje = s[0], ocekJezik = s[1], ocekTema = s[2];
  var jezik = detectLang(pitanje);
  var odg = demoOdgovor(pitanje);
  var potpis = POTPIS[ocekTema][ocekJezik];
  var temaOk = odg.text.indexOf(potpis) !== -1;
  var jezikOk = jezik === ocekJezik;

  poJeziku[ocekJezik] = poJeziku[ocekJezik] || { ok: 0, ukupno: 0 };
  poJeziku[ocekJezik].ukupno += 1;
  if (jezikOk && temaOk) poJeziku[ocekJezik].ok += 1;

  if (jezikOk && temaOk) {
    console.log('  OK   [' + ocekJezik + '] ' + pitanje);
  } else {
    pao += 1;
    console.log('  PAO  [' + ocekJezik + '] ' + pitanje);
    if (!jezikOk) console.log('       jezik: ocekivan ' + ocekJezik + ', dobiven ' + jezik);
    if (!temaOk) console.log('       tema:  nije nadeno "' + potpis + '" u odgovoru');
    console.log('       odgovor: ' + odg.text.slice(0, 110) + '…');
  }
});

console.log('\nPo jeziku:');
Object.keys(poJeziku).forEach(function (l) {
  console.log('  ' + l + ': ' + poJeziku[l].ok + '/' + poJeziku[l].ukupno);
});

if (pao) {
  console.log('\n' + pao + ' od ' + SLUCAJEVI.length + ' slucajeva nije proslo.');
  process.exit(1);
}
console.log('\nSvih ' + SLUCAJEVI.length + ' slucajeva proslo.');
