import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import EquationReview, { type DetectedEquation } from "@/components/EquationReview";
import MCELoader from "@/components/MCELoader";

export default function EquationReviewPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const analysisId = parseInt(params.id || "0");

  const [detectedEquations, setDetectedEquations] = useState<DetectedEquation[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(true);
  const [progressMessage, setProgressMessage] = useState("Initializing...");
  const [progressDetail, setProgressDetail] = useState("Preparing contract analysis");

  const detectMutation = trpc.customAnalysis.detectEquations.useMutation({
    onSuccess: (data) => {
      setPdfUrl(data.pdfUrl);
      setDetectedEquations(data.equations as DetectedEquation[]);
      setIsDetecting(false);
    },
    onError: (error) => {
      alert(`Detection failed: ${error.message}`);
      setIsDetecting(false);
    },
  });

  const extractRegionMutation = trpc.customAnalysis.extractRegion.useMutation();

  const { data: analysis } = trpc.customAnalysis.getById.useQuery({ id: analysisId });

  const buildModelMutation = trpc.customAnalysis.buildModelFromEquations.useMutation({
    onSuccess: () => {
      // Navigate to custom analysis page with analysis ID (will show model confirmation step)
      setLocation(`/custom-analysis/${analysisId}`);
    },
    onError: (error) => {
      alert(`Model building failed: ${error.message}`);
    },
  });

  useEffect(() => {
    if (analysisId) {
      detectMutation.mutate({ analysisId });
    }
  }, [analysisId]);

  // Simulated progress updates while detection is running
  useEffect(() => {
    if (!isDetecting) return;

    const progressSteps = [
      { message: "Loading contract...", detail: "Downloading PDF file", delay: 0 },
      { message: "Converting pages...", detail: "Rendering PDF to images", delay: 3000 },
      { message: "Detecting equations...", detail: "Scanning for mathematical expressions", delay: 8000 },
      { message: "Extracting LaTeX...", detail: "Converting equations to LaTeX format", delay: 15000 },
      { message: "Analyzing structure...", detail: "Identifying equation components", delay: 25000 },
      { message: "Finalizing results...", detail: "Preparing equation review interface", delay: 40000 },
    ];

    const timers = progressSteps.map(step => 
      setTimeout(() => {
        if (isDetecting) {
          setProgressMessage(step.message);
          setProgressDetail(step.detail);
        }
      }, step.delay)
    );

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [isDetecting]);

  const handleExtractRegion = async (
    pageNumber: number,
    bbox: { x: number; y: number; width: number; height: number }
  ): Promise<string> => {
    const result = await extractRegionMutation.mutateAsync({
      analysisId,
      pageNumber,
      bbox,
    });
    return result.latex;
  };

  const handleConfirm = (verifiedEquations: DetectedEquation[]) => {
    // Build model from verified equations
    buildModelMutation.mutate({
      analysisId,
      verifiedEquations: verifiedEquations.map(eq => ({
        id: eq.id,
        pageNumber: eq.pageNumber,
        latex: eq.latex,
        context: eq.context,
      })),
    });
  };

  const handleCancel = () => {
    setLocation(`/custom-analysis/${analysisId}`);
  };

  if (isDetecting || buildModelMutation.isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <MCELoader size={80} className="mx-auto mb-6" />
          <p className="text-lg font-medium mb-2">
            {isDetecting ? progressMessage : "Building model from verified equations..."}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {isDetecting ? progressDetail : "Interpreting equations with AI..."}
          </p>
          {isDetecting && (
            <p className="text-xs text-muted-foreground">
              This may take 1-2 minutes
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Failed to load PDF</p>
      </div>
    );
  }

  return (
    <EquationReview
      pdfUrl={pdfUrl}
      detectedEquations={detectedEquations}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      onExtractRegion={handleExtractRegion}
    />
  );
}
