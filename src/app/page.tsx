import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Star, Users, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4 text-sm font-medium">
            5 Day Sprint Framework Installed ✨
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Dog Friendly Finder
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            A comprehensive directory of dog-friendly venues across the United Kingdom, 
            helping pet owners discover and review places where their dogs are welcome. 
            Built to rank #1 in organic search - both traditional search and LLM search.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/application">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-medium">
                <Zap className="mr-2 h-5 w-5" />
                View Starter Kit
              </Button>
            </Link>
            
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="px-8 py-3 text-lg font-medium">
                <Users className="mr-2 h-5 w-5" />
                View Component Showcase
              </Button>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="text-left hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl">Location Discovery</CardTitle>
                <CardDescription>
                  Find dog-friendly venues across the UK with advanced search capabilities
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-left hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-xl">User Reviews</CardTitle>
                <CardDescription>
                  Read and share experiences from fellow dog owners about venues
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-left hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-xl">SEO Optimized</CardTitle>
                <CardDescription>
                  Built to rank #1 in both traditional search engines and AI search
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Development Status */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Development Status
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Built with 5 Day Sprint Framework by Omar Choudhry - Ready for James&apos;s vision. 
            Complete shadcn/ui ecosystem installed with responsive design and accessibility features.
          </p>
          
          <div className="mt-8">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Next Steps: Go back to Cursor to discuss your project requirements
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline">Next.js 15</Badge>
              <Badge variant="outline">TypeScript</Badge>
              <Badge variant="outline">Tailwind CSS v4</Badge>
              <Badge variant="outline">shadcn/ui</Badge>
              <Badge variant="outline">Responsive Design</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
