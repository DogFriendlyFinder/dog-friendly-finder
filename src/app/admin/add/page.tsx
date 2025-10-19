"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlacesAutocomplete } from "@/components/places-autocomplete"
import { MapPin, Star, Users } from "lucide-react"
import { Separator } from "@/components/ui/separator"

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

type ProcessStatus = 'pending' | 'loading' | 'completed' | 'error'

interface ProcessStages {
  fetchingPlaceData: ProcessStatus
  fetchingMenu: ProcessStatus
  uploadingImages: ProcessStatus
  analysingImages: ProcessStatus
  storingImages: ProcessStatus
  generatingContent: ProcessStatus
  mappingFields: ProcessStatus
  uploadingToDatabase: ProcessStatus
}

export default function AddPage() {
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [stages, setStages] = useState<ProcessStages>({
    fetchingPlaceData: 'pending',
    fetchingMenu: 'pending',
    uploadingImages: 'pending',
    analysingImages: 'pending',
    storingImages: 'pending',
    generatingContent: 'pending',
    mappingFields: 'pending',
    uploadingToDatabase: 'pending',
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('ldrs').then(({ ring }) => {
        ring.register()
      })
    }
  }, [])

  const handlePlaceSelect = (place: PlaceResult) => {
    setSelectedPlace(place)
  }

  const handleRun = () => {
    setIsRunning(true)
    // This will trigger the pipeline
  }

  const renderStatusIndicator = (status: ProcessStatus) => {
    switch (status) {
      case 'pending':
        return <div className="w-[14px] h-[14px] rounded-full border-[3px] border-[#d1d5db]"></div>
      case 'loading':
        return (
          <l-ring
            size="14"
            stroke="3"
            bg-opacity="0"
            speed="2"
            color="#d1d5db"
          ></l-ring>
        )
      case 'completed':
        return <div className="w-[14px] h-[14px] rounded-full border-[3px] border-green-500 bg-green-500"></div>
      case 'error':
        return <div className="w-[14px] h-[14px] rounded-full border-[3px] border-red-500 bg-red-500"></div>
    }
  }

  return (
    <div className="flex h-full">
      {/* Left Column - Search Panel */}
      <div className="w-96 border-r bg-muted/30 p-6 overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold">Context</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Add restaurants to the Dog Friendly Finder directory
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">2</span>
            </div>
            <h2 className="font-semibold">Restaurant Sources</h2>
          </div>

          <PlacesAutocomplete
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search restaurants..."
          />

          {selectedPlace && (
            <div className="mt-4">
              <div className="rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{selectedPlace.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {selectedPlace.formatted_address || selectedPlace.vicinity}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {selectedPlace.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">{selectedPlace.rating}</span>
                        </div>
                      )}
                      {selectedPlace.user_ratings_total && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span>({selectedPlace.user_ratings_total})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full mt-4"
            size="sm"
            onClick={handleRun}
            disabled={!selectedPlace}
          >
            Run
          </Button>

          {isRunning && (
            <>
              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Fetching Place Data</span>
                  {renderStatusIndicator(stages.fetchingPlaceData)}
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Fetching Menu</span>
                  {renderStatusIndicator(stages.fetchingMenu)}
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Uploading Images</span>
                  {renderStatusIndicator(stages.uploadingImages)}
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Analysing Images</span>
                  {renderStatusIndicator(stages.analysingImages)}
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Storing Images</span>
                  {renderStatusIndicator(stages.storingImages)}
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Generating Content</span>
                  {renderStatusIndicator(stages.generatingContent)}
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Mapping Fields</span>
                  {renderStatusIndicator(stages.mappingFields)}
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Uploading to Database</span>
                  {renderStatusIndicator(stages.uploadingToDatabase)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Middle Column - Extracted Data */}
      <div className="w-96 border-r bg-muted/30 p-6 overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold">Extracted Data</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Data extracted from multiple sources
          </p>
        </div>

{isRunning && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">1</span>
                </div>
                <h3 className="font-semibold text-sm">Basic Information</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Google Place ID</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Slug</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Cuisine</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Address</span>
                  <span className="text-xs font-medium text-right">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Phone</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Latitude</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Longitude</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Coordinates</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Neighborhood</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Price Range</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Website</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Instagram</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Facebook</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Menu</span>
                  <span className="text-xs font-medium">-</span>
                </div>
              </div>
            </div>

            {/* Photos */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">2</span>
                </div>
                <h3 className="font-semibold text-sm">Photos</h3>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="aspect-square bg-muted rounded"></div>
                <div className="aspect-square bg-muted rounded"></div>
                <div className="aspect-square bg-muted rounded"></div>
                <div className="aspect-square bg-muted rounded"></div>
              </div>
            </div>

            {/* Ratings */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">3</span>
                </div>
                <h3 className="font-semibold text-sm">Ratings</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Google</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">TripAdvisor</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">OpenTable</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">The Fork</span>
                  <span className="text-xs font-medium">-</span>
                </div>
              </div>
            </div>

            {/* Operational Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">4</span>
                </div>
                <h3 className="font-semibold text-sm">Operational Info</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-xs text-muted-foreground">Hours</span>
                  <span className="text-xs font-medium text-right">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Reservations Required</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Dress Code</span>
                  <span className="text-xs font-medium">-</span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">5</span>
                </div>
                <h3 className="font-semibold text-sm">Features</h3>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">-</div>
              </div>
            </div>

            {/* Restaurant Meals */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">6</span>
                </div>
                <h3 className="font-semibold text-sm">Restaurant Meals</h3>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">-</div>
              </div>
            </div>

            {/* Accessibility Features */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">7</span>
                </div>
                <h3 className="font-semibold text-sm">Accessibility Features</h3>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">-</div>
              </div>
            </div>

            {/* Awards & Recognition */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">8</span>
                </div>
                <h3 className="font-semibold text-sm">Awards & Recognition</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">AA Rosettes</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Michelin Stars</span>
                  <span className="text-xs font-medium">-</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Menu */}
      <div className="flex-1 overflow-y-auto bg-muted/30 p-6">
        {isRunning && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-semibold">Menu</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Menu items extracted from sources
              </p>
            </div>

            <div className="space-y-6">
              {/* No Menu Data */}
              <div className="text-xs text-muted-foreground">-</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
