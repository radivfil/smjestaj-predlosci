/* ============================================================
   CHAT WIDGET — Apartmani Mare i Gumbek
   ------------------------------------------------------------
   Bez ovisnosti, bez build koraka. Uključuje se s dvije linije
   u index.html (vidi dno <body>).

   DVA NAČINA RADA
   ---------------
   1) DEMO (zadano, API_URL je prazan)
      Odgovara lokalno, iz pripremljenih odgovora u DEMO_ODGOVORI.
      Svi su izvedeni iz chatbot/knowledge.md — ništa izmišljeno.
      U prozoru stoji vidljiva napomena da je riječ o demo načinu.

   2) LIVE (kad se upiše API_URL)
      Šalje poruku i povijest razgovora na vlastiti backend, koji
      zove Claude API sa system promptom iz knowledge.md.
      Demo traka tada nestaje sama, bez ijedne druge promjene.

   Jezik se u LIVE načinu prepoznaje na strani Claudea. U DEMO
   načinu ga pogađa jednostavna heuristika niže (detectLang) —
   dovoljna za 6 podržanih jezika i kratka pitanja gostiju.
   ============================================================ */
(function () {
  'use strict';

  /* ==========================================================
     1. POSTAVKE — jedino što se ovdje mijenja
     ========================================================== */
  var CFG = {
    // Prazno = demo način. Upisati punu adresu backenda za live rad,
    // npr. 'https://mare-gumbek-chat.vercel.app/api/chat'
    API_URL: '',

    TELEFON: '+385 98 751 522',
    TELEFON_HREF: 'tel:+38598751522',
    WHATSAPP: 'https://wa.me/38598751522',

    // Koliko se prethodnih poruka šalje backendu kao kontekst.
    // Parni broj — povijest uvijek počinje porukom gosta.
    POVIJEST: 8,

    // Nakon koliko sekundi odustajemo od odgovora.
    TIMEOUT_MS: 20000,

    MAX_ZNAKOVA: 600
  };

  /* ==========================================================
     2. TEKSTOVI SUČELJA — po zahtjevu na hrvatskom
     ========================================================== */
  var UI = {
    naslov: 'Virtualni asistent',
    podnaslov: 'Apartmani Mare i Gumbek',
    placeholder: 'Napišite pitanje…',
    otvori: 'Otvorite chat s virtualnim asistentom',
    zatvori: 'Zatvori chat',
    posalji: 'Pošalji poruku',
    pozdrav: 'Pozdrav! Ja sam virtualni asistent Apartmana Mare i Gumbek. ' +
             'Pitajte me bilo što o smještaju, lokaciji ili rezervaciji.',
    demo: '<strong>Demo način.</strong> Asistent još nije spojen na Claude API, ' +
          'pa odgovara iz pripremljenih odgovora. Za sve ostalo nazovite nas.',
    greska: 'Trenutno imamo tehničke poteškoće — molimo kontaktirajte nas direktno na ' +
            CFG.TELEFON,
    predugo: 'Poruka je predugačka. Skratite je na najviše ' + CFG.MAX_ZNAKOVA + ' znakova.',
    foot: 'Za rezervaciju i cijenu: ',
    prijedlozi: [
      'Koliko je do plaže?',
      'Ima li parkinga?',
      'Kolika je cijena?',
      'Kada je prijava?'
    ]
  };

  /* ==========================================================
     3. PREPOZNAVANJE JEZIKA (samo demo način)
     ----------------------------------------------------------
     Bodovanje po čestim riječima, uz jak bonus za znakove koji
     se javljaju samo u jednom jeziku. U live načinu ovo se ne
     koristi — Claude prepoznaje jezik puno pouzdanije.
     ========================================================== */
  var RIJECI = {
    hr: ['je', 'su', 'li', 'sto', 'koliko', 'ima', 'imate', 'moze', 'molim', 'hvala',
         'gdje', 'kada', 'kad', 'cijena', 'apartman', 'plaza', 'vas', 'vam', 'nas',
         'pozdrav', 'koji', 'kolika', 'jel', 'dobar', 'dan', 'nema', 'treba'],
    en: ['the', 'is', 'are', 'do', 'does', 'you', 'your', 'how', 'what', 'when',
         'where', 'can', 'we', 'there', 'have', 'has', 'please', 'thanks', 'hello',
         'much', 'far', 'many', 'time', 'any', 'with'],
    de: ['ist', 'sind', 'wie', 'was', 'wann', 'wo', 'gibt', 'einen', 'eine', 'der',
         'die', 'das', 'ich', 'wir', 'haben', 'bitte', 'danke', 'hallo', 'weit',
         'kann', 'konnen', 'lange', 'auch', 'nicht', 'und'],
    fr: ['est', 'sont', 'comment', 'quand', 'ou', 'vous', 'nous', 'je', 'les', 'des',
         'une', 'combien', 'merci', 'bonjour', 'peut', 'puis', 'jusqu', 'avec',
         'pour', 'quelle', 'quel', 'plage', 'temps', 'il', 'un', 'du', 'au',
         'votre', 'avez', 'dans', 'sur', 'aussi', 'tres'],
    it: ['sono', 'come', 'cosa', 'quando', 'dove', 'avete', 'siamo', 'noi', 'voi',
         'gli', 'quanto', 'grazie', 'ciao', 'buongiorno', 'posso', 'che', 'per',
         'con', 'della', 'orario', 'spiaggia'],
    es: ['son', 'como', 'que', 'cuando', 'donde', 'hay', 'tiene', 'tienen', 'usted',
         'nosotros', 'los', 'las', 'una', 'cuanto', 'gracias', 'hola', 'puedo',
         'para', 'con', 'playa', 'esta']
  };

  // Znakovi i nizovi koji gotovo sigurno određuju jezik.
  var MARKERI = [
    { re: /[čćžšđ]/i, lang: 'hr', bod: 6 },
    { re: /[äöüß]/i, lang: 'de', bod: 6 },
    { re: /[ñ¿¡]/i, lang: 'es', bod: 6 },
    { re: /[àèùò]/i, lang: 'it', bod: 3 },
    { re: /[çœ]|[éêèà]s\b/i, lang: 'fr', bod: 4 },
    { re: /\b(qu'|d'|l'|c'est|est-ce)/i, lang: 'fr', bod: 5 },
    // "Y a-t-il un parking?" nema nijedne ceste rijeci s popisa iznad —
    // bez ovoga bi pitanje ostalo bez ijednog signala i palo na hrvatski.
    { re: /(y a-t-il|il y a|avez-vous|qu'est|s'il vous|n'est)/i, lang: 'fr', bod: 6 },
    { re: /(gibt es|haben sie|wie viel|kann man)/i, lang: 'de', bod: 5 },
    { re: /(ci sono|si puo|quanto dista|c'e )/i, lang: 'it', bod: 5 },
    { re: /(se admiten|hay un|cuanto cuesta|a que hora)/i, lang: 'es', bod: 5 },
    { re: /\b(che|del|nella|dell)\b/i, lang: 'it', bod: 4 },
    { re: /\b(sich|nach|dem|den|einem)\b/i, lang: 'de', bod: 4 }
  ];

  function bezKvacica(s) {
    return s
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function detectLang(tekst) {
    var sirovo = String(tekst || '');
    var cist = bezKvacica(sirovo.toLowerCase());
    var rijeci = cist.split(/[^a-z0-9']+/).filter(Boolean);

    var bod = { hr: 0, en: 0, de: 0, fr: 0, it: 0, es: 0 };

    rijeci.forEach(function (r) {
      Object.keys(RIJECI).forEach(function (lang) {
        if (RIJECI[lang].indexOf(r) !== -1) bod[lang] += 1;
      });
    });

    MARKERI.forEach(function (m) {
      if (m.re.test(sirovo)) bod[m.lang] += m.bod;
    });

    var najbolji = 'hr', max = 0;
    Object.keys(bod).forEach(function (lang) {
      if (bod[lang] > max) { max = bod[lang]; najbolji = lang; }
    });

    // Bez ijednog signala (npr. "Gumbek?") ostajemo na hrvatskom —
    // stranica je hrvatska i to je najvjerojatniji jezik gosta.
    return max === 0 ? 'hr' : najbolji;
  }

  /* ==========================================================
     4. DEMO ODGOVORI
     ----------------------------------------------------------
     Svaka tema ima ključne riječi (kljuc = 1 bod, jaki = 3 boda)
     i odgovor na svih 6 jezika. Sadržaj je doslovno izveden iz
     chatbot/knowledge.md — što tamo piše NEDOSTAJE, ovdje se
     otvoreno kaže da nije poznato.
     ========================================================== */
  var T = CFG.TELEFON;

  var DEMO_ODGOVORI = [
    {
      id: 'kapacitet',
      jaki: ['gumbek', 'razlik', 'differen', 'unterschied', 'kapacit', 'capacit'],
      kljuc: ['apartman', 'apartment', 'wohnung', 'appartement', 'appartamento',
              'apartamento', 'osoba', 'person', 'people', 'leute', 'persone',
              'personas', 'personnes', 'soba', 'spavaon', 'room', 'zimmer',
              'chambre', 'camera', 'habitacion', 'schlafzimmer'],
      txt: {
        hr: 'Imamo dva apartmana u istoj zgradi. Mare je u prizemlju, bez stepenica, do 6 osoba, s vlastitim vrtom i velikom natkrivenom terasom koja ima vanjsku kuhinju i kameni kamin. Gumbek je dvoetažni, do 4 osobe, s balkonom s tendom i spavaonicama na gornjoj etaži. Oba imaju dvije spavaonice, vlastiti ulaz, punu kuhinju, kupaonicu i klimu. Točan broj i tip ležajeva najbolje provjerite na ' + T + '.',
        en: 'There are two apartments in the same building. Mare is on the ground floor, no stairs, for up to 6 people, with its own garden and a large covered terrace that has an outdoor kitchen and a stone fireplace. Gumbek is on two levels, for up to 4 people, with an awning-covered balcony and the bedrooms upstairs. Both have two bedrooms, a private entrance, a full kitchen, a bathroom and air conditioning. For the exact number and type of beds, please call ' + T + '.',
        de: 'Es gibt zwei Wohnungen im selben Haus. Mare liegt im Erdgeschoss, stufenlos, für bis zu 6 Personen, mit eigenem Garten und einer großen überdachten Terrasse mit Außenküche und Steinkamin. Gumbek ist auf zwei Ebenen, für bis zu 4 Personen, mit Balkon mit Markise und den Schlafzimmern im Obergeschoss. Beide haben zwei Schlafzimmer, einen eigenen Eingang, eine komplette Küche, ein Bad und Klimaanlage. Die genaue Zahl und Art der Betten erfragen Sie bitte unter ' + T + '.',
        fr: 'Il y a deux appartements dans le même bâtiment. Mare est au rez-de-chaussée, sans escalier, pour 6 personnes maximum, avec son propre jardin et une grande terrasse couverte dotée d\'une cuisine extérieure et d\'une cheminée en pierre. Gumbek est sur deux niveaux, pour 4 personnes maximum, avec un balcon sous store et les chambres à l\'étage. Les deux ont deux chambres, une entrée privée, une cuisine complète, une salle de bain et la climatisation. Pour le nombre et le type exacts de lits, appelez le ' + T + '.',
        it: 'Ci sono due appartamenti nello stesso edificio. Mare è al piano terra, senza scale, fino a 6 persone, con giardino privato e un\'ampia terrazza coperta con cucina esterna e camino in pietra. Gumbek è su due livelli, fino a 4 persone, con balcone con tenda e le camere al piano superiore. Entrambi hanno due camere da letto, ingresso indipendente, cucina completa, bagno e aria condizionata. Per il numero e il tipo esatto di letti chiamate il ' + T + '.',
        es: 'Tenemos dos apartamentos en el mismo edificio. Mare está en la planta baja, sin escaleras, hasta 6 personas, con jardín propio y una gran terraza cubierta con cocina exterior y chimenea de piedra. Gumbek es de dos plantas, hasta 4 personas, con balcón con toldo y los dormitorios arriba. Ambos tienen dos dormitorios, entrada independiente, cocina completa, baño y aire acondicionado. Para el número y tipo exacto de camas, llame al ' + T + '.'
      }
    },
    {
      id: 'checkin',
      jaki: ['check in', 'check-in', 'checkin', 'check out', 'check-out', 'checkout',
             'prijav', 'odjav', 'einchecken', 'anreise', 'abreise', 'llegada', 'salida'],
      kljuc: ['kljuc', 'schlussel', 'schluessel', 'key', 'cle', 'chiave', 'llave',
              'arriv', 'depart', 'orario', 'ingresso', 'uscita', 'entrada',
              'uhrzeit', 'vrijeme', 'sat', 'hora', 'ora', 'heure'],
      txt: {
        hr: 'Vrijeme prijave i odjave dogovaramo unaprijed — nemamo fiksni sat. Javite nam kada planirate stići i prilagodimo se. Ključeve preuzimate osobno od nas, u vrijeme koje unaprijed dogovorimo.',
        en: 'Check-in and check-out times are arranged in advance — there is no fixed hour. Just tell us when you plan to arrive and we adjust. You collect the keys from us in person, at a time agreed beforehand.',
        de: 'Check-in und Check-out vereinbaren wir im Voraus — feste Uhrzeiten gibt es nicht. Sagen Sie uns einfach, wann Sie ankommen möchten, und wir richten uns danach. Die Schlüssel übergeben wir Ihnen persönlich zur vereinbarten Zeit.',
        fr: 'L\'heure d\'arrivée et de départ se convient à l\'avance — il n\'y a pas d\'horaire fixe. Dites-nous simplement quand vous comptez arriver et nous nous adaptons. Les clés vous sont remises en main propre, à l\'heure convenue.',
        it: 'L\'orario di check-in e check-out si concorda in anticipo — non c\'è un orario fisso. Diteci quando pensate di arrivare e ci organizziamo. Le chiavi vengono consegnate di persona, all\'ora concordata.',
        es: 'La hora de entrada y salida se acuerda con antelación — no hay un horario fijo. Dígannos cuándo piensan llegar y nos adaptamos. Las llaves se entregan en persona, a la hora acordada.'
      }
    },
    {
      id: 'parking',
      jaki: ['parking', 'parkir', 'parkplatz', 'aparcamiento', 'parcheggio',
             'stationnement', 'parken'],
      kljuc: ['auto', 'car', 'voiture', 'coche', 'macchina', 'garaz', 'garage'],
      txt: {
        hr: 'Parking je besplatan i nalazi se u dvorištu, pred samim ulazom — jedno mjesto po apartmanu. Ne morate tražiti mjesto po mjestu.',
        en: 'Parking is free and right in the courtyard in front of the entrance — one space per apartment. No hunting for a spot around the village.',
        de: 'Der Parkplatz ist kostenlos und liegt im Hof direkt vor dem Eingang — ein Stellplatz pro Wohnung. Sie müssen im Ort keinen Platz suchen.',
        fr: 'Le parking est gratuit, dans la cour juste devant l\'entrée — une place par appartement. Pas besoin de chercher une place dans le village.',
        it: 'Il parcheggio è gratuito, nel cortile davanti all\'ingresso — un posto per appartamento. Non dovete cercare posto in paese.',
        es: 'El aparcamiento es gratuito, en el patio justo delante de la entrada — una plaza por apartamento. No hace falta buscar sitio por el pueblo.'
      }
    },
    {
      id: 'plaza',
      jaki: ['plaz', 'beach', 'strand', 'plage', 'spiaggia', 'playa'],
      kljuc: ['more', 'sea', 'meer', 'mer', 'mar', 'kupanj', 'swim', 'baden',
              'nager', 'nuotare', 'nadar', 'luka', 'riva', 'harbour', 'hafen'],
      txt: {
        hr: 'Plaža Donje Petrčane je 800 metara od nas, oko 9 minuta lagane šetnje — i to bez prelaska prometnice. Luka i riva Petrčana, s konobama uz more, još su bliže, nekoliko minuta hoda.',
        en: 'Donje Petrčane beach is 800 m away, about a 9-minute easy walk — and you never cross a road on the way. The Petrčane harbour and seafront, with taverns by the water, are even closer, a few minutes on foot.',
        de: 'Der Strand Donje Petrčane ist 800 m entfernt, etwa 9 Minuten gemütlicher Fußweg — ganz ohne Straßenüberquerung. Hafen und Uferpromenade von Petrčane mit Tavernen am Wasser sind noch näher, wenige Gehminuten.',
        fr: 'La plage de Donje Petrčane est à 800 m, environ 9 minutes de marche tranquille — sans traverser aucune route. Le port et le front de mer de Petrčane, avec ses tavernes, sont encore plus près, à quelques minutes à pied.',
        it: 'La spiaggia di Donje Petrčane dista 800 m, circa 9 minuti di passeggiata tranquilla — senza attraversare strade. Il porto e la riva di Petrčane, con le taverne sul mare, sono ancora più vicini, a pochi minuti a piedi.',
        es: 'La playa de Donje Petrčane está a 800 m, unos 9 minutos andando tranquilamente — y sin cruzar ninguna carretera. El puerto y el paseo marítimo de Petrčane, con tabernas junto al mar, están aún más cerca, a pocos minutos a pie.'
      }
    },
    {
      id: 'cijena',
      jaki: ['cijen', 'cjenik', 'price', 'cost', 'kosten', 'preis', 'prix', 'prezzo',
             'costo', 'precio', 'tarif', 'rezervac', 'reserv', 'booking', 'buchen',
             'prenotaz', 'kostet'],
      kljuc: ['eur', 'euro', 'nocenj', 'noc', 'night', 'nacht', 'nuit', 'notte',
              'noche', 'placanj', 'payment', 'zahlung', 'pagament', 'pago', 'kapar',
              'deposit', 'anzahlung', 'boravisn', 'tax', 'taxe', 'tassa', 'tasa'],
      txt: {
        hr: 'Cijenu ne objavljujemo unaprijed jer ovisi o terminu, duljini boravka i broju gostiju. Pošaljite datume kroz obrazac „Provjerite svoj termin" na dnu stranice ili nazovite ' + T + ' — javljamo se s točnim iznosom, u pravilu isti dan. U cijenu su uključeni posteljina, ručnici, finalno čišćenje, voda, struja, klima, parking i Wi-Fi; boravišna pristojba se obračunava dodatno. Upit ništa ne obvezuje.',
        en: 'We do not publish prices in advance because they depend on the dates, the length of stay and the number of guests. Send us your dates through the enquiry form at the bottom of this page or call ' + T + ' — we reply with an exact figure, usually the same day. Bed linen, towels, final cleaning, water, electricity, air conditioning, parking and Wi-Fi are included; the tourist tax is charged separately. An enquiry commits you to nothing.',
        de: 'Wir veröffentlichen keine Preise im Voraus, da sie vom Zeitraum, der Aufenthaltsdauer und der Personenzahl abhängen. Schicken Sie uns Ihre Daten über das Anfrageformular unten auf der Seite oder rufen Sie ' + T + ' an — wir antworten mit einem konkreten Betrag, in der Regel noch am selben Tag. Bettwäsche, Handtücher, Endreinigung, Wasser, Strom, Klimaanlage, Parkplatz und WLAN sind inbegriffen; die Kurtaxe wird zusätzlich berechnet. Eine Anfrage ist unverbindlich.',
        fr: 'Nous ne publions pas de tarifs à l\'avance, car ils dépendent des dates, de la durée du séjour et du nombre de personnes. Envoyez-nous vos dates via le formulaire en bas de page ou appelez le ' + T + ' — nous répondons avec un montant précis, en général le jour même. Draps, serviettes, ménage de fin de séjour, eau, électricité, climatisation, parking et Wi-Fi sont inclus ; la taxe de séjour est facturée en plus. Une demande n\'engage à rien.',
        it: 'Non pubblichiamo i prezzi in anticipo perché dipendono dal periodo, dalla durata del soggiorno e dal numero di ospiti. Inviateci le date tramite il modulo in fondo alla pagina o chiamate il ' + T + ' — rispondiamo con una cifra precisa, di norma lo stesso giorno. Biancheria, asciugamani, pulizia finale, acqua, elettricità, aria condizionata, parcheggio e Wi-Fi sono inclusi; la tassa di soggiorno si paga a parte. La richiesta non impegna a nulla.',
        es: 'No publicamos precios por adelantado porque dependen de las fechas, la duración de la estancia y el número de huéspedes. Envíenos sus fechas con el formulario al final de la página o llame al ' + T + ' — respondemos con un importe exacto, normalmente el mismo día. Ropa de cama, toallas, limpieza final, agua, electricidad, aire acondicionado, aparcamiento y Wi-Fi están incluidos; la tasa turística se cobra aparte. La consulta no compromete a nada.'
      }
    },
    {
      id: 'oprema',
      jaki: ['wifi', 'wi-fi', 'internet', 'klima', 'klim', 'air con', 'aircon',
             'aria condizionata', 'aire acondicionado', 'climatisation'],
      kljuc: ['kuhinj', 'kitchen', 'kuche', 'kueche', 'cucina', 'cocina', 'cuisine',
              'perilic', 'washing', 'waschmasch', 'lavatrice', 'lavadora', 'machine a laver',
              'tv', 'pecnic', 'oven', 'backofen', 'forno', 'horno', 'four',
              'terasa', 'terrace', 'terrasse', 'terrazza', 'balkon', 'balcon',
              'vrt', 'garden', 'garten', 'giardino', 'jardin'],
      txt: {
        hr: 'U oba apartmana su besplatan Wi-Fi bez ograničenja prometa, klima, TV i puna kuhinja — pećnica, ploča, perilica posuđa, mikrovalna i aparat za kavu. Perilica rublja navedena je u apartmanu Mare. Mare uz to ima vrt i natkrivenu terasu s vanjskom kuhinjom i kamenim kaminom, a Gumbek balkon s tendom.',
        en: 'Both apartments have free unlimited Wi-Fi, air conditioning, a TV and a full kitchen — oven, hob, dishwasher, microwave and coffee machine. A washing machine is listed in the Mare apartment. Mare also has a garden and a covered terrace with an outdoor kitchen and a stone fireplace; Gumbek has a balcony with an awning.',
        de: 'Beide Wohnungen haben kostenloses WLAN ohne Volumenbegrenzung, Klimaanlage, TV und eine komplette Küche — Backofen, Kochfeld, Geschirrspüler, Mikrowelle und Kaffeemaschine. Eine Waschmaschine ist für die Wohnung Mare angegeben. Mare hat zudem einen Garten und eine überdachte Terrasse mit Außenküche und Steinkamin, Gumbek einen Balkon mit Markise.',
        fr: 'Les deux appartements disposent du Wi-Fi gratuit et illimité, de la climatisation, d\'une télévision et d\'une cuisine complète — four, plaque, lave-vaisselle, micro-ondes et machine à café. Un lave-linge est indiqué dans l\'appartement Mare. Mare a en plus un jardin et une terrasse couverte avec cuisine extérieure et cheminée en pierre, Gumbek un balcon sous store.',
        it: 'Entrambi gli appartamenti hanno Wi-Fi gratuito e illimitato, aria condizionata, TV e cucina completa — forno, piano cottura, lavastoviglie, microonde e macchina del caffè. La lavatrice è indicata nell\'appartamento Mare. Mare ha inoltre un giardino e una terrazza coperta con cucina esterna e camino in pietra, Gumbek un balcone con tenda.',
        es: 'Ambos apartamentos tienen Wi-Fi gratuito e ilimitado, aire acondicionado, televisión y cocina completa — horno, placa, lavavajillas, microondas y cafetera. La lavadora figura en el apartamento Mare. Mare tiene además jardín y una terraza cubierta con cocina exterior y chimenea de piedra, y Gumbek un balcón con toldo.'
      }
    },
    {
      id: 'lokacija',
      jaki: ['zadar', 'aerodrom', 'zracn', 'airport', 'flughafen', 'aeroport',
             'aeroporto', 'aeropuerto', 'petrcane', 'adres', 'address', 'adresse',
             'indirizzo', 'direccion', 'trajekt', 'ferry', 'faehre', 'fahre'],
      kljuc: ['lokacij', 'location', 'lage', 'posizione', 'ubicacion', 'kilometar',
              'km', 'autobus', 'bus', 'nin', 'kornat', 'krka', 'plitvic', 'izlet',
              'excursion', 'ausflug', 'gita', 'wie weit', 'how far', 'quanto dista'],
      txt: {
        hr: 'Nalazimo se na adresi Petrčane IX 2a, 23231 Petrčane. Centar Zadra i Morske orgulje su 12 km, oko 20 minuta vožnje; zračna luka Zadar otprilike 20 do 30 minuta; autobusna i trajektna luka Zadar oko 15 minuta; Nin s pješčanom plažom i solanom oko 15 minuta. Kornati, Krka i Plitvička jezera su izleti od jednog dana.',
        en: 'We are at Petrčane IX 2a, 23231 Petrčane. Zadar city centre and the Sea Organ are 12 km away, about a 20-minute drive; Zadar airport roughly 20 to 30 minutes; the Zadar bus and ferry terminals about 15 minutes; Nin, with its sandy beach and salt pans, about 15 minutes. Kornati, Krka and the Plitvice Lakes are day trips.',
        de: 'Wir befinden uns in Petrčane IX 2a, 23231 Petrčane. Das Zentrum von Zadar und die Meeresorgel sind 12 km entfernt, etwa 20 Minuten mit dem Auto; der Flughafen Zadar rund 20 bis 30 Minuten; Bus- und Fährhafen Zadar etwa 15 Minuten; Nin mit Sandstrand und Salinen etwa 15 Minuten. Kornaten, Krka und die Plitvicer Seen sind Tagesausflüge.',
        fr: 'Nous sommes au Petrčane IX 2a, 23231 Petrčane. Le centre de Zadar et les Orgues marines sont à 12 km, environ 20 minutes en voiture ; l\'aéroport de Zadar à peu près 20 à 30 minutes ; la gare routière et le port de ferries de Zadar environ 15 minutes ; Nin, sa plage de sable et ses salines, environ 15 minutes. Les Kornati, la Krka et les lacs de Plitvice sont des excursions à la journée.',
        it: 'Ci troviamo in Petrčane IX 2a, 23231 Petrčane. Il centro di Zara e l\'Organo del mare distano 12 km, circa 20 minuti in auto; l\'aeroporto di Zara all\'incirca 20-30 minuti; la stazione degli autobus e il porto dei traghetti di Zara circa 15 minuti; Nin, con la spiaggia di sabbia e le saline, circa 15 minuti. Kornati, Krka e i laghi di Plitvice sono gite in giornata.',
        es: 'Estamos en Petrčane IX 2a, 23231 Petrčane. El centro de Zadar y el Órgano del Mar están a 12 km, unos 20 minutos en coche; el aeropuerto de Zadar aproximadamente 20 a 30 minutos; la estación de autobuses y el puerto de ferris de Zadar unos 15 minutos; Nin, con su playa de arena y las salinas, unos 15 minutos. Kornati, Krka y los lagos de Plitvice son excursiones de un día.'
      }
    },
    {
      id: 'djeca',
      jaki: ['djec', 'dijet', 'child', 'kinder', 'enfant', 'bambin', 'nino',
             'krevetic', 'crib', 'babybett', 'kinderbett', 'culla', 'cuna', 'berceau'],
      kljuc: ['beba', 'baby', 'bebe', 'kind', 'obitelj', 'family', 'familie',
              'famille', 'famiglia', 'familia'],
      txt: {
        hr: 'Djeca su dobrodošla. Napišite u upitu koliko ih je i koliko su stara pa predlažemo raspored ležajeva, a i boravišnu pristojbu tada računamo točno. Ima li dječjeg krevetića ili visoke stolice nije navedeno na stranici — to provjerite na ' + T + '.',
        en: 'Children are welcome. Tell us in your enquiry how many there are and how old they are, so we can suggest a bed arrangement and calculate the tourist tax correctly. Whether a cot or high chair is available is not stated on the site — please check on ' + T + '.',
        de: 'Kinder sind willkommen. Schreiben Sie in Ihrer Anfrage, wie viele es sind und wie alt sie sind, dann schlagen wir eine Bettenaufteilung vor und berechnen die Kurtaxe genau. Ob ein Kinderbett oder Hochstuhl vorhanden ist, steht nicht auf der Seite — bitte erfragen Sie das unter ' + T + '.',
        fr: 'Les enfants sont les bienvenus. Indiquez dans votre demande combien ils sont et quel âge ils ont, afin que nous proposions une répartition des lits et calculions exactement la taxe de séjour. La présence d\'un lit bébé ou d\'une chaise haute n\'est pas précisée sur le site — renseignez-vous au ' + T + '.',
        it: 'I bambini sono i benvenuti. Nella richiesta scrivete quanti sono e che età hanno, così proponiamo una sistemazione dei letti e calcoliamo con precisione la tassa di soggiorno. Se ci siano culla o seggiolone non è indicato sul sito — verificatelo al ' + T + '.',
        es: 'Los niños son bienvenidos. Indique en su consulta cuántos son y qué edad tienen, así proponemos una distribución de camas y calculamos la tasa turística con exactitud. Si hay cuna o trona no consta en la web — consúltelo en el ' + T + '.'
      }
    },
    {
      id: 'nepoznato',
      // Teme za koje se u knowledge.md izričito zna da podatka nema.
      jaki: ['ljubim', 'pets', 'pet ', 'hund', 'haustier', 'chien', 'animaux',
             'animali', 'perro', 'mascota', 'macka', 'katze', 'gatto', 'gato',
             'pusenj', 'smoking', 'rauchen', 'fumer', 'fumare', 'fumar',
             'bazen', 'pool', 'piscine', 'piscina', 'schwimmbad',
             'kvadrat', 'square meter', 'quadratmeter', 'metri quadri', 'metros',
             'otkaz', 'cancel', 'stornier', 'annul', 'cancellaz', 'minimaln',
             'minimum stay', 'mindestaufenthalt'],
      kljuc: ['dozvolj', 'allowed', 'erlaubt', 'permis', 'permesso', 'permitido'],
      txt: {
        hr: 'To vam iz podataka o objektu ne mogu potvrditi — nije navedeno na stranici, a ne želim nagađati. Najbolje pitajte direktno na ' + T + ' ili WhatsAppom na isti broj; javljaju se u pravilu isti dan.',
        en: 'I cannot confirm that from the property information — it is not stated on the site and I would rather not guess. Please ask directly on ' + T + ', or via WhatsApp on the same number; they usually reply the same day.',
        de: 'Das kann ich anhand der Objektinformationen nicht bestätigen — es steht nicht auf der Seite, und ich möchte nicht raten. Fragen Sie bitte direkt unter ' + T + ' oder per WhatsApp unter derselben Nummer; die Antwort kommt in der Regel am selben Tag.',
        fr: 'Je ne peux pas le confirmer à partir des informations disponibles — ce n\'est pas indiqué sur le site et je préfère ne pas deviner. Demandez directement au ' + T + ' ou par WhatsApp au même numéro ; la réponse arrive en général le jour même.',
        it: 'Non posso confermarlo dalle informazioni disponibili — non è indicato sul sito e preferisco non tirare a indovinare. Chiedete direttamente al ' + T + ' o su WhatsApp allo stesso numero; di norma rispondono lo stesso giorno.',
        es: 'No puedo confirmarlo con la información disponible — no consta en la web y prefiero no suponer. Pregunte directamente en el ' + T + ' o por WhatsApp al mismo número; suelen responder el mismo día.'
      }
    },
    {
      id: 'kontakt',
      jaki: ['kontakt', 'contact', 'telefon', 'phone', 'whatsapp', 'mail',
             'nazov', 'anruf', 'telefono', 'contacto', 'contatto'],
      kljuc: ['broj', 'number', 'nummer', 'numero', 'javit', 'call'],
      txt: {
        hr: 'Najbrže ćete do nas telefonom na ' + T + ' ili WhatsAppom na isti broj. Možete i ispuniti obrazac „Provjerite svoj termin" na dnu stranice — odgovaramo u pravilu isti dan. Govorimo hrvatski, engleski i njemački.',
        en: 'The quickest way to reach us is by phone on ' + T + ' or WhatsApp on the same number. You can also fill in the enquiry form at the bottom of this page — we usually reply the same day. We speak Croatian, English and German.',
        de: 'Am schnellsten erreichen Sie uns telefonisch unter ' + T + ' oder per WhatsApp unter derselben Nummer. Sie können auch das Anfrageformular unten auf der Seite ausfüllen — wir antworten in der Regel am selben Tag. Wir sprechen Kroatisch, Englisch und Deutsch.',
        fr: 'Le plus rapide est de nous appeler au ' + T + ' ou de nous écrire sur WhatsApp au même numéro. Vous pouvez aussi remplir le formulaire en bas de page — nous répondons en général le jour même. Nous parlons croate, anglais et allemand.',
        it: 'Il modo più rapido è il telefono al ' + T + ' o WhatsApp allo stesso numero. Potete anche compilare il modulo in fondo alla pagina — rispondiamo di norma lo stesso giorno. Parliamo croato, inglese e tedesco.',
        es: 'La forma más rápida es el teléfono ' + T + ' o WhatsApp al mismo número. También puede rellenar el formulario al final de la página — respondemos normalmente el mismo día. Hablamos croata, inglés y alemán.'
      }
    }
  ];

  var FALLBACK = {
    hr: 'Na to nemam odgovor iz podataka koje imam o objektu. Nazovite ' + T + ' ili pišite WhatsAppom — javljaju se u pravilu isti dan. Mene možete pitati o apartmanima, plaži, parkingu, opremi, lokaciji, cijeni ili dolasku.',
    en: 'I don\'t have an answer to that in the property information I hold. Please call ' + T + ' or write on WhatsApp — they usually reply the same day. You can ask me about the apartments, the beach, parking, facilities, the location, prices or arrival.',
    de: 'Dazu habe ich in den Objektinformationen keine Antwort. Rufen Sie ' + T + ' an oder schreiben Sie per WhatsApp — die Antwort kommt in der Regel am selben Tag. Mich können Sie zu den Wohnungen, zum Strand, Parkplatz, zur Ausstattung, Lage, zu Preisen oder zur Anreise fragen.',
    fr: 'Je n\'ai pas de réponse à cela dans les informations dont je dispose. Appelez le ' + T + ' ou écrivez sur WhatsApp — la réponse arrive en général le jour même. Vous pouvez m\'interroger sur les appartements, la plage, le parking, les équipements, la situation, les tarifs ou l\'arrivée.',
    it: 'Su questo non ho una risposta nelle informazioni che possiedo. Chiamate il ' + T + ' o scrivete su WhatsApp — di norma rispondono lo stesso giorno. A me potete chiedere degli appartamenti, della spiaggia, del parcheggio, delle dotazioni, della posizione, dei prezzi o dell\'arrivo.',
    es: 'No tengo respuesta a eso en la información de la que dispongo. Llame al ' + T + ' o escriba por WhatsApp — suelen responder el mismo día. A mí puede preguntarme por los apartamentos, la playa, el aparcamiento, el equipamiento, la ubicación, los precios o la llegada.'
  };

  function demoOdgovor(poruka) {
    var lang = detectLang(poruka);
    var cist = ' ' + bezKvacica(String(poruka).toLowerCase()) + ' ';

    var najbolja = null, max = 0;
    DEMO_ODGOVORI.forEach(function (tema) {
      var bod = 0;
      (tema.jaki || []).forEach(function (k) { if (cist.indexOf(k) !== -1) bod += 3; });
      (tema.kljuc || []).forEach(function (k) { if (cist.indexOf(k) !== -1) bod += 1; });
      if (bod > max) { max = bod; najbolja = tema; }
    });

    var txt = (max > 0 && najbolja) ? najbolja.txt[lang] : FALLBACK[lang];
    return { text: txt || FALLBACK.hr, lang: lang };
  }

  /* ==========================================================
     5. SUČELJE
     ========================================================== */
  var IKONE = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 20l1-4.2A8.4 8.4 0 1 1 21 11.5z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    kuca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6"/></svg>',
    posalji: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 16-8-6 8 6 8z"/></svg>'
  };

  var root, panel, log, input, sendBtn, form, launcher;
  var povijest = [];       // [{role:'user'|'assistant', content:'…'}]
  var salje = false;
  var otvoren = false;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Telefon u tekstu odgovora postaje pozivni link — na mobitelu je to
  // razlika između pročitanog broja i obavljenog poziva.
  function linkifyTelefon(html) {
    var re = new RegExp(CFG.TELEFON.replace(/[+\s]/g, function (c) {
      return c === '+' ? '\\+' : '\\s*';
    }), 'g');
    return html.replace(re, '<a href="' + CFG.TELEFON_HREF + '">' + CFG.TELEFON + '</a>');
  }

  function dodajPoruku(tekst, vrsta) {
    var cls = 'cb__msg cb__msg--' + vrsta;
    var html = vrsta === 'user' ? escapeHtml(tekst) : linkifyTelefon(escapeHtml(tekst));
    var node = el('div', cls, html);
    node.setAttribute('role', 'listitem');
    log.appendChild(node);
    naDno();
    return node;
  }

  function naDno() {
    // rAF da se poruka stigne izmjeriti prije skrolanja.
    requestAnimationFrame(function () { log.scrollTop = log.scrollHeight; });
  }

  function prikaziPrijedloge() {
    var wrap = el('div', 'cb__chips');
    UI.prijedlozi.forEach(function (p) {
      var b = el('button', 'cb__chip', escapeHtml(p));
      b.type = 'button';
      b.addEventListener('click', function () {
        wrap.remove();
        posalji(p);
      });
      wrap.appendChild(b);
    });
    log.appendChild(wrap);
    naDno();
  }

  function typingOn() {
    var n = el('div', 'cb__msg cb__msg--bot cb__typing',
      '<span></span><span></span><span></span>');
    n.setAttribute('aria-label', 'Asistent piše odgovor');
    n.dataset.typing = '1';
    log.appendChild(n);
    naDno();
    return n;
  }

  /* ==========================================================
     6. SLANJE
     ========================================================== */
  function posalji(tekst) {
    tekst = String(tekst || '').trim();
    if (!tekst || salje) return;

    if (tekst.length > CFG.MAX_ZNAKOVA) {
      dodajPoruku(UI.predugo, 'error');
      return;
    }

    dodajPoruku(tekst, 'user');
    povijest.push({ role: 'user', content: tekst });
    input.value = '';
    autoVisina();
    zakljucaj(true);

    var typing = typingOn();

    odgovori(tekst)
      .then(function (odg) {
        typing.remove();
        dodajPoruku(odg, 'bot');
        povijest.push({ role: 'assistant', content: odg });
        if (povijest.length > CFG.POVIJEST) {
          povijest = povijest.slice(-CFG.POVIJEST);
          // Povijest mora počinjati porukom gosta, inače je API odbija.
          while (povijest.length && povijest[0].role !== 'user') povijest.shift();
        }
      })
      .catch(function (err) {
        typing.remove();
        if (window.console && console.warn) console.warn('[chat]', err);
        dodajPoruku(UI.greska, 'error');
        // Neuspjeli krug ne ostaje u povijesti.
        povijest.pop();
      })
      .then(function () {
        zakljucaj(false);
        if (otvoren) input.focus();
      });
  }

  function odgovori(tekst) {
    if (!CFG.API_URL) {
      // Demo: kratka odgoda da "piše…" ima smisla.
      return new Promise(function (res) {
        setTimeout(function () { res(demoOdgovor(tekst).text); }, 550 + Math.random() * 450);
      });
    }
    return sPosluzitelja(tekst);
  }

  function sPosluzitelja(tekst) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, CFG.TIMEOUT_MS);

    return fetch(CFG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: tekst,
        // Povijest bez zadnje poruke gosta — nju backend dobiva u `message`.
        history: povijest.slice(0, -1)
      }),
      signal: ctrl.signal
    }).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (d) {
      if (!d || !d.reply) throw new Error('Prazan odgovor');
      return d.reply;
    });
  }

  function zakljucaj(stanje) {
    salje = stanje;
    sendBtn.disabled = stanje;
    input.disabled = stanje;
  }

  /* ==========================================================
     7. OTVARANJE / ZATVARANJE
     ========================================================== */
  function otvori() {
    if (otvoren) return;
    otvoren = true;
    root.classList.add('is-open', 'is-seen');
    launcher.setAttribute('aria-expanded', 'true');
    try { localStorage.setItem('cb-seen', '1'); } catch (e) { /* privatni način */ }

    if (!log.children.length) {
      dodajPoruku(UI.pozdrav, 'bot');
      prikaziPrijedloge();
    }
    setTimeout(function () { input.focus(); }, 320);
  }

  function zatvori() {
    if (!otvoren) return;
    otvoren = false;
    root.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }

  function autoVisina() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 110) + 'px';
  }

  /* ==========================================================
     8. IZGRADNJA
     ========================================================== */
  function izgradi() {
    root = el('div', 'cb');

    launcher = el('button', 'cb__launcher',
      '<span class="cb__ico-chat">' + IKONE.chat + '</span>' +
      '<span class="cb__ico-close">' + IKONE.x + '</span>' +
      '<span class="cb__dot"></span>');
    launcher.type = 'button';
    launcher.setAttribute('aria-label', UI.otvori);
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'cb-panel');

    panel = el('div', 'cb__panel');
    panel.id = 'cb-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', UI.naslov + ' — ' + UI.podnaslov);

    var head = el('div', 'cb__head',
      '<span class="cb__avatar">' + IKONE.kuca + '</span>' +
      '<span><span class="cb__title">' + UI.naslov + '</span><br>' +
      '<span class="cb__subtitle">' + UI.podnaslov + '</span></span>');
    var close = el('button', 'cb__close', IKONE.x);
    close.type = 'button';
    close.setAttribute('aria-label', UI.zatvori);
    close.addEventListener('click', zatvori);
    head.appendChild(close);
    panel.appendChild(head);

    if (!CFG.API_URL) panel.appendChild(el('div', 'cb__demo', UI.demo));

    log = el('div', 'cb__log');
    log.setAttribute('role', 'list');
    log.setAttribute('aria-live', 'polite');
    log.setAttribute('aria-atomic', 'false');
    panel.appendChild(log);

    form = el('form', 'cb__form');
    input = el('textarea', 'cb__input');
    input.rows = 1;
    input.placeholder = UI.placeholder;
    input.setAttribute('aria-label', UI.placeholder);
    input.maxLength = CFG.MAX_ZNAKOVA;
    sendBtn = el('button', 'cb__send', IKONE.posalji);
    sendBtn.type = 'submit';
    sendBtn.setAttribute('aria-label', UI.posalji);
    form.appendChild(input);
    form.appendChild(sendBtn);
    panel.appendChild(form);

    panel.appendChild(el('div', 'cb__foot',
      UI.foot + '<a href="' + CFG.TELEFON_HREF + '">' + CFG.TELEFON + '</a>'));

    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    try {
      if (localStorage.getItem('cb-seen')) root.classList.add('is-seen');
    } catch (e) { /* privatni način preglednika */ }

    /* --- događaji --- */
    launcher.addEventListener('click', function () { otvoren ? zatvori() : otvori(); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      posalji(input.value);
    });

    input.addEventListener('input', autoVisina);
    input.addEventListener('keydown', function (e) {
      // Enter šalje, Shift+Enter je novi red.
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        posalji(input.value);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && otvoren) zatvori();
    });
  }

  /* ==========================================================
     9. POKRETANJE
     ----------------------------------------------------------
     Provjera na `document` postoji da se ista datoteka moze
     ucitati i u Nodeu (chatbot/test-demo.js), gdje DOM-a nema
     a testira se samo logika demo odgovora.
     ========================================================== */
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', izgradi);
    } else {
      izgradi();
    }
  }

  // Izlaz za testove; u pregledniku `module` ne postoji pa se preskace.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { detectLang: detectLang, demoOdgovor: demoOdgovor, CFG: CFG };
  }
})();
