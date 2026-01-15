import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Zap, FileText, Calendar, MapPin } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: sites, isLoading } = trpc.sites.list.useQuery();

  // Calculate stats
  const totalSites = sites?.length || 0;
  const totalCapacity = sites?.reduce((sum, site) => 
    sum + (Number(site.capacityDcMw) || 0), 0
  ) || 0;
  const operationalSites = sites?.filter(site => 
    site.status?.toLowerCase() === 'operational'
  ).length || 0;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-8 md:py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Assessment Dashboard
              </h1>
              <p className="text-lg text-slate-300">
                Overview of solar farm performance analysis across the NEM
              </p>
            </div>
            <Button
              onClick={() => setLocation("/new-assessment")}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              New Assessment
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-slate-50 dark:bg-slate-950">
        <div className="container">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Loading dashboard...</p>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Total Sites
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        {totalSites}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Total Capacity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">
                          {totalCapacity.toFixed(0)}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">MW DC</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Operational
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        {operationalSites}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Assessments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        0
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Assessments */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mb-8">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-900 dark:text-white">Recent Assessments</CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400">
                        Latest performance analysis reports
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => setLocation("/new-assessment")}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      New Assessment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-16">
                    <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                      No assessments yet
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      Create your first performance assessment to get started
                    </p>
                    <Button
                      onClick={() => setLocation("/new-assessment")}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Create Assessment
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Top Sites by Capacity */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Top Sites by Capacity</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Largest solar farms in the database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sites
                      ?.sort((a, b) => (Number(b.capacityDcMw) || 0) - (Number(a.capacityDcMw) || 0))
                      .slice(0, 10)
                      .map((site, index) => (
                        <div
                          key={site.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 transition-colors cursor-pointer"
                          onClick={() => setLocation(`/site/${site.id}`)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {site.name}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mt-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {site.duid}
                                </Badge>
                                {site.latitude && site.longitude && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {Number(site.latitude).toFixed(2)}°, {Number(site.longitude).toFixed(2)}°
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                              <Zap className="h-5 w-5 text-orange-500" />
                              {site.capacityDcMw ? `${Number(site.capacityDcMw).toFixed(1)} MW` : "—"}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">DC Capacity</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
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
