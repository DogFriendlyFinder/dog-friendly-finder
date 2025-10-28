import type { ReserveAction } from '../types'

interface ReservationInput {
  reservationsUrl?: string | null
  reservationsRequired: boolean
}

interface ReservationSchema {
  acceptsReservations: boolean
  potentialAction?: ReserveAction
}

/**
 * Generates ReserveAction schema for booking integration
 *
 * @param input - Reservation data from database
 * @returns Object with acceptsReservations and optional potentialAction
 */
export function generateReservationSchema(input: ReservationInput): ReservationSchema {
  const schema: ReservationSchema = {
    acceptsReservations: input.reservationsRequired
  }

  // Only include potentialAction if reservation URL exists
  if (input.reservationsUrl) {
    schema.potentialAction = {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: input.reservationsUrl
      }
    }
  }

  return schema
}
