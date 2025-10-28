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
  apifyFetch: ProcessStatus
  firecrawlFetch: ProcessStatus
  downloadingImages: ProcessStatus
  filteringImages: ProcessStatus
  uploadingImages: ProcessStatus
  generatingContent: ProcessStatus
  mappingFields: ProcessStatus
  uploadingToDatabase: ProcessStatus
}

interface ApifyData {
  title?: string
  description?: string
  price?: string
  categoryName?: string
  address?: string
  street?: string
  city?: string
  postalCode?: string
  countryCode?: string
  website?: string
  phone?: string
  location?: {
    lat: number
    lng: number
  }
  menu?: string
  totalScore?: number
  reviewsCount?: number
  openingHours?: Array<{
    day: string
    hours: string
  }>
  popularTimesHistogram?: {
    [key: string]: Array<{
      hour: number
      occupancyPercent: number
    }>
  }
  additionalInfo?: {
    Pets?: Array<{ "Dogs allowed"?: boolean }>
    Planning?: Array<{ "Accepts reservations"?: boolean }>
    [key: string]: any
  }
  reviewsTags?: Array<{
    title: string
    count: number
  }>
  placeId?: string
}

export default function AddPage() {
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)
  const [isCardClicked, setIsCardClicked] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [apifyData, setApifyData] = useState<ApifyData | null>(null)
  const [stages, setStages] = useState<ProcessStages>({
    apifyFetch: 'pending',
    firecrawlFetch: 'pending',
    downloadingImages: 'pending',
    filteringImages: 'pending',
    uploadingImages: 'pending',
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
    console.log('=== RAW GOOGLE PLACES DATA ===')
    console.log(JSON.stringify(place, null, 2))
    console.log('=== END RAW DATA ===')
    setSelectedPlace(place)
    setIsCardClicked(false) // Reset card click when new place is selected
  }

  const handleCardClick = () => {
    setIsCardClicked(true)
  }

  const handleRun = async () => {
    if (!selectedPlace?.place_id) return

    // Reset all stages to pending when starting a new run
    setStages({
      apifyFetch: 'pending',
      firecrawlFetch: 'pending',
      downloadingImages: 'pending',
      filteringImages: 'pending',
      uploadingImages: 'pending',
      generatingContent: 'pending',
      mappingFields: 'pending',
      uploadingToDatabase: 'pending',
    })

    setIsRunning(true)

    try {
      // Step A: Create restaurant record immediately
      console.log('Creating restaurant record...')

      const lat = typeof selectedPlace.geometry?.location.lat === 'function'
        ? selectedPlace.geometry.location.lat()
        : selectedPlace.geometry?.location.lat || 0

      const lng = typeof selectedPlace.geometry?.location.lng === 'function'
        ? selectedPlace.geometry.location.lng()
        : selectedPlace.geometry?.location.lng || 0

      const createResponse = await fetch('/api/restaurants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_place_id: selectedPlace.place_id,
          name: selectedPlace.name,
          address: selectedPlace.formatted_address,
          latitude: lat,
          longitude: lng
        })
      })

      if (!createResponse.ok) {
        const responseText = await createResponse.text()
        console.error('Create response status:', createResponse.status)
        console.error('Create response body:', responseText)

        try {
          const errorData = JSON.parse(responseText)
          if (errorData.isDuplicate) {
            alert('This restaurant has already been added to the database. Please select a different restaurant.')
          } else {
            alert(`Failed to create restaurant: ${errorData.details || errorData.error}`)
          }
        } catch (e) {
          console.error('Failed to parse error response as JSON')
          alert('Failed to create restaurant. Please check the console for details.')
        }
        setIsRunning(false)
        return
      }

      const createResult = await createResponse.json()
      const newRestaurantId = createResult.restaurant_id
      setRestaurantId(newRestaurantId)

      console.log('Restaurant created with ID:', newRestaurantId)

      // Step B & C: Run Apify and Firecrawl in PARALLEL for faster processing
      console.log('Starting Apify and Firecrawl fetches in parallel...')
      setStages(prev => ({ ...prev, apifyFetch: 'loading', firecrawlFetch: 'loading' }))

      const [apifyResponse, firecrawlResponse] = await Promise.all([
        // Apify fetch
        fetch(`/api/restaurants/${newRestaurantId}/apify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place_id: selectedPlace.place_id })
        }),
        // Firecrawl fetch (using Google Places data, Apify website will be added later by images step)
        fetch(`/api/restaurants/${newRestaurantId}/firecrawl`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant_name: selectedPlace.name,
            address: selectedPlace.formatted_address,
            website: null // Will be populated from Apify data later
          })
        })
      ])

      console.log('Parallel fetch complete - Apify status:', apifyResponse.status, 'Firecrawl status:', firecrawlResponse.status)

      // Handle Apify response
      if (!apifyResponse.ok) {
        const apifyErrorText = await apifyResponse.text()
        console.error('Apify fetch failed:', apifyErrorText)
        try {
          const apifyError = JSON.parse(apifyErrorText)
          console.error('Apify error details:', apifyError)
          alert(`Apify fetch failed: ${apifyError.error || apifyError.details}`)
        } catch (e) {
          console.error('Could not parse Apify error response')
          alert('Apify fetch failed. Check console for details.')
        }
        setStages(prev => ({ ...prev, apifyFetch: 'error' }))
        setIsRunning(false)
        return
      }

      const apifyResult = await apifyResponse.json()
      console.log('Apify result:', apifyResult)

      if (apifyResult.success && apifyResult.data) {
        setApifyData(apifyResult.data)
        setStages(prev => ({ ...prev, apifyFetch: 'completed' }))
        console.log('Apify data fetched and stored successfully')
      } else {
        console.error('Apify result missing success or data:', apifyResult)
        setStages(prev => ({ ...prev, apifyFetch: 'error' }))
        alert('Apify fetch completed but no data was returned')
        setIsRunning(false)
        return
      }

      // Handle Firecrawl response
      if (!firecrawlResponse.ok) {
        const firecrawlErrorText = await firecrawlResponse.text()
        console.error('Firecrawl fetch failed:', firecrawlErrorText)
        try {
          const firecrawlError = JSON.parse(firecrawlErrorText)
          console.error('Firecrawl error details:', firecrawlError)
          alert(`Firecrawl fetch failed: ${firecrawlError.error || firecrawlError.details}`)
        } catch (e) {
          console.error('Could not parse Firecrawl error response')
          alert('Firecrawl fetch failed. Check console for details.')
        }
        setStages(prev => ({ ...prev, firecrawlFetch: 'error' }))
      } else {
        const firecrawlResult = await firecrawlResponse.json()
        console.log('Firecrawl result:', firecrawlResult)

        if (firecrawlResult.success) {
          setStages(prev => ({ ...prev, firecrawlFetch: 'completed' }))
          console.log('Firecrawl data fetched and stored successfully')
          console.log('Summary:', firecrawlResult.summary)
        } else {
          console.error('Firecrawl result missing success:', firecrawlResult)
          setStages(prev => ({ ...prev, firecrawlFetch: 'error' }))
          alert('Firecrawl fetch completed but no data was returned')
        }
      }

      // Step D: Download, filter and upload images (requires Apify for website URL)
      console.log('Starting image download for restaurant ID:', newRestaurantId)
      setStages(prev => ({ ...prev, downloadingImages: 'loading' }))

      // Start the image processing API call
      const imagesPromise = fetch(`/api/restaurants/${newRestaurantId}/images/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      // Simulate stage progression while API is processing
      // The backend does: download → filter → upload, but returns only when complete
      // So we show realistic progress timing based on typical durations

      // Stage 1: Downloading (simulate ~3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000))
      setStages(prev => ({ ...prev, downloadingImages: 'completed', filteringImages: 'loading' }))
      console.log('Image download stage complete, starting filtering...')

      // Stage 2: Filtering with AI (simulate ~4 seconds)
      await new Promise(resolve => setTimeout(resolve, 4000))
      setStages(prev => ({ ...prev, filteringImages: 'completed', uploadingImages: 'loading' }))
      console.log('Image filtering stage complete, starting upload...')

      // Stage 3: Wait for actual API response (uploading)
      const imagesResponse = await imagesPromise
      console.log('Images response status:', imagesResponse.status)

      if (!imagesResponse.ok) {
        const imagesErrorText = await imagesResponse.text()
        console.error('Image upload failed:', imagesErrorText)
        try {
          const imagesError = JSON.parse(imagesErrorText)
          console.error('Image upload error details:', imagesError)
          alert(`Image upload failed: ${imagesError.error || imagesError.details}`)
        } catch (e) {
          console.error('Could not parse image upload error response')
          alert('Image upload failed. Check console for details.')
        }
        setStages(prev => ({ ...prev, uploadingImages: 'error' }))
        setIsRunning(false)
        return
      }

      const imagesResult = await imagesResponse.json()
      console.log('Images result:', imagesResult)

      if (imagesResult.success) {
        // Mark final stage as completed
        setStages(prev => ({ ...prev, uploadingImages: 'completed' }))
        console.log(`Images uploaded: ${imagesResult.uploaded_count}/${imagesResult.total_processed}`)
      } else {
        console.error('Image upload result missing success:', imagesResult)
        setStages(prev => ({ ...prev, uploadingImages: 'error' }))
        alert('Image upload completed but no images were uploaded')
        setIsRunning(false)
        return
      }

      // Step E: Generate content (slug, about, social media, cuisines, categories, neighbourhood)
      console.log('Starting content generation for restaurant ID:', newRestaurantId)
      setStages(prev => ({ ...prev, generatingContent: 'loading' }))

      const generateContentResponse = await fetch(`/api/restaurants/${newRestaurantId}/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      console.log('Generate content response status:', generateContentResponse.status)

      if (!generateContentResponse.ok) {
        const generateContentErrorText = await generateContentResponse.text()
        console.error('Content generation failed:', generateContentErrorText)
        try {
          const generateContentError = JSON.parse(generateContentErrorText)
          console.error('Content generation error details:', generateContentError)
          alert(`Content generation failed: ${generateContentError.error || generateContentError.details}`)
        } catch (e) {
          console.error('Could not parse content generation error response')
          alert('Content generation failed. Check console for details.')
        }
        setStages(prev => ({ ...prev, generatingContent: 'error' }))
        setIsRunning(false)
        return
      }

      const generateContentResult = await generateContentResponse.json()
      console.log('Generate content result:', generateContentResult)

      if (!generateContentResult.success) {
        console.error('Content generation result missing success:', generateContentResult)
        setStages(prev => ({ ...prev, generatingContent: 'error' }))
        alert('Content generation completed but no content was returned')
        setIsRunning(false)
        return
      }

      setStages(prev => ({ ...prev, generatingContent: 'completed' }))
      console.log('Content generated successfully')
      console.log('Generated content:', generateContentResult.raw_anthropic_output)

      // Step F: Map fields (process Anthropic output)
      console.log('Starting field mapping for restaurant ID:', newRestaurantId)
      setStages(prev => ({ ...prev, mappingFields: 'loading' }))

      const mapFieldsResponse = await fetch(`/api/restaurants/${newRestaurantId}/map-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthropic_output: generateContentResult.raw_anthropic_output
        })
      })

      console.log('Map fields response status:', mapFieldsResponse.status)

      if (!mapFieldsResponse.ok) {
        const mapFieldsErrorText = await mapFieldsResponse.text()
        console.error('Field mapping failed:', mapFieldsErrorText)
        try {
          const mapFieldsError = JSON.parse(mapFieldsErrorText)
          console.error('Field mapping error details:', mapFieldsError)
          alert(`Field mapping failed: ${mapFieldsError.error || mapFieldsError.details}`)
        } catch (e) {
          console.error('Could not parse field mapping error response')
          alert('Field mapping failed. Check console for details.')
        }
        setStages(prev => ({ ...prev, mappingFields: 'error' }))
        setIsRunning(false)
        return
      }

      const mapFieldsResult = await mapFieldsResponse.json()
      console.log('Map fields result:', mapFieldsResult)

      if (!mapFieldsResult.success) {
        console.error('Field mapping result missing success:', mapFieldsResult)
        setStages(prev => ({ ...prev, mappingFields: 'error' }))
        alert('Field mapping completed but no data was returned')
        setIsRunning(false)
        return
      }

      setStages(prev => ({ ...prev, mappingFields: 'completed' }))
      console.log('Fields mapped successfully')
      console.log('Mapped data:', mapFieldsResult.mapped_data)

      // Step G: Upload to database (final write)
      console.log('Starting database upload for restaurant ID:', newRestaurantId)
      setStages(prev => ({ ...prev, uploadingToDatabase: 'loading' }))

      const uploadResponse = await fetch(`/api/restaurants/${newRestaurantId}/upload-to-database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapped_data: mapFieldsResult.mapped_data,
          direct_fields: mapFieldsResult.direct_fields
        })
      })

      console.log('Upload to database response status:', uploadResponse.status)

      if (!uploadResponse.ok) {
        const uploadErrorText = await uploadResponse.text()
        console.error('Database upload failed:', uploadErrorText)
        try {
          const uploadError = JSON.parse(uploadErrorText)
          console.error('Database upload error details:', uploadError)
          alert(`Database upload failed: ${uploadError.error || uploadError.details}`)
        } catch (e) {
          console.error('Could not parse database upload error response')
          alert('Database upload failed. Check console for details.')
        }
        setStages(prev => ({ ...prev, uploadingToDatabase: 'error' }))
        setIsRunning(false)
        return
      }

      const uploadResult = await uploadResponse.json()
      console.log('Upload to database result:', uploadResult)

      if (!uploadResult.success) {
        console.error('Database upload result missing success:', uploadResult)
        setStages(prev => ({ ...prev, uploadingToDatabase: 'error' }))
        alert('Database upload completed but no confirmation was returned')
        setIsRunning(false)
        return
      }

      setStages(prev => ({ ...prev, uploadingToDatabase: 'completed' }))
      console.log('Restaurant data uploaded successfully!')
      console.log('Links created:', uploadResult.links_created)
      alert('Restaurant successfully added and published!')

      setIsRunning(false)

    } catch (error) {
      console.error('Error in handleRun:', error)
      setStages(prev => ({ ...prev, apifyFetch: 'error' }))
      setIsRunning(false)
      alert(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const getBusiestAndQuietest = () => {
    if (!apifyData?.popularTimesHistogram) return null

    const dayMap: { [key: string]: string } = {
      'Mo': 'Monday',
      'Tu': 'Tuesday',
      'We': 'Wednesday',
      'Th': 'Thursday',
      'Fr': 'Friday',
      'Sa': 'Saturday',
      'Su': 'Sunday'
    }

    let busiestTime = { day: '', hour: 0, percent: 0 }
    let quietestTime = { day: '', hour: 24, percent: 100 }

    Object.entries(apifyData.popularTimesHistogram).forEach(([dayCode, hours]) => {
      hours.forEach(slot => {
        if (slot.occupancyPercent > 0) {
          if (slot.occupancyPercent > busiestTime.percent) {
            busiestTime = { day: dayMap[dayCode] || dayCode, hour: slot.hour, percent: slot.occupancyPercent }
          }
          if (slot.occupancyPercent < quietestTime.percent) {
            quietestTime = { day: dayMap[dayCode] || dayCode, hour: slot.hour, percent: slot.occupancyPercent }
          }
        }
      })
    })

    const formatTime = (hour: number) => {
      if (hour === 0) return '12 AM'
      if (hour < 12) return `${hour} AM`
      if (hour === 12) return '12 PM'
      return `${hour - 12} PM`
    }

    return {
      busiest: busiestTime.percent > 0 ? `${busiestTime.day} at ${formatTime(busiestTime.hour)}` : '-',
      quietest: quietestTime.percent < 100 ? `${quietestTime.day} at ${formatTime(quietestTime.hour)}` : '-'
    }
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
              <div
                className={`rounded-lg border p-3 hover:bg-accent/50 transition-all cursor-pointer ${
                  isCardClicked ? 'border-blue-500 border-2 bg-accent/30' : 'bg-card border-border'
                }`}
                onClick={handleCardClick}
              >
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
            disabled={!isCardClicked}
          >
            Run
          </Button>

          <Button
            className="w-full mt-2"
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Add Another Restaurant
          </Button>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Apify Fetch</span>
              {renderStatusIndicator(stages.apifyFetch)}
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Firecrawl Fetch</span>
              {renderStatusIndicator(stages.firecrawlFetch)}
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Downloading Images</span>
              {renderStatusIndicator(stages.downloadingImages)}
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Filtering Images</span>
              {renderStatusIndicator(stages.filteringImages)}
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Uploading Images</span>
              {renderStatusIndicator(stages.uploadingImages)}
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

{(isRunning || apifyData) && (
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
                  <span className="text-xs font-medium">{apifyData?.placeId || '-'}</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <span className="text-xs font-medium">{apifyData?.title || '-'}</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Slug</span>
                  <span className="text-xs font-medium">
                    {apifyData?.title ? apifyData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '-'}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Dogs Allowed</span>
                  <span className="text-xs font-medium">
                    {apifyData?.additionalInfo?.Pets?.some(p => p["Dogs allowed"]) ? 'Yes' : '-'}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Cuisine</span>
                  <span className="text-xs font-medium">{apifyData?.categoryName || '-'}</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Address</span>
                  <span className="text-xs font-medium text-right">{apifyData?.address || '-'}</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Phone</span>
                  <span className="text-xs font-medium">{apifyData?.phone || '-'}</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Latitude</span>
                  <span className="text-xs font-medium">
                    {apifyData?.location?.lat ? apifyData.location.lat.toFixed(4) : '-'}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Longitude</span>
                  <span className="text-xs font-medium">
                    {apifyData?.location?.lng ? apifyData.location.lng.toFixed(4) : '-'}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Coordinates</span>
                  <span className="text-xs font-medium">
                    {apifyData?.location?.lat && apifyData?.location?.lng
                      ? `${apifyData.location.lat.toFixed(4)}, ${apifyData.location.lng.toFixed(4)}`
                      : '-'}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Neighborhood</span>
                  <span className="text-xs font-medium">-</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Price Range</span>
                  <span className="text-xs font-medium">{apifyData?.price || '-'}</span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Website</span>
                  {apifyData?.website ? (
                    <a href={apifyData.website} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">
                      Visit
                    </a>
                  ) : (
                    <span className="text-xs font-medium">-</span>
                  )}
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
                  {apifyData?.menu ? (
                    <a href={apifyData.menu} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">
                      View
                    </a>
                  ) : (
                    <span className="text-xs font-medium">-</span>
                  )}
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
                  <span className="text-xs font-medium">
                    {apifyData?.totalScore && apifyData?.reviewsCount
                      ? `${apifyData.totalScore} (${apifyData.reviewsCount.toLocaleString()} reviews)`
                      : '-'}
                  </span>
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
                  <div className="text-xs font-medium text-right">
                    {apifyData?.openingHours && apifyData.openingHours.length > 0 ? (
                      apifyData.openingHours.map((hours, idx) => (
                        <div key={idx}>{hours.day}: {hours.hours}</div>
                      ))
                    ) : (
                      '-'
                    )}
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Reservations Required</span>
                  <span className="text-xs font-medium">
                    {apifyData?.additionalInfo?.Planning?.some(p => p["Accepts reservations"]) ? 'Yes' : '-'}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Dress Code</span>
                  <span className="text-xs font-medium">-</span>
                </div>
              </div>
            </div>

            {/* Busy Periods */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">5</span>
                </div>
                <h3 className="font-semibold text-sm">Busy Periods</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Busiest</span>
                  <span className="text-xs font-medium">
                    {getBusiestAndQuietest()?.busiest || '-'}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Quietest</span>
                  <span className="text-xs font-medium">
                    {getBusiestAndQuietest()?.quietest || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">6</span>
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
                  <span className="text-sm font-medium text-primary-foreground">7</span>
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
                  <span className="text-sm font-medium text-primary-foreground">8</span>
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
                  <span className="text-sm font-medium text-primary-foreground">9</span>
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
        {(isRunning || apifyData) && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-semibold">Menu</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Popular items from reviews
              </p>
            </div>

            <div className="space-y-6">
              {apifyData?.reviewsTags && apifyData.reviewsTags.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-foreground">1</span>
                    </div>
                    <h3 className="font-semibold text-sm">Popular Items</h3>
                  </div>

                  <div className="space-y-2">
                    {apifyData.reviewsTags
                      .filter(tag => tag.title !== 'dog' && tag.title !== 'walk')
                      .slice(0, 10)
                      .map((tag, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium capitalize">{tag.title}</span>
                            <span className="text-xs text-muted-foreground">{tag.count} mentions</span>
                          </div>
                          {idx < Math.min(9, apifyData.reviewsTags.filter(t => t.title !== 'dog' && t.title !== 'walk').length - 1) && (
                            <Separator className="my-2" />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No popular items found</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
