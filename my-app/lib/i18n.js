// Bilingual (English / Nepali) copy for the app.
//
// English is the authored source: components keep their English literals and wrap
// them in t(lang, '…'), which looks the string up in the Nepali map. A missing
// entry falls back to the English text, so a half-translated screen never breaks.
//
// Database content is handled the other way round: rows may carry a `_ne` twin of
// a field (title_ne, description_ne, address_ne, location_name_ne), and
// localizeField picks it when the reader is on Nepali and it is non-empty.

import { NE_LANDING } from './i18n/landing.js'
import { NE_AUTH } from './i18n/auth.js'
import { NE_REPORTS } from './i18n/reports.js'
import { NE_PAGES } from './i18n/pages.js'
import { NE_ADMIN } from './i18n/admin.js'

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', short: 'EN', region: 'United States' },
  { code: 'ne', label: 'Nepali', nativeLabel: 'नेपाली', short: 'ने', region: 'Nepal' },
]

export const DEFAULT_LANG = 'en'
// A cookie name cannot contain ':', so this is not the localStorage-style key.
export const LANG_COOKIE = 'lang'

export function normalizeLang(value) {
  return LANGUAGES.some((entry) => entry.code === value) ? value : DEFAULT_LANG
}

// `{name}` placeholders are substituted from the `vars` argument.
export function t(lang, text, vars) {
  let out = text
  if (lang === 'ne') {
    if (NE[text] === undefined && process.env.NODE_ENV === 'development') {
      // A missing Nepali key falls back to English; the warning points the
      // translator at the gap without breaking the screen.
      console.warn('[i18n] missing Nepali copy for:', text)
    }
    out = NE[text] ?? text
  }
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      out = out.split(`{${key}}`).join(String(value))
    }
  }
  return out
}

/**
 * The `_ne` twin of a field when the reader is on Nepali and it holds text,
 * otherwise the English field. `localizeField(event, 'title', 'ne')`.
 */
export function localizeField(item, fieldName, lang = DEFAULT_LANG) {
  if (!item) return ''
  if (lang === 'ne') {
    const nepali = item[`${fieldName}_ne`]
    if (typeof nepali === 'string' && nepali.trim()) return nepali
  }
  return item[fieldName] ?? ''
}

/** True when the row actually carries a Nepali value for that field. */
export function hasNepali(item, fieldName) {
  const value = item?.[`${fieldName}_ne`]
  return typeof value === 'string' && value.trim().length > 0
}

// ---------------------------------------------------------------------------
// Nepali copy — the shared core, plus one map per surface area. Later maps win
// on a duplicate key, so a repeated entry is harmless (both are valid Nepali).
// ---------------------------------------------------------------------------
const NE_CORE = {
  // Navigation and common actions
  Dashboard: 'ड्यासबोर्ड',
  Reports: 'रिपोर्टहरू',
  Events: 'कार्यक्रमहरू',
  Map: 'नक्सा',
  English: 'English',
  Nepali: 'नेपाली',
  'Change language': 'भाषा परिवर्तन गर्नुहोस्',
  Next: 'अर्को',
  Back: 'पछाडि',
  Cancel: 'रद्द गर्नुहोस्',
  Remove: 'हटाउनुहोस्',
  optional: 'वैकल्पिक',
  'Select…': 'छान्नुहोस्…',
  'Saving…': 'सुरक्षित गर्दै…',
  'Submitting…': 'पेश गर्दै…',
  'Try again': 'पुनः प्रयास गर्नुहोस्',
  'View details': 'विवरण हेर्नुहोस्',
  'Sign in to verify': 'प्रमाणित गर्न साइन इन गर्नुहोस्',
  'Sign in to join': 'सहभागी हुन साइन इन गर्नुहोस्',
  'Log in': 'लग इन',
  'Create account': 'खाता खोल्नुहोस्',
  'Report an issue': 'समस्या रिपोर्ट गर्नुहोस्',

  // Event types (from EventTypeIcon)
  'Blood donation': 'रक्तदान',
  'Tree plantation': 'वृक्षरोपण',
  'Flower plantation': 'फूल रोपण',
  'Cleanliness drive': 'सरसफाइ अभियान',
  'Food donation': 'खाद्यान्न वितरण',
  'Clothes donation': 'लुगा वितरण',
  'Health camp': 'स्वास्थ्य शिविर',
  'Awareness campaign': 'सचेतना अभियान',
  Other: 'अन्य',
  Blood: 'रक्त',
  Tree: 'रूख',
  Flower: 'फूल',
  'Clean-up': 'सरसफाइ',
  Food: 'खाना',
  Clothes: 'लुगा',
  Health: 'स्वास्थ्य',
  Awareness: 'सचेतना',

  // Event form
  Organise: 'आयोजना',
  'Organise an event': 'कार्यक्रम आयोजना गर्नुहोस्',
  'Edit your event': 'आफ्नो कार्यक्रम सम्पादन गर्नुहोस्',
  'Edit event': 'कार्यक्रम सम्पादन',
  'Five short steps. Nothing is public until an admin approves it.':
    'पाँच छोटा चरण। एडमिनले स्वीकृति दिनुअघि केही पनि सार्वजनिक हुँदैन।',
  'Draft saved': 'मस्यौदा सुरक्षित भयो',
  Type: 'प्रकार',
  Basics: 'आधारभूत',
  Place: 'स्थान',
  Organiser: 'आयोजक',
  Review: 'समीक्षा',
  'What kind of event is this?': 'यो कस्तो कार्यक्रम हो?',
  'Pick one. Each type asks a few extra questions later.':
    'एउटा छान्नुहोस्। प्रत्येक प्रकारले पछि केही थप प्रश्न सोध्छ।',
  'The basics': 'आधारभूत विवरण',
  'Event title': 'कार्यक्रमको शीर्षक',
  'Title in Nepali': 'शीर्षक (नेपाली)',
  'e.g. Ward 6 roadside plantation': 'जस्तै: वडा ६ सडक किनार वृक्षरोपण',
  Description: 'विवरण',
  'Description in Nepali': 'विवरण (नेपाली)',
  'What will happen, who is it for, and what should people expect?':
    'के हुनेछ, कसका लागि हो, र मानिसहरूले के अपेक्षा गर्ने?',
  Date: 'मिति',
  'Start time': 'सुरु समय',
  'End time': 'अन्त्य समय',
  'Maximum participants': 'अधिकतम सहभागी',
  'Leave blank for no limit. Joining stops once this number is reached.':
    'सीमा नराख्न खाली छोड्नुहोस्। यो संख्या पुगेपछि सहभागिता बन्द हुन्छ।',
  'What to bring': 'के ल्याउने',
  'Gloves, water bottle, a photo ID…': 'पन्जा, पानीको बोतल, फोटो सहितको परिचयपत्र…',
  'Cover photo': 'आवरण तस्बिर',
  'Cover selected': 'आवरण छानियो',
  'Choose a cover photo (up to 1 MB)': 'आवरण तस्बिर छान्नुहोस् (१ MB सम्म)',
  'Where it happens': 'कहाँ हुन्छ',
  'Pin on the map': 'नक्सामा पिन राख्नुहोस्',
  'tap the map to move the pin.': 'पिन सार्न नक्सामा थिच्नुहोस्।',
  'Address or landmark': 'ठेगाना वा चिनारी',
  'Address in Nepali': 'ठेगाना वा चिनारी (नेपाली)',
  'e.g. Community hall near Ward 3 office': 'जस्तै: वडा ३ कार्यालय नजिकको सामुदायिक भवन',
  'Ward / area': 'वडा / क्षेत्र',
  'e.g. Ward 6': 'जस्तै: वडा ६',
  'Event area radius': 'कार्यक्रम क्षेत्रको त्रिज्या',
  '{n} m around the pin': 'पिन वरिपरि {n} मिटर',
  'Organiser details': 'आयोजकको विवरण',
  'Private — these are never shown publicly. Admins use them to review the application.':
    'निजी — यी कहिल्यै सार्वजनिक हुँदैनन्। एडमिनले आवेदन समीक्षा गर्न प्रयोग गर्छन्।',
  'Group name': 'समूहको नाम',
  'Leave blank to be shown as an individual organiser.':
    'व्यक्तिगत आयोजकको रूपमा देखिन खाली छोड्नुहोस्।',
  'e.g. Ward 6 Youth Club': 'जस्तै: वडा ६ युवा क्लब',
  'Contact person': 'सम्पर्क व्यक्ति',
  Phone: 'फोन',
  Email: 'इमेल',
  'Questions for review': 'समीक्षाका लागि प्रश्नहरू',
  'Private answers that help an admin judge the plan. They are not shown on the public event page.':
    'यी निजी उत्तरले एडमिनलाई योजना मूल्याङ्कन गर्न मद्दत गर्छन्। सार्वजनिक कार्यक्रम पृष्ठमा देखिँदैनन्।',
  '{label} questions': '{label} सम्बन्धी प्रश्नहरू',
  'Specific to this event type. Also private.': 'यो कार्यक्रम प्रकारसँग सम्बन्धित। यो पनि निजी।',
  'Supporting documents': 'समर्थन कागजातहरू',
  'Optional. A PDF or image up to 5 MB (permission letter, plan). Private to admins.':
    'वैकल्पिक। ५ MB सम्मको PDF वा तस्बिर (अनुमति पत्र, योजना)। एडमिनका लागि मात्र।',
  'Choose a document': 'कागजात छान्नुहोस्',
  'Coming soon — document upload needs the Supabase backend.':
    'चाँडै आउँदैछ — कागजात अपलोडका लागि Supabase ब्याकेन्ड चाहिन्छ।',
  'Review and confirm': 'समीक्षा र पुष्टि',
  'Review answers': 'उत्तरहरू हेर्नुहोस्',
  'The details are correct and this is not a duplicate. I understand it stays private until an admin approves it.':
    'विवरण सही छन् र यो दोहोरो होइन। एडमिनले स्वीकृति दिनुअघि यो निजी रहन्छ भन्ने मैले बुझेको छु।',
  'Submit for review': 'समीक्षाका लागि पेश गर्नुहोस्',
  'Resubmit for review': 'पुनः समीक्षाका लागि पेश गर्नुहोस्',
  'Application sent': 'आवेदन पठाइयो',
  'Changes sent for review': 'परिवर्तन समीक्षाका लागि पठाइयो',
  'An admin will review it. You will see the decision in My events. Your event stays private until it is approved.':
    'एडमिनले समीक्षा गर्नेछन्। निर्णय मेरा कार्यक्रममा देखिन्छ। स्वीकृति नहुँदासम्म कार्यक्रम निजी रहन्छ।',
  'My events': 'मेरा कार्यक्रमहरू',
  'Browse events': 'कार्यक्रमहरू हेर्नुहोस्',
  'Sign in to organise an event': 'कार्यक्रम आयोजना गर्न साइन इन गर्नुहोस्',
  'Anyone can browse events. An account lets you submit an application and track the review decision under My events.':
    'जो कोहीले कार्यक्रम हेर्न सक्छ। खाता भएमा आवेदन पेश गर्न र निर्णय मेरा कार्यक्रममा हेर्न सकिन्छ।',

  // Nepali-translation section
  'Add Nepali translation': 'नेपाली विवरण थप्नुहोस्',
  'Hide Nepali fields': 'नेपाली विवरण लुकाउनुहोस्',
  'Shown to readers who switch the site to Nepali. Leave a field blank to fall back to the English text.':
    'साइट नेपालीमा हेर्नेहरूलाई देखाइन्छ। कुनै फाँट खाली छोडेमा अंग्रेजी पाठ देखिन्छ।',

  // Validation
  'Choose an event type.': 'कार्यक्रमको प्रकार छान्नुहोस्।',
  'Give the event a title.': 'कार्यक्रमको शीर्षक लेख्नुहोस्।',
  'Write at least 80 characters': 'कम्तीमा ८० अक्षर लेख्नुहोस्',
  'Pick a date.': 'मिति छान्नुहोस्।',
  'Choose today or a future date.': 'आज वा भविष्यको मिति छान्नुहोस्।',
  'Add a start time.': 'सुरु समय थप्नुहोस्।',
  'Add an end time.': 'अन्त्य समय थप्नुहोस्।',
  'End time must be after the start.': 'अन्त्य समय सुरु भन्दा पछि हुनुपर्छ।',
  'Enter a positive number.': 'सकारात्मक संख्या लेख्नुहोस्।',
  'Place the pin on the map.': 'नक्सामा पिन राख्नुहोस्।',
  'Add an address or landmark.': 'ठेगाना वा चिनारी थप्नुहोस्।',
  'Add a contact person.': 'सम्पर्क व्यक्ति थप्नुहोस्।',
  'Add a phone number.': 'फोन नम्बर थप्नुहोस्।',
  'Add an email.': 'इमेल थप्नुहोस्।',
  'Enter a valid email address.': 'मान्य इमेल ठेगाना लेख्नुहोस्।',
  'Please confirm before submitting.': 'पेश गर्नुअघि पुष्टि गर्नुहोस्।',
  'Please choose an image file.': 'कृपया एउटा तस्बिर फाइल छान्नुहोस्।',
  'Cover photos must be 1 MB or smaller.': 'आवरण तस्बिर १ MB वा सानो हुनुपर्छ।',
  'Documents must be 5 MB or smaller.': 'कागजात ५ MB वा सानो हुनुपर्छ।',
  'Documents must be a PDF or an image.': 'कागजात PDF वा तस्बिर हुनुपर्छ।',

  // Map chrome
  Legend: 'संकेत',
  Severity: 'गम्भीरता',
  Zones: 'क्षेत्रहरू',
  'High-severity zone': 'उच्च गम्भीरता क्षेत्र',
  'Problem-prone zone': 'समस्या बढी हुने क्षेत्र',
  'Other zone': 'अन्य क्षेत्र',
  'Single report': 'एकल रिपोर्ट',
  'High-severity zone ({n}+ reports within {r}, a high or critical one among them)':
    'उच्च गम्भीरता क्षेत्र ({r} भित्र {n}+ रिपोर्ट, तीमध्ये उच्च वा अति गम्भीर एउटा)',
  'Other zone ({n}+ reports within {r})': 'अन्य क्षेत्र ({r} भित्र {n}+ रिपोर्ट)',
  '{n} issues': '{n} समस्या',
  'Zone · {n}': 'क्षेत्र · {n}',
  'Event area (its radius)': 'कार्यक्रम क्षेत्र (यसको त्रिज्या)',
  'Reported problems and community events on one map. Select a pin for details.':
    'रिपोर्ट गरिएका समस्या र सामुदायिक कार्यक्रमहरू एउटै नक्सामा। विवरणका लागि पिन छान्नुहोस्।',
  Problems: 'समस्याहरू',
  Both: 'दुवै',
  'All types': 'सबै प्रकार',
  'Zone radius': 'क्षेत्र त्रिज्या',
  '{n} problem-prone zones': '{n} समस्या बढी हुने क्षेत्र',
  '{n} located': '{n} स्थान सहित',
  '{n} events': '{n} कार्यक्रम',
  '{n} located · {m} events': '{n} स्थान सहित · {m} कार्यक्रम',
  'Upcoming events': 'आउँदा कार्यक्रमहरू',
  'All events': 'सबै कार्यक्रम',
  'No upcoming events': 'आउँदो कार्यक्रम छैन',
  'No approved events match this filter yet.': 'यो फिल्टरसँग मिल्ने स्वीकृत कार्यक्रम अझै छैन।',
  'Events are not set up yet.': 'कार्यक्रमहरू अझै सेटअप भएका छैनन्।',
  'Located reports': 'स्थान सहितका रिपोर्टहरू',
  'Clear zone filter': 'क्षेत्र फिल्टर हटाउनुहोस्',
  'No located reports yet': 'स्थान सहितको रिपोर्ट अझै छैन',
  'Reports appear here once they have a map pin.': 'नक्सामा पिन भएपछि रिपोर्ट यहाँ देखिन्छ।',
  'Show on map': 'नक्सामा देखाउनुहोस्',
  'No reports with a map location yet.': 'नक्सा स्थान भएको रिपोर्ट अझै छैन।',
  'Zoom to zone': 'क्षेत्रमा जुम गर्नुहोस्',
  'View reports': 'रिपोर्टहरू हेर्नुहोस्',
  '{n} reports in this zone': 'यो क्षेत्रमा {n} रिपोर्ट',
  '{n} reports near {label}': '{label} नजिक {n} रिपोर्ट',
  'Tap to zoom the map.': 'नक्सा जुम गर्न थिच्नुहोस्।',
  'within about {r}.': 'करिब {r} भित्र।',
  'You reported this': 'यो तपाईंले रिपोर्ट गर्नुभयो',
  Verify: 'प्रमाणित गर्नुहोस्',
  Verified: 'प्रमाणित',
  'No photo attached': 'तस्बिर संलग्न छैन',
  '{n} verifications': '{n} प्रमाणीकरण',
  '{n} verification': '{n} प्रमाणीकरण',
  'Reported by {name}': 'रिपोर्ट गर्ने: {name}',
  'Sign in to join an event': 'कार्यक्रममा सहभागी हुन साइन इन गर्नुहोस्',
  Ended: 'समाप्त',
  'Event full': 'कार्यक्रम भरियो',
  'You are organising': 'तपाईं आयोजक हुनुहुन्छ',
  Join: 'सहभागी हुनुहोस्',
  Leave: 'छोड्नुहोस्',
  '{n} people going': '{n} जना सहभागी',
  '{n} going': '{n} जना',
  '{n} events at this spot': 'यही स्थानमा {n} कार्यक्रम',
  'Location on the map': 'नक्सामा स्थान',

  // Event form — progress and hints
  'Step {n} of 5': 'चरण {n} / ५',
  '{n}/80 characters minimum': '{n}/८० अक्षर न्यूनतम',
  'Write at least 80 characters ({n} so far).': 'कम्तीमा ८० अक्षर लेख्नुहोस् ({n} अक्षर अहिलेसम्म)।',

  // Event form — General review questions
  'Goal and beneficiaries': 'लक्ष्य र लाभग्राही',
  'What you want to achieve, and who benefits': 'तपाईं के हासिल गर्न चाहनुहुन्छ, र कसलाई फाइदा हुन्छ',
  'Expected attendance': 'अपेक्षित सहभागिता',
  'A rough number of people': 'अनुमानित मानिसको संख्या',
  'Permission from ward office or landowner': 'वडा कार्यालय वा जग्गाधनीको अनुमति',
  Yes: 'छ',
  'In progress': 'प्रक्रियामा',
  'Not needed': 'आवश्यक छैन',
  'Permission notes': 'अनुमति सम्बन्धी विवरण',
  'Reference or details (optional)': 'सन्दर्भ वा विवरण (वैकल्पिक)',
  'Safety plan': 'सुरक्षा योजना',
  'First aid, crowd control, weather plan': 'प्राथमिक उपचार, भीड नियन्त्रण, मौसम योजना',
  'Who provides materials or funding': 'सामग्री वा खर्च कसले गर्छ',
  'Sponsors, ward office, or self': 'प्रायोजक, वडा कार्यालय, वा आफैं',
  'Past similar events': 'विगतका समान कार्यक्रमहरू',
  'What you have run before (optional)': 'तपाईंले पहिले गरेका कार्यक्रम (वैकल्पिक)',
  'Free or fee': 'नि:शुल्क वा शुल्क',
  Free: 'नि:शुल्क',
  Fee: 'शुल्क',
  'Fee details': 'शुल्कको विवरण',
  'Amount and what it covers (optional)': 'रकम र के समेटिन्छ (वैकल्पिक)',

  // Event form — plantation questions
  'Species to plant': 'रोप्ने प्रजाति',
  'e.g. Neem, Jacaranda': 'जस्तै: निम, ज्याकरान्डा',
  'Sapling supplier': 'बिरुवा आपूर्तिकर्ता',
  'Nursery or ward office': 'नर्सरी वा वडा कार्यालय',
  'Site permission': 'स्थल अनुमति',
  'Landowner or ward office': 'जग्गाधनी वा वडा कार्यालय',
  'Watering plan': 'सिँचाइ योजना',
  'Who waters, and how often': 'कसले पानी हाल्छ, र कति पटक',

  // Event form — type-specific questions
  'Partner blood bank or hospital': 'साझेदार रक्त बैंक वा अस्पताल',
  'e.g. District Blood Bank': 'जस्तै: जिल्ला रक्त बैंक',
  'Registration number': 'दर्ता नम्बर',
  'Reference or licence number': 'सन्दर्भ वा इजाजतपत्र नम्बर',
  'Medical staff on site': 'स्थलमा चिकित्सकीय कर्मचारी',
  'Doctors and nurses attending': 'उपस्थित डाक्टर र नर्सहरू',
  'Waste type': 'फोहोरको प्रकार',
  'Plastic, organic, mixed…': 'प्लास्टिक, जैविक, मिश्रित…',
  'How waste will be disposed of': 'फोहोर कसरी व्यवस्थापन गरिन्छ',
  'Municipal truck, recycling…': 'नगरपालिकाको ट्रक, पुनःचक्रण…',
  'Gloves and bags': 'पन्जा र झोला',
  'Who provides them': 'कसले उपलब्ध गराउँछ',
  'Food type': 'खानाको प्रकार',
  'Cooked meal, dry ration…': 'पकाएको खाना, सुख्खा रासन…',
  'Hygiene plan': 'सरसफाइ योजना',
  'Kitchen and packing hygiene': 'भान्सा र प्याकिङको सरसफाइ',
  'Who receives it': 'कसले प्राप्त गर्छ',
  'Families, shelters…': 'परिवार, आश्रयस्थल…',
  'Doctors and specialists': 'डाक्टर र विशेषज्ञहरू',
  'Names or specialities': 'नाम वा विशेषज्ञता',
  'Registration / consent': 'दर्ता / सहमति',
  'How patients register': 'बिरामीहरू कसरी दर्ता हुन्छन्',

  // Event form — review summary
  Title: 'शीर्षक',
  Time: 'समय',
  Participants: 'सहभागीहरू',
  'Not chosen': 'छानिएको छैन',
  'Not set': 'सेट गरिएको छैन',
  'No limit': 'सीमा छैन',

  // Event detail and remaining map chrome
  'About this event': 'यो कार्यक्रमबारे',
  'Where and when': 'कहाँ र कहिले',
  'Back to events': 'कार्यक्रमहरूमा फर्कनुहोस्',
  "We couldn't find this event": 'यो कार्यक्रम भेटिएन',
  "It may have been removed, or it isn't public yet.":
    'यो हटाइएको हुन सक्छ, वा अझै सार्वजनिक भएको छैन।',
  'Events are not set up yet.': 'कार्यक्रमहरू अझै सेटअप गरिएका छैनन्।',
  'No note was left.': 'कुनै टिप्पणी छोडिएको छैन।',
  'Review only — admins cannot join or apply.':
    'समीक्षा मात्र — एडमिनले सहभागी वा आवेदन गर्न सक्दैनन्।',
  'Map layers': 'नक्सा तहहरू',
  Details: 'विवरण',
  Upcoming: 'आउँदै',
  Today: 'आज',
  Sample: 'नमुना',
  'Example data': 'नमुना डाटा',
  '+{n} more': 'थप {n}',

  // Relative timestamps (lib/reports.js)
  'Just now': 'भर्खरै',
  '{n} min ago': '{n} मिनेट अघि',
  '{n} hour ago': '{n} घण्टा अघि',
  '{n} hours ago': '{n} घण्टा अघि',
  '{n} day ago': '{n} दिन अघि',
  '{n} days ago': '{n} दिन अघि',

  // Event review statuses (Badges)
  Draft: 'मस्यौदा',
  'Pending review': 'समीक्षा बाँकी',
  'Changes requested': 'परिवर्तन अनुरोध',
  Approved: 'स्वीकृत',
  Rejected: 'अस्वीकृत',
  Cancelled: 'रद्द',
}

const NE = { ...NE_CORE, ...NE_LANDING, ...NE_AUTH, ...NE_REPORTS, ...NE_PAGES, ...NE_ADMIN }
