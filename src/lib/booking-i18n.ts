/**
 * Booking confirmation + voucher translations.
 *
 * Owner ask (2026-09-10): a customer who books in their own language should
 * get the confirmation TWICE — once in English, once in their booking
 * language — each with a JetMeAway-branded PDF voucher in that language.
 *
 * Phase 1 ships the Latin-script European languages only. These render
 * cleanly in the PDF's standard Helvetica (WinAnsi) font, whose glyph set
 * covers their accents (é ñ ü ç à ï …). Non-Latin locales (ar, ur, hi, zh,
 * ja, ru) need an embedded font in the PDF and are deliberately NOT here yet
 * — `stringsFor()` falls back to English for anything unsupported, so an
 * unsupported booking language simply gets the English email only, exactly
 * as before. Nothing breaks; we just don't send a second email we can't
 * render.
 *
 * The dictionary is the single source of truth for BOTH the localized email
 * (src/app/success/page.tsx) and the localized voucher (src/lib/voucher.ts),
 * so a hotel's "Check-in" label reads identically in the email and on the PDF.
 */

export const VOUCHER_EMAIL_LOCALES = ['es', 'fr', 'de', 'nl', 'it', 'pt'] as const;
export type SupportedLocale = (typeof VOUCHER_EMAIL_LOCALES)[number];

export function isSupportedLocale(locale: string | null | undefined): locale is SupportedLocale {
  return !!locale && (VOUCHER_EMAIL_LOCALES as readonly string[]).includes(locale);
}

export interface BookingStrings {
  /** BCP-47 tag for Intl date formatting, e.g. "es-ES". */
  dateLocale: string;
  // Voucher + email shared labels
  voucherTitle: string;
  statusConfirmed: string;
  bookingRef: string;
  hotelReference: string;
  hotelConfirmation: string;
  hotelDetails: string;
  sectionStay: string;
  sectionGuests: string;
  sectionPayment: string;
  sectionCancellation: string;
  checkIn: string;
  checkOut: string;
  from: string;
  until: string;
  nights: string;
  room: string;
  meals: string;
  heldUnder: string;
  heldUnderHint: string;
  guests: string;
  totalPaid: string;
  payableAtHotel: string;
  payableHint: string;
  freeCancelUntil: string;
  goodToKnow: string;
  noteShowVoucher: string;
  noteLocalFees: (amount: string) => string;
  noteIdDeposit: string;
  supportLine: string;
  // Party words (simple concatenation — "2 adults + 1 child")
  adult: string;
  adults: string;
  child: string;
  children: string;
  guest: string;
  guestsWord: string;
  // Email-only
  emailSubject: (hotel: string) => string;
  emailConfirmedHeading: string;
  emailConfirmedSub: string;
  emailGreeting: (name: string) => string;
  emailIntro: (hotel: string, date: string) => string;
  getDirections: string;
  voucherAttached: string;
  questionsContact: string;
}

const EN: BookingStrings = {
  dateLocale: 'en-GB',
  voucherTitle: 'Hotel voucher',
  statusConfirmed: 'CONFIRMED',
  bookingRef: 'Booking reference',
  hotelReference: 'Hotel reference',
  hotelConfirmation: 'Hotel confirmation',
  hotelDetails: 'Hotel details',
  sectionStay: 'Your stay',
  sectionGuests: 'Guests',
  sectionPayment: 'Payment',
  sectionCancellation: 'Cancellation',
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  from: 'from',
  until: 'until',
  nights: 'Nights',
  room: 'Room',
  meals: 'Meals',
  heldUnder: 'Room held under',
  heldUnderHint: 'Show this name at reception — it is the name the hotel holds the room under.',
  guests: 'Guests',
  totalPaid: 'Total paid',
  payableAtHotel: 'Payable at the hotel',
  payableHint: 'City tax and local fees the property collects on arrival — not included above.',
  freeCancelUntil: 'Free cancellation until',
  goodToKnow: 'GOOD TO KNOW',
  noteShowVoucher: 'Show this voucher and the name above at reception - it is the name the hotel holds the room under.',
  noteLocalFees: (a) => `The property collects ${a} on arrival (city tax and local fees) - not included in the total paid.`,
  noteIdDeposit: 'Hotels may ask for photo ID and a card or cash deposit for incidentals. If you will arrive after 8pm, tell the hotel in advance so the room is not released.',
  supportLine: '24/7 stay support line',
  adult: 'adult', adults: 'adults', child: 'child', children: 'children', guest: 'guest', guestsWord: 'guests',
  emailSubject: (h) => `🏨 Hotel Booking Confirmed — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Hotel Booking Confirmed!',
  emailConfirmedSub: 'Your stay is secured',
  emailGreeting: (n) => n ? `Hello, ${n}!` : 'Hello!',
  emailIntro: (h, d) => `Your booking at ${h} is confirmed${d ? ` for ${d}` : ''}. Everything is ready for your arrival.`,
  getDirections: 'Get directions',
  voucherAttached: 'Your hotel voucher is attached to this email as a PDF — show it at reception.',
  questionsContact: 'Questions? Contact us at',
};

const ES: BookingStrings = {
  dateLocale: 'es-ES',
  voucherTitle: 'Bono de hotel',
  statusConfirmed: 'CONFIRMADA',
  bookingRef: 'Referencia de la reserva',
  hotelReference: 'Referencia del hotel',
  hotelConfirmation: 'Confirmación del hotel',
  hotelDetails: 'Detalles del hotel',
  sectionStay: 'Tu estancia',
  sectionGuests: 'Huéspedes',
  sectionPayment: 'Pago',
  sectionCancellation: 'Cancelación',
  checkIn: 'Entrada',
  checkOut: 'Salida',
  from: 'a partir de las',
  until: 'hasta las',
  nights: 'Noches',
  room: 'Habitación',
  meals: 'Régimen',
  heldUnder: 'Reserva a nombre de',
  heldUnderHint: 'Muestra este nombre en recepción — es el nombre con el que el hotel tiene la habitación reservada.',
  guests: 'Huéspedes',
  totalPaid: 'Total pagado',
  payableAtHotel: 'A pagar en el hotel',
  payableHint: 'Impuesto turístico y tasas locales que la propiedad cobra a la llegada — no incluidos arriba.',
  freeCancelUntil: 'Cancelación gratuita hasta',
  goodToKnow: 'INFORMACIÓN ÚTIL',
  noteShowVoucher: 'Muestra este bono y el nombre indicado arriba en recepción - es el nombre con el que el hotel tiene reservada la habitación.',
  noteLocalFees: (a) => `La propiedad cobra ${a} a la llegada (impuesto turístico y tasas locales) - no incluido en el total pagado.`,
  noteIdDeposit: 'Los hoteles pueden pedir un documento de identidad con foto y una tarjeta o depósito en efectivo para gastos imprevistos. Si vas a llegar después de las 20:00, avisa al hotel con antelación para que no libere la habitación.',
  supportLine: 'Línea de asistencia 24/7 durante la estancia',
  adult: 'adulto', adults: 'adultos', child: 'niño', children: 'niños', guest: 'huésped', guestsWord: 'huéspedes',
  emailSubject: (h) => `🏨 Reserva de hotel confirmada — ${h} | JetMeAway`,
  emailConfirmedHeading: '¡Reserva de hotel confirmada!',
  emailConfirmedSub: 'Tu estancia está garantizada',
  emailGreeting: (n) => n ? `¡Hola, ${n}!` : '¡Hola!',
  emailIntro: (h, d) => `Tu reserva en ${h} está confirmada${d ? ` para el ${d}` : ''}. Todo está listo para tu llegada.`,
  getDirections: 'Cómo llegar',
  voucherAttached: 'Tu bono de hotel está adjunto a este correo en PDF — muéstralo en recepción.',
  questionsContact: '¿Preguntas? Escríbenos a',
};

const FR: BookingStrings = {
  dateLocale: 'fr-FR',
  voucherTitle: 'Bon d’hôtel',
  statusConfirmed: 'CONFIRMÉE',
  bookingRef: 'Référence de réservation',
  hotelReference: 'Référence de l’hôtel',
  hotelConfirmation: 'Confirmation de l’hôtel',
  hotelDetails: 'Détails de l’hôtel',
  sectionStay: 'Votre séjour',
  sectionGuests: 'Voyageurs',
  sectionPayment: 'Paiement',
  sectionCancellation: 'Annulation',
  checkIn: 'Arrivée',
  checkOut: 'Départ',
  from: 'à partir de',
  until: 'jusqu’à',
  nights: 'Nuits',
  room: 'Chambre',
  meals: 'Repas',
  heldUnder: 'Chambre au nom de',
  heldUnderHint: 'Présentez ce nom à la réception — c’est le nom sous lequel l’hôtel garde la chambre.',
  guests: 'Voyageurs',
  totalPaid: 'Total payé',
  payableAtHotel: 'À payer à l’hôtel',
  payableHint: 'Taxe de séjour et frais locaux perçus par l’établissement à l’arrivée — non inclus ci-dessus.',
  freeCancelUntil: 'Annulation gratuite jusqu’au',
  goodToKnow: 'BON À SAVOIR',
  noteShowVoucher: 'Présentez ce bon et le nom ci-dessus à la réception - c’est le nom sous lequel l’hôtel garde la chambre.',
  noteLocalFees: (a) => `L’établissement perçoit ${a} à l’arrivée (taxe de séjour et frais locaux) - non inclus dans le total payé.`,
  noteIdDeposit: 'Les hôtels peuvent demander une pièce d’identité avec photo et une carte ou une caution en espèces pour les extras. Si vous arrivez après 20h, prévenez l’hôtel à l’avance pour que la chambre ne soit pas libérée.',
  supportLine: 'Ligne d’assistance 24h/24 et 7j/7 pendant le séjour',
  adult: 'adulte', adults: 'adultes', child: 'enfant', children: 'enfants', guest: 'voyageur', guestsWord: 'voyageurs',
  emailSubject: (h) => `🏨 Réservation d’hôtel confirmée — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Réservation d’hôtel confirmée !',
  emailConfirmedSub: 'Votre séjour est garanti',
  emailGreeting: (n) => n ? `Bonjour ${n} !` : 'Bonjour !',
  emailIntro: (h, d) => `Votre réservation à ${h} est confirmée${d ? ` pour le ${d}` : ''}. Tout est prêt pour votre arrivée.`,
  getDirections: 'Itinéraire',
  voucherAttached: 'Votre bon d’hôtel est joint à cet e-mail au format PDF — présentez-le à la réception.',
  questionsContact: 'Des questions ? Contactez-nous à',
};

const DE: BookingStrings = {
  dateLocale: 'de-DE',
  voucherTitle: 'Hotelgutschein',
  statusConfirmed: 'BESTÄTIGT',
  bookingRef: 'Buchungsreferenz',
  hotelReference: 'Hotelreferenz',
  hotelConfirmation: 'Hotelbestätigung',
  hotelDetails: 'Hoteldetails',
  sectionStay: 'Ihr Aufenthalt',
  sectionGuests: 'Gäste',
  sectionPayment: 'Zahlung',
  sectionCancellation: 'Stornierung',
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  from: 'ab',
  until: 'bis',
  nights: 'Nächte',
  room: 'Zimmer',
  meals: 'Verpflegung',
  heldUnder: 'Zimmer reserviert auf',
  heldUnderHint: 'Zeigen Sie diesen Namen an der Rezeption — unter diesem Namen hält das Hotel das Zimmer bereit.',
  guests: 'Gäste',
  totalPaid: 'Gesamt bezahlt',
  payableAtHotel: 'Im Hotel zu zahlen',
  payableHint: 'Kurtaxe und lokale Gebühren, die das Hotel bei der Ankunft erhebt — oben nicht enthalten.',
  freeCancelUntil: 'Kostenlose Stornierung bis',
  goodToKnow: 'GUT ZU WISSEN',
  noteShowVoucher: 'Zeigen Sie diesen Gutschein und den oben genannten Namen an der Rezeption - unter diesem Namen hält das Hotel das Zimmer bereit.',
  noteLocalFees: (a) => `Das Hotel erhebt bei der Ankunft ${a} (Kurtaxe und lokale Gebühren) - nicht im bezahlten Gesamtbetrag enthalten.`,
  noteIdDeposit: 'Hotels können einen Lichtbildausweis und eine Karte oder Barkaution für Nebenkosten verlangen. Wenn Sie nach 20 Uhr ankommen, informieren Sie das Hotel im Voraus, damit das Zimmer nicht freigegeben wird.',
  supportLine: '24/7-Betreuung während des Aufenthalts',
  adult: 'Erwachsener', adults: 'Erwachsene', child: 'Kind', children: 'Kinder', guest: 'Gast', guestsWord: 'Gäste',
  emailSubject: (h) => `🏨 Hotelbuchung bestätigt — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Hotelbuchung bestätigt!',
  emailConfirmedSub: 'Ihr Aufenthalt ist gesichert',
  emailGreeting: (n) => n ? `Hallo ${n}!` : 'Hallo!',
  emailIntro: (h, d) => `Ihre Buchung im ${h} ist bestätigt${d ? ` für den ${d}` : ''}. Alles ist für Ihre Ankunft bereit.`,
  getDirections: 'Route',
  voucherAttached: 'Ihr Hotelgutschein ist dieser E-Mail als PDF beigefügt — zeigen Sie ihn an der Rezeption.',
  questionsContact: 'Fragen? Kontaktieren Sie uns unter',
};

const NL: BookingStrings = {
  dateLocale: 'nl-NL',
  voucherTitle: 'Hotelvoucher',
  statusConfirmed: 'BEVESTIGD',
  bookingRef: 'Boekingsreferentie',
  hotelReference: 'Hotelreferentie',
  hotelConfirmation: 'Hotelbevestiging',
  hotelDetails: 'Hotelgegevens',
  sectionStay: 'Uw verblijf',
  sectionGuests: 'Gasten',
  sectionPayment: 'Betaling',
  sectionCancellation: 'Annulering',
  checkIn: 'Inchecken',
  checkOut: 'Uitchecken',
  from: 'vanaf',
  until: 'tot',
  nights: 'Nachten',
  room: 'Kamer',
  meals: 'Maaltijden',
  heldUnder: 'Kamer op naam van',
  heldUnderHint: 'Toon deze naam bij de receptie — het is de naam waarop het hotel de kamer heeft gereserveerd.',
  guests: 'Gasten',
  totalPaid: 'Totaal betaald',
  payableAtHotel: 'Te betalen in het hotel',
  payableHint: 'Toeristenbelasting en lokale kosten die het hotel bij aankomst int — hierboven niet inbegrepen.',
  freeCancelUntil: 'Gratis annuleren tot',
  goodToKnow: 'GOED OM TE WETEN',
  noteShowVoucher: 'Toon deze voucher en de naam hierboven bij de receptie - het is de naam waarop het hotel de kamer heeft gereserveerd.',
  noteLocalFees: (a) => `Het hotel int bij aankomst ${a} (toeristenbelasting en lokale kosten) - niet inbegrepen in het betaalde totaal.`,
  noteIdDeposit: 'Hotels kunnen om een identiteitsbewijs met foto en een kaart of contante borg voor extra kosten vragen. Als u na 20.00 uur aankomt, laat het hotel dit vooraf weten zodat de kamer niet wordt vrijgegeven.',
  supportLine: '24/7-hulplijn tijdens het verblijf',
  adult: 'volwassene', adults: 'volwassenen', child: 'kind', children: 'kinderen', guest: 'gast', guestsWord: 'gasten',
  emailSubject: (h) => `🏨 Hotelboeking bevestigd — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Hotelboeking bevestigd!',
  emailConfirmedSub: 'Uw verblijf is gegarandeerd',
  emailGreeting: (n) => n ? `Hallo ${n}!` : 'Hallo!',
  emailIntro: (h, d) => `Uw boeking bij ${h} is bevestigd${d ? ` voor ${d}` : ''}. Alles is klaar voor uw aankomst.`,
  getDirections: 'Route',
  voucherAttached: 'Uw hotelvoucher is als PDF bij deze e-mail gevoegd — toon hem bij de receptie.',
  questionsContact: 'Vragen? Neem contact met ons op via',
};

const IT: BookingStrings = {
  dateLocale: 'it-IT',
  voucherTitle: 'Voucher hotel',
  statusConfirmed: 'CONFERMATA',
  bookingRef: 'Riferimento della prenotazione',
  hotelReference: 'Riferimento hotel',
  hotelConfirmation: 'Conferma hotel',
  hotelDetails: 'Dettagli hotel',
  sectionStay: 'Il tuo soggiorno',
  sectionGuests: 'Ospiti',
  sectionPayment: 'Pagamento',
  sectionCancellation: 'Cancellazione',
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  from: 'dalle',
  until: 'fino alle',
  nights: 'Notti',
  room: 'Camera',
  meals: 'Pasti',
  heldUnder: 'Camera intestata a',
  heldUnderHint: 'Mostra questo nome alla reception — è il nome a cui l’hotel tiene la camera.',
  guests: 'Ospiti',
  totalPaid: 'Totale pagato',
  payableAtHotel: 'Da pagare in hotel',
  payableHint: 'Tassa di soggiorno e costi locali che la struttura riscuote all’arrivo — non inclusi sopra.',
  freeCancelUntil: 'Cancellazione gratuita fino al',
  goodToKnow: 'BUONO A SAPERSI',
  noteShowVoucher: 'Mostra questo voucher e il nome indicato sopra alla reception - è il nome a cui l’hotel tiene la camera.',
  noteLocalFees: (a) => `La struttura riscuote ${a} all’arrivo (tassa di soggiorno e costi locali) - non inclusi nel totale pagato.`,
  noteIdDeposit: 'Gli hotel possono richiedere un documento con foto e una carta o un deposito in contanti per eventuali extra. Se arrivi dopo le 20:00, avvisa l’hotel in anticipo affinché la camera non venga rilasciata.',
  supportLine: 'Assistenza 24/7 durante il soggiorno',
  adult: 'adulto', adults: 'adulti', child: 'bambino', children: 'bambini', guest: 'ospite', guestsWord: 'ospiti',
  emailSubject: (h) => `🏨 Prenotazione hotel confermata — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Prenotazione hotel confermata!',
  emailConfirmedSub: 'Il tuo soggiorno è garantito',
  emailGreeting: (n) => n ? `Ciao ${n}!` : 'Ciao!',
  emailIntro: (h, d) => `La tua prenotazione presso ${h} è confermata${d ? ` per il ${d}` : ''}. Tutto è pronto per il tuo arrivo.`,
  getDirections: 'Indicazioni',
  voucherAttached: 'Il tuo voucher hotel è allegato a questa email in PDF — mostralo alla reception.',
  questionsContact: 'Domande? Scrivici a',
};

const PT: BookingStrings = {
  dateLocale: 'pt-PT',
  voucherTitle: 'Voucher de hotel',
  statusConfirmed: 'CONFIRMADA',
  bookingRef: 'Referência da reserva',
  hotelReference: 'Referência do hotel',
  hotelConfirmation: 'Confirmação do hotel',
  hotelDetails: 'Detalhes do hotel',
  sectionStay: 'A sua estadia',
  sectionGuests: 'Hóspedes',
  sectionPayment: 'Pagamento',
  sectionCancellation: 'Cancelamento',
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  from: 'a partir das',
  until: 'até às',
  nights: 'Noites',
  room: 'Quarto',
  meals: 'Refeições',
  heldUnder: 'Quarto em nome de',
  heldUnderHint: 'Mostre este nome na receção — é o nome com que o hotel tem o quarto reservado.',
  guests: 'Hóspedes',
  totalPaid: 'Total pago',
  payableAtHotel: 'A pagar no hotel',
  payableHint: 'Taxa turística e taxas locais que o alojamento cobra à chegada — não incluídas acima.',
  freeCancelUntil: 'Cancelamento gratuito até',
  goodToKnow: 'BOM SABER',
  noteShowVoucher: 'Mostre este voucher e o nome indicado acima na receção - é o nome com que o hotel tem o quarto reservado.',
  noteLocalFees: (a) => `O alojamento cobra ${a} à chegada (taxa turística e taxas locais) - não incluído no total pago.`,
  noteIdDeposit: 'Os hotéis podem pedir um documento de identificação com foto e um cartão ou depósito em dinheiro para extras. Se chegar depois das 20h, avise o hotel com antecedência para que o quarto não seja libertado.',
  supportLine: 'Linha de apoio 24/7 durante a estadia',
  adult: 'adulto', adults: 'adultos', child: 'criança', children: 'crianças', guest: 'hóspede', guestsWord: 'hóspedes',
  emailSubject: (h) => `🏨 Reserva de hotel confirmada — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Reserva de hotel confirmada!',
  emailConfirmedSub: 'A sua estadia está garantida',
  emailGreeting: (n) => n ? `Olá, ${n}!` : 'Olá!',
  emailIntro: (h, d) => `A sua reserva em ${h} está confirmada${d ? ` para ${d}` : ''}. Está tudo pronto para a sua chegada.`,
  getDirections: 'Como chegar',
  voucherAttached: 'O seu voucher de hotel está anexado a este e-mail em PDF — mostre-o na receção.',
  questionsContact: 'Dúvidas? Contacte-nos em',
};

const DICT: Record<SupportedLocale, BookingStrings> = { es: ES, fr: FR, de: DE, nl: NL, it: IT, pt: PT };

/** Strings for a locale; English for anything unsupported (never throws). */
export function stringsFor(locale: string | null | undefined): BookingStrings {
  return isSupportedLocale(locale) ? DICT[locale] : EN;
}

export const EN_STRINGS = EN;

/**
 * Translate a supplier meal-plan ("board basis") into the booking language.
 *
 * LiteAPI returns the board in English ("Bed & Breakfast", "Half Board", …),
 * so a Spanish email showed "Régimen: Bed & Breakfast" — a language mix a
 * native notices. Board basis is a small, standard closed set, so it maps
 * cleanly. Anything we don't recognise (or an unsupported locale) is returned
 * unchanged — better an English phrase we know is correct than a wrong guess.
 * Room NAMES are deliberately not translated: they are free-text product
 * names ("Superior Double Room with Sea View") a hotel prints as-is.
 */
const BOARD_MAP: Record<string, Record<SupportedLocale, string>> = {
  'room only': {
    es: 'Solo alojamiento', fr: 'Sans repas', de: 'Nur Übernachtung',
    nl: 'Alleen kamer', it: 'Solo pernottamento', pt: 'Só alojamento',
  },
  'bed & breakfast': {
    es: 'Alojamiento y desayuno', fr: 'Petit-déjeuner inclus', de: 'Übernachtung mit Frühstück',
    nl: 'Logies en ontbijt', it: 'Pernottamento e prima colazione', pt: 'Alojamento e pequeno-almoço',
  },
  'half board': {
    es: 'Media pensión', fr: 'Demi-pension', de: 'Halbpension',
    nl: 'Halfpension', it: 'Mezza pensione', pt: 'Meia pensão',
  },
  'full board': {
    es: 'Pensión completa', fr: 'Pension complète', de: 'Vollpension',
    nl: 'Volpension', it: 'Pensione completa', pt: 'Pensão completa',
  },
  'all inclusive': {
    es: 'Todo incluido', fr: 'Tout compris', de: 'All-Inclusive',
    nl: 'All-inclusive', it: 'Tutto incluso', pt: 'Tudo incluído',
  },
};

export function translateBoard(board: string | null | undefined, locale: string): string {
  const raw = (board || '').trim();
  if (!raw || !isSupportedLocale(locale)) return raw;
  // Normalise: lowercase, "and" → "&", drop filler ("included"/"basis"),
  // collapse whitespace. Fold the breakfast synonyms onto one key.
  let key = raw.toLowerCase()
    .replace(/\band\b/g, '&')
    .replace(/\b(included|basis|board basis)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (key === 'breakfast' || key === 'bed & breakfast included' || key === 'b&b') key = 'bed & breakfast';
  if (key === 'ro') key = 'room only';
  if (key === 'hb') key = 'half board';
  if (key === 'fb') key = 'full board';
  if (key === 'ai') key = 'all inclusive';
  const m = BOARD_MAP[key];
  return m ? m[locale] : raw;
}
