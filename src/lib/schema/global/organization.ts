import type { OrganizationSchema } from '../types'

/**
 * Generates Organization schema for Dog Friendly Finder
 * This should be included site-wide (in root layout)
 *
 * SEO Benefits:
 * - Establishes brand entity in Google Knowledge Graph
 * - Displays logo, social profiles in search results
 * - Enhances brand recognition and trust signals
 */
export function generateOrganizationSchema(): OrganizationSchema {
  const baseUrl = "https://www.dogfriendlyfinder.com"

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    "name": "Dog Friendly Finder",
    "legalName": "Dog Friendly Finder Ltd",
    "url": baseUrl,
    "description": "The UK's leading guide to dog-friendly restaurants, hotels, and attractions. Discover verified dog-friendly venues with detailed information on facilities, restrictions, and amenities for your four-legged friend. From Michelin-starred restaurants to cosy country pubs, find the perfect dog-friendly experience across the United Kingdom.",

    // Founding & Identity
    "foundingDate": "2025",
    "foundingLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "London",
        "addressCountry": "GB"
      }
    },

    // Knowledge Areas (SEO Topic Authority)
    "knowsAbout": [
      "Dog-friendly restaurants in the UK",
      "Dog-friendly hotels in the UK",
      "Dog-friendly attractions in the UK",
      "Pet-friendly dining",
      "Dog amenities and facilities",
      "Dog-friendly travel in the United Kingdom",
      "Michelin-starred dog-friendly restaurants",
      "Dog-friendly outdoor seating",
      "Dog-friendly accommodation"
    ],

    // Contact Information
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "email": "hello@dogfriendlyfinder.com",
      "availableLanguage": "English"
    },

    // Founder
    "founder": {
      "@type": "Person",
      "name": "James Goodman",
      "jobTitle": "Founder"
    },

    // Service Area
    "areaServed": {
      "@type": "Country",
      "name": "United Kingdom",
      "@id": "https://en.wikipedia.org/wiki/United_Kingdom"
    },

    // Language
    "inLanguage": {
      "@type": "Language",
      "name": "English",
      "alternateName": "en-GB"
    },

    // Address
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "London",
      "addressCountry": "GB"
    },

    // Social Media
    "sameAs": [
      "https://www.instagram.com/dogfriendlyfinder",
      "https://www.tiktok.com/@dogfriendlyfinder",
      "https://twitter.com/DogFriendlyFind"
      // TODO: Add Facebook when created
    ]

    // Logo (TODO: Add when created)
    // "logo": {
    //   "@type": "ImageObject",
    //   "url": `${baseUrl}/logo.png`,
    //   "width": 600,
    //   "height": 600
    // }
  }
}
