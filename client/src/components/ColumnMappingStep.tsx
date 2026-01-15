import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ColumnMappingStepProps {
  analysisId: number;
  onComplete: () => void;
  onBack: () => void;
}

export default function ColumnMappingStep({ analysisId, onComplete, onBack }: ColumnMappingStepProps) {
  const [scadaMappings, setScadaMappings] = useState<any[]>([]);
  const [meteoMappings, setMeteoMappings] = useState<any[]>([]);
  const [missingVariables, setMissingVariables] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [scadaHeaders, setScadaHeaders] = useState<string[]>([]);
  const [meteoHeaders, setMeteoHeaders] = useState<string[]>([]);

  const analyzeMutation = trpc.customAnalysis.analyzeColumnMappings.useMutation({
    onSuccess: (data) => {
      setScadaMappings(data.scada_mappings || []);
      setMeteoMappings(data.meteo_mappings || []);
      setMissingVariables(data.missing_variables || []);
      setWarnings(data.warnings || []);
      
      // Extract unique headers
      const scadaHdrs = new Set<string>();
      const meteoHdrs = new Set<string>();
      
      data.scada_mappings?.forEach((m: any) => scadaHdrs.add(m.suggested_column));
      data.meteo_mappings?.forEach((m: any) => meteoHdrs.add(m.suggested_column));
      
      setScadaHeaders(Array.from(scadaHdrs));
      setMeteoHeaders(Array.from(meteoHdrs));
    },
    onError: (error: any) => {
      alert(`Analysis failed: ${error.message}`);
    },
  });

  const updateMutation = trpc.customAnalysis.updateColumnMappings.useMutation({
    onSuccess: () => {
      alert("Column mappings saved successfully");
      onComplete();
    },
    onError: (error: any) => {
      alert(`Save failed: ${error.message}`);
    },
  });

  useEffect(() => {
    analyzeMutation.mutate({ analysisId });
  }, [analysisId]);

  const handleScadaMappingChange = (index: number, newColumn: string) => {
    const updated = [...scadaMappings];
    updated[index].suggested_column = newColumn;
    setScadaMappings(updated);
  };

  const handleMeteoMappingChange = (index: number, newColumn: string) => {
    const updated = [...meteoMappings];
    updated[index].suggested_column = newColumn;
    setMeteoMappings(updated);
  };

  const handleSave = () => {
    updateMutation.mutate({
      analysisId,
      scadaMappings,
      meteoMappings,
    });
  };

  if (analyzeMutation.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analyzing Data Files</CardTitle>
          <CardDescription>LLM is analyzing CSV/Excel headers and suggesting column mappings...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Column Mapping</CardTitle>
          <CardDescription>
            Review and adjust the suggested mappings between your data columns and model variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Missing Variables */}
          {missingVariables.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Missing Variables:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {missingVariables.map((v, i) => (
                    <li key={i}>
                      <strong>{v.variable_name}</strong>: {v.reason}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* SCADA Mappings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">SCADA Data Mappings</h3>
            <div className="space-y-4">
              {scadaMappings.map((mapping, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <Label className="text-sm font-medium">{mapping.variable_name}</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confidence: {mapping.confidence}% • {mapping.reasoning}
                    </p>
                  </div>
                  <Select
                    value={mapping.suggested_column}
                    onValueChange={(value) => handleScadaMappingChange(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scadaHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Meteo Mappings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Meteorological Data Mappings</h3>
            <div className="space-y-4">
              {meteoMappings.map((mapping, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <Label className="text-sm font-medium">{mapping.variable_name}</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confidence: {mapping.confidence}% • {mapping.reasoning}
                    </p>
                  </div>
                  <Select
                    value={mapping.suggested_column}
                    onValueChange={(value) => handleMeteoMappingChange(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meteoHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Mappings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
