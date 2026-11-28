// Self-check for findProblemZones. No test runner in this project, so:
//   node scripts/check-zones.mjs
import assert from 'node:assert/strict'
import {
  ZONE_RADIUS_M,
  ZONE_RADIUS_OPTIONS,
  ZONE_TIER_COLOR,
  findProblemZones,
  haversineMeters,
} from '../lib/reports.js'

const LAT = 26.6646
const LNG = 87.2718
const M_PER_DEG_LAT = 111320

// A report `meters` due north of the base point.
const at = (meters, severity = 'medium', category = 'Road & Potholes', id = `r${meters}`) => ({
  id,
  latitude: LAT + meters / M_PER_DEG_LAT,
  longitude: LNG,
  severity,
  category,
})

const close = (actual, expected, eps = 1) =>
  assert.ok(Math.abs(actual - expected) <= eps, `expected ${expected} ± ${eps}, got ${actual}`)

// 1. One report → no zone, just a pin.
assert.deepEqual(findProblemZones([at(0)]), [])

// 2. Two reports 300 m apart, different categories → one zone that counts both.
const mixed = findProblemZones([
  at(0, 'high', 'Water Supply', 'a'),
  at(300, 'low', 'Electricity', 'b'),
])
assert.equal(mixed.length, 1)
assert.equal(mixed[0].count, 2)
assert.equal(mixed[0].score, 3 + 1)
assert.deepEqual(
  mixed[0].categories.map((c) => c.category),
  ['Electricity', 'Water Supply'].sort()
)
close(mixed[0].drawRadius, 300) // ~150 m to the far member + 150 m padding

// 3. Two reports 4 km apart → no zone, two plain pins.
assert.deepEqual(findProblemZones([at(0), at(4000)]), [])

// 4. Chain A–B–C: neighbours within 1 km, A–C 1.78 km → still one group of 3.
const chain = findProblemZones([at(0, 'critical', 'Drainage', 'a'), at(890, 'medium', 'Water Supply', 'b'), at(1780, 'high', 'Drainage', 'c')])
assert.equal(chain.length, 1)
assert.equal(chain[0].count, 3)
assert.equal(chain[0].severities.critical, 1)
assert.equal(chain[0].severities.high, 1)
assert.equal(chain[0].severities.medium, 1)

// 5. Centre is the centroid of the members.
assert.ok(Math.abs(chain[0].center.lat - (LAT + 890 / M_PER_DEG_LAT)) < 1e-9)

// 6. Radius selector changes the grouping; default is 1 km.
assert.deepEqual(findProblemZones([at(0), at(890)], 500), [])
assert.equal(findProblemZones([at(0), at(890)], 1000).length, 1)

// 7. drawRadius clamps: never wider than the radius, never below 250 m.
close(findProblemZones([at(0), at(890)], 1000)[0].drawRadius, 595)
const tight = findProblemZones([at(0), at(60)], 500)
assert.equal(tight[0].drawRadius, 250) // 30 m + 150 m padding, floored at 250 m
assert.ok(findProblemZones([at(0), at(2400)], 2500)[0].drawRadius <= 2500)

// 8. Invalid coordinates are ignored, not grouped.
assert.equal(
  findProblemZones([at(0), { id: 'bad', latitude: 0, longitude: 0, severity: 'low', category: 'Drainage' }]).length,
  0
)

// 9. Haversine sanity: 1 degree of latitude ≈ 111.2 km.
const km = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) / 1000
assert.ok(Math.abs(km - 111.19) < 0.2, `got ${km}`)

// 10. Severity tier: one high/critical report makes the whole zone "high",
//     a medium/low-only zone stays "moderate". Every tier has a colour.
assert.equal(mixed[0].severityTier, 'high') // one 'high' member
assert.equal(chain[0].severityTier, 'high') // one 'critical' member
assert.equal(
  findProblemZones([at(0, 'low', 'Drainage', 'a'), at(200, 'medium', 'Drainage', 'b')])[0]
    .severityTier,
  'moderate'
)
assert.equal(ZONE_TIER_COLOR.high, '#ff6b5a')
assert.equal(ZONE_TIER_COLOR.moderate, '#0b4a6f')

// 11. Every radius the toolbar offers stays at or under the 1 km default.
assert.deepEqual([...ZONE_RADIUS_OPTIONS].sort((a, b) => a - b), [500, 1000])
assert.ok(ZONE_RADIUS_OPTIONS.every((radius) => radius <= ZONE_RADIUS_M))

console.log('findProblemZones self-check: all assertions passed')
