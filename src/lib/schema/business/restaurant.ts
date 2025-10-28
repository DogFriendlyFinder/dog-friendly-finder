import type { RestaurantSchema } from '../types'
import { generateAddressSchema } from '../core/address'
import { generateGeoSchema } from '../core/geo'
import { generateImagesSchema } from '../core/images'
import { generateRatingSchema } from '../core/rating'
import { generateHoursSchema } from '../core/hours'
import { generateCuisineSchema } from '../core/cuisine'
import { generateDogFeaturesSchema } from '../core/dog-features'
import { generatePaymentSchema } from '../core/payment'
import { generateReservationSchema } from '../core/reservation'
import { generateFAQPageSchema } from '../global/faq'

interface RestaurantInput {
  // Core identity
  slug: string
  name: string
  about: string | null

  // Location
  address: string
  city: string
  country: string
  latitude: number
  longitude: number

  // Contact
  phone: string | null
  website: string | null
  social_media_urls: Record<string, string> | null

  // Pricing & Cuisine
  price_range: string | null
  cuisines: string[]

  // Photos
  photos: Array<{
    url?: string
    public_url?: string
    caption?: string | null
    alt_text?: string | null
    width?: number | null
    height?: number | null
  }>

  // Ratings
  apify_output: Record<string, any> | null

  // Hours & Reservations
  hours: Record<string, any> | null
  reservations_url: string | null
  reservations_required: boolean

  // Dog-friendly features
  dogFeatures: string[]

  // FAQs
  faqs: Array<{
    question: string
    answer: string
  }> | null
}

/**
 * Generates complete Restaurant schema and FAQPage schema by composing core components
 *
 * @param input - Restaurant data from database
 * @returns Array containing RestaurantSchema and FAQPage schema (if FAQs exist)
 */
export function generateRestaurantSchema(input: RestaurantInput): Array<RestaurantSchema | ReturnType<typeof generateFAQPageSchema>> {
  const baseUrl = "https://www.dogfriendlyfinder.com"
  const restaurantUrl = `${baseUrl}/places-to-eat/restaurants/${input.slug}`

  // Build sameAs array (restaurant website + social media)
  const sameAs: string[] = []
  if (input.website) {
    sameAs.push(input.website)
  }
  if (input.social_media_urls) {
    if (input.social_media_urls.instagram) sameAs.push(input.social_media_urls.instagram)
    if (input.social_media_urls.facebook) sameAs.push(input.social_media_urls.facebook)
    if (input.social_media_urls.twitter) sameAs.push(input.social_media_urls.twitter)
    if (input.social_media_urls.tiktok) sameAs.push(input.social_media_urls.tiktok)
  }

  // Prepare images (handle both 'url' and 'public_url' fields)
  const imageInputs = input.photos.map(photo => ({
    url: photo.url || photo.public_url || '',
    caption: photo.caption,
    alt_text: photo.alt_text,
    width: photo.width,
    height: photo.height
  }))

  // Extract rating data from apify_output
  const ratingInput = input.apify_output?.totalScore && input.apify_output?.reviewsCount
    ? {
        totalScore: input.apify_output.totalScore,
        reviewsCount: input.apify_output.reviewsCount
      }
    : null

  // Extract payment data from apify_output
  const paymentMethods = input.apify_output?.additionalInfo?.Payments || null

  // Build the complete schema
  const schema: RestaurantSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": restaurantUrl,
    name: input.name,
    url: restaurantUrl,
    address: generateAddressSchema({
      address: input.address,
      city: input.city,
      country: input.country
    }),
    geo: generateGeoSchema({
      latitude: input.latitude,
      longitude: input.longitude
    })
  }

  // Add optional description
  if (input.about) {
    schema.description = input.about
  }

  // Add images
  const images = generateImagesSchema(imageInputs)
  if (images && images.length > 0) {
    schema.image = images
  }

  // Add telephone
  if (input.phone) {
    schema.telephone = input.phone
  }

  // Add sameAs
  if (sameAs.length > 0) {
    schema.sameAs = sameAs
  }

  // Add cuisines
  const cuisines = generateCuisineSchema(input.cuisines)
  if (cuisines) {
    schema.servesCuisine = cuisines
  }

  // Add price range
  if (input.price_range) {
    schema.priceRange = input.price_range
  }

  // Add menu link
  schema.hasMenu = {
    "@type": "Menu",
    url: `${restaurantUrl}#menu`
  }

  // Add rating
  const rating = generateRatingSchema(ratingInput)
  if (rating) {
    schema.aggregateRating = rating
  }

  // Add hours
  const hours = generateHoursSchema(input.hours)
  if (hours) {
    schema.openingHoursSpecification = hours
  }

  // Add reservation info
  const reservation = generateReservationSchema({
    reservationsUrl: input.reservations_url,
    reservationsRequired: input.reservations_required
  })
  schema.acceptsReservations = reservation.acceptsReservations
  if (reservation.potentialAction) {
    schema.potentialAction = reservation.potentialAction
  }

  // Add dog-friendly features
  const dogFeatures = generateDogFeaturesSchema(input.dogFeatures)
  if (dogFeatures) {
    schema.amenityFeature = dogFeatures
  }

  // Add payment info
  const payment = generatePaymentSchema(paymentMethods)
  schema.currenciesAccepted = payment.currenciesAccepted
  schema.paymentAccepted = payment.paymentAccepted

  // Generate FAQPage schema if FAQs exist
  const faqPageSchema = generateFAQPageSchema(input.faqs, input.slug)

  // Return array with Restaurant schema and FAQPage schema (if exists)
  const schemas: Array<RestaurantSchema | ReturnType<typeof generateFAQPageSchema>> = [schema]
  if (faqPageSchema) {
    schemas.push(faqPageSchema)
  }

  return schemas
}
