// Base schema types
export interface SchemaContext {
  "@context": "https://schema.org"
  "@type": string | string[]
  "@id"?: string
}

// Restaurant schema
export interface RestaurantSchema extends SchemaContext {
  "@type": "Restaurant"
  name: string
  description?: string
  url: string
  image?: ImageObject[]
  address: PostalAddress
  geo: GeoCoordinates
  telephone?: string
  sameAs?: string[]
  servesCuisine?: string[]
  priceRange?: string
  hasMenu?: Menu
  aggregateRating?: AggregateRating
  openingHoursSpecification?: OpeningHoursSpecification[]
  acceptsReservations?: boolean
  potentialAction?: ReserveAction
  amenityFeature?: LocationFeatureSpecification[]
  currenciesAccepted?: string
  paymentAccepted?: string[]
}

// Core component types
export interface PostalAddress {
  "@type": "PostalAddress"
  streetAddress?: string
  addressLocality?: string
  addressRegion?: string
  postalCode?: string
  addressCountry?: string
}

export interface GeoCoordinates {
  "@type": "GeoCoordinates"
  latitude: number
  longitude: number
}

export interface ImageObject {
  "@type": "ImageObject"
  url: string
  caption?: string
  width?: string
  height?: string
}

export interface AggregateRating {
  "@type": "AggregateRating"
  ratingValue: string
  ratingCount: string
  bestRating?: string
  worstRating?: string
}

export interface OpeningHoursSpecification {
  "@type": "OpeningHoursSpecification"
  dayOfWeek: string
  opens: string
  closes: string
}

export interface Menu {
  "@type": "Menu"
  url: string
}

export interface ReserveAction {
  "@type": "ReserveAction"
  target: EntryPoint
}

export interface EntryPoint {
  "@type": "EntryPoint"
  urlTemplate: string
}

export interface LocationFeatureSpecification {
  "@type": "LocationFeatureSpecification"
  name: string
  value: boolean
}

// Database input types
export interface RestaurantData {
  id: string
  name: string
  slug: string
  about: string | null
  address: string
  phone: string | null
  latitude: number
  longitude: number
  city: string
  country: string
  price_range: string | null
  hours: Record<string, any> | null
  website: string | null
  social_media_urls: Record<string, string> | null
  apify_output: Record<string, any> | null
  reservations_url: string | null
  reservations_required: boolean
}

export interface PhotoData {
  public_url: string
  caption: string | null
  alt_text: string | null
  width: number | null
  height: number | null
  display_order: number
}

export interface CuisineData {
  name: string
}

export interface FeatureData {
  name: string
  feature_category: string
}
