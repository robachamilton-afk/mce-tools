import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Edit2, Save } from "lucide-react";

interface ModelConfirmationProps {
  model: any;
  onConfirm: (confirmedModel: any) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function ModelConfirmation({ model, onConfirm, onBack, isLoading }: ModelConfirmationProps) {
  const [editedModel, setEditedModel] = useState(model);
  const [clarifications, setClarifications] = useState<Record<string, string>>({});
  const [editingEquation, setEditingEquation] = useState<number | null>(null);

  const hasUndefinedTerms = (editedModel.undefinedTerms?.length || 0) > 0;
  const hasMissingParams = (editedModel.missingParameters?.length || 0) > 0;
  const hasAmbiguities = (editedModel.ambiguities?.length || 0) > 0;
  const needsClarification = hasUndefinedTerms || hasMissingParams || hasAmbiguities;

  const handleConfirm = () => {
    // Merge clarifications into model
    const confirmedModel = {
      ...editedModel,
      clarifications,
      _validation: {
        ...editedModel._validation,
        clarificationsProvided: Object.keys(clarifications).length
      }
    };
    onConfirm(confirmedModel);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Confidence Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Model Extraction Summary</CardTitle>
          <CardDescription>Review confidence scores and extracted information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getConfidenceColor(editedModel.confidence?.equations || 0)}`}>
                {editedModel.confidence?.equations || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Equations</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${getConfidenceColor(editedModel.confidence?.parameters || 0)}`}>
                {editedModel.confidence?.parameters || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Parameters</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${getConfidenceColor(editedModel.confidence?.tariffs || 0)}`}>
                {editedModel.confidence?.tariffs || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Tariffs</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${getConfidenceColor(editedModel.confidence?.overall || 0)}`}>
                {editedModel.confidence?.overall || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Overall</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clarifications Needed */}
      {needsClarification && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {editedModel._validation?.clarificationCount || 0} items need clarification before proceeding
          </AlertDescription>
        </Alert>
      )}

      {/* Undefined Terms */}
      {hasUndefinedTerms && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Undefined Terms
            </CardTitle>
            <CardDescription>Provide definitions for these terms referenced in the contract</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editedModel.undefinedTerms.map((term: any, idx: number) => (
              <div key={idx} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{term.term}</div>
                    <div className="text-sm text-muted-foreground">{term.context}</div>
                    <div className="text-xs text-muted-foreground mt-1">Required for: {term.requiredFor}</div>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`term-${idx}`}>Definition</Label>
                  <Textarea
                    id={`term-${idx}`}
                    placeholder={`Define "${term.term}"...`}
                    value={clarifications[`term_${idx}`] || ""}
                    onChange={(e) => setClarifications({ ...clarifications, [`term_${idx}`]: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Missing Parameters */}
      {hasMissingParams && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Missing Parameters
            </CardTitle>
            <CardDescription>Provide values for parameters not found in the contract</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editedModel.missingParameters.map((param: any, idx: number) => (
              <div key={idx} className="space-y-2 p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{param.parameter}</div>
                  <div className="text-sm text-muted-foreground">{param.description}</div>
                  {param.suggestedValue && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Suggested: {param.suggestedValue}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor={`param-${idx}`}>Value</Label>
                  <Input
                    id={`param-${idx}`}
                    placeholder={param.suggestedValue || "Enter value..."}
                    value={clarifications[`param_${idx}`] || ""}
                    onChange={(e) => setClarifications({ ...clarifications, [`param_${idx}`]: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ambiguities */}
      {hasAmbiguities && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Ambiguities
            </CardTitle>
            <CardDescription>Clarify these ambiguous clauses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editedModel.ambiguities.map((amb: any, idx: number) => (
              <div key={idx} className="space-y-2 p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{amb.issue}</div>
                  <div className="text-sm text-muted-foreground">Location: {amb.location}</div>
                  <div className="text-sm mt-2">Possible interpretations:</div>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {amb.options.map((opt: string, optIdx: number) => (
                      <li key={optIdx}>{opt}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Label htmlFor={`amb-${idx}`}>Clarification</Label>
                  <Textarea
                    id={`amb-${idx}`}
                    placeholder="Provide clarification..."
                    value={clarifications[`amb_${idx}`] || ""}
                    onChange={(e) => setClarifications({ ...clarifications, [`amb_${idx}`]: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Extracted Equations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Extracted Equations ({editedModel.equations?.length || 0})
          </CardTitle>
          <CardDescription>Review and edit performance equations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editedModel.equations?.map((eq: any, idx: number) => (
            <div key={idx} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{eq.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{eq.description}</div>
                  <div className="mt-2 p-2 bg-muted rounded font-mono text-sm">{eq.formula}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Variables: {eq.variables.map((v: any) => v.name).join(", ")}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditingEquation(idx)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Parameters & Tariffs */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contract Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(editedModel.parameters || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tariff Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {editedModel.tariffs?.baseRate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Rate:</span>
                <span className="font-medium">${editedModel.tariffs.baseRate}/MWh</span>
              </div>
            )}
            {editedModel.tariffs?.timeOfUse?.map((tou: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{tou.period}:</span>
                <span className="font-medium">${tou.rate}/MWh</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={handleConfirm} disabled={isLoading}>
          {isLoading ? (
            <>
              <Save className="mr-2 h-4 w-4 animate-spin" />
              Confirming...
            </>
          ) : (
            "Confirm Model & Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
