/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Move a point towards a target by a percentage of the total distance
 * @param fromLat Starting latitude
 * @param fromLon Starting longitude
 * @param toLat Target latitude
 * @param toLon Target longitude
 * @param percent Percentage to move (0-1)
 * @returns New coordinates
 */
export function moveTowards(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  percent: number
): { lat: number; lon: number } {
  return {
    lat: fromLat + (toLat - fromLat) * percent,
    lon: fromLon + (toLon - fromLon) * percent,
  };
}

/**
 * Calculate estimated time of arrival in seconds based on distance
 * Assumes average walking speed of 1.4 m/s (5 km/h)
 */
export function calculateETA(distanceMeters: number): number {
  const walkingSpeed = 1.4; // m/s
  return Math.round(distanceMeters / walkingSpeed);
}
