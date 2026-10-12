-- CivicFix seed: staff profile, 15 realistic civic reports around San
-- Francisco's Civic Center, consistent confirmation counts, status timelines.

BEGIN;

TRUNCATE report_status_events, report_confirmations, reports, profiles
RESTART IDENTITY CASCADE;

INSERT INTO profiles (email, role) VALUES
  ('ops@civicfix.city', 'admin');

INSERT INTO reports
  (title, description, category, status, latitude, longitude, image_url,
   upvote_count, created_at, updated_at)
VALUES
  ('Deep pothole damaging wheels on Grove St',
   'Right lane immediately after the crossing. At least 6 inches deep and filling with gravel; two cars bottomed out this morning.',
   'pothole', 'pending', 37.77843, -122.41885, '/uploads/seed-pothole-1.jpg', 4,
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  ('Streetlight flickering all night on Larkin',
   'Lamp cycles on and off every few seconds after dark. Stretch between Eddy and Turk is nearly pitch black.',
   'street_light', 'in_progress', 37.77721, -122.41542, '/uploads/seed-street-light-1.jpg', 12,
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 days'),

  ('Sidewalk slab lifted by tree root',
   'Concrete heaved about 3 inches, hard to see at night. Wheelchair and stroller routing is blocked.',
   'sidewalk', 'pending', 37.77810, -122.41120, '/uploads/seed-sidewalk-1.jpg', 2,
   NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days'),

  ('Signal stuck on red at Hyde & McAllister',
   'Eastbound signal has not cycled in two hours; drivers are treating it as a four-way stop.',
   'traffic_signal', 'investigating', 37.78036, -122.41334, '/uploads/seed-traffic-1.jpg', 18,
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 hours'),

  ('Mattress and debris dumped in alley',
   'A mattress, paint cans and broken furniture dumped beside the garage entrance; growing pile for a week.',
   'illegal_dumping', 'pending', 37.78122, -122.41021, '/uploads/seed-dumping-2.jpg', 7,
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

  ('Asphalt crater after the 4th St crossing',
   'Whole stretch of patched asphalt dropped away; cyclists swerving into the main lane to avoid it.',
   'pothole', 'resolved', 37.77692, -122.41765, '/uploads/seed-pothole-2.jpg', 9,
   NOW() - INTERVAL '21 days', NOW() - INTERVAL '16 days'),

  ('Three lamps out on the library block',
   'Every lamp on the north side facing the library is dark; the corner feels unsafe after 8pm.',
   'street_light', 'pending', 37.78105, -122.41620, '/uploads/seed-street-light-2.jpg', 5,
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  ('Cracked pavement tripping hazard near plaza',
   'Long fracture with loose chunks right where people queue for the food trucks. One fall witnessed.',
   'sidewalk', 'investigating', 37.77640, -122.41396, '/uploads/seed-sidewalk-2.jpg', 3,
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),

  ('Ped signal not responding at crossing',
   'Button gives no confirmation and the walk phase never triggers; pedestrians crossing against traffic.',
   'traffic_signal', 'in_progress', 37.78230, -122.40890, '/uploads/seed-traffic-2.jpg', 11,
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '12 hours'),

  ('Overflowing trash heaps behind market lot',
   'Commercial bins long gone; loose refuse spreading onto the walkway and blocking half the path.',
   'illegal_dumping', 'resolved', 37.77490, -122.40950, '/uploads/seed-dumping-3.jpg', 14,
   NOW() - INTERVAL '16 days', NOW() - INTERVAL '3 days'),

  ('Pothole cluster in right lane downhill',
   'Four connected holes along the descent; buses kick up loose asphalt at every pass.',
   'pothole', 'in_progress', 37.77986, -122.40590, '/uploads/seed-pothole-3.jpg', 22,
   NOW() - INTERVAL '9 days', NOW() - INTERVAL '4 hours'),

  ('Lamp post buzzing loudly at dusk',
   'Audible electrical buzz when the lamp strikes on each evening.',
   'street_light', 'dismissed', 37.77530, -122.41980, '/uploads/seed-street-light-3.jpg', 1,
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'),

  ('Chunks of concrete spalling off curb ramp',
   'ADA ramp surface is breaking apart; loose gravel on the slope is slippery when wet.',
   'sidewalk', 'pending', 37.78310, -122.41250, '/uploads/seed-sidewalk-3.jpg', 6,
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

  ('Traffic light knocked loose by truck',
   'Head rotated toward the buildings after a delivery truck clipped the mast arm; signal faces the wrong way.',
   'traffic_signal', 'pending', 37.77740, -122.42240, '/uploads/seed-traffic-3.jpg', 8,
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

  ('Waste scattered across parking strip',
   'Loose litter spread across the courtesy strip and into the planter beds after bins overflowed.',
   'illegal_dumping', 'investigating', 37.77460, -122.41440, '/uploads/seed-dumping-1.jpg', 10,
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 days');

-- Confirmation ledger matching upvote_count (unique client hashes).
INSERT INTO report_confirmations (report_id, client_hash, created_at)
SELECT r.id, 'seed-' || r.id || '-' || g, r.created_at + (INTERVAL '3 hours' * g)
FROM reports r
JOIN LATERAL generate_series(1, r.upvote_count) AS g ON TRUE;

-- Every report starts with a "logged" event.
INSERT INTO report_status_events (report_id, from_status, to_status, note, created_at)
SELECT r.id, NULL, 'pending', 'Report submitted by a resident', r.created_at
FROM reports r;

-- Forward transitions for triaged work.
INSERT INTO report_status_events (report_id, from_status, to_status, created_at)
SELECT r.id, 'pending', 'investigating', r.created_at + INTERVAL '1 day'
FROM reports r
WHERE r.status IN ('investigating', 'in_progress', 'resolved');

INSERT INTO report_status_events (report_id, from_status, to_status, created_at)
SELECT r.id, 'investigating', 'in_progress', r.created_at + INTERVAL '2 days'
FROM reports r
WHERE r.status IN ('in_progress', 'resolved');

INSERT INTO report_status_events (report_id, from_status, to_status, note, created_at)
SELECT r.id, 'in_progress', 'resolved', 'Crew completed repair and verified on site', r.created_at + INTERVAL '5 days'
FROM reports r
WHERE r.status = 'resolved';

INSERT INTO report_status_events (report_id, from_status, to_status, note, created_at)
SELECT r.id, 'pending', 'dismissed', 'Referred to the utility provider — out of city scope', r.created_at + INTERVAL '2 days'
FROM reports r
WHERE r.status = 'dismissed';

-- Keep updated_at aligned with the newest timeline event.
UPDATE reports r
SET updated_at = (
  SELECT MAX(e.created_at) FROM report_status_events e WHERE e.report_id = r.id
);

COMMIT;
