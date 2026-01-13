import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Zap, Calendar, TrendingUp, FileText } from "lucide-react";
import Navigation from "@/components/Navigation";

export default function SiteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  const siteId = parseInt(id || "0", 10);
  const { data: site, isLoading } = trpc.sites.getById.useQuery(
    { id: siteId },
    { enabled: siteId > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <Navigation />
        <div className="container py-16">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading site details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <Navigation />
        <div className="container py-16">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="py-16 text-center">
              <p className="text-slate-600 dark:text-slate-400">Site not found</p>
              <Button
                onClick={() => setLocation("/")}
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-8 md:py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="mb-6 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sites
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {site.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-sm px-3 py-1">
                  {site.duid}
                </Badge>
                {site.status && (
                  <Badge className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1">
                    {site.status}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-300">
                {site.latitude && site.longitude && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-500" />
                    <span>
                      {Number(site.latitude).toFixed(4)}°, {Number(site.longitude).toFixed(4)}°
                    </span>
                  </div>
                )}
                {site.capacityDcMw && (
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-500" />
                    <span className="font-semibold">{Number(site.capacityDcMw).toFixed(1)} MW DC</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button
                onClick={() => setLocation(`/assessment/new?siteId=${site.id}`)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                New Assessment
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-slate-50 dark:bg-slate-950">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Site Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Site Information</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Technical details and specifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">DUID</dt>
                      <dd className="text-base font-mono font-semibold text-slate-900 dark:text-white">{site.duid}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Status</dt>
                      <dd className="text-base text-slate-900 dark:text-white">{site.status || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">DC Capacity</dt>
                      <dd className="text-base font-semibold text-slate-900 dark:text-white">
                        {site.capacityDcMw ? `${Number(site.capacityDcMw).toFixed(1)} MW` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Location</dt>
                      <dd className="text-base text-slate-900 dark:text-white">
                        {site.latitude && site.longitude
                          ? `${Number(site.latitude).toFixed(4)}°, ${Number(site.longitude).toFixed(4)}°`
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Assessment History */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Assessment History</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Past performance assessments for this site
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      No assessments yet for this site
                    </p>
                    <Button
                      onClick={() => setLocation(`/assessment/new?siteId=${site.id}`)}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Create First Assessment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Location Map Placeholder */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Map view coming soon
                      </p>
                    </div>
                  </div>
                  {site.latitude && site.longitude && (
                    <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                      <p className="font-medium mb-1">Coordinates:</p>
                      <p className="font-mono">
                        Lat: {Number(site.latitude).toFixed(6)}°<br />
                        Lon: {Number(site.longitude).toFixed(6)}°
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => setLocation(`/assessment/new?siteId=${site.id}`)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    New Assessment
                  </Button>
                  <Button
                    onClick={() => setLocation("/dashboard")}
                    variant="outline"
                    className="w-full border-slate-300 dark:border-slate-600"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 dark:bg-slate-950 border-t border-slate-800">
        <div className="container">
          <p className="text-center text-slate-400 text-sm">
            © 2026 Main Character Energy - MCE Tools Suite
          </p>
        </div>
      </footer>
    </div>
  );
}
