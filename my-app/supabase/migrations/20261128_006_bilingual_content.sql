-- supabase/migrations/20261128_006_bilingual_content.sql
--
-- Purpose: English/Nepali content for the event and report tables.
--   public.events   -> title_ne, description_ne, address_ne
--   public.reports  -> location_name_ne   (the Nepali side of a problem-zone name)
--
-- The map and every list fall back to the English column whenever a Nepali one is
-- null or empty, so these columns are always safe to leave unset.
--
-- Run order: after supabase/migrations/20261128_002_events_tables.sql for events,
-- and after supabase/schema.sql for reports. Safe to run twice: the columns use
-- IF NOT EXISTS and each backfill only touches rows still holding null.
--
-- Row Level Security is untouched and stays intact: RLS is evaluated per row, and
-- 20261128_003_events_rls.sql already grants table-level SELECT on public.events
-- to anon and authenticated, with row-level insert/update policies for organisers
-- and admins. Adding nullable columns therefore needs no new policy and no new
-- grant, and nothing here widens what a row exposes. The same is true for
-- public.reports, whose policies live in schema.sql.

alter table public.events
  add column if not exists title_ne text,
  add column if not exists description_ne text,
  add column if not exists address_ne text;

alter table public.reports
  add column if not exists location_name_ne text;

comment on column public.events.title_ne is
  'Nepali event title. Shown instead of title when the reader switches to Nepali.';
comment on column public.events.description_ne is
  'Nepali event description. Falls back to description when null or empty.';
comment on column public.events.address_ne is
  'Nepali address or landmark. Falls back to address when null or empty.';
comment on column public.reports.location_name_ne is
  'Nepali place name. Falls back to location_name when null or empty.';

-- ---------------------------------------------------------------------------
-- Backfill: the six sample events inserted by supabase/seed/events_sample.sql
-- ---------------------------------------------------------------------------

update public.events set
  title_ne = 'सामुदायिक रक्तदान कार्यक्रम',
  description_ne = 'जिल्ला रक्तकोषसँग मिलेर बिहानको रक्तदान शिविर। परिचयपत्र लिएर आउनुहोस्, दानपछि आराम र खाजाको व्यवस्था छ। सबै रक्त समूहका दानकर्तालाई स्वागत छ।',
  address_ne = 'इटहरी स्वास्थ्य चौकी, वडा ४'
where id = 'a0000000-0000-4000-8000-000000000001' and title_ne is null;

update public.events set
  title_ne = 'सडक किनार वृक्षरोपण',
  description_ne = 'वडा ६ को सडक किनारमा बिरुवा रोप्ने र आउँदो सुक्खा सिजनका लागि सिँचाइ तालिका बनाउने कार्यक्रम। औजार र बिरुवा वडा कार्यालयले व्यवस्था गर्नेछ।',
  address_ne = 'वडा ६ सम्पर्क सडक, विद्यालय नजिक'
where id = 'a0000000-0000-4000-8000-000000000002' and title_ne is null;

update public.events set
  title_ne = 'सामुदायिक पार्कमा फूल रोपण',
  description_ne = 'सामुदायिक पार्कका क्यारीमा मौसमी फूल रोप्ने र मुख्य बाटो सफा गर्ने। परिवारसहित स्वागत छ, बालबालिका अभिभावकसँग मात्र।',
  address_ne = 'सामुदायिक पार्क, वडा २'
where id = 'a0000000-0000-4000-8000-000000000003' and title_ne is null;

update public.events set
  title_ne = 'वडा ८ सरसफाइ बिहान',
  description_ne = 'वर्षापछि जम्मा भएको सडक किनारको फोहोर हटाउने, पुनःप्रयोग हुने सामान छुट्याउने र बाँकी नगरपालिकाको गाडीलाई बुझाउने।',
  address_ne = 'बजार सडक, वडा ८'
where id = 'a0000000-0000-4000-8000-000000000004' and title_ne is null;

update public.events set
  title_ne = 'तातो खाना वितरण',
  description_ne = 'बसपार्क वरिपरि बस्ने परिवारका लागि तातो खाना पकाएर प्याक गर्ने र आवश्यक परे सानो किराना प्याक पनि दिने।',
  address_ne = 'बसपार्क सामुदायिक भवन, वडा ३'
where id = 'a0000000-0000-4000-8000-000000000005' and title_ne is null;

update public.events set
  title_ne = 'निःशुल्क स्वास्थ्य जाँच शिविर',
  description_ne = 'स्वयंसेवक चिकित्सकसहित सामान्य जाँच शिविर: रक्तचाप, रक्त सुगर र आधारभूत परामर्श, निःशुल्क, पहिले आउनेलाई पहिले सेवा।',
  address_ne = 'सामुदायिक भवन, वडा ५'
where id = 'a0000000-0000-4000-8000-000000000006' and title_ne is null;

-- ---------------------------------------------------------------------------
-- Backfill: the demo reports inserted by supabase/seed.sql.
-- Problem zones are computed on the client from these rows, so their Nepali names
-- come from the report that names the area. Any other row keeps null and reads in
-- English until someone fills the column in.
-- ---------------------------------------------------------------------------

update public.reports set location_name_ne = case location_name
    when 'Itahari Chowk, Ward 5' then 'इटहरी चोक, वडा ५'
    when 'Dharan Road, Ward 5' then 'धरान सडक, वडा ५'
    when 'Biratnagar Line, Ward 4' then 'विराटनगर लाइन, वडा ४'
    when 'Khanar, Ward 3' then 'खनार, वडा ३'
    when 'Tarahara, Ward 2' then 'तरहरा, वडा २'
    when 'Itahari, Ward 7' then 'इटहरी, वडा ७'
  end
where location_name_ne is null
  and location_name in (
    'Itahari Chowk, Ward 5',
    'Dharan Road, Ward 5',
    'Biratnagar Line, Ward 4',
    'Khanar, Ward 3',
    'Tarahara, Ward 2',
    'Itahari, Ward 7'
  );

-- Verification (optional, read-only):
--   select count(*) as events_with_nepali from public.events where title_ne is not null;
--   select count(*) as reports_with_nepali from public.reports where location_name_ne is not null;
