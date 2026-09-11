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
  /** Age unit for child ages, e.g. "8 años". Empty for EN (keeps "(8)"). */
  years: string;
  // Email-only
  emailSubject: (hotel: string) => string;
  emailConfirmedHeading: string;
  emailConfirmedSub: string;
  emailGreeting: (name: string) => string;
  emailIntro: (hotel: string, date: string) => string;
  getDirections: string;
  voucherAttached: string;
  questionsContact: string;
  // "Manage your booking" sign-in nudge (added 2026-09-11)
  manageHeading: string;
  manageBody: string;
  manageButton: string;
  getApp: string;
}

/** Convert a "03:00 PM" time to 24-hour "15:00" for locales that use it
 *  (es/fr/de/nl/it/pt). English/unsupported keep the original. Unrecognised
 *  formats pass through unchanged. */
export function formatTime(t: string | null | undefined, locale: string): string {
  const raw = (t || '').trim();
  if (!raw || !isSupportedLocale(locale)) return raw;
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return raw;
  let h = parseInt(m[1], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
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
  adult: 'adult', adults: 'adults', child: 'child', children: 'children', guest: 'guest', guestsWord: 'guests', years: '',
  emailSubject: (h) => `🏨 Hotel Booking Confirmed — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Hotel Booking Confirmed!',
  emailConfirmedSub: 'Your stay is secured',
  emailGreeting: (n) => n ? `Hello, ${n}!` : 'Hello!',
  emailIntro: (h, d) => `Your booking at ${h} is confirmed${d ? ` for ${d}` : ''}. Everything is ready for your arrival.`,
  getDirections: 'Get directions',
  voucherAttached: 'Your hotel voucher is attached to this email as a PDF — show it at reception.',
  questionsContact: 'Questions? Contact us at',
  manageHeading: 'Manage your booking',
  manageBody: 'Sign in with this email — no password needed — to view your booking, re-download your voucher any time, and manage your stay.',
  manageButton: 'View my booking',
  getApp: 'Get the JetMeAway app',
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
  adult: 'adulto', adults: 'adultos', child: 'niño', children: 'niños', guest: 'huésped', guestsWord: 'huéspedes', years: 'años',
  emailSubject: (h) => `🏨 Reserva de hotel confirmada — ${h} | JetMeAway`,
  emailConfirmedHeading: '¡Reserva de hotel confirmada!',
  emailConfirmedSub: 'Tu estancia está garantizada',
  emailGreeting: (n) => n ? `¡Hola, ${n}!` : '¡Hola!',
  emailIntro: (h, d) => `Tu reserva en ${h} está confirmada${d ? ` para el ${d}` : ''}. Todo está listo para tu llegada.`,
  getDirections: 'Cómo llegar',
  voucherAttached: 'Tu bono de hotel está adjunto a este correo en PDF — muéstralo en recepción.',
  questionsContact: '¿Preguntas? Escríbenos a',
  manageHeading: 'Gestiona tu reserva',
  manageBody: 'Inicia sesión con este correo — sin contraseña — para ver tu reserva, descargar tu bono cuando quieras y gestionar tu estancia.',
  manageButton: 'Ver mi reserva',
  getApp: 'Descarga la app de JetMeAway',
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
  adult: 'adulte', adults: 'adultes', child: 'enfant', children: 'enfants', guest: 'voyageur', guestsWord: 'voyageurs', years: 'ans',
  emailSubject: (h) => `🏨 Réservation d’hôtel confirmée — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Réservation d’hôtel confirmée !',
  emailConfirmedSub: 'Votre séjour est garanti',
  emailGreeting: (n) => n ? `Bonjour ${n} !` : 'Bonjour !',
  emailIntro: (h, d) => `Votre réservation à ${h} est confirmée${d ? ` pour le ${d}` : ''}. Tout est prêt pour votre arrivée.`,
  getDirections: 'Itinéraire',
  voucherAttached: 'Votre bon d’hôtel est joint à cet e-mail au format PDF — présentez-le à la réception.',
  questionsContact: 'Des questions ? Contactez-nous à',
  manageHeading: 'Gérez votre réservation',
  manageBody: 'Connectez-vous avec cet e-mail — sans mot de passe — pour voir votre réservation, retélécharger votre bon à tout moment et gérer votre séjour.',
  manageButton: 'Voir ma réservation',
  getApp: 'Téléchargez l’app JetMeAway',
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
  adult: 'Erwachsener', adults: 'Erwachsene', child: 'Kind', children: 'Kinder', guest: 'Gast', guestsWord: 'Gäste', years: 'Jahre',
  emailSubject: (h) => `🏨 Hotelbuchung bestätigt — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Hotelbuchung bestätigt!',
  emailConfirmedSub: 'Ihr Aufenthalt ist gesichert',
  emailGreeting: (n) => n ? `Hallo ${n}!` : 'Hallo!',
  emailIntro: (h, d) => `Ihre Buchung im ${h} ist bestätigt${d ? ` für den ${d}` : ''}. Alles ist für Ihre Ankunft bereit.`,
  getDirections: 'Route',
  voucherAttached: 'Ihr Hotelgutschein ist dieser E-Mail als PDF beigefügt — zeigen Sie ihn an der Rezeption.',
  questionsContact: 'Fragen? Kontaktieren Sie uns unter',
  manageHeading: 'Buchung verwalten',
  manageBody: 'Melden Sie sich mit dieser E-Mail an — ohne Passwort — um Ihre Buchung anzusehen, Ihren Gutschein jederzeit erneut herunterzuladen und Ihren Aufenthalt zu verwalten.',
  manageButton: 'Meine Buchung ansehen',
  getApp: 'Laden Sie die JetMeAway-App',
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
  adult: 'volwassene', adults: 'volwassenen', child: 'kind', children: 'kinderen', guest: 'gast', guestsWord: 'gasten', years: 'jaar',
  emailSubject: (h) => `🏨 Hotelboeking bevestigd — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Hotelboeking bevestigd!',
  emailConfirmedSub: 'Uw verblijf is gegarandeerd',
  emailGreeting: (n) => n ? `Hallo ${n}!` : 'Hallo!',
  emailIntro: (h, d) => `Uw boeking bij ${h} is bevestigd${d ? ` voor ${d}` : ''}. Alles is klaar voor uw aankomst.`,
  getDirections: 'Route',
  voucherAttached: 'Uw hotelvoucher is als PDF bij deze e-mail gevoegd — toon hem bij de receptie.',
  questionsContact: 'Vragen? Neem contact met ons op via',
  manageHeading: 'Beheer uw boeking',
  manageBody: 'Log in met dit e-mailadres — geen wachtwoord nodig — om uw boeking te bekijken, uw voucher altijd opnieuw te downloaden en uw verblijf te beheren.',
  manageButton: 'Mijn boeking bekijken',
  getApp: 'Download de JetMeAway-app',
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
  adult: 'adulto', adults: 'adulti', child: 'bambino', children: 'bambini', guest: 'ospite', guestsWord: 'ospiti', years: 'anni',
  emailSubject: (h) => `🏨 Prenotazione hotel confermata — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Prenotazione hotel confermata!',
  emailConfirmedSub: 'Il tuo soggiorno è garantito',
  emailGreeting: (n) => n ? `Ciao ${n}!` : 'Ciao!',
  emailIntro: (h, d) => `La tua prenotazione presso ${h} è confermata${d ? ` per il ${d}` : ''}. Tutto è pronto per il tuo arrivo.`,
  getDirections: 'Indicazioni',
  voucherAttached: 'Il tuo voucher hotel è allegato a questa email in PDF — mostralo alla reception.',
  questionsContact: 'Domande? Scrivici a',
  manageHeading: 'Gestisci la tua prenotazione',
  manageBody: 'Accedi con questa email — senza password — per vedere la tua prenotazione, riscaricare il voucher quando vuoi e gestire il soggiorno.',
  manageButton: 'Vedi la mia prenotazione',
  getApp: 'Scarica l’app JetMeAway',
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
  adult: 'adulto', adults: 'adultos', child: 'criança', children: 'crianças', guest: 'hóspede', guestsWord: 'hóspedes', years: 'anos',
  emailSubject: (h) => `🏨 Reserva de hotel confirmada — ${h} | JetMeAway`,
  emailConfirmedHeading: 'Reserva de hotel confirmada!',
  emailConfirmedSub: 'A sua estadia está garantida',
  emailGreeting: (n) => n ? `Olá, ${n}!` : 'Olá!',
  emailIntro: (h, d) => `A sua reserva em ${h} está confirmada${d ? ` para ${d}` : ''}. Está tudo pronto para a sua chegada.`,
  getDirections: 'Como chegar',
  voucherAttached: 'O seu voucher de hotel está anexado a este e-mail em PDF — mostre-o na receção.',
  questionsContact: 'Dúvidas? Contacte-nos em',
  manageHeading: 'Faça a gestão da sua reserva',
  manageBody: 'Inicie sessão com este e-mail — sem palavra-passe — para ver a sua reserva, transferir o voucher quando quiser e gerir a sua estadia.',
  manageButton: 'Ver a minha reserva',
  getApp: 'Descarregue a app JetMeAway',
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

/**
 * Translate a hotel room type into the booking language — the common,
 * composable ones only. A room name is [qualifiers] + [bed]-Room + [features]
 * ("Superior Double Room with Sea View"). We translate each recognised part
 * and reassemble it in the target language's word order (noun-first for
 * Romance: "Habitación Doble Superior con Vistas al Mar"; adjective-first for
 * German/Dutch: "Superior Doppelzimmer mit Meerblick").
 *
 * CRITICAL: if ANY part of the string isn't recognised, the ORIGINAL English
 * is returned untouched — a room name half-translated or with a wrong gender
 * ending would look worse than plain English. So every translation shown is
 * fully understood; the long tail (unusual names) stays English, on purpose.
 */
const ROOM_QUAL: Record<string, Record<SupportedLocale, string>> = {
  // Invariant / gender-safe adjectives only. French uses the feminine form
  // (the room noun is always feminine — Chambre / Suite — in our noun map).
  superior: { es: 'Superior', fr: 'Supérieure', de: 'Superior', nl: 'Superior', it: 'Superior', pt: 'Superior' },
  deluxe: { es: 'Deluxe', fr: 'Deluxe', de: 'Deluxe', nl: 'Deluxe', it: 'Deluxe', pt: 'Deluxe' },
  standard: { es: 'Estándar', fr: 'Standard', de: 'Standard', nl: 'Standaard', it: 'Standard', pt: 'Standard' },
  premium: { es: 'Premium', fr: 'Premium', de: 'Premium', nl: 'Premium', it: 'Premium', pt: 'Premium' },
  junior: { es: 'Junior', fr: 'Junior', de: 'Junior', nl: 'Junior', it: 'Junior', pt: 'Junior' },
};
// Bed + base noun as one unit (German/Dutch compound; Romance keeps the noun
// feminine so the French qualifier agrees). Empty string = "don't translate
// in this language" → falls the whole room name back to English.
const ROOM_NOUN: Record<string, Record<SupportedLocale, string>> = {
  'double room': { es: 'Habitación Doble', fr: 'Chambre Double', de: 'Doppelzimmer', nl: 'Tweepersoonskamer', it: 'Camera Doppia', pt: 'Quarto Duplo' },
  'twin room': { es: 'Habitación con Dos Camas', fr: 'Chambre Twin', de: 'Zweibettzimmer', nl: 'Twinkamer', it: 'Camera con Due Letti', pt: 'Quarto Twin' },
  'single room': { es: 'Habitación Individual', fr: 'Chambre Simple', de: 'Einzelzimmer', nl: 'Eenpersoonskamer', it: 'Camera Singola', pt: 'Quarto Individual' },
  'triple room': { es: 'Habitación Triple', fr: 'Chambre Triple', de: 'Dreibettzimmer', nl: 'Driepersoonskamer', it: 'Camera Tripla', pt: 'Quarto Triplo' },
  'family room': { es: 'Habitación Familiar', fr: 'Chambre Familiale', de: 'Familienzimmer', nl: 'Familiekamer', it: 'Camera Familiare', pt: 'Quarto Familiar' },
  'room': { es: 'Habitación', fr: 'Chambre', de: 'Zimmer', nl: 'Kamer', it: 'Camera', pt: 'Quarto' },
  'junior suite': { es: 'Junior Suite', fr: 'Suite Junior', de: 'Junior-Suite', nl: 'Junior Suite', it: 'Junior Suite', pt: 'Junior Suite' },
  'suite': { es: 'Suite', fr: 'Suite', de: 'Suite', nl: 'Suite', it: 'Suite', pt: 'Suite' },
  'studio': { es: 'Estudio', fr: '', de: 'Studio', nl: 'Studio', it: 'Monolocale', pt: 'Estúdio' },
  'apartment': { es: 'Apartamento', fr: '', de: 'Apartment', nl: 'Appartement', it: 'Appartamento', pt: 'Apartamento' },
};
const ROOM_FEAT: Record<string, Record<SupportedLocale, string>> = {
  'sea view': { es: 'con Vistas al Mar', fr: 'Vue Mer', de: 'mit Meerblick', nl: 'met Zeezicht', it: 'Vista Mare', pt: 'com Vista Mar' },
  'ocean view': { es: 'con Vistas al Mar', fr: 'Vue Mer', de: 'mit Meerblick', nl: 'met Zeezicht', it: 'Vista Mare', pt: 'com Vista Mar' },
  'city view': { es: 'con Vistas a la Ciudad', fr: 'Vue Ville', de: 'mit Stadtblick', nl: 'met Stadszicht', it: 'Vista Città', pt: 'com Vista Cidade' },
  'garden view': { es: 'con Vistas al Jardín', fr: 'Vue Jardin', de: 'mit Gartenblick', nl: 'met Tuinzicht', it: 'Vista Giardino', pt: 'com Vista Jardim' },
  'pool view': { es: 'con Vistas a la Piscina', fr: 'Vue Piscine', de: 'mit Poolblick', nl: 'met Zwembadzicht', it: 'Vista Piscina', pt: 'com Vista Piscina' },
  'mountain view': { es: 'con Vistas a la Montaña', fr: 'Vue Montagne', de: 'mit Bergblick', nl: 'met Bergzicht', it: 'Vista Montagna', pt: 'com Vista Montanha' },
  'balcony': { es: 'con Balcón', fr: 'avec Balcon', de: 'mit Balkon', nl: 'met Balkon', it: 'con Balcone', pt: 'com Varanda' },
};
const ROMANCE = new Set<SupportedLocale>(['es', 'fr', 'it', 'pt']);

export function translateRoom(room: string | null | undefined, locale: string): string {
  const raw = (room || '').trim();
  if (!raw || !isSupportedLocale(locale)) return raw;

  let work = ` ${raw.toLowerCase()} `.replace(/[&/,]/g, ' ').replace(/\s+/g, ' ');
  const eat = (phrase: string): boolean => {
    const p = ` ${phrase} `;
    if (work.includes(p)) { work = work.replace(p, ' ').replace(/\s+/g, ' '); return true; }
    return false;
  };

  const quals: string[] = [];
  for (const key of Object.keys(ROOM_QUAL)) if (eat(key)) quals.push(ROOM_QUAL[key][locale]);
  const feats: string[] = [];
  for (const key of Object.keys(ROOM_FEAT)) if (eat(`with ${key}`) || eat(key)) feats.push(ROOM_FEAT[key][locale]);

  // Whatever remains must be exactly one recognised base noun (longest first).
  const rest = work.trim();
  let noun = '';
  for (const key of Object.keys(ROOM_NOUN).sort((a, b) => b.length - a.length)) {
    if (rest === key) { noun = ROOM_NOUN[key][locale]; break; }
  }
  // Unrecognised base, or a noun we don't translate in this language → English.
  if (!noun) return raw;

  const parts = ROMANCE.has(locale) ? [noun, ...quals, ...feats] : [...quals, noun, ...feats];
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

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
