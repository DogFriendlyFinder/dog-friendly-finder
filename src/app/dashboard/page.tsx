"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowLeft,
  Bell,
  Settings,
  User,
  Palette,
  Layout,
  Zap,
  Code,
  Smartphone,
  Monitor,
  Sun,
  Moon,
  Star,
  Heart,
  Share2,
  Download,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Sparkles
} from "lucide-react";

export default function Dashboard() {
  const [sliderValue, setSliderValue] = useState([50]);
  const [switchEnabled, setSwitchEnabled] = useState(false);
  const [progress, setProgress] = useState(75);

  return (
    <TooltipProvider>
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
                  Component Showcase
                </h1>
                <Badge variant="secondary" className="text-xs">
                  shadcn/ui Ecosystem
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Documentation
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Visit https://ui.shadcn.com/docs/components</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* Component Library Panel */}
            <Card className="md:col-span-2 lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-blue-600" />
                  <CardTitle>Component Library</CardTitle>
                </div>
                <CardDescription>
                  Complete shadcn/ui component ecosystem with TypeScript integration
                  <br />
                  <a href="https://ui.shadcn.com/docs/components" className="text-blue-600 hover:underline text-sm">
                    → Official Documentation
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Primary</Button>
                  <Button variant="secondary" size="sm">Secondary</Button>
                  <Button variant="outline" size="sm">Outline</Button>
                  <Button variant="ghost" size="sm">Ghost</Button>
                  <Button variant="destructive" size="sm">Destructive</Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="demo-input">Input Field</Label>
                    <Input id="demo-input" placeholder="Type something..." />
                  </div>
                  <div>
                    <Label>Switch Control</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Switch
                        id="demo-switch"
                        checked={switchEnabled}
                        onCheckedChange={setSwitchEnabled}
                      />
                      <Label htmlFor="demo-switch">
                        {switchEnabled ? "Enabled" : "Disabled"}
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Theme System Panel */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-lg">Theme System</CardTitle>
                </div>
                <CardDescription>
                  CSS variables and color palette
                  <br />
                  <a href="https://ui.shadcn.com/themes" className="text-blue-600 hover:underline text-sm">
                    → Themes
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="h-8 bg-primary rounded" />
                    <div className="h-8 bg-secondary rounded" />
                    <div className="h-8 bg-accent rounded" />
                    <div className="h-8 bg-muted rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span className="text-sm">Light/Dark modes</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interactive Components Panel */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  <CardTitle className="text-lg">Interactive</CardTitle>
                </div>
                <CardDescription>
                  Dialogs, dropdowns, and controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      Open Dialog
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Demo Dialog</DialogTitle>
                      <DialogDescription>
                        This is a demonstration of the shadcn/ui dialog component.
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      Dropdown Menu
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>

            {/* Progress & Feedback Panel */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">Progress & Feedback</CardTitle>
                </div>
                <CardDescription>
                  Progress bars, alerts, and status indicators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
                
                <div>
                  <Label>Slider Control: {sliderValue[0]}</Label>
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Success!</AlertTitle>
                  <AlertDescription>
                    Your shadcn/ui ecosystem is working perfectly.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Typography Panel */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layout className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-lg">Typography</CardTitle>
                </div>
                <CardDescription>
                  Text hierarchy and styling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <h1 className="text-2xl font-bold">Heading 1</h1>
                <h2 className="text-xl font-semibold">Heading 2</h2>
                <h3 className="text-lg font-medium">Heading 3</h3>
                <p className="text-sm text-muted-foreground">
                  Body text with proper contrast and readability.
                </p>
              </CardContent>
            </Card>

            {/* Icons & Avatars Panel */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-lg">Icons & Avatars</CardTitle>
                </div>
                <CardDescription>
                  Lucide icons and avatar components
                  <br />
                  <a href="https://lucide.dev/docs/lucide-react" className="text-blue-600 hover:underline text-sm">
                    → Lucide React
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Avatar>
                    <AvatarImage src="/api/placeholder/40/40" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex gap-3 text-gray-600">
                  <Heart className="h-5 w-5" />
                  <Star className="h-5 w-5" />
                  <Share2 className="h-5 w-5" />
                  <Download className="h-5 w-5" />
                  <Settings className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Responsive Design Panel */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-teal-600" />
                  <CardTitle className="text-lg">Responsive Design</CardTitle>
                </div>
                <CardDescription>
                  Built-in responsive patterns and mobile-first approach
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="desktop" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="desktop">Desktop</TabsTrigger>
                    <TabsTrigger value="tablet">Tablet</TabsTrigger>
                    <TabsTrigger value="mobile">Mobile</TabsTrigger>
                  </TabsList>
                  <TabsContent value="desktop" className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span className="text-sm">Large screens (1024px+)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Multi-column layouts with sidebar navigation
                    </p>
                  </TabsContent>
                  <TabsContent value="tablet" className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 rotate-90" />
                      <span className="text-sm">Medium screens (768px+)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Collapsible navigation and stacked components
                    </p>
                  </TabsContent>
                  <TabsContent value="mobile" className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span className="text-sm">Small screens (640px+)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Single column layout with touch-friendly controls
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Ecosystem Status Panel */}
            <Card className="lg:col-span-3 xl:col-span-4">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">shadcn/ui Ecosystem Status</CardTitle>
                </div>
                <CardDescription>
                  Complete component library installation and verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[
                    "Button", "Card", "Input", "Dialog", "Sheet", "Form",
                    "Select", "Badge", "Avatar", "Table", "Tabs", "Alert",
                    "Progress", "Slider", "Switch", "Tooltip", "Dropdown", "Sidebar"
                  ].map((component) => (
                    <div key={component} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{component}</span>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-6" />
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Next.js 15</Badge>
                  <Badge variant="outline">TypeScript</Badge>
                  <Badge variant="outline">Tailwind CSS v4</Badge>
                  <Badge variant="outline">shadcn/ui</Badge>
                  <Badge variant="outline">Lucide Icons</Badge>
                  <Badge variant="outline">Responsive</Badge>
                  <Badge variant="outline">Accessible</Badge>
                  <Badge variant="outline">Dark Mode</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8 mt-12">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Complete shadcn/ui Ecosystem
            </h3>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-4">
              This dashboard demonstrates the comprehensive shadcn/ui component library with 
              TypeScript integration, responsive design, and accessibility features.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <a href="https://ui.shadcn.com/docs/components" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Component Docs
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://ui.shadcn.com/themes" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Theme System
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

