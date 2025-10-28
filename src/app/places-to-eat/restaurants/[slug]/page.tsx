import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, ExternalLink, Facebook, Instagram, Twitter, Music, ChevronRight, Home, MapPin, Accessibility } from "lucide-react"
import { JsonLd } from "@/lib/schema/components/JsonLd"
import { generateRestaurantSchema } from "@/lib/schema/business/restaurant"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface Restaurant {
  id: string
  name: string
  slug: string
  address: string
  phone: string | null
  website: string | null
  about: string | null
  price_range: string | null
  city: string
  country: string
  neighborhood: string | null
  neighbourhood_id: string | null
  neighbourhoods?: {
    name: string
  }
  latitude: number
  longitude: number
  hours: Record<string, any> | null
  social_media_urls: Record<string, any> | null
  ratings: Record<string, any> | null
  review_sources: Record<string, any> | null
  faqs: Array<any> | null
  photos: Array<any> | null
  restaurant_awards: Array<any> | null
  michelin_stars: number
  accessibility_features: string[] | null
  dress_code: string | null
  reservations_required: boolean
  reservations_url: string | null
  best_times_description: string | null
  best_times_buzzing: string[] | null
  best_times_relaxed: string[] | null
  best_times_with_dogs: string[] | null
  getting_there_public: string | null
  getting_there_car: string | null
  public_review_sentiment: string | null
  sentiment_score: number | null
  menu_data: Record<string, any> | null
  nearest_dog_parks: string[] | null
  apify_output: Record<string, any> | null
  restaurant_feature_links?: FeatureLink[]
  restaurant_cuisine_links?: CuisineLink[]
  restaurant_category_links?: CategoryLink[]
}

interface FeatureLink {
  restaurant_features: {
    name: string
    feature_category: string
  }
}

interface CuisineLink {
  restaurant_cuisines: {
    name: string
    slug: string
  }
}

interface CategoryLink {
  restaurant_categories: {
    name: string
    slug: string
  }
}

async function getRestaurant(slug: string): Promise<Restaurant | null> {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      neighbourhoods(name),
      restaurant_feature_links(restaurant_features(name, feature_category)),
      restaurant_cuisine_links(restaurant_cuisines(name, slug)),
      restaurant_category_links(restaurant_categories(name, slug))
    `)
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error) {
    console.error('Error fetching restaurant:', error)
    return null
  }

  return data
}

function DataSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function DataField({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '') return null

  const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)

  return (
    <>
      <div className="flex flex-col gap-1 py-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm break-words whitespace-pre-wrap">{displayValue}</span>
      </div>
      <Separator />
    </>
  )
}

function formatArrayList(items: string[] | null): string | null {
  if (!items || items.length === 0) return null
  return items.join(', ')
}

function formatFeatureName(name: string): string {
  // Convert camelCase to Title Case
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

function getSocialMediaLinks(urls: Record<string, any> | null): Array<{ platform: string; url: string; icon: string }> {
  if (!urls) return []

  const iconMap: Record<string, string> = {
    facebook: 'facebook',
    instagram: 'instagram',
    twitter: 'twitter',
    tiktok: 'music'
  }

  return Object.entries(urls)
    .filter(([_, url]) => url !== null && url !== '')
    .map(([platform, url]) => ({
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      url: url as string,
      icon: iconMap[platform.toLowerCase()] || 'link'
    }))
}

function SocialIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'facebook':
      return <Facebook className="w-5 h-5" />
    case 'instagram':
      return <Instagram className="w-5 h-5" />
    case 'twitter':
      return <Twitter className="w-5 h-5" />
    case 'music':
      return <Music className="w-5 h-5" />
    default:
      return <ExternalLink className="w-5 h-5" />
  }
}

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const restaurant = await getRestaurant(slug)

  if (!restaurant) {
    notFound()
  }

  const sortedPhotos = restaurant.photos?.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)) || []
  const features = restaurant.restaurant_feature_links?.map(link => link.restaurant_features.name) || []
  const cuisines = restaurant.restaurant_cuisine_links?.map(link => ({ name: link.restaurant_cuisines.name, slug: link.restaurant_cuisines.slug })) || []
  const categories = restaurant.restaurant_category_links?.map(link => ({ name: link.restaurant_categories.name, slug: link.restaurant_categories.slug })) || []

  // Filter dog-friendly features for schema
  const dogFeatures = restaurant.restaurant_feature_links
    ?.filter(link => link.restaurant_features.feature_category === 'dog_amenities')
    .map(link => link.restaurant_features.name) || []

  // Generate schema (returns array with Restaurant and FAQPage if FAQs exist)
  const restaurantSchema = generateRestaurantSchema({
    slug: restaurant.slug,
    name: restaurant.name,
    about: restaurant.about,
    address: restaurant.address,
    city: restaurant.city,
    country: restaurant.country || 'United Kingdom',
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    phone: restaurant.phone,
    website: restaurant.website,
    social_media_urls: restaurant.social_media_urls,
    price_range: restaurant.price_range,
    cuisines: cuisines.map(c => c.name),
    photos: sortedPhotos,
    apify_output: restaurant.apify_output,
    hours: restaurant.hours,
    reservations_url: restaurant.reservations_url,
    reservations_required: restaurant.reservations_required,
    dogFeatures,
    faqs: restaurant.faqs
  })

  return (
    <>
      <JsonLd data={restaurantSchema} />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground flex items-center gap-1">
          <Home className="w-4 h-4" />
          Home
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/places-to-eat" className="hover:text-foreground">
          Places to Eat
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/places-to-eat/restaurants" className="hover:text-foreground">
          Restaurants
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{restaurant.name}</span>
      </nav>

      {/* Category and Cuisine Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <Link key={category.slug} href={`/places-to-eat/categories/${category.slug}`}>
            <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
              {category.name}
            </Badge>
          </Link>
        ))}
        {cuisines.map((cuisine) => (
          <Link key={cuisine.slug} href={`/places-to-eat/cuisines/${cuisine.slug}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
              {cuisine.name}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Header with Images */}
      <div className="mb-8 grid lg:grid-cols-3 gap-8">
        {/* Left: Title and Description */}
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-bold mb-4">{restaurant.name}</h1>
          {restaurant.about && (
            <p className="text-muted-foreground leading-relaxed">{restaurant.about}</p>
          )}
        </div>

        {/* Right: Image Grid */}
        {sortedPhotos.length > 0 && (
          <div className="lg:col-span-1">
            <div className="grid grid-cols-2 gap-2">
              {sortedPhotos.slice(0, 4).map((photo, idx) => {
                const imageUrl = photo.url || photo.public_url
                return (
                  <div
                    key={photo.id || idx}
                    className={`relative overflow-hidden rounded-lg ${
                      idx === 0 ? 'col-span-2 h-64' : 'h-32'
                    }`}
                  >
                    <Image
                      src={imageUrl}
                      alt={photo.alt_text || photo.caption || restaurant.name}
                      fill
                      className="object-cover"
                      sizes={idx === 0 ? "(max-width: 768px) 100vw, 33vw" : "(max-width: 768px) 50vw, 16vw"}
                    />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                        {photo.caption}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {sortedPhotos.length > 4 && (
              <Button variant="outline" className="w-full mt-2" size="sm">
                View All {sortedPhotos.length} Photos
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Features Section */}
      {((features && features.length > 0) || (restaurant.accessibility_features && restaurant.accessibility_features.length > 0)) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {features.map((feature) => (
                <Badge key={feature} variant="secondary">
                  {feature}
                </Badge>
              ))}
              {restaurant.accessibility_features && restaurant.accessibility_features.map((feature) => (
                <Badge key={feature} variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100">
                  <Accessibility className="w-3 h-3 mr-1" />
                  {formatFeatureName(feature)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <DataSection title="Contact & Location">
          <DataField label="Address" value={restaurant.address} />
          <DataField label="City" value={restaurant.city} />
          <DataField label="Neighbourhood" value={restaurant.neighbourhoods?.name} />
          {restaurant.phone && (
            <>
              <div className="py-2">
                <a href={`tel:${restaurant.phone}`}>
                  <Button variant="outline" className="w-full" size="sm">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Restaurant
                  </Button>
                </a>
              </div>
              <Separator />
            </>
          )}
          {restaurant.website && (
            <>
              <div className="py-2">
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Website
                  </Button>
                </a>
              </div>
              <Separator />
            </>
          )}
          <DataField label="Price Range" value={restaurant.price_range} />
        </DataSection>

        {/* Map */}
        <DataSection title="Map">
          <div className="w-full h-64 rounded-lg overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${restaurant.latitude},${restaurant.longitude}`}
              allowFullScreen
            />
          </div>
        </DataSection>

        {/* Opening Hours */}
        {restaurant.hours && (
          <DataSection title="Opening Hours">
            <div className="space-y-2">
              {Object.entries(restaurant.hours).map(([day, hours]: [string, any]) => (
                <div key={day} className="flex justify-between items-center py-1">
                  <span className="font-medium capitalize text-sm">{day}</span>
                  <span className="text-sm text-muted-foreground">
                    {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                  </span>
                </div>
              ))}
            </div>
          </DataSection>
        )}

        {/* Reservations */}
        {restaurant.reservations_url && (
          <DataSection title="Reservations">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {restaurant.reservations_required ? 'Reservations required' : 'Reservations available'}
              </p>
              <a href={restaurant.reservations_url} target="_blank" rel="noopener noreferrer">
                <Button className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Book a Table
                </Button>
              </a>
            </div>
          </DataSection>
        )}

        {/* Social Media */}
        {restaurant.social_media_urls && getSocialMediaLinks(restaurant.social_media_urls).length > 0 && (
          <DataSection title="Social Media">
            <div className="flex gap-3">
              {getSocialMediaLinks(restaurant.social_media_urls).map(({ platform, url, icon }) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full hover:bg-accent transition-colors"
                  title={platform}
                >
                  <SocialIcon icon={icon} />
                </a>
              ))}
            </div>
          </DataSection>
        )}

        {/* Best Times */}
        {(restaurant.best_times_description || restaurant.best_times_buzzing || restaurant.best_times_relaxed || restaurant.best_times_with_dogs) && (
          <DataSection title="Best Times to Visit">
            {restaurant.best_times_description && (
              <p className="text-sm mb-4">{restaurant.best_times_description}</p>
            )}
            <DataField label="Buzzing Times" value={formatArrayList(restaurant.best_times_buzzing)} />
            <DataField label="Relaxed Times" value={formatArrayList(restaurant.best_times_relaxed)} />
            <DataField label="Best Times with Dogs" value={formatArrayList(restaurant.best_times_with_dogs)} />
          </DataSection>
        )}

        {/* Features */}
        {features.length > 0 && (
          <DataSection title="Features & Amenities">
            <div className="flex flex-wrap gap-2">
              {features.map((feature, idx) => (
                <Badge key={idx} variant="secondary">
                  {formatFeatureName(feature)}
                </Badge>
              ))}
            </div>
          </DataSection>
        )}

        {/* Nearest Dog Parks */}
        {restaurant.nearest_dog_parks && Array.isArray(restaurant.nearest_dog_parks) && restaurant.nearest_dog_parks.length > 0 && (
          <DataSection title="Nearest Dog Parks">
            <div className="space-y-2">
              {restaurant.nearest_dog_parks.map((park, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span className="text-sm">{park}</span>
                </div>
              ))}
            </div>
          </DataSection>
        )}

        {/* Awards */}
        {(restaurant.michelin_stars > 0 || (restaurant.restaurant_awards && Array.isArray(restaurant.restaurant_awards) && restaurant.restaurant_awards.length > 0)) && (
          <DataSection title="Awards & Recognition">
            {restaurant.michelin_stars > 0 && (
              <>
                <div className="py-2">
                  <span className="text-sm font-medium text-muted-foreground">Michelin Stars</span>
                  <div className="mt-1 flex gap-1">
                    {Array.from({ length: restaurant.michelin_stars }).map((_, i) => (
                      <span key={i} className="text-2xl">⭐</span>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}
            {restaurant.restaurant_awards && Array.isArray(restaurant.restaurant_awards) && restaurant.restaurant_awards.length > 0 && (
              <div className="space-y-2">
                {restaurant.restaurant_awards.map((award: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    <div className="font-medium">{award.name}</div>
                    {award.year && <div className="text-muted-foreground">{award.year}</div>}
                    {award.level && <div className="text-muted-foreground">{award.level}</div>}
                    {award.rank && <div className="text-muted-foreground">Rank: {award.rank}</div>}
                  </div>
                ))}
              </div>
            )}
          </DataSection>
        )}

        {/* Getting There */}
        {(restaurant.getting_there_public || restaurant.getting_there_car) && (
          <DataSection title="Getting There">
            <DataField label="Public Transport" value={restaurant.getting_there_public} />
            <DataField label="By Car" value={restaurant.getting_there_car} />
          </DataSection>
        )}

        {/* Sentiment */}
        {(restaurant.public_review_sentiment || restaurant.sentiment_score) && (
          <DataSection title="What People Say">
            {restaurant.public_review_sentiment && (
              <p className="text-sm mb-2">{restaurant.public_review_sentiment}</p>
            )}
            <DataField label="Sentiment Score" value={restaurant.sentiment_score} />
          </DataSection>
        )}

        {/* FAQs */}
        {restaurant.faqs && Array.isArray(restaurant.faqs) && restaurant.faqs.length > 0 && (
          <DataSection title="FAQs">
            <div className="space-y-4">
              {restaurant.faqs.map((faq: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <p className="text-sm font-medium">{faq.question}</p>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  {idx < restaurant.faqs!.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </DataSection>
        )}

        {/* Menu */}
        {restaurant.menu_data && restaurant.menu_data.sections && Array.isArray(restaurant.menu_data.sections) && (
          <DataSection title="Menu">
            <div className="space-y-6">
              {restaurant.menu_data.sections.map((section: any, idx: number) => (
                <div key={idx}>
                  <h3 className="font-semibold mb-3">{section.name}</h3>
                  <div className="space-y-3">
                    {section.items && Array.isArray(section.items) && section.items.map((item: any, itemIdx: number) => (
                      <div key={itemIdx} className="space-y-1">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                            )}
                            {item.dietary && Array.isArray(item.dietary) && item.dietary.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {item.dietary.map((tag: string, tagIdx: number) => (
                                  <Badge key={tagIdx} variant="outline" className="text-xs px-1 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {item.price && (
                            <div className="text-sm font-medium ml-4">£{item.price.toFixed(2)}</div>
                          )}
                        </div>
                        {itemIdx < section.items.length - 1 && <Separator className="mt-2" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DataSection>
        )}
      </div>
    </div>
    </>
  )
}
