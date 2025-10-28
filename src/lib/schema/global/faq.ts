interface FAQItem {
  question: string
  answer: string
}

interface FAQPageSchema {
  "@context": "https://schema.org"
  "@type": "FAQPage"
  "@id": string
  mainEntity: Array<{
    "@type": "Question"
    name: string
    acceptedAnswer: {
      "@type": "Answer"
      text: string
    }
  }>
}

/**
 * Generates FAQPage schema from restaurant FAQs
 *
 * @param faqs - Array of FAQ objects from database
 * @param restaurantSlug - Restaurant slug for @id
 * @returns FAQPage schema object or undefined if no FAQs
 */
export function generateFAQPageSchema(
  faqs: FAQItem[] | null | undefined,
  restaurantSlug: string
): FAQPageSchema | undefined {
  if (!faqs || faqs.length === 0) {
    return undefined
  }

  const baseUrl = "https://www.dogfriendlyfinder.com"
  const faqUrl = `${baseUrl}/places-to-eat/restaurants/${restaurantSlug}#faq`

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": faqUrl,
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  }
}
