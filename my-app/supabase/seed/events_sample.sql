-- supabase/seed/events_sample.sql
-- Purpose: optional example events so the map and Events page are not empty.
--          This is NOT a migration — run it only if you want sample data.
-- Run order: after supabase/migrations/20261128_002_events_tables.sql.
--          The title_ne / description_ne / address_ne columns come from
--          20261128_006_bilingual_content.sql; drop those three values if you
--          have not run it yet.
-- safe to run twice

-- BEFORE RUNNING: replace the placeholder organizer id below with a real
-- auth.users id (Authentication -> Users -> copy the UID). The six events are
-- inserted as already approved so they are instantly public.
--
--   organizer uuid: '00000000-0000-0000-0000-000000000000'  <-- REPLACE ME

insert into public.events (
  id, organizer_id, type, title, description,
  event_date, start_time, end_time, address, ward,
  latitude, longitude, radius_m, max_participants, what_to_bring,
  organization_name, contact_name, contact_phone, contact_email,
  status, submitted_at,
  title_ne, description_ne, address_ne
)
values
  (
    'a0000000-0000-4000-8000-000000000001', -- fixed id keeps this file re-runnable
    '00000000-0000-0000-0000-000000000000', -- <-- REPLACE with a real user id
    'blood_donation',
    'Community blood donation drive',
    'A morning blood donation camp with the district blood bank. Walk in with an ID; rest and refreshments afterwards.',
    current_date + 3, '08:00', '13:00',
    'Itahari Health Post, Ward 4', 'Ward 4',
    26.6646, 87.2718, 150, 120, 'Photo ID. Eat breakfast before donating.',
    'Sajha Pahal Volunteers', 'Sample organiser', '9800000000', 'hello@example.com',
    'approved', now(),
    'सामुदायिक रक्तदान कार्यक्रम',
    'जिल्ला रक्तकोषसँग मिलेर बिहानको रक्तदान शिविर। परिचयपत्र लिएर आउनुहोस्, दानपछि आराम र खाजाको व्यवस्था छ। सबै रक्त समूहका दानकर्तालाई स्वागत छ।',
    'इटहरी स्वास्थ्य चौकी, वडा ४'
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'tree_plantation',
    'Roadside tree plantation',
    'Plant saplings along the Ward 6 link road and set up a watering roster for the dry weeks ahead.',
    current_date + 7, '07:30', '11:00',
    'Ward 6 link road, near the school', 'Ward 6',
    26.6720, 87.2810, 200, 60, 'Gloves if you have them, and drinking water.',
    'Green Ward 6', 'Sample organiser', '9800000000', 'hello@example.com',
    'approved', now(),
    'सडक किनार वृक्षरोपण',
    'वडा ६ को सडक किनारमा बिरुवा रोप्ने र आउँदो सुक्खा सिजनका लागि सिँचाइ तालिका बनाउने कार्यक्रम। औजार र बिरुवा वडा कार्यालयले व्यवस्था गर्नेछ।',
    'वडा ६ सम्पर्क सडक, विद्यालय नजिक'
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'flower_plantation',
    'Flowers for the community park',
    'Add seasonal flowers to the community park beds and tidy the central walkway. Families welcome.',
    current_date + 10, '09:00', '12:00',
    'Community park, Ward 2', 'Ward 2',
    26.6585, 87.2645, 150, 40, 'Sunny-weather clothes and a water bottle.',
    'Park Care Group', 'Sample organiser', '9800000000', 'hello@example.com',
    'approved', now(),
    'सामुदायिक पार्कमा फूल रोपण',
    'सामुदायिक पार्कका क्यारीमा मौसमी फूल रोप्ने र मुख्य बाटो सफा गर्ने। परिवारसहित स्वागत छ, बालबालिका अभिभावकसँग मात्र।',
    'सामुदायिक पार्क, वडा २'
  ),
  (
    'a0000000-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'cleanliness',
    'Ward 8 clean-up morning',
    'Clear the roadside waste left after the rains, sort what can be recycled, and hand the rest to the municipal truck.',
    current_date + 14, '07:00', '10:30',
    'Market road, Ward 8', 'Ward 8',
    26.6715, 87.2590, 250, 80, 'Gloves and a mask. Bags are provided.',
    'Ward 8 Youth Club', 'Sample organiser', '9800000000', 'hello@example.com',
    'approved', now(),
    'वडा ८ सरसफाइ बिहान',
    'वर्षापछि जम्मा भएको सडक किनारको फोहोर हटाउने, पुनःप्रयोग हुने सामान छुट्याउने र बाँकी नगरपालिकाको गाडीलाई बुझाउने।',
    'बजार सडक, वडा ८'
  ),
  (
    'a0000000-0000-4000-8000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'food_donation',
    'Hot meal distribution',
    'Cook and pack hot meals for families staying near the bus park, and hand them out with a small grocery pack.',
    current_date + 21, '17:30', '20:00',
    'Bus park community hall, Ward 3', 'Ward 3',
    26.6670, 87.2760, 150, 45, 'An apron if you have one. Food is prepared on site.',
    'Annapurna Sewa', 'Sample organiser', '9800000000', 'hello@example.com',
    'approved', now(),
    'तातो खाना वितरण',
    'बसपार्क वरिपरि बस्ने परिवारका लागि तातो खाना पकाएर प्याक गर्ने र आवश्यक परे सानो किराना प्याक पनि दिने।',
    'बसपार्क सामुदायिक भवन, वडा ३'
  ),
  (
    'a0000000-0000-4000-8000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'health_camp',
    'Free health check-up camp',
    'A general check-up camp with volunteer doctors: blood pressure, blood sugar and basic consultations, free of charge.',
    current_date + 30, '09:00', '15:00',
    'Community hall, Ward 5', 'Ward 5',
    26.6610, 87.2685, 150, 200, 'Any medicine you are taking, and your health card if you have one.',
    'Itahari Medics Network', 'Sample organiser', '9800000000', 'hello@example.com',
    'approved', now(),
    'निःशुल्क स्वास्थ्य जाँच शिविर',
    'स्वयंसेवक चिकित्सकसहित सामान्य जाँच शिविर: रक्तचाप, रक्त सुगर र आधारभूत परामर्श, निःशुल्क, पहिले आउनेलाई पहिले सेवा।',
    'सामुदायिक भवन, वडा ५'
  )
on conflict (id) do nothing;
