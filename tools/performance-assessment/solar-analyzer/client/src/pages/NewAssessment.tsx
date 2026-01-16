import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, MapPin, Loader2 } from "lucide-react";

export default function NewAssessment() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: sites, isLoading } = trpc.sites.list.useQuery();

  const filteredSites = sites?.filter((site) => {
    const query = searchQuery.toLowerCase();
    return (
      site.name.toLowerCase().includes(query) ||
      site.duid?.toLowerCase().includes(query) ||
      site.region?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">New Assessment</h1>
            <p className="text-muted-foreground">
              Select a solar farm to create a new performance assessment
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by site name, DUID, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Sites List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSites?.map((site) => (
                <Card key={site.id} className="hover:border-primary transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{site.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <MapPin className="h-3 w-3" />
                          {site.region}
                          {site.duid && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span>DUID: {site.duid}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => setLocation(`/site/${site.id}/custom-analysis`)}
                        size="sm"
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Create Assessment
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {site.capacityDcMw && (
                        <Badge variant="outline">{site.capacityDcMw} MW DC</Badge>
                      )}
                      {site.capacityAcMw && (
                        <Badge variant="outline">{site.capacityAcMw} MW AC</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredSites?.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No sites found matching your search</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
