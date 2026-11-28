// Nepali copy for the report surfaces: list, detail, the report form and the map
// page's report controls.
//
// Keyed by the English source string, exactly like the map in lib/i18n.js, which
// merges this map in.
export const NE_REPORTS = {
  // ---- List (ReportsBrowser) ----
  'Browse and filter every reported problem. Reports are public.':
    'हरेक रिपोर्ट गरिएको समस्या हेर्नुहोस् र फिल्टर गर्नुहोस्। रिपोर्टहरू सार्वजनिक हुन्छन्।',
  Filters: 'फिल्टरहरू',
  'Search reports': 'रिपोर्ट खोज्नुहोस्',
  'Search title, description or location': 'शीर्षक, विवरण वा स्थान खोज्नुहोस्',
  Category: 'श्रेणी',
  'All categories': 'सबै श्रेणी',
  Status: 'स्थिति',
  'All statuses': 'सबै स्थिति',
  'All severities': 'सबै गम्भीरता',
  Sort: 'क्रमबद्ध',
  'Newest first': 'नयाँ पहिले',
  'Oldest first': 'पुरानो पहिले',
  'Highest severity': 'उच्चतम गम्भीरता',
  'Clear all filters': 'सबै फिल्टर हटाउनुहोस्',
  'Clear filters': 'फिल्टर हटाउनुहोस्',
  'No reports match these filters': 'यी फिल्टरसँग मिल्ने रिपोर्ट छैन',
  'No reports yet': 'अझै रिपोर्ट छैन',
  'Try a different search term or clear the filters to see everything.':
    'अर्को खोज शब्द प्रयास गर्नुहोस् वा सबै हेर्न फिल्टर हटाउनुहोस्।',
  'Nothing has been reported yet. Be the first to flag a problem.':
    'अझै कुनै समस्या रिपोर्ट गरिएको छैन। समस्या औंल्याउने पहिलो व्यक्ति बन्नुहोस्।',
  'Showing {from}–{to} of {n} report': 'कुल {n} मध्ये {from}–{to} रिपोर्ट देखाइँदै',
  'Showing {from}–{to} of {n} reports': 'कुल {n} मध्ये {from}–{to} रिपोर्टहरू देखाइँदै',
  Pagination: 'पृष्ठ निर्धारण',
  Previous: 'अघिल्लो',
  'Page {page} of {total}': 'पृष्ठ {page} / {total}',

  // ---- Detail (ReportDetail) ----
  Report: 'रिपोर्ट',
  'Report not found': 'रिपोर्ट भेटिएन',
  'This report may have been removed, or the link is incorrect.':
    'यो रिपोर्ट हटाइएको हुन सक्छ, वा लिंक गलत छ।',
  'Back to reports': 'रिपोर्टहरूमा फर्कनुहोस्',
  'Report submitted successfully. It is now visible on the map.':
    'रिपोर्ट सफलतापूर्वक पेश गरियो। यो अब नक्सामा देखिन्छ।',
  'Report ID {id} · {category} · reported {when}':
    'रिपोर्ट ID {id} · {category} · {when} रिपोर्ट गरियो',
  'No description was provided.': 'कुनै विवरण दिइएको छैन।',
  Photo: 'तस्बिर',
  'Photo for: {title}': 'तस्बिर: {title}',
  'Progress timeline': 'प्रगति समयरेखा',
  'No status changes recorded yet.': 'अझै कुनै स्थिति परिवर्तन अभिलेख गरिएको छैन।',
  'Status & actions': 'स्थिति र कार्यहरू',
  'Reported by': 'रिपोर्ट गर्ने',
  Reported: 'रिपोर्ट मिति',
  'Last updated': 'अन्तिम अद्यावधिक',
  'Verified · {n}': 'प्रमाणित · {n}',
  'Verify this report · {n}': 'यो रिपोर्ट प्रमाणित गर्नुहोस् · {n}',
  'Sign in': 'साइन इन गर्नुहोस्',
  'to verify.': 'प्रमाणित गर्न।',
  'Sign in to verify a report.': 'रिपोर्ट प्रमाणित गर्न साइन इन गर्नुहोस्।',
  'Update status': 'स्थिति अद्यावधिक गर्नुहोस्',
  'New status': 'नयाँ स्थिति',
  Note: 'टिप्पणी',
  'Add a note (optional)': 'टिप्पणी थप्नुहोस् (वैकल्पिक)',
  'Updating…': 'अद्यावधिक गर्दै…',
  'Save status': 'स्थिति सुरक्षित गर्नुहोस्',
  Location: 'स्थान',
  'Open in map': 'नक्सामा खोल्नुहोस्',
  'No address given': 'ठेगाना दिइएको छैन',
  'This report has no map location.': 'यो रिपोर्टको नक्सा स्थान छैन।',
  'Verified by': 'प्रमाणित गर्नेहरू',
  'No verifications yet. Be the first to confirm this problem.':
    'अझै कुनै प्रमाणीकरण छैन। यो समस्या पुष्टि गर्ने पहिलो व्यक्ति बन्नुहोस्।',
  'person verified this report.': 'जनाले यो रिपोर्ट प्रमाणित गर्नुभयो।',
  'people verified this report.': 'जनाले यो रिपोर्ट प्रमाणित गर्नुभयो।',
  'Similar reports nearby': 'नजिकैका समान रिपोर्टहरू',
  'No other {category} reports within 500 m.':
    '५०० मिटर भित्र अन्य {category} रिपोर्ट छैन।',

  // ---- Form (ReportForm) ----
  'Sign in to report an issue': 'समस्या रिपोर्ट गर्न साइन इन गर्नुहोस्',
  'Anyone can read reports. An account keeps reports tied to a real reporter and lets you verify problems in your area.':
    'जो कोहीले रिपोर्ट पढ्न सक्छ। खाता भएमा रिपोर्ट साँचो व्यक्तिसँग जोडिन्छ र आफ्नो क्षेत्रका समस्या प्रमाणित गर्न सकिन्छ।',
  'Describe the problem and mark where it is. Reports are published immediately and can be verified by neighbours.':
    'समस्याको वर्णन गर्नुहोस् र कहाँ छ भनी चिन्ह लगाउनुहोस्। रिपोर्टहरू तुरुन्तै प्रकाशित हुन्छन् र छिमेकीहरूले प्रमाणित गर्न सक्छन्।',
  'Report title': 'रिपोर्टको शीर्षक',
  'e.g. Blocked drainage pipe near Ward 4': 'जस्तै: वडा ४ नजिक अवरुद्ध ढलको पाइप',
  'Select a category': 'श्रेणी छान्नुहोस्',
  'What is wrong, and how is it affecting people?':
    'के गल्ती छ, र यसले मानिसहरूलाई कसरी असर गर्दैछ?',
  'Describe the problem so neighbours can confirm it.':
    'छिमेकीहरूले पुष्टि गर्न सक्ने गरी समस्याको वर्णन गर्नुहोस्।',
  'Please enter a report title.': 'कृपया रिपोर्टको शीर्षक लेख्नुहोस्।',
  'Please select a category.': 'कृपया श्रेणी छान्नुहोस्।',
  'Please describe the problem.': 'कृपया समस्याको वर्णन गर्नुहोस्।',
  'Please enter the location.': 'कृपया स्थान लेख्नुहोस्।',
  'This browser cannot share your location.': 'यो ब्राउजरले तपाईंको स्थान साझा गर्न सक्दैन।',
  'Could not read your location. Set the pin on the map instead.':
    'तपाईंको स्थान पढ्न सकिएन। यसको सट्टा नक्सामा पिन राख्नुहोस्।',
  'e.g. Ward 5, near Bus Park': 'जस्तै: वडा ५, बस पार्क नजिक',
  'Pinpoint on the map': 'नक्सामा स्थान निर्धारण गर्नुहोस्',
  'Clear pin': 'पिन हटाउनुहोस्',
  'Use my location': 'मेरो स्थान प्रयोग गर्नुहोस्',
  'Locating…': 'स्थान पत्ता लगाउँदै…',
  'Pin at {coords} — click the map to move it.':
    '{coords} मा पिन — सार्न नक्सामा क्लिक गर्नुहोस्।',
  'Click the map to place a pin, or use your current location.':
    'पिन राख्न नक्सामा क्लिक गर्नुहोस्, वा आफ्नो हालको स्थान प्रयोग गर्नुहोस्।',
  'One photo, up to 5 MB. JPG, PNG or WebP.': 'एउटा तस्बिर, ५ MB सम्म। JPG, PNG वा WebP।',
  'Selected report photo': 'छानिएको रिपोर्ट तस्बिर',
  'Choose a photo': 'तस्बिर छान्नुहोस्',
  'A clear photo helps others confirm the problem.':
    'स्पष्ट तस्बिरले अरूलाई समस्या पुष्टि गर्न मद्दत गर्छ।',
  'Before you submit': 'पेश गर्नुअघि',
  'Not selected': 'छानिएको छैन',
  'Pinned on map': 'नक्सामा पिन गरिएको',
  'New reports start as {status} and appear on the map right away.':
    'नयाँ रिपोर्टहरू {status} का रूपमा सुरु हुन्छन् र तुरुन्तै नक्सामा देखिन्छन्।',
  'Submit report': 'रिपोर्ट पेश गर्नुहोस्',
  'Images must be 5 MB or smaller.': 'तस्बिरहरू ५ MB वा सानो हुनुपर्छ।',

  // ---- Image viewer (ReportImage) ----
  'Enlarge photo': 'तस्बिर ठूलो बनाउनुहोस्',
  'Photo could not be loaded.': 'तस्बिर लोड गर्न सकिएन।',
  Enlarge: 'ठूलो बनाउनुहोस्',
  Close: 'बन्द गर्नुहोस्',

  // ---- Data-layer error messages shown by these screens ----
  'The reports database is not set up yet. Apply supabase/schema.sql in Supabase.':
    'रिपोर्ट डाटाबेस अझै सेटअप भएको छैन। Supabase मा supabase/schema.sql लागू गर्नुहोस्।',
  'You do not have permission to do that. Sign in and try again.':
    'त्यो गर्न तपाईंलाई अनुमति छैन। साइन इन गरेर पुनः प्रयास गर्नुहोस्।',
  'Some report details were rejected. Check the values and try again.':
    'रिपोर्टका केही विवरण अस्वीकृत भए। मानहरू जाँच्नुहोस् र पुनः प्रयास गर्नुहोस्।',
  'Unable to load reports. Please try again.': 'रिपोर्टहरू लोड गर्न सकिएन। कृपया पुनः प्रयास गर्नुहोस्।',
}
