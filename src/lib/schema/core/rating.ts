import type { AggregateRating } from '../types'

interface RatingInput {
  totalScore: number
  reviewsCount: number
}

/**
 * Transforms review data into AggregateRating schema
 *
 * @param input - Rating data (usually from apify_output)
 * @returns AggregateRating schema object or undefined if no data
 */
export function generateRatingSchema(input: RatingInput | null | undefined): AggregateRating | undefined {
  if (!input || !input.totalScore || !input.reviewsCount) {
    return undefined
  }

  const { totalScore, reviewsCount } = input

  // Round to 1 decimal place
  const roundedScore = Math.round(totalScore * 10) / 10

  return {
    "@type": "AggregateRating",
    ratingValue: String(roundedScore),
    ratingCount: String(reviewsCount),
    bestRating: "5",
    worstRating: "1"
  }
}
