import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import EquationReview, { type DetectedEquation } from "@/components/EquationReview";
import { Loader2 } from "lucide-react";

export default function EquationReviewPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const analysisId = parseInt(params.id || "0");

  const [detectedEquations, setDetectedEquations] = useState<DetectedEquation[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(true);

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
      // TODO: Navigate to variable mapping page
      // For now, navigate back to custom analysis page to show model confirmation
      if (analysis) {
        setLocation(`/custom-analysis/${analysisId}`);
      }
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
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">
            {isDetecting ? "Detecting equations in contract..." : "Building model from verified equations..."}
          </p>
          <p className="text-sm text-muted-foreground">
            {isDetecting ? "This may take 1-2 minutes" : "Interpreting equations with AI..."}
          </p>
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
