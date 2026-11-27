-- Optional demo content for a fresh project, so the dashboard and map are not
-- empty on first run. Run AFTER schema.sql. These are stored community records
-- (ownerless, since seeded rows have no auth account), not hardcoded UI data.
--
-- Delete this file's rows any time with:
--   delete from public.reports where reporter_name like '%(demo)';

with inserted as (
  insert into public.reports
    (reporter_name, title, description, category, severity, status,
     location_name, latitude, longitude, created_at)
  values
    ('Aarav S. (demo)', 'Deep pothole near Main Chowk intersection',
     'Large water-filled pothole blocking the northbound lane; two bikes slipped here this morning.',
     'Road & Potholes', 'critical', 'in_progress', 'Itahari Chowk, Ward 5',
     26.6646, 87.2718, now() - interval '40 minutes'),
    ('Nisha K. (demo)', 'Broken asphalt and exposed drainage grate',
     'The metal grate cover is dislodged and the road edge has collapsed along the school route.',
     'Road & Potholes', 'high', 'pending', 'Dharan Road, Ward 5',
     26.6710, 87.2735, now() - interval '3 hours'),
    ('Rohan T. (demo)', 'Road subsidence after overnight rain',
     'Surface cracking across half the street width is making ambulance access difficult.',
     'Drainage', 'high', 'pending', 'Biratnagar Line, Ward 4',
     26.6580, 87.2720, now() - interval '6 hours'),
    ('Sita M. (demo)', 'Overflowing community waste bin',
     'Garbage has not been collected for three days and is spilling onto the footpath.',
     'Waste Management', 'medium', 'resolved', 'Khanar, Ward 3',
     26.6350, 87.2705, now() - interval '2 days'),
    ('Bikash G. (demo)', 'Streetlight flickering near community park',
     'Pole 14 LED light keeps cutting out every few minutes after dusk.',
     'Electricity', 'low', 'pending', 'Tarahara, Ward 2',
     26.7010, 87.2760, now() - interval '3 days'),
    ('Prakash B. (demo)', 'Low water pressure on ward line',
     'Supply drops to a trickle every evening between 6pm and 9pm for several households.',
     'Water Supply', 'medium', 'in_progress', 'Itahari, Ward 7',
     26.6690, 87.2800, now() - interval '4 days')
  returning id, status, created_at
)
insert into public.report_status_history (report_id, status, note, created_at)
select id, status, 'Imported demo record.', created_at from inserted;
