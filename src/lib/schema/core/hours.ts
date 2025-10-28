import type { OpeningHoursSpecification } from '../types'

interface DayHours {
  open?: string
  close?: string
  closed?: boolean
}

type HoursInput = Record<string, DayHours>

/**
 * Transforms operating hours JSONB into OpeningHoursSpecification array
 *
 * @param hours - Hours data from database
 * @returns Array of OpeningHoursSpecification objects
 */
export function generateHoursSchema(hours: HoursInput | null | undefined): OpeningHoursSpecification[] | undefined {
  if (!hours) {
    return undefined
  }

  const dayMapping: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday"
  }

  const hoursArray: OpeningHoursSpecification[] = []

  for (const [day, dayHours] of Object.entries(hours)) {
    // Skip closed days
    if (dayHours.closed) {
      continue
    }

    // Skip if no open/close times
    if (!dayHours.open || !dayHours.close) {
      continue
    }

    // Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/
    if (!timeRegex.test(dayHours.open) || !timeRegex.test(dayHours.close)) {
      console.warn(`Invalid time format for ${day}: ${dayHours.open} - ${dayHours.close}`)
      continue
    }

    const capitalizedDay = dayMapping[day.toLowerCase()] || day

    hoursArray.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: capitalizedDay,
      opens: dayHours.open,
      closes: dayHours.close
    })
  }

  return hoursArray.length > 0 ? hoursArray : undefined
}
