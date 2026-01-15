import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, ArrowLeft, TrendingUp, TrendingDown, DollarSign, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Generate mock time-series data for charts
// TODO: Replace with real data from analysis results
function generateMockTimeSeriesData() {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pr: 80 + Math.random() * 10,
      availability: 95 + Math.random() * 5,
      energy: 3 + Math.random() * 2,
    });
  }
  
  return data;
}

export default function CustomAnalysisResults() {
  const params = useParams<{ id: string; analysisId: string }>();
  const siteId = parseInt(params.id || "0");
  const analysisId = parseInt(params.analysisId || "0");

  const { data: analysis, isLoading: analysisLoading } = trpc.customAnalysis.getById.useQuery({ id: analysisId });
  const { data: site } = trpc.sites.getById.useQuery({ id: siteId });
  
  const generatePDF = trpc.customAnalysis.generatePDFReport.useMutation();
  const generateExcel = trpc.customAnalysis.generateExcelReport.useMutation();
  
  const handleExportPDF = async () => {
    try {
      const result = await generatePDF.mutateAsync({ analysisId });
      window.open(result.url, '_blank');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };
  
  const handleExportExcel = async () => {
    try {
      const result = await generateExcel.mutateAsync({ analysisId });
      window.open(result.url, '_blank');
    } catch (error) {
      console.error('Failed to generate Excel:', error);
    }
  };

  if (analysisLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Analysis Not Found</CardTitle>
            <CardDescription>The requested analysis could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/site/${siteId}`}>
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Site
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Parse extracted model to get results
  const model = analysis.extractedModel ? 
    (typeof analysis.extractedModel === 'string' ? JSON.parse(analysis.extractedModel) : analysis.extractedModel) 
    : null;

  // Mock results for now - in production these would come from the assessment
  const results = {
    performanceRatio: 85.3,
    availability: 98.5,
    energyGeneration: 125000,
    revenue: 12500,
    penalties: 250,
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/site/${siteId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {site?.name || "Site"}
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mt-2">{analysis.name}</h1>
          <p className="text-muted-foreground">{analysis.description}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={generatePDF.isPending}
          >
            {generatePDF.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export PDF
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportExcel}
            disabled={generateExcel.isPending}
          >
            {generateExcel.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export Excel
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div>
        <Badge variant={analysis.status === 'completed' ? 'default' : 'secondary'}>
          {analysis.status}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Ratio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.performanceRatio.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {results.performanceRatio >= 85 ? "Above target" : "Below target"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Availability</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.availability.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {results.availability >= 98 ? "Excellent" : "Needs improvement"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Energy Generation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(results.energyGeneration / 1000).toFixed(1)} MWh</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total generation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((results.revenue - results.penalties) / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue: ${(results.revenue / 1000).toFixed(1)}k | Penalties: ${(results.penalties / 1000).toFixed(1)}k
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contract Details */}
      {model && (
        <Card>
          <CardHeader>
            <CardTitle>Contract Terms</CardTitle>
            <CardDescription>Extracted from uploaded contract</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {model.tariff_structure && (
              <div>
                <h3 className="font-semibold mb-2">Tariff Structure</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Base Tariff:</span>
                    <span className="ml-2 font-medium">${model.tariff_structure.base_tariff || 0}/MWh</span>
                  </div>
                  {model.tariff_structure.time_of_use_rates && (
                    <div>
                      <span className="text-muted-foreground">Time-of-Use:</span>
                      <span className="ml-2 font-medium">Yes</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {model.capacity_guarantees && (
              <div>
                <h3 className="font-semibold mb-2">Performance Guarantees</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {model.capacity_guarantees.min_performance_ratio && (
                    <div>
                      <span className="text-muted-foreground">Minimum PR:</span>
                      <span className="ml-2 font-medium">{model.capacity_guarantees.min_performance_ratio}%</span>
                    </div>
                  )}
                  {model.capacity_guarantees.min_availability && (
                    <div>
                      <span className="text-muted-foreground">Minimum Availability:</span>
                      <span className="ml-2 font-medium">{model.capacity_guarantees.min_availability}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {model.equations && model.equations.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Performance Equations</h3>
                <div className="space-y-2">
                  {model.equations.slice(0, 3).map((eq: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{eq.name}:</span>
                      <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">{eq.formula}</code>
                    </div>
                  ))}
                  {model.equations.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{model.equations.length - 3} more equations
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>Time-series analysis of key metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Performance Ratio Chart */}
            <div>
              <h3 className="text-sm font-medium mb-4">Performance Ratio Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generateMockTimeSeriesData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[70, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pr" stroke="#8b5cf6" strokeWidth={2} name="Performance Ratio (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Availability Chart */}
            <div>
              <h3 className="text-sm font-medium mb-4">Availability Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generateMockTimeSeriesData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[90, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="availability" stroke="#10b981" strokeWidth={2} name="Availability (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Energy Generation Chart */}
            <div>
              <h3 className="text-sm font-medium mb-4">Daily Energy Generation</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generateMockTimeSeriesData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} name="Energy (MWh)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Status</CardTitle>
          <CardDescription>Performance against contract requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Performance Ratio</span>
              <div className="flex items-center gap-2">
                {results.performanceRatio >= 85 ? (
                  <>
                    <Badge variant="default">Compliant</Badge>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </>
                ) : (
                  <>
                    <Badge variant="destructive">Below Target</Badge>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Availability</span>
              <div className="flex items-center gap-2">
                {results.availability >= 98 ? (
                  <>
                    <Badge variant="default">Compliant</Badge>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </>
                ) : (
                  <>
                    <Badge variant="destructive">Below Target</Badge>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </>
                )}
              </div>
            </div>

            {results.penalties > 0 && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm font-medium text-destructive">
                  Penalty Assessment: ${results.penalties.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Performance below contractual guarantees resulted in penalty charges
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Files */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Data</CardTitle>
          <CardDescription>Files used in this analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {analysis.contractFileUrl && (
              <div className="flex items-center justify-between">
                <span>Contract PDF</span>
                <a href={analysis.contractFileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            )}
            {analysis.scadaFileUrl && (
              <div className="flex items-center justify-between">
                <span>SCADA Data</span>
                <a href={analysis.scadaFileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            )}
            {analysis.meteoFileUrl && (
              <div className="flex items-center justify-between">
                <span>Meteorological Data</span>
                <a href={analysis.meteoFileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
