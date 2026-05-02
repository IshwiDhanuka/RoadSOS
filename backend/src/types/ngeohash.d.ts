declare module 'ngeohash' {
  /** Encode lat/lng to a geohash string of given precision. */
  export function encode(lat: number, lng: number, precision?: number): string;

  /** Decode a geohash string to { latitude, longitude }. */
  export function decode(hash: string): { latitude: number; longitude: number };

  /** Return the 8 neighbouring geohash cells. */
  export function neighbors(hash: string): string[];

  /** Decode a geohash to its bounding box [minlat, minlon, maxlat, maxlon]. */
  export function decode_bbox(hash: string): [number, number, number, number];

  /** Return all geohash cells within a bounding box at given precision. */
  export function bboxes(
    minlat: number,
    minlon: number,
    maxlat: number,
    maxlon: number,
    precision?: number,
  ): string[];
}
