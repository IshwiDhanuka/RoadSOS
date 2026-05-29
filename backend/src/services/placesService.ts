import type { ServiceCategory, ServiceRecord } from '../interfaces';
import { getEnv } from '../config/env';

const PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const PLACES_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';

const TYPE_MAP: Record<string, ServiceCategory> = {
  hospital: 'hospital',
  doctor: 'hospital',
  health: 'hospital',
  police: 'police',
  fire_station: 'fire_station',
  car_repair: 'mechanic',
  car_dealer: 'mechanic',
  gas_station: 'fuel',
  pharmacy: 'pharmacy',
};

function resolveCategory(types: string[]): ServiceCategory {
  /** Maps a Google Places type array to our ServiceCategory enum. Iterates through the
   *  types and returns the first match found in TYPE_MAP, or 'general' if none match. */
  for (const t of types) {
    const mapped = TYPE_MAP[t];
    if (mapped) return mapped;
  }
  return 'general';
}

interface PlacesResult {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
}

function toServiceRecord(place: PlacesResult): ServiceRecord | null {
  /** Converts a raw Google Places API result into a normalised ServiceRecord.
   *  Returns null if the place has no valid GPS coordinates, which causes it
   *  to be filtered out during the map/filter pipeline. */
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (lat == null || lng == null) return null;

  return {
    id: place.id,
    name: place.displayName?.text ?? 'Unknown',
    category: resolveCategory(place.types ?? []),
    lat,
    lng,
    address: place.formattedAddress ?? '',
    source: 'google',
    isVerified: false,
  };
}

export async function searchNearby(
  lat: number,
  lng: number,
  radiusMetres: number,
): Promise<ServiceRecord[]> {
  /** Calls the Google Places (New) Nearby Search API for emergency-relevant place types
   *  (hospital, police, fire_station, car_repair, gas_station, pharmacy) within the given
   *  radius. Returns up to 20 normalised ServiceRecords. Used on cache-miss path for
   *  GET /api/services/nearby. Throws on non-2xx API response. */
  const env = getEnv();

  const body = {
    includedTypes: [
      'hospital',
      'police',
      'fire_station',
      'car_repair',
      'gas_station',
      'pharmacy',
    ],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMetres,
      },
    },
  };

  const res = await fetch(PLACES_NEARBY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.types',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places Nearby API ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { places?: PlacesResult[] };
  return (data.places ?? []).map(toServiceRecord).filter(Boolean) as ServiceRecord[];
}

export async function searchText(
  query: string,
  lat: number,
  lng: number,
  radiusMetres: number,
): Promise<ServiceRecord[]> {
  /** Calls the Google Places (New) Text Search API with a free-form query string,
   *  biased towards the given GPS coordinates and radius. Returns up to 20 normalised
   *  ServiceRecords. Used by GET /api/services/search. Throws on non-2xx API response. */
  const env = getEnv();

  const body = {
    textQuery: query,
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMetres,
      },
    },
  };

  const res = await fetch(PLACES_TEXT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.types',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places Text Search API ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { places?: PlacesResult[] };
  return (data.places ?? []).map(toServiceRecord).filter(Boolean) as ServiceRecord[];
}
