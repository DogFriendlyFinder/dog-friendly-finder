import type { PostalAddress } from '../types'

interface AddressInput {
  address: string
  city: string
  country: string
}

/**
 * Transforms database address fields into PostalAddress schema
 *
 * @param input - Address data from database
 * @returns PostalAddress schema object
 */
export function generateAddressSchema(input: AddressInput): PostalAddress {
  const { address, city, country } = input

  // Extract postcode using UK postcode regex
  const postcodeMatch = address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i)
  const postcode = postcodeMatch ? postcodeMatch[1].trim() : undefined

  // Extract street address by removing city and postcode
  let streetAddress = address
  if (postcode) {
    streetAddress = streetAddress.replace(new RegExp(postcode, 'i'), '').trim()
  }
  // Remove city from end if present
  if (city && streetAddress.endsWith(city)) {
    streetAddress = streetAddress.substring(0, streetAddress.length - city.length).trim()
  }
  // Remove trailing comma
  streetAddress = streetAddress.replace(/,\s*$/, '').trim()

  // Convert country name to ISO 3166-1 alpha-2 code
  const countryCode = country === 'United Kingdom' ? 'GB' : country

  return {
    "@type": "PostalAddress",
    streetAddress,
    addressLocality: city,
    postalCode: postcode,
    addressCountry: countryCode
  }
}
