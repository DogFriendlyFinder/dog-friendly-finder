/**
 * Generates servesCuisine array from cuisine names
 *
 * @param cuisines - Array of cuisine names
 * @returns Array of cuisine strings or undefined
 */
export function generateCuisineSchema(cuisines: string[] | null | undefined): string[] | undefined {
  if (!cuisines || cuisines.length === 0) {
    return undefined
  }

  // Limit to 5 cuisines maximum to avoid over-tagging
  return cuisines.slice(0, 5)
}
