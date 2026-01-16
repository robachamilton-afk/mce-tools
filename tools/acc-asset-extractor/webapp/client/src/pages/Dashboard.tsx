import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Clock, FileText, Loader2, Package } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function Dashboard() {
  const { jobId } = useParams();
  const [, setLocation] = useLocation();
  
  const jobIdNum = parseInt(jobId || "0");
  const { data: job, isLoading } = trpc.extraction.getJob.useQuery(
    { jobId: jobIdNum },
    { 
      refetchInterval: 2000,
      enabled: jobIdNum > 0
    }
  );

  const { data: stats } = trpc.extraction.getStatistics.useQuery(
    { jobId: parseInt(jobId || "0") },
    { enabled: job?.status === "completed" }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <Button onClick={() => setLocation("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const reviewProgress = (job.totalDocuments || 0) > 0 
    ? ((job.reviewedDocuments || 0) / (job.totalDocuments || 1)) * 100 
    : 0;
  
  const extractionProgress = (job.totalDocuments || 0) > 0
    ? ((job.extractedDocuments || 0) / (job.totalDocuments || 1)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-6xl py-12">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{job.projectName}</h1>
            <p className="text-muted-foreground">Extraction Job #{job.id}</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {job.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
                Status: {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </CardTitle>
              <CardDescription>
                {job.status === "completed" 
                  ? `Completed on ${new Date(job.completedAt!).toLocaleString()}`
                  : job.status === "reviewing"
                  ? "Reviewing documents for asset-relevant content..."
                  : job.status === "extracting"
                  ? "Extracting assets from documents..."
                  : "Processing..."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Document Review Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Document Review</span>
                  <span className="font-medium">{job.reviewedDocuments || 0} / {job.totalDocuments || 0}</span>
                </div>
                <Progress value={reviewProgress} className="h-2" />
              </div>

              {/* Asset Extraction Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Asset Extraction</span>
                  <span className="font-medium">{job.extractedDocuments || 0} / {job.totalDocuments || 0}</span>
                </div>
                <Progress value={extractionProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{job.totalAssets || 0}</div>
                <p className="text-xs text-muted-foreground">Extracted from documents</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{job.totalDocuments || 0}</div>
                <p className="text-xs text-muted-foreground">Total reviewed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {job.completedAt && job.startedAt
                    ? `${Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 60000)}m`
                    : "-"}
                </div>
                <p className="text-xs text-muted-foreground">Processing time</p>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Asset Breakdown</CardTitle>
                <CardDescription>Distribution by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.byCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{category}</span>
                      <span className="text-sm text-muted-foreground">{count} assets</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {job.status === "completed" && (
            <div className="flex gap-4">
              <Button onClick={() => setLocation(`/validate/${job.id}`)} size="lg" className="flex-1">
                Review & Validate Assets
              </Button>
              <Button onClick={() => setLocation(`/export/${job.id}`)} variant="outline" size="lg" className="flex-1">
                Export Results
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
