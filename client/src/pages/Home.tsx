import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Zap, TrendingUp, MapPin, BarChart3, Satellite } from "lucide-react";
import Navigation from "@/components/Navigation";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  // Search sites as user types
  const { data: searchResults, isLoading: isSearching } = trpc.sites.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );

  // Get all sites for the list view
  const { data: allSites, isLoading: isLoadingAll } = trpc.sites.list.useQuery();

  const displaySites = searchQuery.length >= 2 ? searchResults : allSites?.slice(0, 10);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Navigation />

      {/* Hero Section */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-semibold">
              <Zap className="h-4 w-4" />
              Automated Performance Analysis
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tight">
              Solar Farm Performance Analyzer
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Automated performance assessment with adaptive tracking detection, satellite imagery analysis, 
              and curtailment separation for <span className="font-bold text-orange-600 dark:text-orange-500">{allSites?.length || 125}+ NEM solar farms</span>
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by site name or DUID (e.g., 'Clare Solar Farm' or 'CLARESF1')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 mb-4">
                    <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {allSites?.length || 125}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Solar Farms</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 mb-4">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Auto
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Tracking Detection</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 mb-4">
                    <Satellite className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    AI
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Satellite Analysis</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Sites List */}
      <section className="py-12 md:py-16 bg-slate-50 dark:bg-slate-950">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  {searchQuery.length >= 2 ? "Search Results" : "Solar Farms"}
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  {searchQuery.length >= 2 && searchResults 
                    ? `${searchResults.length} results found`
                    : "Select a site to begin performance analysis"}
                </p>
              </div>
            </div>

            {isSearching || isLoadingAll ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <p className="mt-4 text-slate-600 dark:text-slate-400">Loading sites...</p>
              </div>
            ) : displaySites && displaySites.length > 0 ? (
              <div className="grid gap-4">
                {displaySites.map((site) => (
                  <Card 
                    key={site.id} 
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-orange-500 dark:hover:border-orange-500 transition-all cursor-pointer group"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">
                            {site.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2 text-slate-600 dark:text-slate-400">
                            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                              {site.duid}
                            </span>
                            {site.latitude && site.longitude && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {Number(site.latitude).toFixed(2)}°, {Number(site.longitude).toFixed(2)}°
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {site.capacityDcMw ? `${Number(site.capacityDcMw).toFixed(1)} MW` : "—"}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">DC Capacity</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 text-sm">
                          {site.region && (
                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">
                              {site.region}
                            </span>
                          )}
                          {site.status && (
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full capitalize">
                              {site.status}
                            </span>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white dark:border-orange-500 dark:text-orange-400 dark:hover:bg-orange-500 dark:hover:text-white"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Analyze Performance
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="py-16 text-center">
                  <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    No sites found matching "<span className="font-semibold">{searchQuery}</span>"
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="py-16 text-center">
                  <p className="text-slate-600 dark:text-slate-400">No sites available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8">
        <div className="container text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Part of the <span className="font-semibold text-slate-900 dark:text-white">MCE Tools Suite</span> • 
            Data sourced from AEMO & APVI
          </p>
        </div>
      </footer>
    </div>
  );
}
