import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Zap, TrendingUp, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);

  // Search sites as user types
  const { data: searchResults, isLoading: isSearching } = trpc.sites.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );

  // Get all sites for the list view
  const { data: allSites, isLoading: isLoadingAll } = trpc.sites.list.useQuery();

  const displaySites = searchQuery.length >= 2 ? searchResults : allSites?.slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-700 flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Solar Performance Analyzer</h1>
                <p className="text-sm text-gray-600">MCE Tools Suite</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-12">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold text-gray-900">
            Analyze Solar Farm Performance
          </h2>
          <p className="text-lg text-gray-600">
            Automated performance assessment with adaptive tracking detection, satellite imagery analysis, 
            and curtailment separation for 125+ NEM solar farms
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by site name or DUID (e.g., 'Clare Solar Farm' or 'CLARESF1')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-700">{allSites?.length || 125}</div>
                <div className="text-sm text-gray-600 mt-1">Solar Farms</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-700">Auto</div>
                <div className="text-sm text-gray-600 mt-1">Tracking Detection</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-700">AI</div>
                <div className="text-sm text-gray-600 mt-1">Satellite Analysis</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Sites List */}
      <section className="container pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              {searchQuery.length >= 2 ? "Search Results" : "Recent Sites"}
            </h3>
            {searchQuery.length >= 2 && searchResults && (
              <span className="text-sm text-gray-600">{searchResults.length} results</span>
            )}
          </div>

          {isSearching || isLoadingAll ? (
            <div className="text-center py-12 text-gray-600">Loading sites...</div>
          ) : displaySites && displaySites.length > 0 ? (
            <div className="grid gap-4">
              {displaySites.map((site) => (
                <Card key={site.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{site.name}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="font-mono font-semibold text-blue-700">{site.duid}</span>
                          {site.latitude && site.longitude && (
                            <span className="flex items-center gap-1 text-gray-600">
                              <MapPin className="h-3 w-3" />
                              {Number(site.latitude).toFixed(2)}°, {Number(site.longitude).toFixed(2)}°
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {site.capacityDcMw ? `${Number(site.capacityDcMw).toFixed(1)} MW` : "—"}
                        </div>
                        <div className="text-sm text-gray-600">DC Capacity</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 text-sm text-gray-600">
                        {site.region && (
                          <span className="px-2 py-1 bg-gray-100 rounded">{site.region}</span>
                        )}
                        {site.status && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded capitalize">
                            {site.status}
                          </span>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Analyze Performance
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-600">
                No sites found matching "{searchQuery}"
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-600">
                No sites available
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm py-8">
        <div className="container text-center text-sm text-gray-600">
          <p>Part of the MCE Tools Suite • Data sourced from AEMO & APVI</p>
        </div>
      </footer>
    </div>
  );
}
