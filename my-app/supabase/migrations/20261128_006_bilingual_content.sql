-- supabase/migrations/20261128_006_bilingual_content.sql
--
-- Purpose: English/Nepali content for the reports and (optional) events tables.
--   public.reports  -> title_ne, description_ne, location_name_ne
--   public.events   -> title_ne, description_ne, address_ne (if public.events exists)
--
-- Safe to run multiple times (idempotent) and reloads PostgREST's schema cache.

-- ---------------------------------------------------------------------------
-- 1. public.reports bilingual columns
-- ---------------------------------------------------------------------------

alter table public.reports
  add column if not exists title_ne text,
  add column if not exists description_ne text,
  add column if not exists location_name_ne text;

comment on column public.reports.title_ne is
  'Nepali report title. Falls back to title when null or empty.';
comment on column public.reports.description_ne is
  'Nepali report description. Falls back to description when null or empty.';
comment on column public.reports.location_name_ne is
  'Nepali place name. Falls back to location_name when null or empty.';

update public.reports
set location_name_ne = case location_name
    when 'Itahari Chowk, Ward 5' then 'इटहरी चोक, वडा ५'
    when 'Dharan Road, Ward 5' then 'धरान सडक, वडा ५'
    when 'Biratnagar Line, Ward 4' then 'विराटनगर लाइन, वडा ४'
    when 'Khanar, Ward 3' then 'खनार, वडा ३'
    when 'Tarahara, Ward 2' then 'तरहरा, वडा २'
    when 'Itahari, Ward 7' then 'इटहरी, वडा ७'
    else location_name_ne
  end
where (location_name_ne is null or location_name_ne = '')
  and location_name in (
    'Itahari Chowk, Ward 5',
    'Dharan Road, Ward 5',
    'Biratnagar Line, Ward 4',
    'Khanar, Ward 3',
    'Tarahara, Ward 2',
    'Itahari, Ward 7'
  );

-- ---------------------------------------------------------------------------
-- 2. public.events bilingual columns & backfill (skipped safely if events table is absent)
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.events') is not null then
    alter table public.events
      add column if not exists title_ne text,
      add column if not exists description_ne text,
      add column if not exists address_ne text;

    comment on column public.events.title_ne is
      'Nepali event title. Shown instead of title when the reader switches to Nepali.';
    comment on column public.events.description_ne is
      'Nepali event description. Falls back to description when null or empty.';
    comment on column public.events.address_ne is
      'Nepali address or landmark. Falls back to address when null or empty.';

    update public.events set
      title_ne = 'सामुदायिक रक्तदान कार्यक्रम',
      description_ne = 'जिल्ला रक्तकोषसँग मिलेर बिहानको रक्तदान शिविर। परिचयपत्र लिएर आउनुहोस्, दानपछि आराम र खाजाको व्यवस्था छ। सबै रक्त समूहका दानकर्तालाई स्वागत छ।',
      address_ne = 'इटहरी स्वास्थ्य चौकी, वडा ४'
    where id = 'a0000000-0000-4000-8000-000000000001'
      and (title_ne is null or title_ne = '');

    update public.events set
      title_ne = 'सडक किनार वृक्षरोपण',
      description_ne = 'वडा ६ को सडक किनारमा बिरुवा रोप्ने र आउँदो सुक्खा सिजनका लागि सिँचाइ तालिका बनाउने कार्यक्रम। औजार र बिरुवा वडा कार्यालयले व्यवस्था गर्नेछ।',
      address_ne = 'वडा ६ सम्पर्क सडक, विद्यालय नजिक'
    where id = 'a0000000-0000-4000-8000-000000000002'
      and (title_ne is null or title_ne = '');

    update public.events set
      title_ne = 'सामुदायिक पार्कमा फूल रोपण',
      description_ne = 'सामुदायिक पार्कका क्यारीमा मौसमी फूल रोप्ने र मुख्य बाटो सफा गर्ने। परिवारसहित स्वागत छ, बालबालिका अभिभावकसँग मात्र।',
      address_ne = 'सामुदायिक पार्क, वडा २'
    where id = 'a0000000-0000-4000-8000-000000000003'
      and (title_ne is null or title_ne = '');

    update public.events set
      title_ne = 'वडा ८ सरसफाइ बिहान',
      description_ne = 'वर्षापछि जम्मा भएको सडक किनारको फोहोर हटाउने, पुनःप्रयोग हुने सामान छुट्याउने र बाँकी नगरपालिकाको गाडीलाई बुझाउने।',
      address_ne = 'बजार सडक, वडा ८'
    where id = 'a0000000-0000-4000-8000-000000000004'
      and (title_ne is null or title_ne = '');

    update public.events set
      title_ne = 'तातो खाना वितरण',
      description_ne = 'बसपार्क वरिपरि बस्ने परिवारका लागि तातो खाना पकाएर प्याक गर्ने र आवश्यक परे सानो किराना प्याक पनि दिने।',
      address_ne = 'बसपार्क सामुदायिक भवन, वडा ३'
    where id = 'a0000000-0000-4000-8000-000000000005'
      and (title_ne is null or title_ne = '');

    update public.events set
      title_ne = 'निःशुल्क स्वास्थ्य जाँच शिविर',
      description_ne = 'स्वयंसेवक चिकित्सकसहित सामान्य जाँच शिविर: रक्तचाप, रक्त सुगर र आधारभूत परामर्श, निःशुल्क, पहिले आउनेलाई पहिले सेवा।',
      address_ne = 'सामुदायिक भवन, वडा ५'
    where id = 'a0000000-0000-4000-8000-000000000006'
      and (title_ne is null or title_ne = '');
  end if;
end $$;

-- Refresh PostgREST schema cache so new columns are immediately queryable
notify pgrst, 'reload schema';