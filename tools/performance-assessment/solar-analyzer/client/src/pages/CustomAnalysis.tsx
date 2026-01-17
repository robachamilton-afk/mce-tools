import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import ModelConfirmation from "@/components/ModelConfirmation";
// Toast notifications handled via browser alerts for now

type AnalysisStep = "details" | "upload_contract" | "review_equations" | "upload_scada" | "upload_meteo" | "map_columns" | "processing" | "results";

export default function CustomAnalysis() {
  const params = useParams<{ id: string; analysisId?: string }>();
  const [, setLocation] = useLocation();
  const toast = (opts: { title: string; description?: string; variant?: string }) => {
    alert(`${opts.title}${opts.description ? '\n' + opts.description : ''}`);
  };

  // If we have analysisId in URL, we're coming back from equation review
  const urlAnalysisId = params.id && !params.analysisId ? parseInt(params.id) : null;
  const siteId = params.analysisId ? 0 : parseInt(params.id || "0");
  const [step, setStep] = useState<AnalysisStep>("details");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [analysisName, setAnalysisName] = useState("");
  const [analysisDescription, setAnalysisDescription] = useState("");
  const [analysisId, setAnalysisId] = useState<number | null>(urlAnalysisId);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [scadaFile, setScadaFile] = useState<File | null>(null);
  const [meteoFile, setMeteoFile] = useState<File | null>(null);
  const [extractedModel, setExtractedModel] = useState<any>(null);
  const [extractionStartTime, setExtractionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [extractionProgress, setExtractionProgress] = useState<{
    stage: string;
    message: string;
    progress: number;
  } | null>(null);
  
  const contractInputRef = useRef<HTMLInputElement>(null);
  const scadaInputRef = useRef<HTMLInputElement>(null);
  const meteoInputRef = useRef<HTMLInputElement>(null);

  const { data: site, isLoading: siteLoading } = trpc.sites.getById.useQuery(
    { id: siteId },
    { enabled: siteId > 0 }
  );

  // If we have an analysisId from URL, load the analysis to get site info and show model confirmation
  const { data: existingAnalysis } = trpc.customAnalysis.getById.useQuery(
    { id: urlAnalysisId! },
    { enabled: !!urlAnalysisId }
  );

  // When coming back from equation review, show model confirmation step
  useEffect(() => {
    if (existingAnalysis && urlAnalysisId) {
      setAnalysisId(urlAnalysisId);
      setCompletedSteps(new Set(["details", "upload_contract"]));
      setStep("confirm_model");
      // Load the extracted model if available
      if (existingAnalysis.extractedModel) {
        setExtractedModel(existingAnalysis.extractedModel);
      }
    }
  }, [existingAnalysis, urlAnalysisId]);

  const uploadContractMutation = trpc.customAnalysis.uploadContract.useMutation({
    onSuccess: () => {
      toast({ title: "Contract uploaded", description: "Proceeding to equation review..." });
      // Navigate to equation review page
      if (analysisId) {
        setLocation(`/custom-analysis/${analysisId}/review-equations`);
      }
    },
    onError: (error: any) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const confirmModelMutation = trpc.customAnalysis.confirmModel.useMutation({
    onSuccess: () => {
      toast({ title: "Model confirmed", description: "Ready to upload data files" });
      setCompletedSteps(prev => new Set(prev).add("upload_contract"));
      setStep("upload_scada");
    },
    onError: (error: any) => {
      toast({ title: "Confirmation failed", description: error.message, variant: "destructive" });
    },
  });

  const extractModelMutation = trpc.customAnalysis.extractModel.useMutation({
    onMutate: () => {
      // Start timer when extraction begins
      setExtractionStartTime(Date.now());
      setElapsedTime(0);
      setExtractionProgress({ stage: 'pdf_conversion', message: 'Converting PDF to images...', progress: 10 });
    },
    onSuccess: (data: any) => {
      // Stop timer
      const duration = extractionStartTime ? Math.round((Date.now() - extractionStartTime) / 1000) : 0;
      setExtractionStartTime(null);
      setExtractionProgress(null);
      setExtractedModel(data.model);
      toast({ 
        title: "Model extracted", 
        description: `Completed in ${duration}s. ${data.model._validation?.needsClarification 
          ? `${data.model._validation.clarificationCount} items need clarification`
          : "Ready for review"}`
      });
      setStep("confirm_model");
    },
    onError: (error: any) => {
      // Stop timer on error
      setExtractionStartTime(null);
      setExtractionProgress(null);
      toast({ title: "Extraction failed", description: error.message, variant: "destructive" });
    },
  });

  const createAnalysisMutation = trpc.customAnalysis.create.useMutation({
    onSuccess: (data: any) => {
      setAnalysisId(data.id);
      toast({
        title: "Analysis created",
        description: "Ready to upload contract",
      });
      setCompletedSteps(prev => new Set(prev).add("details"));
      setStep("upload_contract");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update elapsed time and simulate progress every second while extracting
  useEffect(() => {
    if (extractionStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.round((Date.now() - extractionStartTime) / 1000);
        setElapsedTime(elapsed);
        
        // Simulate progress based on typical stage durations
        // Total expected time: ~300-600s for 12 pages
        if (elapsed < 5) {
          setExtractionProgress({ stage: 'pdf_conversion', message: 'Converting PDF to images...', progress: 10 });
        } else if (elapsed < 60) {
          // OCR + equation detection (parallel, fast)
          const progress = 10 + Math.min(30, (elapsed - 5) / 55 * 30);
          setExtractionProgress({ stage: 'ocr', message: 'Extracting text with OCR (parallel processing)...', progress: Math.round(progress) });
        } else if (elapsed < 180) {
          // LaTeX extraction (batch, moderate)
          const progress = 40 + Math.min(30, (elapsed - 60) / 120 * 30);
          setExtractionProgress({ stage: 'latex_extraction', message: 'Extracting LaTeX equations...', progress: Math.round(progress) });
        } else {
          // AI interpretation (slow, final stage)
          const progress = 70 + Math.min(25, (elapsed - 180) / 420 * 25);
          setExtractionProgress({ stage: 'ai_interpretation', message: 'Interpreting contract with AI...', progress: Math.round(progress) });
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [extractionStartTime]);

  const handleCreateAnalysis = () => {
    if (!analysisName.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for this analysis",
        variant: "destructive",
      });
      return;
    }
    
    createAnalysisMutation.mutate({
      siteId,
      name: analysisName,
      description: analysisDescription,
    });
  };

  const handleContractUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.pdf')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      setContractFile(file);
    }
  };

  const handleScadaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = ['.csv', '.xlsx', '.xls', '.pdf'];
      const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!isValid) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV, Excel, or PDF file",
          variant: "destructive",
        });
        return;
      }
      setScadaFile(file);
    }
  };

  const handleScadaDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validExtensions = ['.csv', '.xlsx', '.xls', '.pdf'];
      const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!isValid) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV, Excel, or PDF file",
          variant: "destructive",
        });
        return;
      }
      setScadaFile(file);
    }
  };

  const handleMeteoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = ['.csv', '.xlsx', '.xls', '.pdf'];
      const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!isValid) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV, Excel, or PDF file",
          variant: "destructive",
        });
        return;
      }
      setMeteoFile(file);
    }
  };

  const handleMeteoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validExtensions = ['.csv', '.xlsx', '.xls', '.pdf'];
      const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!isValid) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV, Excel, or PDF file",
          variant: "destructive",
        });
        return;
      }
      setMeteoFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  if (siteLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="container py-8">
        <p>Site not found</p>
      </div>
    );
  }

  const displaySite = site || (existingAnalysis ? { name: "Loading...", id: existingAnalysis.siteId } : null);
  const backSiteId = siteId || existingAnalysis?.siteId;

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-6">
        {backSiteId && (
          <Button variant="ghost" onClick={() => setLocation(`/site/${backSiteId}`)}>
            ← Back to Site
          </Button>
        )}
        <h1 className="text-3xl font-bold mt-4">Custom Performance Analysis</h1>
        {displaySite && <p className="text-muted-foreground">{displaySite.name}</p>}
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { key: "details", label: "Details" },
            { key: "upload_contract", label: "Contract" },
            { key: "upload_scada", label: "SCADA Data" },
            { key: "upload_meteo", label: "Meteo Data" },
            { key: "map_columns", label: "Map Columns" },
            { key: "processing", label: "Process Data" },
            { key: "results", label: "Results" },
          ].map((s, idx) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  completedSteps.has(s.key)
                    ? "bg-green-500 text-white"
                    : step === s.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {completedSteps.has(s.key) ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  idx + 1
                )}
              </div>
              <span className="ml-2 text-sm hidden sm:inline">{s.label}</span>
              {idx < 6 && <div className="w-8 h-0.5 bg-muted mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step: Details */}
      {step === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Details</CardTitle>
            <CardDescription>
              Provide a name and description for this custom analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Analysis Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Q4 2025 Performance Review"
                value={analysisName}
                onChange={(e) => setAnalysisName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional notes about this analysis"
                value={analysisDescription}
                onChange={(e) => setAnalysisDescription(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={handleCreateAnalysis} disabled={createAnalysisMutation.isPending}>
              {createAnalysisMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Upload Contract */}
      {step === "upload_contract" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Contract</CardTitle>
            <CardDescription>
              Upload the performance contract PDF to extract equations, tariffs, and guarantees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary"
              onClick={() => contractInputRef.current?.click()}
            >
              <input
                ref={contractInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleContractUpload}
              />
              {contractFile ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span className="font-medium">{contractFile.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({(contractFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <>
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload contract PDF
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PDF files only</p>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("details")}>
                Back
              </Button>
              <Button 
                onClick={async () => {
                  if (!contractFile || !analysisId) return;
                  
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64 = reader.result?.toString().split(',')[1];
                    if (base64) {
                      uploadContractMutation.mutate({
                        analysisId,
                        fileName: contractFile.name,
                        fileContent: base64,
                      });
                    }
                  };
                  reader.readAsDataURL(contractFile);
                }}
                disabled={!contractFile || uploadContractMutation.isPending || extractModelMutation.isPending}
              >
                {uploadContractMutation.isPending || extractModelMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadContractMutation.isPending 
                      ? "Uploading..." 
                      : `Extracting Model... (${elapsedTime}s)`}
                  </>
                ) : (
                  "Upload & Extract Model"
                )}
              </Button>
              
              {/* Progress Tracker */}
              {extractModelMutation.isPending && extractionProgress && (
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{extractionProgress.message}</span>
                    <span className="text-muted-foreground">{extractionProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${extractionProgress.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Stage: {extractionProgress.stage} • Elapsed: {elapsedTime}s
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Confirm Model */}
      {step === "confirm_model" && extractedModel && (
        <ModelConfirmation
          model={extractedModel}
          onConfirm={(confirmedModel) => {
            if (!analysisId) return;
            confirmModelMutation.mutate({ analysisId, model: confirmedModel });
          }}
          onBack={() => setStep("upload_contract")}
          isLoading={confirmModelMutation.isPending}
        />
      )}

      {/* Step: Upload SCADA */}
      {step === "upload_scada" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload SCADA Data</CardTitle>
            <CardDescription>
              Upload file with generation data (CSV, Excel, or PDF with timestamp, power output, availability)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary"
              onClick={() => scadaInputRef.current?.click()}
              onDrop={handleScadaDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={scadaInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={handleScadaUpload}
              />
              {scadaFile ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span className="font-medium">{scadaFile.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({(scadaFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">CSV, Excel (.xlsx, .xls), or PDF files</p>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("details")}>
                Back
              </Button>
              <Button
                onClick={() => setStep("upload_meteo")}
                disabled={!scadaFile}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Upload Meteo */}
      {step === "upload_meteo" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Meteorological Data</CardTitle>
            <CardDescription>
              Upload file with weather data (CSV, Excel, or PDF with timestamp, irradiance, temperature)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary"
              onClick={() => meteoInputRef.current?.click()}
              onDrop={handleMeteoDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={meteoInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={handleMeteoUpload}
              />
              {meteoFile ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span className="font-medium">{meteoFile.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({(meteoFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">CSV, Excel (.xlsx, .xls), or PDF files</p>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload_scada")}>
                Back
              </Button>
              <Button
                onClick={() => setStep("map_columns")}
                disabled={!meteoFile}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placeholder for other steps */}
      {step === "map_columns" && (
        <Card>
          <CardHeader>
            <CardTitle>Column Mapping</CardTitle>
            <CardDescription>Coming soon: LLM-powered column mapping</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setStep("upload_meteo")}>
              Back
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
