"use client"

import { useRef, useEffect, useState } from "react"
import { useLoadScript } from "@react-google-maps/api"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

const libraries: ("places")[] = ["places"]

interface PlaceResult {
  place_id: string
  name: string
  formatted_address: string
  geometry?: {
    location: {
      lat: () => number
      lng: () => number
    }
  }
  rating?: number
  user_ratings_total?: number
  vicinity?: string
}

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceResult) => void
  placeholder?: string
}

export function PlacesAutocomplete({
  onPlaceSelect,
  placeholder = "Search for restaurants..."
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  })

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocomplete) return

    const autocompleteInstance = new google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["establishment"],
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "geometry",
          "rating",
          "user_ratings_total",
          "vicinity",
        ],
      }
    )

    autocompleteInstance.addListener("place_changed", () => {
      const place = autocompleteInstance.getPlace()

      if (!place.place_id) {
        return
      }

      const placeResult: PlaceResult = {
        place_id: place.place_id,
        name: place.name || "",
        formatted_address: place.formatted_address || "",
        geometry: place.geometry,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        vicinity: place.vicinity,
      }

      onPlaceSelect(placeResult)
    })

    setAutocomplete(autocompleteInstance)
  }, [isLoaded, autocomplete, onPlaceSelect])

  if (loadError) {
    return (
      <div className="text-destructive text-sm">
        Error loading Google Maps. Please check your API key.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading Google Maps...</span>
      </div>
    )
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      className="flex-1"
    />
  )
}
