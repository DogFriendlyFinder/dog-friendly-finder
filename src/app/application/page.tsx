"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  Clock, 
  Phone, 
  Globe, 
  Dog, 
  Search,
  Heart,
  Share2,
  Info
} from "lucide-react";

// Mock data for dog-friendly venues
const venues = [
  {
    id: 1,
    name: "The Dog & Duck Pub",
    category: "Pub & Restaurant",
    location: "Camden, London",
    rating: 4.8,
    reviews: 127,
    distance: "0.3 miles",
    image: "/api/placeholder/300/200",
    description: "Traditional British pub with a warm welcome for dogs and their owners.",
    amenities: ["Dog Bowls", "Outdoor Seating", "Dog Treats", "Water Station"],
    hours: "11:00 AM - 11:00 PM",
    phone: "+44 20 7485 2791",
    website: "www.dogandduckcamden.co.uk"
  },
  {
    id: 2,
    name: "Hampstead Heath",
    category: "Park & Recreation",
    location: "Hampstead, London",
    rating: 4.9,
    reviews: 342,
    distance: "1.2 miles",
    image: "/api/placeholder/300/200",
    description: "Large ancient heath with off-leash areas and beautiful walking trails.",
    amenities: ["Off-Leash Areas", "Ponds", "Walking Trails", "Waste Bins"],
    hours: "24 hours",
    phone: "N/A",
    website: "www.cityoflondon.gov.uk"
  },
  {
    id: 3,
    name: "Brew Coffee House",
    category: "Cafe",
    location: "Shoreditch, London", 
    rating: 4.6,
    reviews: 89,
    distance: "0.8 miles",
    image: "/api/placeholder/300/200",
    description: "Artisan coffee shop with dog-friendly seating and homemade treats.",
    amenities: ["Dog Treats", "Water Bowls", "Outdoor Seating", "WiFi"],
    hours: "7:00 AM - 6:00 PM",
    phone: "+44 20 7739 4563",
    website: "www.brewcoffeehouse.co.uk"
  }
];

export default function ApplicationDemo() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Pub & Restaurant", "Park & Recreation", "Cafe", "Hotel", "Shop"];

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         venue.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || venue.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dog Friendly Finder
              </h1>
              <Badge variant="secondary" className="text-xs">
                Starter Kit Demo
              </Badge>
            </div>
            
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Info className="h-4 w-4" />
                  Install Feature
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="flex justify-between space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="https://koqqkpitepqwlfjymcje.supabase.co/storage/v1/object/public/brand-assets/5ds-blank.svg" />
                    <AvatarFallback>5DS</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-semibold">Make This Feature Functional</h4>
                    <p className="text-sm text-muted-foreground">
                      Connect this venue directory to a real database and search API for full functionality.
                    </p>
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">Copy this prompt to Claude Code:</p>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs font-mono">
                        Create a functional venue search system for Dog Friendly Finder. Add Supabase database integration with venues table including name, category, location, rating, amenities, and contact info. Implement real search functionality with filters. Add your Supabase credentials to .env.local as NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Use the existing UI design but connect it to live data with CRUD operations.
                      </div>
                    </div>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search for dog-friendly venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => (
            <Card key={venue.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-t-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-green-500 opacity-20" />
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    {venue.category}
                  </Badge>
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white/80 hover:bg-white">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white/80 hover:bg-white">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{venue.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {venue.location} • {venue.distance}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{venue.rating}</span>
                    <span className="text-xs text-gray-500">({venue.reviews})</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {venue.description}
                </p>
                
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {venue.amenities.map((amenity) => (
                      <Badge key={amenity} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {venue.hours}
                    </div>
                    {venue.phone !== "N/A" && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Call
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Website
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredVenues.length === 0 && (
          <div className="text-center py-12">
            <Dog className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No venues found
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Try adjusting your search criteria or browse all venues
            </p>
          </div>
        )}
      </div>

      {/* Demo Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
            This is a Demo Interface
          </h3>
          <p className="text-blue-700 dark:text-blue-300 max-w-2xl mx-auto">
            This starter kit demonstrates the Dog Friendly Finder interface with mock data. 
            Use the &ldquo;Install Feature&rdquo; hover cards to get Claude Code prompts for adding real functionality.
          </p>
        </div>
      </div>
    </div>
  );
}

