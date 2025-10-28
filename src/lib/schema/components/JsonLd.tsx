import React from 'react'

interface JsonLdProps {
  data: object | object[]
}

/**
 * Renders JSON-LD schema markup for SEO
 *
 * This component should be placed in the page component (Next.js automatically
 * places it in the <head> section for proper SEO indexing)
 *
 * @param data - Schema object or array of schema objects
 */
export function JsonLd({ data }: JsonLdProps) {
  // Minify JSON for production (no pretty-print)
  const jsonString = JSON.stringify(data, null, 0)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  )
}
