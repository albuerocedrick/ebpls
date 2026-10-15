import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import geojsonRaw from '../data/liliw-barangays.geojson?raw';
export const geojsonData = JSON.parse(geojsonRaw);

/**
 * Checks whether a lat/lng coordinate falls within the polygon for a given
 * barangay name. Case-insensitive name match against the GeoJSON features.
 *
 * @param {number} lat  Latitude of the pin
 * @param {number} lng  Longitude of the pin
 * @param {string} selectedBarangayName  Barangay selected in the form
 * @returns {{ isMatch: boolean, detectedBarangay: string|null }}
 */
export function checkBarangayMatch(lat, lng, selectedBarangayName) {
  if (!lat || !lng || !selectedBarangayName) {
    return { isMatch: true, detectedBarangay: null }; // graceful: missing data = no warning
  }

  const pin = point([lng, lat]); // GeoJSON order: [longitude, latitude]
  const normalizedSelected = selectedBarangayName.trim().toLowerCase();
  let selectedFeature = null;
  let detectedBarangay = null;

  for (const feature of geojsonData.features) {
    const featureName = feature.properties.name?.trim().toLowerCase();
    if (featureName === normalizedSelected) selectedFeature = feature;
    if (booleanPointInPolygon(pin, feature)) detectedBarangay = feature.properties.name;
  }

  // If no polygon exists for the selected barangay, skip validation gracefully
  if (!selectedFeature) return { isMatch: true, detectedBarangay };

  return { isMatch: booleanPointInPolygon(pin, selectedFeature), detectedBarangay };
}
