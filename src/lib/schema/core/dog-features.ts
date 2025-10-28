import type { LocationFeatureSpecification } from '../types'

/**
 * Generates amenityFeature array for dog-friendly attributes
 *
 * Note: We use LocationFeatureSpecification (not petsAllowed) because
 * petsAllowed is NOT valid for Restaurant type in schema.org
 *
 * @param features - Array of dog-friendly feature names
 * @returns Array of LocationFeatureSpecification objects or undefined
 */
export function generateDogFeaturesSchema(features: string[] | null | undefined): LocationFeatureSpecification[] | undefined {
  if (!features || features.length === 0) {
    return undefined
  }

  // Convert feature names to LocationFeatureSpecification objects
  return features.map(name => ({
    "@type": "LocationFeatureSpecification",
    name,
    value: true
  }))
}
