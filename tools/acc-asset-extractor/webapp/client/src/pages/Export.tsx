import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function Export() {
  const { jobId } = useParams();
  const [, setLocation] = useLocation();

  const jobIdNum = parseInt(jobId || "0");
  const { data: job } = trpc.extraction.getJob.useQuery({ jobId: jobIdNum });
  const { data: assets } = trpc.extraction.getAssets.useQuery({ jobId: jobIdNum });
  const { data: stats } = trpc.extraction.getStatistics.useQuery({ jobId: jobIdNum });

  const handleExportJSON = () => {
    if (!assets) return;
    
    const dataStr = JSON.stringify(assets, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${job?.projectName || "assets"}_${jobId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("JSON export downloaded");
  };

  const handleExportCSV = () => {
    if (!assets) return;

    const headers = ["Asset ID", "Name", "Category", "Type", "Location", "Quantity", "Confidence", "Source Document"];
    const rows = assets.map((asset) => [
      asset.assetId,
      asset.name,
      asset.category,
      asset.type || "",
      asset.location || "",
      asset.quantity || 1,
      asset.confidence,
      asset.sourceDocument,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\\n");

    const dataBlob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${job?.projectName || "assets"}_${jobId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded");
  };

  const exportExcel = trpc.extraction.exportToExcel.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("ACC Excel file downloaded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to generate Excel: ${error.message}`);
    },
  });

  const handleExportACCExcel = () => {
    exportExcel.mutate({ jobId: jobIdNum });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-5xl py-12">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/dashboard/${jobId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Export Results</h1>
            <p className="text-muted-foreground">{job?.projectName}</p>
          </div>
        </div>

        {/* Statistics Summary */}
        {stats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Export Summary</CardTitle>
              <CardDescription>Overview of extracted data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Assets</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</div>
                  <div className="text-sm text-muted-foreground">Categories</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{Math.round(stats.avgConfidence)}%</div>
                  <div className="text-sm text-muted-foreground">Avg Confidence</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Options */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <CardTitle>ACC-Compatible Excel</CardTitle>
              </div>
              <CardDescription>
                Export assets in ACC-compatible format for direct import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleExportACCExcel} 
                size="lg" 
                className="w-full"
                disabled={exportExcel.isPending || !assets || assets.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Download ACC Excel File
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" />
                <CardTitle>JSON Export</CardTitle>
              </div>
              <CardDescription>
                Raw asset data with complete specifications and metadata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportJSON} variant="outline" size="lg" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>CSV Export</CardTitle>
              </div>
              <CardDescription>
                Simple spreadsheet format compatible with Excel and Google Sheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportCSV} variant="outline" size="lg" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        {stats && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Asset Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.byCategory).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{category}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-16 text-right">
                        {count} ({Math.round((count / stats.total) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
