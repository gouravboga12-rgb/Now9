// Enterprise Mapbox Geolocation & Mapping Service for Now 9
// Uses VITE_MAPBOX_TOKEN securely loaded from environment variables (never hardcoded in source)

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

/**
 * Checks if the Mapbox token is configured
 * @returns {boolean}
 */
export function isMapboxEnabled() {
  return Boolean(MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith('pk.'));
}

/**
 * Reverse geocodes GPS coordinates into detailed Indian address components
 * using Mapbox Geocoding v5 API.
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{
 *   locality: string,
 *   city: string,
 *   district: string,
 *   state: string,
 *   pincode: string,
 *   formattedAddress: string,
 *   rawFeatures: Array
 * } | null>}
 */
export async function reverseGeocodeMapbox(lat, lon) {
  if (!isMapboxEnabled()) {
    console.warn('[Mapbox] Token not found in VITE_MAPBOX_TOKEN');
    return null;
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=address,neighborhood,locality,place,district,postcode,region&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[Mapbox] Geocode HTTP error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      return null;
    }

    const features = data.features;
    let locality = '';
    let city = '';
    let district = '';
    let state = 'Telangana';
    let pincode = '';
    let fullAddress = features[0]?.place_name || '';

    // Parse features to extract granular Indian administrative levels
    for (const f of features) {
      const type = f.place_type?.[0];
      if (type === 'neighborhood' && !locality) {
        locality = f.text;
      } else if (type === 'locality' && !locality) {
        locality = f.text;
      } else if (type === 'place' && !city) {
        city = f.text;
      } else if (type === 'district' && !district) {
        district = f.text;
      } else if (type === 'region') {
        state = f.text;
      } else if (type === 'postcode' && !pincode) {
        pincode = f.text;
      }

      // Check context hierarchy if present
      if (f.context) {
        for (const ctx of f.context) {
          if (ctx.id.startsWith('neighborhood') && !locality) locality = ctx.text;
          if (ctx.id.startsWith('locality') && !locality) locality = ctx.text;
          if (ctx.id.startsWith('place') && !city) city = ctx.text;
          if (ctx.id.startsWith('district') && !district) district = ctx.text;
          if (ctx.id.startsWith('region')) state = ctx.text;
          if (ctx.id.startsWith('postcode') && !pincode) pincode = ctx.text;
        }
      }
    }

    // Default fallbacks
    if (!district && city) district = city;
    if (!city && district) city = district;
    if (!locality && city) locality = city;

    return {
      locality: locality || city || 'Hyderabad',
      city: city || 'Hyderabad',
      district: district || city || 'Hyderabad',
      state: state || 'Telangana',
      pincode: pincode || '',
      formattedAddress: fullAddress,
      rawFeatures: features
    };
  } catch (err) {
    console.error('[Mapbox] Reverse geocoding failed:', err);
    return null;
  }
}

/**
 * Searches for places, wards, or constituencies across Telangana / AP
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchPlacesMapbox(query) {
  if (!isMapboxEnabled() || !query?.trim()) return [];

  try {
    const encoded = encodeURIComponent(query.trim());
    // Bounding box for Telangana / Andhra Pradesh region to prioritize local results
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=in&bbox=77.0,15.5,81.5,19.9&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    return data.features || [];
  } catch (err) {
    console.error('[Mapbox] Forward search error:', err);
    return [];
  }
}

/**
 * Generates a high-resolution dark-mode map snippet centered on coordinates
 * with a golden Now 9 custom pin (#f5c754)
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {object} options
 * @returns {string} Image URL
 */
export function getMapboxStaticMapUrl(lat, lon, options = {}) {
  if (!isMapboxEnabled() || !lat || !lon) return '';

  const zoom = options.zoom || 13;
  const width = options.width || 400;
  const height = options.height || 200;
  const pinColor = options.pinColor || 'f5c754'; // Now 9 Golden Yellow

  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+${pinColor}(${lon},${lat})/${lon},${lat},${zoom},0/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;
}
