/* =====================================================================
   DA MARINELLI — script.js
   ---------------------------------------------------------------------
   Contenuto di questo file:
     1. Utilità e archiviazione (localStorage)
     2. Traduzioni dell'interfaccia (IT / EN / DE / SL)
     3. Allergeni, categorie e gruppi del menù
     4. Dati di partenza del menù (trascritti dal menù cartaceo)
     5. Accesso ai dati: menù, prenotazioni, impostazioni, PIN
     6. Logica del menù pubblico (index.html)

   Tutto il necessario per admin.html è esposto in window.MarinelliCore.

   NOTA IMPORTANTE: localStorage vive solo nel browser in cui viene usato.
   Le modifiche fatte da admin.html NON arrivano ai telefoni dei clienti:
   per quello serve un database online (vedi note di consegna).
   ===================================================================== */
(function () {
  'use strict';

  /* ===================================================================
     1. UTILITÀ E ARCHIVIAZIONE
     =================================================================== */
  const LANGS = ['it', 'en', 'de', 'sl'];
  const LOCALES = { it: 'it-IT', en: 'en-GB', de: 'de-DE', sl: 'sl-SI' };
  const KEYS = {
    menu: 'marinelli.menu.v1',
    bookings: 'marinelli.bookings.v1',
    settings: 'marinelli.settings.v1',
    lang: 'marinelli.lang.v1'
  };
  const MENU_VERSION = 2; // alza questo numero quando cambi i dati di partenza (SEED)

  // T(it, en, de, sl) crea un oggetto testo multilingua. Se mancano tedesco o sloveno usa l'inglese.
  const T = (it, en, de, sl) => ({ it: it, en: en, de: de === undefined ? en : de, sl: sl === undefined ? en : sl });
  // N(testo) = stesso testo in tutte le lingue (nomi propri dei piatti)
  const N = (s) => ({ it: s, en: s, de: s, sl: s });

  const esc = (s) =>
    String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  // Restituisce il testo nella lingua richiesta, con ripiego sull'italiano
  const tr = (obj, lang) => (obj && (obj[lang] || obj.it)) || '';

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clone = (x) => JSON.parse(JSON.stringify(x));

  function todayISO() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function formatPrice(value, lang) {
    try {
      return new Intl.NumberFormat(LOCALES[lang] || 'it-IT', { style: 'currency', currency: 'EUR' }).format(value);
    } catch (e) {
      return '€ ' + Number(value).toFixed(2).replace('.', ',');
    }
  }

  // Archiviazione con ripiego in memoria (es. navigazione privata che blocca localStorage)
  const mem = {};
  const storage = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) return JSON.parse(raw);
      } catch (e) { /* ignora */ }
      return key in mem ? mem[key] : fallback;
    },
    set(key, value) {
      mem[key] = value;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  // Hash semplice (cyrb53) per non salvare il PIN in chiaro.
  // ATTENZIONE: è offuscamento, non sicurezza vera (vedi note di consegna).
  function hashPin(str) {
    str = 'marinelli:' + String(str);
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  /* ===================================================================
     2. TRADUZIONI DELL'INTERFACCIA (menù pubblico)
     Per aggiungere un testo: inserisci la stessa chiave nelle 3 lingue
     e usa data-i18n="chiave" nell'HTML.
     =================================================================== */
  const UI = {
    it: {
      pageTitle: 'Da Marinelli — Menù',
      brandTag: 'Pizzeria e bar',
      heroLine: 'Fior di latte di Agerola, pomodoro San Marzano e pizze fritte.',
      bookCta: 'Prenota un tavolo',
      bookShort: 'Prenota',
      allergensCta: 'Allergeni',
      langLabel: 'Lingua',
      searchLabel: 'Cerca nel menù',
      searchPh: 'Cerca un piatto o un ingrediente',
      clearSearch: 'Cancella ricerca',
      navLabel: 'Categorie del menù',
      all: 'Tutto',
      noResults: 'Nessun piatto trovato. Prova con un’altra ricerca.',
      from: 'da',
      onRequest: 'su richiesta',
      unavailable: 'Non disponibile',
      cover: 'Coperto',
      frozenNote: 'I prodotti contrassegnati con l’asterisco (*) possono essere congelati o surgelati all’origine.',
      allergenNote: 'I numeri indicano gli allergeni presenti nei prodotti. Per maggiori informazioni, chiedere al personale.',
      allergensTitle: 'Allergeni e conservazione',
      close: 'Chiudi',
      toTop: 'Torna su',
      bookTitle: 'Prenota un tavolo',
      bookSub: 'Lascia i tuoi dati: ti risponderemo per confermare la prenotazione.',
      fName: 'Nome e cognome',
      fPhone: 'Telefono',
      fDate: 'Data',
      fTime: 'Orario',
      fGuests: 'Persone',
      fNotes: 'Note (allergie, seggiolone…)',
      fSubmit: 'Invia richiesta',
      errRequired: 'Compila tutti i campi obbligatori.',
      errPhone: 'Inserisci un numero di telefono valido.',
      errDate: 'Scegli una data da oggi in poi.',
      errGuests: 'Numero di persone non valido (massimo {max}). Per gruppi più grandi, chiamaci.',
      okTitle: 'Richiesta inviata',
      okText: 'Abbiamo registrato la tua richiesta: il locale ti contatterà per confermare.',
      okWa: 'Invia anche su WhatsApp',
      okAgain: 'Nuova richiesta',
      bookingsOff: 'Per prenotare un tavolo contattaci direttamente.',
      infoTitle: 'Contatti e orari',
      address: 'Indirizzo',
      phone: 'Telefono',
      hours: 'Orari',
      call: 'Chiama',
      directions: 'Apri la mappa',
      whatsapp: 'Scrivici su WhatsApp',
      footerRights: 'Tutti i diritti riservati',
      staffArea: 'Area riservata',
      waBooking: 'Buongiorno, sono {name}. Vorrei prenotare un tavolo. Data: {date}, ore: {time}, persone: {guests}.{notes}',
      notesPrefix: ' Note: '
    },
    en: {
      pageTitle: 'Da Marinelli — Menu',
      brandTag: 'Pizzeria and bar',
      heroLine: 'Agerola fior di latte, San Marzano tomatoes and fried pizzas.',
      bookCta: 'Book a table',
      bookShort: 'Book',
      allergensCta: 'Allergens',
      langLabel: 'Language',
      searchLabel: 'Search the menu',
      searchPh: 'Search a dish or an ingredient',
      clearSearch: 'Clear search',
      navLabel: 'Menu categories',
      all: 'All',
      noResults: 'No dishes found. Try another search.',
      from: 'from',
      onRequest: 'on request',
      unavailable: 'Unavailable',
      cover: 'Cover charge',
      frozenNote: 'Products marked with an asterisk (*) may be frozen or deep-frozen at source.',
      allergenNote: 'The numbers indicate the allergens present in the products. Please ask our staff for more information.',
      allergensTitle: 'Allergens and storage',
      close: 'Close',
      toTop: 'Back to top',
      bookTitle: 'Book a table',
      bookSub: 'Leave your details and we will get back to you to confirm the booking.',
      fName: 'Full name',
      fPhone: 'Phone',
      fDate: 'Date',
      fTime: 'Time',
      fGuests: 'Guests',
      fNotes: 'Notes (allergies, high chair…)',
      fSubmit: 'Send request',
      errRequired: 'Please fill in all required fields.',
      errPhone: 'Please enter a valid phone number.',
      errDate: 'Please choose a date from today onwards.',
      errGuests: 'Invalid number of guests (maximum {max}). For larger groups, please call us.',
      okTitle: 'Request sent',
      okText: 'We have received your request: the restaurant will contact you to confirm.',
      okWa: 'Also send via WhatsApp',
      okAgain: 'New request',
      bookingsOff: 'To book a table, please contact us directly.',
      infoTitle: 'Contact and opening hours',
      address: 'Address',
      phone: 'Phone',
      hours: 'Opening hours',
      call: 'Call',
      directions: 'Open the map',
      whatsapp: 'Message us on WhatsApp',
      footerRights: 'All rights reserved',
      staffArea: 'Staff area',
      waBooking: 'Hello, I am {name}. I would like to book a table. Date: {date}, time: {time}, guests: {guests}.{notes}',
      notesPrefix: ' Notes: '
    },
    de: {
      pageTitle: 'Da Marinelli — Speisekarte',
      brandTag: 'Pizzeria und Bar',
      heroLine: 'Fior di latte aus Agerola, San-Marzano-Tomaten und frittierte Pizzen.',
      bookCta: 'Tisch reservieren',
      bookShort: 'Reservieren',
      allergensCta: 'Allergene',
      langLabel: 'Sprache',
      searchLabel: 'Speisekarte durchsuchen',
      searchPh: 'Gericht oder Zutat suchen',
      clearSearch: 'Suche löschen',
      navLabel: 'Kategorien der Speisekarte',
      all: 'Alles',
      noResults: 'Keine Gerichte gefunden. Versuchen Sie eine andere Suche.',
      from: 'ab',
      onRequest: 'auf Anfrage',
      unavailable: 'Nicht verfügbar',
      cover: 'Gedeck',
      frozenNote: 'Mit Sternchen (*) gekennzeichnete Produkte können eingefroren oder am Ursprungsort tiefgefroren sein.',
      allergenNote: 'Die Zahlen kennzeichnen die in den Produkten enthaltenen Allergene. Für weitere Informationen fragen Sie bitte unser Personal.',
      allergensTitle: 'Allergene und Lagerung',
      close: 'Schließen',
      toTop: 'Nach oben',
      bookTitle: 'Tisch reservieren',
      bookSub: 'Hinterlassen Sie Ihre Daten – wir melden uns zur Bestätigung der Reservierung.',
      fName: 'Vor- und Nachname',
      fPhone: 'Telefon',
      fDate: 'Datum',
      fTime: 'Uhrzeit',
      fGuests: 'Personen',
      fNotes: 'Anmerkungen (Allergien, Kinderstuhl …)',
      fSubmit: 'Anfrage senden',
      errRequired: 'Bitte füllen Sie alle Pflichtfelder aus.',
      errPhone: 'Bitte geben Sie eine gültige Telefonnummer ein.',
      errDate: 'Bitte wählen Sie ein Datum ab heute.',
      errGuests: 'Ungültige Personenzahl (maximal {max}). Für größere Gruppen rufen Sie uns bitte an.',
      okTitle: 'Anfrage gesendet',
      okText: 'Wir haben Ihre Anfrage erhalten: Das Lokal meldet sich zur Bestätigung bei Ihnen.',
      okWa: 'Zusätzlich per WhatsApp senden',
      okAgain: 'Neue Anfrage',
      bookingsOff: 'Um einen Tisch zu reservieren, kontaktieren Sie uns bitte direkt.',
      infoTitle: 'Kontakt und Öffnungszeiten',
      address: 'Adresse',
      phone: 'Telefon',
      hours: 'Öffnungszeiten',
      call: 'Anrufen',
      directions: 'Karte öffnen',
      whatsapp: 'Schreiben Sie uns auf WhatsApp',
      footerRights: 'Alle Rechte vorbehalten',
      staffArea: 'Mitarbeiterbereich',
      waBooking: 'Guten Tag, mein Name ist {name}. Ich möchte einen Tisch reservieren. Datum: {date}, Uhrzeit: {time}, Personen: {guests}.{notes}',
      notesPrefix: ' Anmerkungen: '
    }
  };


  /* ---- Sloveno (SL): interfaccia pubblica. Dà del "voi" (vikanje), come in un locale ---- */
  UI.sl = {
    pageTitle: 'Da Marinelli — Jedilnik',
    brandTag: 'Picerija in bar',
    heroLine: 'Mocarela fior di latte iz Agerole, paradižnik San Marzano in ocvrte pice.',
    bookCta: 'Rezervirajte mizo',
    bookShort: 'Rezerviraj',
    allergensCta: 'Alergeni',
    langLabel: 'Jezik',
    searchLabel: 'Iskanje po jedilniku',
    searchPh: 'Poiščite jed ali sestavino',
    clearSearch: 'Počisti iskanje',
    navLabel: 'Kategorije jedilnika',
    all: 'Vse',
    noResults: 'Nobene jedi nismo našli. Poskusite z drugim iskanjem.',
    from: 'od',
    onRequest: 'na zahtevo',
    unavailable: 'Ni na voljo',
    cover: 'Kuvert',
    frozenNote: 'Izdelki, označeni z zvezdico (*), so lahko zamrznjeni ali ob izvoru globoko zamrznjeni.',
    allergenNote: 'Številke označujejo alergene, ki so prisotni v izdelkih. Za več informacij vprašajte osebje.',
    allergensTitle: 'Alergeni in shranjevanje',
    close: 'Zapri',
    toTop: 'Na vrh',
    bookTitle: 'Rezervirajte mizo',
    bookSub: 'Pustite svoje podatke, javili se vam bomo za potrditev rezervacije.',
    fName: 'Ime in priimek',
    fPhone: 'Telefon',
    fDate: 'Datum',
    fTime: 'Ura',
    fGuests: 'Število oseb',
    fNotes: 'Opombe (alergije, otroški stolček …)',
    fSubmit: 'Pošlji zahtevo',
    errRequired: 'Izpolnite vsa obvezna polja.',
    errPhone: 'Vnesite veljavno telefonsko številko.',
    errDate: 'Izberite datum od danes naprej.',
    errGuests: 'Neveljavno število oseb (največ {max}). Za večje skupine nas pokličite.',
    okTitle: 'Zahteva poslana',
    okText: 'Vašo zahtevo smo prejeli, lokal se vam bo oglasil za potrditev.',
    okWa: 'Pošlji tudi prek WhatsAppa',
    okAgain: 'Nova zahteva',
    bookingsOff: 'Za rezervacijo mize nas kontaktirajte neposredno.',
    infoTitle: 'Kontakt in delovni čas',
    address: 'Naslov',
    phone: 'Telefon',
    hours: 'Delovni čas',
    call: 'Pokličite',
    directions: 'Odpri zemljevid',
    whatsapp: 'Pišite nam na WhatsApp',
    footerRights: 'Vse pravice pridržane',
    staffArea: 'Območje za zaposlene',
    waBooking: 'Dober dan, ime mi je {name}. Rezervirati želim mizo. Datum: {date}, ura: {time}, število oseb: {guests}.{notes}',
    notesPrefix: ' Opombe: '
  };

  function t(key, lang) {
    return (UI[lang] && UI[lang][key]) || UI.it[key] || key;
  }
  const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));


  /* ===================================================================
     TRADUZIONI SLOVENE dei dati di partenza (allergeni, categorie,
     ingredienti, piatti). Vengono applicate più sotto ai dati italiani,
     inglesi e tedeschi. I piatti aggiunti o modificati dalla dashboard
     hanno invece il loro campo "SL" modificabile a mano.
     =================================================================== */
  const SL = {
    // numero allergene: [nome breve, descrizione completa]
    alg: {
      1: ['Gluten', 'Žita, ki vsebujejo gluten, in izdelki iz njih (pšenica, rž, ječmen, oves, pira, kamut)'],
      2: ['Oreščki', 'Lupinasto sadje (oreščki) in izdelki iz njega (mandlji, lešniki, orehi, indijski oreščki, orehi pekan, brazilski oreščki, pistacije, makadamija)'],
      3: ['Raki', 'Raki in izdelki iz njih'],
      4: ['Jajca', 'Jajca in izdelki iz njih'],
      5: ['Ribe', 'Ribe in izdelki iz njih'],
      6: ['Arašidi', 'Arašidi in izdelki iz njih'],
      7: ['Soja', 'Soja in izdelki iz nje'],
      8: ['Mleko', 'Mleko in izdelki iz njega'],
      9: ['Zelena', 'Zelena in izdelki iz nje'],
      10: ['Gorčica', 'Gorčica in izdelki iz nje'],
      11: ['Sezam', 'Sezamovo seme in izdelki iz njega'],
      12: ['Sulfiti', 'Žveplov dioksid in sulfiti v koncentracijah nad 10 mg/kg'],
      13: ['Volčji bob', 'Volčji bob in izdelki iz njega'],
      14: ['Mehkužci', 'Mehkužci in izdelki iz njih']
    },
    cat: {
      antipasti: 'Predjedi', classiche: 'Klasične pice', speciali: 'Posebne pice', aggiunte: 'Dodatki',
      fritte: 'Ocvrte pice', panuozzo: 'Panuozzo',
      primi_terra: 'Prve jedi – s kopnega', primi_mare: 'Prve jedi – iz morja',
      secondi_terra: 'Glavne jedi – s kopnega', secondi_mare: 'Glavne jedi – iz morja',
      contorni: 'Priloge', bibite: 'Pijače', birre: 'Točeno pivo', vini: 'Vina',
      caffetteria: 'Kava', dolci: 'Sladice', digestivi: 'Likerji in amari'
    },
    group: {
      antipasti: 'Predjedi', classiche: 'Klasične pice', speciali: 'Posebne pice', fritte: 'Ocvrte pice',
      panuozzo: 'Panuozzo', primi: 'Prve jedi', secondi: 'Glavne jedi', contorni: 'Priloge',
      bevande: 'Pijače', caffe: 'Kava in sladice'
    },
    ing: {
      evo: 'Ekstra deviško oljčno olje',
      fior: 'Mocarela fior di latte iz Agerole',
      pom: 'Paradižnik San Marzano',
      pomOmbra: 'Kanček paradižnika San Marzano',
      pomodorini: 'Češnjevi paradižniki',
      basilico: 'Bazilika',
      origano: 'Origano',
      aglio: 'Česen',
      scarola: 'Endivija (začinjena z oljem, olivami in česnom)',
      provolaAff: 'Dimljena provola',
      prosCotto: 'Kuhana šunka',
      prosCrudo: 'Pršut',
      funghi: 'Šampinjoni',
      oliveNere: 'Črne olive',
      oliveVerd: 'Črne olive (zelenjava je začinjena)',
      carciofi: 'Artičoke',
      cicoli: 'Ocvirki',
      ricotta: 'Rikota (začinjena s soljo, oljem, poprom in baziliko)',
      ricottaC: 'Rikota (začinjena)',
      pepe: 'Poper',
      spianata: 'Salama spianata',
      spianataCal: 'Kalabrijska spianata (pikantna salama)',
      speck: 'Speck (dimljena šunka)',
      melFritte: 'Ocvrti jajčevci',
      melGrigl: 'Jajčevci na žaru (začinjeni)',
      melZucc: 'Jajčevci in bučke na žaru',
      peperoni: 'Paprike',
      mortadella: 'Mortadela s pistacijami',
      cremaPist: 'Pistacijeva krema',
      granellaPist: 'Sesekljane pistacije',
      salsiccia: 'Italijanska klobasa',
      friarielli: 'Friarielli (repni brokoli, začinjen)',
      cornRicotta: 'Rob pice, polnjen z začinjeno rikoto',
      bufala125: '125 g kampanijske bivolje mocarele v sredini pice',
      cornCrudo: 'Razrezan rob pice, polnjen s pršutom in bivoljo mocarelo',
      cremaZucc: 'Krema iz bučk (začinjena)',
      cremaFriar: 'Krema iz friariellov (začinjena)',
      pancetta: 'Hrustljava panceta',
      provolaBufC: '125 g kampanijske bivolje provole v sredini pice',
      provolaBuf: '125 g bivolje provole v sredini pice',
      panna: 'Smetana',
      crocche: 'Krompirjevi kroketi*',
      patFritte: 'Ocvrt krompirček*',
      patNovelle: 'Ocvrt mladi krompir*',
      wurstel: 'Hrenovke',
      acciughe: 'Inčuni',
      capperi: 'Kapre',
      tropea: 'Rdeča čebula iz Tropee',
      tonno: 'Rumenoplavuti tun',
      rucola: 'Rukola',
      scaglie: 'Lističi sira grana',
      brie: 'Brie',
      gorgonzola: 'Gorgonzola',
      edamer: 'Edamec',
      pizzaFritta: 'Ocvrta pica',
      pizzaFrittaRip: 'Ocvrta pica, dopečena v peči',
      grana: 'Sir grana',
      granaFine: 'Sir grana, dodan po peki',
      salameNapoli: 'Salama Napoli'
    },
    // id del piatto: { desc: descrizione, labels: etichette dei prezzi, nell'ordine }
    items: {
      'ant-marinelli': { desc: 'Bruschetta s češnjevimi paradižniki, krompirjev kroket, frittatina (ocvrte testeninske kroglice), arancino (riževa kroglica), zeppoline (ocvrte kroglice iz testa) in 125 g bivolje mocarele.' },
      'ant-bruschette': { labels: ['S češnjevimi paradižniki', 'S kremo iz friariellov in provolo', 'S panceto in kremo iz bučk'] },
      'ant-sfizioso': { desc: 'Bruschetta s češnjevimi paradižniki, mesna kroglica*, piščančji koščki*, pikantna piščančja krilca*, zelenjava v testu*, jalapeño* (polnjen s sirom) in zeppoline (ocvrte kroglice iz testa).' },
      'ant-newyork': { desc: 'Hrenovke in ocvrt krompirček*.' },
      'pa-panuozzo': { desc: 'Za nadeve vprašajte osebje.' },
      'pm-gamberoni': { desc: 'Špageti z velikimi kozicami in klapavicami' },
      'pm-vongole': { desc: 'Špageti s školjkami vongole' },
      'pm-cozze': { desc: 'Špageti s klapavicami' },
      'pm-scoglio': { desc: 'Špageti z morskimi sadeži' },
      'st-bistecca': { desc: 'Svinjski kare.' },
      'st-cotoletta': { desc: 'Panirani zrezek po milansko' },
      'st-caprese': { desc: 'Z bivoljo mocarelo.' },
      'sm-calamarifritti': { desc: 'Ocvrti lignji' },
      'sm-calamaro': { desc: 'Lignji na žaru' },
      'sm-gamberoni': { desc: 'Velike kozice na žaru (5 kosov)' },
      'sm-spada': { desc: 'Mečarica in velike kozice' },
      'co-verde': { desc: 'Zelena solata' },
      'co-grigliate': { desc: 'Zelenjava na žaru' },
      'co-mista': { desc: 'Mešana solata' },
      'co-patate': { desc: 'Ocvrt krompirček' },
      'bi-acqua': { desc: 'Mineralna voda' },
      'bi-vetro': { desc: 'Coca-Cola, Coca-Cola 0, Fanta, ledeni čaj in Sprite (v steklenici).' },
      'bi-birrabott': { desc: 'Za izbiro vprašajte osebje.' },
      'vi-bianco': { desc: 'Hišno vino: Scolaris, San Lorenzo Isontino.', labels: ['Kozarec', 'Pol litra', 'Liter'] },
      'vi-rosso': { desc: 'Hišno vino: Scolaris, San Lorenzo Isontino.', labels: ['Kozarec', 'Pol litra', 'Liter'] },
      'do-dolci': { desc: 'Vprašajte osebje (tudi glede alergenov).' },
      'do-sorbetto': { desc: 'Za okus vprašajte osebje.' }
    }
  };

  /* ===================================================================
     3. ALLERGENI, CATEGORIE, GRUPPI
     =================================================================== */
  const ALLERGENS = [
    { n: 1, short: T('Glutine', 'Gluten', 'Gluten'),
      full: T('Cereali contenenti glutine e prodotti derivati (grano, segale, orzo, avena, farro, kamut)',
              'Cereals containing gluten and derived products (wheat, rye, barley, oats, spelt, kamut)',
              'Glutenhaltiges Getreide und daraus hergestellte Erzeugnisse (Weizen, Roggen, Gerste, Hafer, Dinkel, Kamut)') },
    { n: 2, short: T('Frutta a guscio', 'Tree nuts', 'Schalenfrüchte'),
      full: T('Frutta a guscio e loro prodotti (mandorle, nocciole, noci, noci di acagiù, noci pecan, noci del Brasile, pistacchi, noci macadamia)',
              'Tree nuts and derived products (almonds, hazelnuts, walnuts, cashews, pecans, Brazil nuts, pistachios, macadamia nuts)',
              'Schalenfrüchte und daraus hergestellte Erzeugnisse (Mandeln, Haselnüsse, Walnüsse, Cashewnüsse, Pecannüsse, Paranüsse, Pistazien, Macadamianüsse)') },
    { n: 3, short: T('Crostacei', 'Crustaceans', 'Krebstiere'),
      full: T('Crostacei e prodotti a base di crostacei', 'Crustaceans and products thereof', 'Krebstiere und daraus hergestellte Erzeugnisse') },
    { n: 4, short: T('Uova', 'Eggs', 'Eier'),
      full: T('Uova e prodotti a base di uova', 'Eggs and products thereof', 'Eier und daraus hergestellte Erzeugnisse') },
    { n: 5, short: T('Pesce', 'Fish', 'Fisch'),
      full: T('Pesce e prodotti a base di pesce', 'Fish and products thereof', 'Fisch und daraus hergestellte Erzeugnisse') },
    { n: 6, short: T('Arachidi', 'Peanuts', 'Erdnüsse'),
      full: T('Arachidi e prodotti a base di arachidi', 'Peanuts and products thereof', 'Erdnüsse und daraus hergestellte Erzeugnisse') },
    { n: 7, short: T('Soia', 'Soy', 'Soja'),
      full: T('Soia e prodotti a base di soia', 'Soy and products thereof', 'Soja und daraus hergestellte Erzeugnisse') },
    { n: 8, short: T('Latte', 'Milk', 'Milch'),
      full: T('Latte e prodotti a base di latte', 'Milk and products thereof', 'Milch und daraus hergestellte Erzeugnisse') },
    { n: 9, short: T('Sedano', 'Celery', 'Sellerie'),
      full: T('Sedano e prodotti a base di sedano', 'Celery and products thereof', 'Sellerie und daraus hergestellte Erzeugnisse') },
    { n: 10, short: T('Senape', 'Mustard', 'Senf'),
      full: T('Senape e prodotti a base di senape', 'Mustard and products thereof', 'Senf und daraus hergestellte Erzeugnisse') },
    { n: 11, short: T('Sesamo', 'Sesame', 'Sesam'),
      full: T('Semi di sesamo e prodotti a base di sesamo', 'Sesame seeds and products thereof', 'Sesamsamen und daraus hergestellte Erzeugnisse') },
    { n: 12, short: T('Solfiti', 'Sulphites', 'Sulfite'),
      full: T('Solfiti in concentrazioni superiori a 10 mg/kg', 'Sulphites at concentrations above 10 mg/kg', 'Sulfite in Konzentrationen von mehr als 10 mg/kg') },
    { n: 13, short: T('Lupini', 'Lupin', 'Lupinen'),
      full: T('Lupini e prodotti a base di lupini', 'Lupin and products thereof', 'Lupinen und daraus hergestellte Erzeugnisse') },
    { n: 14, short: T('Molluschi', 'Molluscs', 'Weichtiere'),
      full: T('Molluschi e prodotti a base di molluschi', 'Molluscs and products thereof', 'Weichtiere und daraus hergestellte Erzeugnisse') }
  ];
  ALLERGENS.forEach((a) => { a.short.sl = SL.alg[a.n][0]; a.full.sl = SL.alg[a.n][1]; });
  const allergen = (n) => ALLERGENS[n - 1];

  // Categorie (le "sezioni" interne del menù). sub:false = nessun sottotitolo.
  const CATEGORIES = {
    antipasti:     { name: T('Antipasti', 'Starters', 'Vorspeisen') },
    classiche:     { name: T('Pizze Classiche', 'Classic Pizzas', 'Klassische Pizzen'), sub: false },
    speciali:      { name: T('Pizze Speciali', 'Special Pizzas', 'Spezialpizzen'), sub: false },
    aggiunte:      { name: T('Aggiunte', 'Extras', 'Extras') },
    fritte:        { name: T('Pizze Fritte', 'Fried Pizzas', 'Frittierte Pizzen') },
    panuozzo:      { name: T('Panuozzo', 'Panuozzo', 'Panuozzo') },
    primi_terra:   { name: T('Primi di Terra', 'First Courses – Land', 'Erste Gänge – Land') },
    primi_mare:    { name: T('Primi di Mare', 'First Courses – Sea', 'Erste Gänge – Meer') },
    secondi_terra: { name: T('Secondi di Terra', 'Main Courses – Land', 'Hauptgerichte – Land') },
    secondi_mare:  { name: T('Secondi di Mare', 'Main Courses – Sea', 'Hauptgerichte – Meer') },
    contorni:      { name: T('Contorni', 'Side Dishes', 'Beilagen') },
    bibite:        { name: T('Bibite', 'Drinks', 'Getränke') },
    birre:         { name: T('Birra alla Spina', 'Draught Beer', 'Fassbier') },
    vini:          { name: T('Vini', 'Wines', 'Weine') },
    caffetteria:   { name: T('Caffetteria', 'Coffee', 'Kaffee') },
    dolci:         { name: T('Dolci', 'Desserts', 'Desserts') },
    digestivi:     { name: T('Liquori e Amari', 'Liqueurs and Amari', 'Liköre und Amari') }
  };

  // Gruppi = voci della barra di navigazione in alto
  const GROUPS = [
    { id: 'antipasti', name: T('Antipasti', 'Starters', 'Vorspeisen'), cats: ['antipasti'] },
    { id: 'classiche', name: T('Pizze Classiche', 'Classic Pizzas', 'Klassische Pizzen'), cats: ['classiche', 'aggiunte'] }, // le Aggiunte compaiono sotto le classiche...
    { id: 'speciali',  name: T('Pizze Speciali', 'Special Pizzas', 'Spezialpizzen'), cats: ['speciali', 'aggiunte'] }, // ...e sotto le speciali
    { id: 'fritte',    name: T('Pizze Fritte', 'Fried Pizzas', 'Frittierte Pizzen'), cats: ['fritte'] },
    { id: 'panuozzo',  name: T('Panuozzo', 'Panuozzo', 'Panuozzo'), cats: ['panuozzo'] },
    { id: 'primi',     name: T('Primi', 'First Courses', 'Erste Gänge'), cats: ['primi_terra', 'primi_mare'] },
    { id: 'secondi',   name: T('Secondi', 'Main Courses', 'Hauptgerichte'), cats: ['secondi_terra', 'secondi_mare'] },
    { id: 'contorni',  name: T('Contorni', 'Sides', 'Beilagen'), cats: ['contorni'] },
    { id: 'bevande',   name: T('Bevande', 'Drinks', 'Getränke'), cats: ['bibite', 'birre', 'vini'] },
    { id: 'caffe',     name: T('Caffè e Dolci', 'Coffee and Desserts', 'Kaffee und Desserts'), cats: ['caffetteria', 'dolci', 'digestivi'] }
  ];

  // Ordine delle categorie nella dashboard (ognuna una volta sola, anche se compare in più gruppi)
  const CAT_ORDER = ['antipasti', 'classiche', 'speciali', 'aggiunte', 'fritte', 'panuozzo', 'primi_terra', 'primi_mare',
    'secondi_terra', 'secondi_mare', 'contorni', 'bibite', 'birre', 'vini', 'caffetteria', 'dolci', 'digestivi'];

  Object.keys(CATEGORIES).forEach((k) => { CATEGORIES[k].name.sl = SL.cat[k]; });
  GROUPS.forEach((g) => { g.name.sl = SL.group[g.id]; });

  /* ===================================================================
     4. DATI DI PARTENZA DEL MENÙ
     Nomi e prezzi sono quelli del menù cartaceo. Gli ingredienti sono
     composti da un piccolo "dizionario" (ING) così le tre lingue restano
     coerenti. Una volta salvati in localStorage diventano testo libero
     modificabile da admin.html.
     =================================================================== */
  const ING = {
    evo: T('Olio EVO', 'Extra virgin olive oil', 'Natives Olivenöl extra'),
    fior: T('Fior di latte di Agerola', 'Agerola fior di latte mozzarella', 'Fior-di-Latte-Mozzarella aus Agerola'),
    pom: T('Pomodoro S. Marzano', 'San Marzano tomato', 'San-Marzano-Tomaten'),
    pomOmbra: T('All’ombra di pomodoro S. Marzano', 'A hint of San Marzano tomato', 'Mit einem Hauch San-Marzano-Tomate'),
    pomodorini: T('Pomodorini ciliegini', 'Cherry tomatoes', 'Kirschtomaten'),
    basilico: T('Basilico', 'Basil', 'Basilikum'),
    origano: T('Origano', 'Oregano', 'Oregano'),
    aglio: T('Aglio', 'Garlic', 'Knoblauch'),
    scarola: T('Scarola (condita con olio, olive e aglio)', 'Escarole (dressed with oil, olives and garlic)', 'Endivie (mit Öl, Oliven und Knoblauch angemacht)'),
    provolaAff: T('Provola affumicata', 'Smoked provola cheese', 'Geräucherter Provola-Käse'),
    prosCotto: T('Prosciutto cotto', 'Cooked ham', 'Kochschinken'),
    prosCrudo: T('Prosciutto crudo', 'Cured ham (prosciutto crudo)', 'Rohschinken (Prosciutto crudo)'),
    funghi: T('Funghi champignon', 'Button mushrooms', 'Champignons'),
    oliveNere: T('Olive nere', 'Black olives', 'Schwarze Oliven'),
    oliveVerd: T('Olive nere (le verdure sono condite)', 'Black olives (the vegetables are dressed)', 'Schwarze Oliven (das Gemüse ist angemacht)'),
    carciofi: T('Carciofi', 'Artichokes', 'Artischocken'),
    cicoli: T('Cicoli', 'Pork cracklings (cicoli)', 'Schweinegrieben (Cicoli)'),
    ricotta: T('Ricotta (condita con sale, olio, pepe e basilico)', 'Ricotta (seasoned with salt, oil, pepper and basil)', 'Ricotta (mit Salz, Öl, Pfeffer und Basilikum gewürzt)'),
    ricottaC: T('Ricotta (condita)', 'Ricotta (seasoned)', 'Ricotta (gewürzt)'),
    pepe: T('Pepe', 'Pepper', 'Pfeffer'),
    spianata: T('Spianata', 'Spianata salami', 'Spianata-Salami'),
    spianataCal: T('Spianata calabra', 'Calabrian spianata (spicy salami)', 'Kalabrische Spianata (scharfe Salami)'),
    speck: T('Speck', 'Speck (smoked ham)', 'Speck'),
    melFritte: T('Melanzane fritte', 'Fried aubergines', 'Frittierte Auberginen'),
    melGrigl: T('Melanzane grigliate (condite)', 'Grilled aubergines (dressed)', 'Gegrillte Auberginen (angemacht)'),
    melZucc: T('Melanzane e zucchine alla griglia', 'Grilled aubergines and courgettes', 'Gegrillte Auberginen und Zucchini'),
    peperoni: T('Peperoni', 'Peppers', 'Paprika'),
    mortadella: T('Mortadella con pistacchio', 'Mortadella with pistachio', 'Mortadella mit Pistazien'),
    cremaPist: T('Crema di pistacchio', 'Pistachio cream', 'Pistaziencreme'),
    granellaPist: T('Granella di pistacchio', 'Chopped pistachios', 'Pistaziensplitter'),
    salsiccia: T('Salsiccia', 'Italian sausage', 'Italienische Salsiccia'),
    friarielli: T('Friarielli (conditi)', 'Friarielli (broccoli rabe, dressed)', 'Friarielli (Stängelkohl, angemacht)'),
    cornRicotta: T('Cornicione ripieno di ricotta (condita)', 'Crust filled with ricotta (seasoned)', 'Pizzarand mit Ricotta gefüllt (gewürzt)'),
    bufala125: T('Bufala campana da 125 g messa al centro della pizza', '125 g Campanian buffalo mozzarella placed in the centre of the pizza', '125 g Büffelmozzarella aus Kampanien in der Mitte der Pizza'),
    cornCrudo: T('Cornicione tagliato e ripieno di prosciutto crudo e bufala', 'Crust cut open and filled with cured ham and buffalo mozzarella', 'Aufgeschnittener Pizzarand, gefüllt mit Rohschinken und Büffelmozzarella'),
    cremaZucc: T('Crema di zucchine (condita)', 'Courgette cream (seasoned)', 'Zucchinicreme (gewürzt)'),
    cremaFriar: T('Crema di friarielli (condita)', 'Friarielli cream (seasoned)', 'Friarielli-Creme (gewürzt)'),
    pancetta: T('Pancetta croccante', 'Crispy pancetta', 'Knusprige Pancetta'),
    provolaBufC: T('Provola di bufala campana da 125 g al centro della pizza', '125 g Campanian buffalo provola in the centre of the pizza', '125 g Büffel-Provola aus Kampanien in der Mitte der Pizza'),
    provolaBuf: T('Provola di bufala da 125 g al centro della pizza', '125 g buffalo provola in the centre of the pizza', '125 g Büffel-Provola in der Mitte der Pizza'),
    panna: T('Panna', 'Cream', 'Sahne'),
    crocche: T('Crocchè*', 'Potato croquettes*', 'Kartoffelkroketten*'),
    patFritte: T('Patate fritte*', 'French fries*', 'Pommes frites*'),
    patNovelle: T('Patate novelle fritte*', 'Fried new potatoes*', 'Frittierte neue Kartoffeln*'),
    wurstel: T('Würstel', 'Frankfurter sausage', 'Würstel'),
    acciughe: T('Acciughe', 'Anchovies', 'Sardellen'),
    capperi: T('Capperi', 'Capers', 'Kapern'),
    tropea: T('Cipolla di Tropea', 'Tropea red onion', 'Rote Zwiebel aus Tropea'),
    tonno: T('Tonno di pinna gialla', 'Yellowfin tuna', 'Gelbflossenthunfisch'),
    rucola: T('Rucola', 'Rocket', 'Rucola'),
    scaglie: T('Scaglie di grana', 'Grana cheese shavings', 'Grana-Späne'),
    brie: T('Brie', 'Brie', 'Brie'),
    gorgonzola: T('Gorgonzola', 'Gorgonzola', 'Gorgonzola'),
    edamer: T('Edamer', 'Edam', 'Edamer'),
    pizzaFritta: T('Pizza fritta', 'Fried pizza', 'Frittierte Pizza'),
    pizzaFrittaRip: T('Pizza fritta ripassata al forno', 'Fried pizza finished in the oven', 'Frittierte Pizza, im Ofen nachgebacken'),
    grana: T('Formaggio grana', 'Grana cheese', 'Grana-Käse'),
    granaFine: T('Formaggio grana a fine cottura', 'Grana cheese added after baking', 'Grana-Käse nach dem Backen'),
    salameNapoli: T('Salame Napoli', 'Napoli salami', 'Salame Napoli')
  };
  Object.keys(ING).forEach((k) => { ING[k].sl = SL.ing[k]; });

  // D(['evo','fior',...]) -> descrizione "A, B e C." in tutte le lingue.
  // Una voce non presente in ING viene usata così com'è in tutte le lingue.
  function D(keys) {
    const and = { it: ' e ', en: ' and ', de: ' und ', sl: ' in ' };
    const out = {};
    LANGS.forEach((l) => {
      let parts = keys.map((k) => (typeof k === 'object' ? (k[l] || k.en) : (ING[k] ? ING[k][l] : k)));
      // in sloveno, in un elenco, solo la prima voce ha la maiuscola
      if (l === 'sl') parts = parts.map((x, i) => (i ? x.charAt(0).toLowerCase() + x.slice(1) : x));
      out[l] = (parts.length > 1 ? parts.slice(0, -1).join(', ') + and[l] + parts[parts.length - 1] : parts[0]) + '.';
    });
    return out;
  }

  const $p = (v) => [{ label: null, value: v }];          // prezzo singolo
  const V = (label, value) => ({ label: label, value: value }); // prezzo con etichetta
  const NONE = T('', '', '');

  function mk(id, cat, name, desc, prices, allergens, extra) {
    return Object.assign({
      id: id,
      cat: cat,
      name: typeof name === 'string' ? N(name) : name,
      desc: desc || NONE,
      prices: prices || [],
      allergens: allergens || [],
      from: false,
      frozen: false,
      available: true
    }, extra || {});
  }
  const ASK = T('Chiedere al personale.', 'Please ask our staff.', 'Bitte beim Personal erfragen.', 'Vprašajte osebje.');

  const SEED = [
    /* ---------- ANTIPASTI ---------- */
    mk('ant-marinelli', 'antipasti', 'Marinelli',
      T('Bruschetta con pomodorini, crocchè, frittatina, arancino, zeppoline e bufala 125 g.',
        'Bruschetta with cherry tomatoes, potato croquette, frittatina (fried pasta bites), arancino (rice ball), zeppoline (fried dough balls) and 125 g buffalo mozzarella.',
        'Bruschetta mit Kirschtomaten, Kartoffelkroketten, Frittatina (frittierte Nudelbällchen), Arancino (Reisbällchen), Zeppoline (frittierte Teigbällchen) und 125 g Büffelmozzarella.'),
      $p(15), [1, 4, 8]),
    mk('ant-bruschette', 'antipasti', 'Bruschette Varie', null, [
      V(T('Con pomodorini', 'With cherry tomatoes', 'Mit Kirschtomaten'), 2),
      V(T('Con crema di friarielli e provola', 'With friarielli cream and provola', 'Mit Friarielli-Creme und Provola'), 2),
      V(T('Con pancetta e crema di zucchine', 'With pancetta and courgette cream', 'Mit Pancetta und Zucchinicreme'), 2)
    ], [1, 8]),
    mk('ant-sfizioso', 'antipasti', 'Sfizioso',
      T('Bruschetta con pomodorini, polpettina di carne*, bocconcini di pollo*, alette di pollo piccante*, verdure pastellate*, jalapeño* (ripieno di formaggio) e zeppoline.',
        'Bruschetta with cherry tomatoes, meatball*, chicken bites*, spicy chicken wings*, battered vegetables*, cheese-stuffed jalapeño* and zeppoline (fried dough balls).',
        'Bruschetta mit Kirschtomaten, Fleischbällchen*, Hähnchenhäppchen*, scharfen Hähnchenflügeln*, Gemüse im Backteig*, Jalapeño* (mit Käse gefüllt) und Zeppoline (frittierte Teigbällchen).'),
      $p(16.5), [1, 4, 8]),
    mk('ant-newyork', 'antipasti', 'New York',
      T('Würstel e patate fritte*.', 'Würstel and French fries*.', 'Würstel und Pommes frites*.'),
      $p(10), [1, 8]),

    /* ---------- PIZZE CLASSICHE ---------- */
    mk('pz-marinara', 'classiche', 'Marinara', D(['evo', 'pom', 'origano', 'aglio', 'basilico']), $p(5.5), [1]),
    mk('pz-margherita', 'classiche', 'Margherita', D(['evo', 'fior', 'pom', 'basilico']), $p(7), [1, 8]),
    mk('pz-diavola', 'classiche', 'Diavola', D(['evo', 'fior', 'pom', 'spianataCal', 'basilico']), $p(10), [1, 8]),
    mk('pz-siciliana', 'classiche', 'Siciliana', D(['evo', 'fior', 'pom', 'melFritte', 'basilico']), $p(9.5), [1, 8]),
    mk('pz-tropea', 'classiche', 'Tropea', D(['evo', 'fior', 'pom', 'tropea', 'tonno', 'basilico']), $p(10), [1, 5, 8]),
    mk('pz-romana', 'classiche', 'Romana', D(['evo', 'fior', 'pom', 'acciughe', 'capperi', 'basilico']), $p(10), [1, 5, 8]),
    mk('pz-primavera', 'classiche', 'Primavera', D(['evo', 'fior', 'pomodorini', 'rucola', 'prosCrudo', 'scaglie', 'basilico']), $p(12), [1, 8]),
    mk('pz-4formaggi', 'classiche', '4 Formaggi', D(['evo', 'fior', 'brie', 'gorgonzola', 'edamer', 'basilico']), $p(10), [1, 8]),
    mk('pz-ripieno', 'classiche', 'Ripieno al Forno', D(['evo', 'fior', 'pom', 'ricotta', 'prosCotto', 'funghi', 'basilico']), $p(11), [1, 8]),
    mk('pz-wurstel', 'classiche', 'Würstel e Patate', D(['evo', 'fior', 'wurstel', 'patFritte', 'basilico']), $p(10), [1, 8]),
    mk('pz-marinelli', 'classiche', 'Marinelli', D(['evo', 'fior', 'pom', 'pomodorini', 'prosCrudo', T('Bufala da 125 g messa al centro della pizza', '125 g buffalo mozzarella placed in the centre of the pizza', '125 g Büffelmozzarella in der Mitte der Pizza', '125 g bivolje mocarele v sredini pice'), 'basilico']), $p(14.5), [1, 8]),

    /* ---------- PIZZE SPECIALI ---------- */
    mk('pz-filetto', 'speciali', 'Filetto', D(['evo', 'fior', 'pomOmbra', 'pomodorini', 'basilico']), $p(9.5), [1, 8]),
    mk('pz-scarola', 'speciali', 'Scarola', D(['evo', 'fior', 'scarola', 'provolaAff', 'basilico']), $p(12), [1, 8]),
    mk('pz-capricciosa', 'speciali', 'Capricciosa', D(['evo', 'fior', 'pom', 'prosCotto', 'funghi', 'oliveNere', 'carciofi', 'basilico']), $p(11), [1, 8]),
    mk('pz-4stagioni', 'speciali', '4Stagioni', D(['evo', 'fior', 'pom', 'oliveNere', 'prosCotto', 'carciofi', 'funghi', 'basilico']), $p(11), [1, 8]),
    mk('pz-vesuvio', 'speciali', "O' Vesuvio", D(['evo', 'fior', 'pom', 'cicoli', 'ricotta', 'spianata', 'basilico']), $p(12), [1, 8]),
    mk('pz-altroadige', 'speciali', 'Altro Adige', D(['evo', 'fior', 'pom', 'speck', 'melGrigl', 'basilico']), $p(10.5), [1, 8]),
    mk('pz-ortolana', 'speciali', 'Ortolana', D(['evo', 'fior', 'melZucc', 'peperoni', 'oliveVerd', 'basilico']), $p(11.5), [1, 8]),
    mk('pz-mortadella', 'speciali', 'Mortadella e Pistacchio', D(['evo', 'fior', 'mortadella', 'cremaPist', 'granellaPist', 'basilico']), $p(11.5), [1, 2, 8]),
    mk('pz-salsiccia', 'speciali', 'Salsiccia e Friarielli', D(['evo', 'fior', 'salsiccia', 'friarielli', 'basilico']), $p(12), [1, 8]),
    mk('pz-regina', 'speciali', 'Regina', D(['evo', 'fior', 'pom', 'cornRicotta', 'basilico']), $p(11), [1, 8]),
    mk('pz-bufala', 'speciali', 'Bufala', D(['evo', 'fior', 'pom', 'bufala125', 'basilico']), $p(12), [1, 8]),
    mk('pz-anemecore', 'speciali', 'Aneme e Core', D(['evo', 'fior', 'pom', 'cornCrudo', 'basilico']), $p(15), [1, 8]),
    mk('pz-partenopea', 'speciali', 'Partenopea', D(['evo', 'fior', 'cremaZucc', 'pomodorini', 'pancetta', 'provolaBufC', 'basilico']), $p(16), [1, 8]),
    mk('pz-donciro', 'speciali', 'Don Ciro', D(['evo', 'fior', 'cremaFriar', 'salsiccia', 'provolaBuf', 'basilico']), $p(15), [1, 8]),
    mk('pz-marci', 'speciali', 'Marci', D(['evo', 'fior', 'speck', 'funghi', 'carciofi', 'oliveNere', 'basilico']), $p(14.5), [1, 8]),
    mk('pz-mery', 'speciali', 'Mery', D(['evo', 'fior', 'salsiccia', 'patFritte', 'basilico']), $p(11), [1, 8]),
    mk('pz-fiocco', 'speciali', 'Fiocco', D(['evo', 'fior', 'panna', 'crocche', 'prosCotto', 'basilico']), $p(13), [1, 8]),
    mk('pz-novella', 'speciali', 'Novella', D(['evo', 'fior', 'pancetta', 'patNovelle', 'funghi', 'basilico']), $p(13), [1, 8]),

    /* ---------- AGGIUNTE ---------- */
    mk('agg-bufala', 'aggiunte', 'Aggiunte di Bufala e Provola di Bufala', null, $p(5), [8]),
    mk('agg-varie', 'aggiunte', 'Ingredienti Vari Aggiunti', null, $p(1.5), []),

    /* ---------- PIZZE FRITTE ---------- */
    mk('fr-classica', 'fritte', 'Pizza Fritta Classica', D(['evo', 'fior', 'pom', 'ricotta', 'cicoli', 'pepe', 'basilico']), $p(12), [1, 8]),
    mk('fr-martina', 'fritte', 'Martina', D(['pizzaFrittaRip', 'pom', 'fior', 'grana', 'basilico']), $p(10), [1, 8]),
    mk('fr-rafe', 'fritte', "Rafe'", D(['pizzaFritta', 'fior', 'ricottaC', 'salameNapoli', 'prosCotto', 'basilico']), $p(11), [1, 8]),
    mk('fr-donnapatrizia', 'fritte', 'Donna Patrizia', D(['pizzaFrittaRip', 'pom', 'prosCotto', 'fior', 'granaFine', 'basilico']), $p(15), [1, 8]),

    /* ---------- PANUOZZO ---------- */
    mk('pa-panuozzo', 'panuozzo', 'Panuozzo',
      T('Chiedere al personale per le farciture.', 'Please ask our staff for the fillings.', 'Füllungen bitte beim Personal erfragen.'),
      $p(9), [1, 8], { from: true }),

    /* ---------- PRIMI DI TERRA ---------- */
    mk('pt-gnocchi', 'primi_terra', 'Gnocchi Sorrento', null, $p(12), [1, 8]),
    mk('pt-carbonara', 'primi_terra', 'Carbonara', null, $p(12), [1, 4, 8]),
    mk('pt-siciliana', 'primi_terra', 'Siciliana', null, $p(12), [1, 8]),
    mk('pt-scarpariello', 'primi_terra', 'Scarpariello', null, $p(12), [1, 8]),

    /* ---------- PRIMI DI MARE ---------- */
    mk('pm-gamberoni', 'primi_mare', 'Spaghetti Gamberoni e Cozze', T('', 'Spaghetti with king prawns and mussels', 'Spaghetti mit Riesengarnelen und Miesmuscheln'), $p(20), [1, 3, 14], { frozen: true }),
    mk('pm-vongole', 'primi_mare', 'Spaghetti alle Vongole', T('', 'Spaghetti with clams', 'Spaghetti mit Venusmuscheln'), $p(16), [1, 14], { frozen: true }),
    mk('pm-cozze', 'primi_mare', 'Spaghetti alle Cozze', T('', 'Spaghetti with mussels', 'Spaghetti mit Miesmuscheln'), $p(15), [1, 14], { frozen: true }),
    mk('pm-scoglio', 'primi_mare', 'Spaghetti allo Scoglio', T('', 'Spaghetti with mixed seafood', 'Spaghetti mit Meeresfrüchten'), $p(22), [1, 3, 5, 14], { frozen: true }),

    /* ---------- SECONDI DI TERRA ---------- */
    mk('st-bistecca', 'secondi_terra', 'Bistecca ai Ferri', T('Lonza.', 'Pork loin.', 'Schweinekarree.'), $p(12), []),
    mk('st-cotoletta', 'secondi_terra', 'Cotoletta alla Milanese', T('', 'Breaded cutlet, Milanese style', 'Paniertes Kotelett nach Mailänder Art'), $p(12), [1, 4], { frozen: true }),
    mk('st-caprese', 'secondi_terra', 'Caprese', T('Con bufala.', 'With buffalo mozzarella.', 'Mit Büffelmozzarella.'), $p(15), [8]),

    /* ---------- SECONDI DI MARE ---------- */
    mk('sm-calamarifritti', 'secondi_mare', 'Calamari Fritti', T('', 'Fried squid', 'Frittierte Calamari'), $p(16), [1, 14], { frozen: true }),
    mk('sm-calamaro', 'secondi_mare', 'Calamaro alla Griglia', T('', 'Grilled squid', 'Gegrillter Tintenfisch'), $p(16), [14], { frozen: true }),
    mk('sm-gamberoni', 'secondi_mare', 'Gamberoni alla Griglia 5pz', T('', 'Grilled king prawns (5 pieces)', 'Gegrillte Riesengarnelen (5 Stück)'), $p(18), [3], { frozen: true }),
    mk('sm-spada', 'secondi_mare', 'Spada e Gamberoni', T('', 'Swordfish and king prawns', 'Schwertfisch und Riesengarnelen'), $p(22), [3, 5], { frozen: true }),

    /* ---------- CONTORNI ---------- */
    mk('co-verde', 'contorni', 'Insalata Verde', T('', 'Green salad', 'Grüner Salat'), $p(4), []),
    mk('co-grigliate', 'contorni', 'Verdure Grigliate', T('', 'Grilled vegetables', 'Gegrilltes Gemüse'), $p(5), []),
    mk('co-mista', 'contorni', 'Insalata Mista', T('', 'Mixed salad', 'Gemischter Salat'), $p(6), []),
    mk('co-patate', 'contorni', 'Patate Fritte', T('', 'French fries', 'Pommes frites'), $p(5), [1], { frozen: true }),

    /* ---------- BIBITE ---------- */
    mk('bi-acqua', 'bibite', 'Acqua S. Benedetto', T('', 'Mineral water', 'Mineralwasser'), $p(3), []),
    mk('bi-vetro', 'bibite', 'Bibita in Vetro',
      T('Coca-Cola, Coca-Cola 0, Fanta, tè freddo e Sprite.', 'Coca-Cola, Coca-Cola 0, Fanta, iced tea and Sprite (glass bottle).', 'Coca-Cola, Coca-Cola 0, Fanta, Eistee und Sprite (Glasflasche).'),
      $p(3.5), []),
    mk('bi-birrabott', 'bibite', 'Birra in Bottiglia', T('Chiedere al personale.', 'Please ask our staff which beers we have.', 'Bitte beim Personal nach der Auswahl fragen.'), $p(4), [1]),

    /* ---------- BIRRA ALLA SPINA ---------- */
    mk('bi-poretti', 'birre', 'Birra Poretti', null, [V(N('0,40 l'), 5), V(N('0,20 l'), 3.5)], []),
    mk('bi-poretti-nf', 'birre', 'Birra Poretti Non Filtrata', null, [V(N('0,40 l'), 6), V(N('0,20 l'), 3.5)], []),

    /* ---------- VINI ---------- */
    mk('vi-bianco', 'vini', 'Vino Bianco',
      T('Vino della casa: Scolaris, San Lorenzo Isontino.', 'House wine: Scolaris, San Lorenzo Isontino.', 'Hauswein: Scolaris, San Lorenzo Isontino.'),
      [V(T('Calice', 'Glass', 'Glas'), 3), V(T('Mezzo litro', 'Half litre', 'Halber Liter'), 6.5), V(T('Un litro', 'One litre', 'Ein Liter'), 13)], []),
    mk('vi-rosso', 'vini', 'Vino Rosso',
      T('Vino della casa: Scolaris, San Lorenzo Isontino.', 'House wine: Scolaris, San Lorenzo Isontino.', 'Hauswein: Scolaris, San Lorenzo Isontino.'),
      [V(T('Calice', 'Glass', 'Glas'), 3), V(T('Mezzo litro', 'Half litre', 'Halber Liter'), 6.5), V(T('Un litro', 'One litre', 'Ein Liter'), 13)], []),
    mk('vi-bottiglia', 'vini', 'Vino in Bottiglia', ASK, $p(15), []),
    mk('vi-prosecco', 'vini', 'Prosecco Extra Dry', ASK, $p(17), []),

    /* ---------- CAFFETTERIA, DOLCI, LIQUORI ---------- */
    mk('ca-caffe', 'caffetteria', 'Caffè', null, $p(1.5), []),
    mk('ca-deca', 'caffetteria', 'Caffè Deca', null, $p(1.7), []),
    mk('ca-cappuccino', 'caffetteria', 'Cappuccino', null, $p(2.5), []),
    mk('do-dolci', 'dolci', 'Dolci',
      T('Chiedere al personale (anche per gli allergeni).', 'Please ask our staff (also about allergens).', 'Bitte beim Personal erfragen (auch zu Allergenen).'),
      $p(5), [], { from: true, frozen: true }),
    mk('do-sorbetto', 'dolci', 'Sorbetto',
      T('Chiedere al personale per il gusto.', 'Please ask our staff for the flavour.', 'Geschmacksrichtungen bitte beim Personal erfragen.'),
      $p(4), [1, 2, 4, 7, 8, 12]),
    mk('di-liquori', 'digestivi', 'Liquori', ASK, $p(2.5), [], { from: true }),
    mk('di-amari', 'digestivi', 'Amari', ASK, $p(3.5), [])
  ];

  // Traduzioni slovene dei piatti di partenza
  const SEED_BY_ID = {};
  SEED.forEach((item) => {
    SEED_BY_ID[item.id] = item;
    const p = SL.items[item.id];
    if (!p) return;
    if (p.desc) item.desc.sl = p.desc;
    if (p.labels) item.prices.forEach((pr, i) => { if (pr.label && p.labels[i]) pr.label.sl = p.labels[i]; });
  });

  const defaultMenu = () => clone(SEED);

  /* ===================================================================
     5. ACCESSO AI DATI
     =================================================================== */
  // INTERRUTTORE GENERALE delle prenotazioni online.
  // Lascialo false finché il sito non usa un database online: senza, le richieste inviate dai clienti
  // restano nel loro telefono e al locale non arrivano. Con false il menù mostra solo Chiama / WhatsApp.
  const ONLINE_BOOKINGS = false;
  const bookingsOpen = (settings) => ONLINE_BOOKINGS && settings.bookingsEnabled !== false;

  const DEFAULT_PIN = '1234';
  const DEFAULT_SETTINGS = {
    phone: '+39 331 717 7998',
    whatsapp: '',                 // solo cifre con prefisso internazionale, es. 393331234567
    email: '',
    address: 'Piazza della Repubblica 21, Monfalcone (GO)',
    mapUrl: '',                   // facoltativo: link Google Maps
    hours: T('Orari da inserire nell’area riservata.', 'Opening hours to be added in the staff area.', 'Öffnungszeiten im Mitarbeiterbereich einzutragen.', 'Delovni čas vnesite v območju za zaposlene.'),
    coperto: 2.5,
    maxGuests: 20,
    bookingsEnabled: true,
    pinHash: ''                   // vuoto = PIN predefinito (1234)
  };

  function normLang(o) {
    o = o || {};
    return { it: o.it || '', en: o.en || '', de: o.de || '', sl: o.sl || '' };
  }

  function normalizeItem(i) {
    return {
      id: i.id || uid(),
      cat: CATEGORIES[i.cat] ? i.cat : 'speciali',
      name: normLang(i.name),
      desc: normLang(i.desc),
      prices: (i.prices || [])
        .map((p) => ({
          label: p.label && (p.label.it || p.label.en || p.label.de || p.label.sl) ? normLang(p.label) : null,
          value: Number(p.value)
        }))
        .filter((p) => isFinite(p.value)),
      from: !!i.from,
      frozen: !!i.frozen,
      available: i.available !== false,
      allergens: (i.allergens || []).map(Number).filter((n) => n >= 1 && n <= 14)
    };
  }

  function getMenu() {
    const saved = storage.get(KEYS.menu, null);
    const fresh = saved && Array.isArray(saved.items) && saved.version === MENU_VERSION;
    const items = fresh ? saved.items : defaultMenu();
    return items.map(normalizeItem).map(backfillSl);
  }
  // Piatti salvati prima dell'arrivo dello sloveno: se il testo italiano è ancora quello originale,
  // aggiunge la traduzione slovena senza toccare le tue modifiche.
  function backfillSl(i) {
    const s = SEED_BY_ID[i.id];
    if (!s) return i;
    if (!i.name.sl && i.name.it === s.name.it) i.name.sl = s.name.sl;
    if (!i.desc.sl && i.desc.it === s.desc.it) i.desc.sl = s.desc.sl;
    i.prices.forEach((p, k) => {
      const sp = s.prices[k];
      if (p.label && !p.label.sl && sp && sp.label && p.label.it === sp.label.it) p.label.sl = sp.label.sl;
    });
    return i;
  }
  function saveMenu(items) {
    return storage.set(KEYS.menu, { version: MENU_VERSION, items: items.map(normalizeItem) });
  }
  function resetMenu() {
    return saveMenu(defaultMenu());
  }

  function getBookings() {
    const list = storage.get(KEYS.bookings, []);
    return Array.isArray(list) ? list : [];
  }
  function saveBookings(list) {
    return storage.set(KEYS.bookings, list);
  }

  function getSettings() {
    const saved = storage.get(KEYS.settings, {}) || {};
    const out = Object.assign({}, DEFAULT_SETTINGS, saved);
    // Se gli orari sono già stati salvati, un campo vuoto resta vuoto (si mostra l'italiano) invece del segnaposto
    out.hours = Object.assign({}, saved.hours ? { it: '', en: '', de: '', sl: '' } : DEFAULT_SETTINGS.hours, saved.hours || {});
    return out;
  }
  function saveSettings(s) {
    return storage.set(KEYS.settings, s);
  }

  function checkPin(pin) {
    const s = getSettings();
    const expected = s.pinHash || hashPin(DEFAULT_PIN);
    return hashPin(pin) === expected;
  }
  function setPin(pin) {
    const s = getSettings();
    s.pinHash = hashPin(pin);
    return saveSettings(s);
  }
  function isDefaultPin() {
    return !getSettings().pinHash;
  }

  function getLang() {
    const l = storage.get(KEYS.lang, 'it');
    return LANGS.indexOf(l) >= 0 ? l : 'it';
  }
  function setStoredLang(l) {
    storage.set(KEYS.lang, l);
  }

  // Normalizza un numero per i link wa.me (default prefisso Italia)
  function waNumber(phone) {
    let d = String(phone || '').replace(/[^\d+]/g, '');
    if (d.indexOf('+') === 0) return d.slice(1).replace(/\D/g, '');
    d = d.replace(/\D/g, '');
    if (d.indexOf('00') === 0) return d.slice(2);
    if (d.length >= 9 && d.length <= 10 && d.charAt(0) === '3') return '39' + d;
    return d;
  }

  window.MarinelliCore = {
    LANGS, LOCALES, KEYS, UI, ALLERGENS, CATEGORIES, GROUPS, CAT_ORDER, SEED,
    DEFAULT_SETTINGS, DEFAULT_PIN, ONLINE_BOOKINGS, bookingsOpen,
    T, N, esc, tr, t, fmt, uid, clone, todayISO, formatPrice, hashPin, waNumber, allergen,
    getMenu, saveMenu, resetMenu, defaultMenu,
    getBookings, saveBookings,
    getSettings, saveSettings,
    checkPin, setPin, isDefaultPin,
    getLang, setStoredLang, normalizeItem,
    storage
  };

  /* ===================================================================
     6. MENÙ PUBBLICO (index.html)
     =================================================================== */
  function initPublic() {
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

    const state = {
      lang: getLang(),
      group: 'all',
      query: '',
      items: getMenu(),
      settings: getSettings()
    };
    const L = () => state.lang;
    const tt = (k) => t(k, state.lang);

    const el = {
      menu: $('#menu'),
      empty: $('#empty'),
      chips: $('#chips'),
      chipsWrap: $('#chips-wrap'),
      topbar: $('#topbar'),
      q: $('#q'),
      qClear: $('#q-clear'),
      cover: $('#cover-price'),
      algDialog: $('#alg-dialog'),
      algList: $('#alg-list'),
      toTop: $('#to-top')
    };

    /* ---------- testi statici ---------- */
    function applyStatic() {
      document.documentElement.lang = state.lang;
      document.title = tt('pageTitle');
      $$('[data-i18n]').forEach((n) => { n.textContent = tt(n.getAttribute('data-i18n')); });
      $$('[data-i18n-ph]').forEach((n) => { n.setAttribute('placeholder', tt(n.getAttribute('data-i18n-ph'))); });
      $$('[data-i18n-aria]').forEach((n) => { n.setAttribute('aria-label', tt(n.getAttribute('data-i18n-aria'))); });
      $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === state.lang)));
      el.cover.textContent = formatPrice(state.settings.coperto, state.lang);
    }

    /* ---------- ricerca ---------- */
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    function matches(item, q) {
      if (!q) return true;
      const hay = norm(tr(item.name, L()) + ' ' + tr(item.desc, L()) + ' ' + tr(CATEGORIES[item.cat].name, L()) + ' ' + tr(item.name, 'it'));
      return q.split(/\s+/).every((tok) => hay.indexOf(tok) >= 0);
    }

    /* ---------- singolo piatto ---------- */
    function priceHtml(value, from) {
      return '<span class="price">' + (from ? '<small>' + esc(tt('from')) + '</small> ' : '') + esc(formatPrice(value, L())) + '</span>';
    }

    function dishHtml(i) {
      const name = tr(i.name, L());
      const desc = tr(i.desc, L());
      const prices = i.prices || [];
      const single = prices.length === 1 && !(prices[0].label && tr(prices[0].label, L()));
      let right = '';
      if (single) right = priceHtml(prices[0].value, i.from);
      else if (!prices.length) right = '<span class="price price--ask">' + esc(tt('onRequest')) + '</span>';

      const variants = !single && prices.length
        ? '<ul class="variants">' + prices.map((p) =>
            '<li><span>' + esc(tr(p.label, L())) + '</span><span class="leader" aria-hidden="true"></span>' + priceHtml(p.value, i.from) + '</li>'
          ).join('') + '</ul>'
        : '';

      const algs = i.allergens.length
        ? '<ul class="algs" aria-label="' + esc(tt('allergensCta')) + '">' + i.allergens.map((n) => {
            const a = allergen(n);
            return '<li><button type="button" class="alg" data-alg="' + n + '" title="' + esc(tr(a.full, L())) + '"><b>' + n + '</b>' + esc(tr(a.short, L())) + '</button></li>';
          }).join('') + '</ul>'
        : '';

      return '<li class="dish' + (i.available ? '' : ' is-off') + '" data-id="' + esc(i.id) + '">' +
        '<div class="dish-top"><h4 class="dish-name">' + esc(name) + (i.frozen ? '<span class="ast">*</span>' : '') + '</h4>' +
        (right ? '<span class="leader" aria-hidden="true"></span>' + right : '') + '</div>' +
        (desc ? '<p class="dish-desc">' + esc(desc) + '</p>' : '') +
        variants + algs +
        (i.available ? '' : '<p class="off-badge">' + esc(tt('unavailable')) + '</p>') +
        '</li>';
    }

    /* ---------- chip di navigazione ---------- */
    function renderChips() {
      const present = {};
      state.items.forEach((i) => { present[i.cat] = true; });
      const groups = GROUPS.filter((g) => g.cats.some((c) => present[c]));
      if (state.group !== 'all' && !groups.some((g) => g.id === state.group)) state.group = 'all';
      const list = [{ id: 'all', label: tt('all') }].concat(groups.map((g) => ({ id: g.id, label: tr(g.name, L()) })));
      el.chips.innerHTML = list.map((c) =>
        '<li><button type="button" class="chip" data-group="' + c.id + '" aria-pressed="' + (state.group === c.id) + '">' + esc(c.label) + '</button></li>'
      ).join('');
    }

    /* ---------- elenco ---------- */
    function renderMenu() {
      const q = norm(state.query).trim();
      let html = '';
      let total = 0;
      const shown = {};
      GROUPS.forEach((g) => {
        if (state.group !== 'all' && state.group !== g.id) return;
        let inner = '';
        g.cats.forEach((cid) => {
          const cat = CATEGORIES[cid];
          if (q && shown[cid]) return; // con una ricerca attiva, una categoria presente in più gruppi compare una volta sola
          const list = state.items.filter((i) => i.cat === cid && matches(i, q));
          if (!list.length) return;
          shown[cid] = true;
          total += list.length;
          const showSub = g.cats.length > 1 && cat.sub !== false;
          inner += (showSub ? '<h3 class="cat-title">' + esc(tr(cat.name, L())) + '</h3>' : '') +
            '<ul class="dishes">' + list.map(dishHtml).join('') + '</ul>';
        });
        if (inner) {
          html += '<section class="group" id="g-' + g.id + '"><h2 class="group-title">' + esc(tr(g.name, L())) + '</h2>' + inner + '</section>';
        }
      });
      el.menu.innerHTML = html;
      el.empty.hidden = total > 0;
    }

    function renderAll() {
      applyStatic();
      renderChips();
      renderMenu();
      renderContacts();
      renderBookingMode();
      renderAllergenList();
    }

    /* ---------- allergeni (finestra) ---------- */
    function renderAllergenList() {
      el.algList.innerHTML = ALLERGENS.map((a) =>
        '<li id="alg-' + a.n + '"><b>' + a.n + '</b><span>' + esc(tr(a.full, L())) + '</span></li>'
      ).join('');
    }
    function openDialog(d) {
      if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); }
      else d.setAttribute('open', '');
    }
    function closeDialog(d) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
    function openAllergens(n) {
      $$('#alg-list li').forEach((li) => li.classList.remove('is-hit'));
      openDialog(el.algDialog);
      if (n) {
        const hit = $('#alg-' + n);
        if (hit) { hit.classList.add('is-hit'); hit.scrollIntoView({ block: 'center' }); }
      }
    }

    /* ---------- contatti ---------- */
    function renderContacts() {
      const s = state.settings;
      const rows = [];
      const telHref = 'tel:' + String(s.phone).replace(/[^\d+]/g, '');
      rows.push('<div class="info-row"><dt>' + esc(tt('address')) + '</dt><dd>' + esc(s.address) + '</dd></div>');
      rows.push('<div class="info-row"><dt>' + esc(tt('phone')) + '</dt><dd><a href="' + esc(telHref) + '">' + esc(s.phone) + '</a></dd></div>');
      if (s.email) rows.push('<div class="info-row"><dt>Email</dt><dd><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a></dd></div>');
      rows.push('<div class="info-row"><dt>' + esc(tt('hours')) + '</dt><dd class="pre">' + esc(tr(s.hours, L())) + '</dd></div>');
      $('#contact-list').innerHTML = rows.join('');

      const mapHref = s.mapUrl || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.address);
      let actions = '<a class="btn btn--primary" href="' + esc(telHref) + '">' + esc(tt('call')) + '</a>';
      const wa = waNumber(s.whatsapp);
      if (wa) actions += '<a class="btn btn--outline" href="https://wa.me/' + wa + '" target="_blank" rel="noopener">WhatsApp</a>';
      actions += '<a class="btn btn--outline" href="' + esc(mapHref) + '" target="_blank" rel="noopener">' + esc(tt('directions')) + '</a>';
      $('#contact-actions').innerHTML = actions;

      const callOff = $('#book-off-call');
      if (callOff) callOff.setAttribute('href', telHref);
      const waOff = $('#book-off-wa');
      if (waOff) {
        waOff.hidden = !wa;
        if (wa) waOff.setAttribute('href', 'https://wa.me/' + wa);
      }
    }

    /* ---------- prenotazione ---------- */
    const form = $('#book-form');
    function renderBookingMode() {
      const on = bookingsOpen(state.settings);
      form.hidden = !on || !$('#book-ok').hidden;
      $('#book-sub').hidden = !on;
      $('#book-off').hidden = on;
      $('#b-guests').max = state.settings.maxGuests;
    }

    function showError(msg) {
      const e = $('#b-error');
      e.textContent = msg;
      e.hidden = false;
    }

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!bookingsOpen(state.settings)) return; // prenotazioni online spente
      $('#b-error').hidden = true;
      const name = $('#b-name').value.trim();
      const phone = $('#b-phone').value.trim();
      const date = $('#b-date').value;
      const time = $('#b-time').value;
      const guests = parseInt($('#b-guests').value, 10);
      const notes = $('#b-notes').value.trim();
      const max = state.settings.maxGuests || 20;

      if (!name || !phone || !date || !time || !guests) return showError(tt('errRequired'));
      if (phone.replace(/\D/g, '').length < 6 || !/^[+()\d\s.\-\/]+$/.test(phone)) return showError(tt('errPhone'));
      if (date < todayISO()) return showError(tt('errDate'));
      if (guests < 1 || guests > max) return showError(fmt(tt('errGuests'), { max: max }));

      const booking = {
        id: uid(), name: name, phone: phone, date: date, time: time, guests: guests, notes: notes,
        status: 'pending', source: 'online', lang: state.lang, createdAt: Date.now()
      };
      const list = getBookings();
      list.push(booking);
      saveBookings(list);

      // Messaggio WhatsApp pronto da inviare al locale (se configurato)
      const wa = waNumber(state.settings.whatsapp);
      const waBtn = $('#book-wa');
      if (wa) {
        const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString(LOCALES[L()], { weekday: 'long', day: 'numeric', month: 'long' });
        const msg = fmt(tt('waBooking'), {
          name: name, date: dateLabel, time: time, guests: guests, notes: notes ? tt('notesPrefix') + notes : ''
        });
        waBtn.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg);
        waBtn.hidden = false;
      } else {
        waBtn.hidden = true;
      }
      form.hidden = true;
      $('#book-ok').hidden = false;
      $('#book-ok').focus();
      form.reset();
      initBookingDefaults();
    });

    $('#book-again').addEventListener('click', () => {
      $('#book-ok').hidden = true;
      renderBookingMode();
      $('#b-name').focus();
    });

    function initBookingDefaults() {
      $('#b-date').min = todayISO();
      $('#b-date').value = todayISO();
      $('#b-time').value = '20:00';
      $('#b-guests').value = 2;
    }

    /* ---------- eventi ---------- */
    function setLang(l) {
      state.lang = l;
      setStoredLang(l);
      renderAll();
    }

    document.addEventListener('click', (ev) => {
      const langBtn = ev.target.closest('[data-lang]');
      if (langBtn) return setLang(langBtn.getAttribute('data-lang'));

      const chip = ev.target.closest('.chip');
      if (chip) {
        state.group = chip.getAttribute('data-group');
        renderChips();
        renderMenu();
        const active = $('.chip[aria-pressed="true"]', el.chips);
        if (active && active.scrollIntoView) active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        const top = el.menu.getBoundingClientRect().top + window.scrollY - el.topbar.offsetHeight - el.chipsWrap.offsetHeight - 12;
        if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
        return;
      }

      const alg = ev.target.closest('[data-alg]');
      if (alg) return openAllergens(parseInt(alg.getAttribute('data-alg'), 10));
      if (ev.target.closest('.js-open-alg')) return openAllergens();

      if (ev.target.closest('[data-close]')) return closeDialog(el.algDialog);
      if (ev.target === el.algDialog) return closeDialog(el.algDialog); // clic sullo sfondo
    });

    let timer;
    el.q.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.query = el.q.value;
        el.qClear.hidden = !state.query;
        renderMenu();
      }, 120);
    });
    el.qClear.addEventListener('click', () => {
      el.q.value = '';
      state.query = '';
      el.qClear.hidden = true;
      renderMenu();
      el.q.focus();
    });

    window.addEventListener('scroll', () => { el.toTop.hidden = window.scrollY < 700; }, { passive: true });
    el.toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Se l'area riservata modifica i dati in un'altra scheda, aggiorna subito
    window.addEventListener('storage', (e) => {
      if (e.key === KEYS.menu || e.key === KEYS.settings) {
        state.items = getMenu();
        state.settings = getSettings();
        renderAll();
      }
    });

    $('#year').textContent = new Date().getFullYear();
    initBookingDefaults();
    renderAll();
  }

  if (document.body && document.body.getAttribute('data-page') === 'menu') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPublic);
    else initPublic();
  }
})();
