import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Calendar, MapPin, Loader2 } from "lucide-react";

export default function Assessments() {
  const [, setLocation] = useLocation();
  // TODO: Create a query to fetch all assessments across all sites
  const isLoading = false;
  const sortedAssessments: any[] = [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Assessments</h1>
              <p className="text-muted-foreground">
                All performance assessments across solar farms
              </p>
            </div>
            <Button
              onClick={() => setLocation("/new-assessment")}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              New Assessment
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Assessments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{sortedAssessments.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sites Assessed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {new Set(sortedAssessments.map(a => a.siteId)).size}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average PR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {sortedAssessments.length > 0
                    ? (sortedAssessments.reduce((sum, a) => sum + Number(a.overallPr || 0), 0) / sortedAssessments.length).toFixed(1)
                    : '—'}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assessments List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedAssessments.length > 0 ? (
            <div className="space-y-4">
              {sortedAssessments.map((assessment) => (
                <Card 
                  key={assessment.id}
                  className="hover:border-primary transition-colors cursor-pointer"
                  onClick={() => setLocation(`/site/${assessment.siteId}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{assessment.siteName}</CardTitle>
                        <CardDescription className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(assessment.dateRangeStart).toLocaleDateString()} - {new Date(assessment.dateRangeEnd).toLocaleDateString()}
                          </span>
                          {assessment.siteDuid && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span>DUID: {assessment.siteDuid}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        PR: {Number(assessment.overallPr).toFixed(1)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Technical PR</div>
                        <div className="text-lg font-semibold mt-1">
                          {Number(assessment.technicalPr).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Curtailment</div>
                        <div className="text-lg font-semibold mt-1">
                          {Number(assessment.curtailmentPct).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Curtailed Energy</div>
                        <div className="text-lg font-semibold mt-1">
                          {Number(assessment.curtailmentMwh).toFixed(0)} MWh
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Lost Revenue</div>
                        <div className="text-lg font-semibold text-orange-600 mt-1">
                          ${Number(assessment.lostRevenueEstimate).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No assessments yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first performance assessment to get started
                </p>
                <Button
                  onClick={() => setLocation("/new-assessment")}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Create First Assessment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
