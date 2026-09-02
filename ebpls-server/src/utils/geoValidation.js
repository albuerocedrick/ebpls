const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;
const { point } = require('@turf/helpers');
const fs = require('fs');
const path = require('path');
const geojsonRaw = fs.readFileSync(path.join(__dirname, '../data/liliw-barangays.geojson'), 'utf-8');
const geojsonData = JSON.parse(geojsonRaw);

/**
 * Server-side mirror. Independent validation — does not trust the client flag.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} selectedBarangayName
 * @returns {boolean}  true = pin is inside selected barangay (no mismatch)
 */
function checkBarangayMatch(lat, lng, selectedBarangayName) {
  if (!lat || !lng || !selectedBarangayName) return true; // graceful

  const pin = point([lng, lat]);
  const normalizedSelected = selectedBarangayName.trim().toLowerCase();
  const selectedFeature = geojsonData.features.find(
    f => f.properties.name?.trim().toLowerCase() === normalizedSelected
  );

  if (!selectedFeature) return true; // no polygon data — skip validation
  return booleanPointInPolygon(pin, selectedFeature);
}

module.exports = { checkBarangayMatch };
