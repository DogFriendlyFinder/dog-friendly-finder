import type { GeoCoordinates } from '../types'

interface GeoInput {
  latitude: number
  longitude: number
}

/**
 * Transforms latitude/longitude into GeoCoordinates schema
 *
 * @param input - Geo data from database
 * @returns GeoCoordinates schema object
 */
export function generateGeoSchema(input: GeoInput): GeoCoordinates {
  const { latitude, longitude } = input

  // Validate ranges
  if (latitude < -90 || latitude > 90) {
    console.warn(`Invalid latitude: ${latitude}. Should be between -90 and 90.`)
  }
  if (longitude < -180 || longitude > 180) {
    console.warn(`Invalid longitude: ${longitude}. Should be between -180 and 180.`)
  }

  return {
    "@type": "GeoCoordinates",
    latitude: Number(latitude),
    longitude: Number(longitude)
  }
}
