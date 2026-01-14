import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Zap, Calendar, TrendingUp, FileText, Satellite } from "lucide-react";
import { MapView } from "@/components/Map";
import { useRef } from "react";
import Navigation from "@/components/Navigation";
import { PerformanceCharts } from "@/components/PerformanceCharts";

export default function SiteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const siteId = parseInt(id || "0", 10);
  const { data: site, isLoading } = trpc.sites.getById.useQuery(
    { id: siteId },
    { enabled: siteId > 0 }
  );
  const { data: configuration } = trpc.sites.getConfiguration.useQuery(
    { siteId },
    { enabled: siteId > 0 }
  );
  const { data: assessments } = trpc.sites.getAssessments.useQuery(
    { siteId },
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
                className="mt-4 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sites
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
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12">
        <div className="container">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="mb-6 text-white hover:text-orange-500 hover:bg-slate-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sites
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">{site.name}</h1>
              <div className="flex items-center gap-3 mb-4">
                {site.duid && (
                  <Badge className="bg-blue-600 text-white">
                    {site.duid}
                  </Badge>
                )}
                {site.status && (
                  <Badge className="bg-green-600 text-white">
                    {site.status}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-6 text-slate-300">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{site.latitude ? `${Number(site.latitude).toFixed(4)}\u00b0` : 'N/A'}, {site.longitude ? `${Number(site.longitude).toFixed(4)}\u00b0` : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="font-semibold">{site.capacityDcMw ? `${Number(site.capacityDcMw).toFixed(1)} MW DC` : 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setLocation("/assessment/new")}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                New Assessment
              </Button>
              <Button
                onClick={() => setLocation(`/site/${siteId}/equipment`)}
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Tag Equipment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Site Information */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Site Information</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Technical details and specifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">DUID</p>
                    <p className="text-base font-medium text-slate-900 dark:text-white">{site.duid || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Status</p>
                    <p className="text-base font-medium text-slate-900 dark:text-white">{site.status || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">DC Capacity</p>
                    <p className="text-base font-medium text-slate-900 dark:text-white">
                      {site.capacityDcMw ? `${Number(site.capacityDcMw).toFixed(1)} MW` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Location</p>
                    <p className="text-base font-medium text-slate-900 dark:text-white">
                      {site.latitude && site.longitude 
                        ? `${Number(site.latitude).toFixed(4)}\u00b0, ${Number(site.longitude).toFixed(4)}\u00b0`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            {configuration && (
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Configuration</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Detected system configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Tracking Type</p>
                      <Badge className="mt-1 bg-blue-600 text-white">
                        {configuration.trackingType.toUpperCase().replace('_', '-')}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Axis Azimuth</p>
                      <p className="text-base font-medium text-slate-900 dark:text-white">
                        {configuration.axisAzimuth ? `${Number(configuration.axisAzimuth).toFixed(2)}\u00b0` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Tilt Angle</p>
                      <p className="text-base font-medium text-slate-900 dark:text-white">
                        {configuration.tiltAngle ? `${Number(configuration.tiltAngle).toFixed(2)}\u00b0` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">GCR</p>
                      <p className="text-base font-medium text-slate-900 dark:text-white">
                        {configuration.gcr ? Number(configuration.gcr).toFixed(3) : 'N/A'}
                      </p>
                    </div>
                    
                    {/* Equipment Details - Only show if available */}
                    {configuration.inverterMake && (
                      <div className="col-span-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Inverter</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {configuration.inverterMake} {configuration.inverterModel || ''}
                        </p>
                        {configuration.inverterCount && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {configuration.inverterCount} units
                          </p>
                        )}
                      </div>
                    )}
                    
                    {configuration.pcuCount && (
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">PCU Count</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {configuration.pcuCount} units
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Detected from satellite
                        </p>
                      </div>
                    )}
                    
                    {configuration.moduleMake && (
                      <div className="col-span-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Solar Modules</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {configuration.moduleMake} {configuration.moduleModel || ''}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Confidence</p>
                      <Badge className="mt-1 bg-green-600 text-white">
                        {configuration.confidenceScore}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assessment History */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Assessment History</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Past performance assessments for this site
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assessments && assessments.length > 0 ? (
                  <div className="space-y-6">
                    {assessments.map((assessment) => (
                      <div key={assessment.id} className="space-y-4">
                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                Assessment Period
                              </span>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                {new Date(assessment.dateRangeStart).toLocaleDateString()} - {new Date(assessment.dateRangeEnd).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className="bg-green-600 text-white">
                              PR: {Number(assessment.overallPr).toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Technical PR</span>
                              <p className="text-base font-medium text-slate-900 dark:text-white mt-1">
                                {Number(assessment.technicalPr).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Curtailment</span>
                              <p className="text-base font-medium text-slate-900 dark:text-white mt-1">
                                {Number(assessment.curtailmentPct).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Curtailed Energy</span>
                              <p className="text-base font-medium text-slate-900 dark:text-white mt-1">
                                {Number(assessment.curtailmentMwh).toFixed(1)} MWh
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Lost Revenue</span>
                              <p className="text-base font-medium text-orange-600 dark:text-orange-500 mt-1">
                                ${Number(assessment.lostRevenueEstimate).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Performance Charts */}
                        <PerformanceCharts
                          dateRangeStart={new Date(assessment.dateRangeStart)}
                          dateRangeEnd={new Date(assessment.dateRangeEnd)}
                          technicalPr={assessment.technicalPr || '0'}
                          overallPr={assessment.overallPr || '0'}
                          curtailmentMwh={assessment.curtailmentMwh || '0'}
                          totalEnergyMwh={'2999'}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      No assessments yet for this site
                    </p>
                    <Button
                      onClick={() => setLocation("/assessment/new")}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Create First Assessment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Location Map */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <Satellite className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={mapContainerRef} className="h-64 rounded-lg overflow-hidden mb-4">
                  {site.latitude && site.longitude && (
                    <MapView
                      onMapReady={(map) => {
                        const position = {
                          lat: Number(site.latitude),
                          lng: Number(site.longitude),
                        };
                        
                        new google.maps.marker.AdvancedMarkerElement({
                          position,
                          map,
                          title: site.name,
                        });
                        
                        map.setCenter(position);
                        map.setZoom(15);
                        map.setMapTypeId('satellite');
                      }}
                    />
                  )}
                </div>
                <div className="text-sm space-y-1">
                  <p className="text-slate-600 dark:text-slate-400">Coordinates:</p>
                  <p className="text-slate-900 dark:text-white font-mono">
                    Lat: {site.latitude ? Number(site.latitude).toFixed(6) : 'N/A'}\u00b0
                  </p>
                  <p className="text-slate-900 dark:text-white font-mono">
                    Lon: {site.longitude ? Number(site.longitude).toFixed(6) : 'N/A'}\u00b0
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => setLocation("/assessment/new")}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white justify-start"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  New Assessment
                </Button>
                <Button
                  onClick={() => setLocation("/dashboard")}
                  variant="outline"
                  className="w-full justify-start border-slate-300 dark:border-slate-600 hover:border-orange-500"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  View Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
