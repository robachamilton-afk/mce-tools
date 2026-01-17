import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit, 
  ChevronLeft, 
  ChevronRight,
  ZoomIn,
  ZoomOut,
  CheckCheck
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type EquationStatus = "detected" | "verified" | "rejected" | "manual";

export interface DetectedEquation {
  id: string;
  pageNumber: number;
  bbox: { x: number; y: number; width: number; height: number };
  latex: string;
  context: string;
  confidence: number;
  status: EquationStatus;
}

interface EquationReviewProps {
  pdfUrl: string;
  detectedEquations: DetectedEquation[];
  onConfirm: (verifiedEquations: DetectedEquation[]) => void;
  onCancel: () => void;
  onExtractRegion?: (pageNumber: number, bbox: { x: number; y: number; width: number; height: number }) => Promise<string>;
}

export default function EquationReview({
  pdfUrl,
  detectedEquations,
  onConfirm,
  onCancel,
  onExtractRegion,
}: EquationReviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [equations, setEquations] = useState<DetectedEquation[]>(detectedEquations);
  const [selectedEquation, setSelectedEquation] = useState<DetectedEquation | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedLatex, setEditedLatex] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number; pngWidth: number; pngHeight: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Calculate scale factor to convert PNG pixels to canvas pixels
  // PNG: 1653px wide (rendered at 200 DPI)
  // Canvas: 595px wide (PDF points at scale=1)
  // Conversion: PNG pixels × (canvas width / PNG width) = canvas pixels
  const getCoordinateScale = () => {
    if (!pageDimensions) return 1;
    // Canvas width = PDF width (595 points) × zoom scale
    const canvasWidth = pageDimensions.width * scale;
    // To convert PNG pixels to canvas pixels: multiply by (canvas / PNG)
    return canvasWidth / pageDimensions.pngWidth;
  };

  const coordinateScale = getCoordinateScale();

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleEquationClick = (equation: DetectedEquation) => {
    setSelectedEquation(equation);
    setCurrentPage(equation.pageNumber);
  };

  const handleEditEquation = (equation: DetectedEquation) => {
    setSelectedEquation(equation);
    setEditedLatex(equation.latex);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (selectedEquation) {
      setEquations(equations.map(eq => 
        eq.id === selectedEquation.id 
          ? { ...eq, latex: editedLatex }
          : eq
      ));
    }
    setEditDialogOpen(false);
  };

  const handleDeleteEquation = (equationId: string) => {
    setEquations(equations.map(eq => 
      eq.id === equationId 
        ? { ...eq, status: "rejected" as EquationStatus }
        : eq
    ));
  };

  const handleVerifyEquation = (equationId: string) => {
    setEquations(equations.map(eq => 
      eq.id === equationId 
        ? { ...eq, status: "verified" as EquationStatus }
        : eq
    ));
  };

  const handleVerifyAll = () => {
    setEquations(equations.map(eq => 
      eq.status !== "rejected" 
        ? { ...eq, status: "verified" as EquationStatus }
        : eq
    ));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pageDimensions) return;
    // Use currentTarget (the element with the event handler) instead of pageRef
    const rect = e.currentTarget.getBoundingClientRect();
    // Mouse position in canvas pixels (relative to PDF canvas)
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    console.log('[Mouse Down] Mouse clientX/Y:', { clientX: e.clientX, clientY: e.clientY });
    console.log('[Mouse Down] Rect (from currentTarget):', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    console.log('[Mouse Down] Calculated canvas pixels:', { canvasX, canvasY });
    console.log('[Mouse Down] PDF dimensions:', pageDimensions);
    console.log('[Mouse Down] Scale:', scale);
    // Store in canvas pixels (we'll convert to PNG pixels on mouse up)
    setDrawStart({ x: canvasX, y: canvasY });
    setDrawCurrent({ x: canvasX, y: canvasY });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !pageDimensions) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Mouse position in canvas pixels
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    setDrawCurrent({ x: canvasX, y: canvasY });
  };

  const handleMouseUp = async () => {
    if (!isDrawing || !drawStart || !drawCurrent || !onExtractRegion) {
      setIsDrawing(false);
      return;
    }

    // drawStart and drawCurrent are in canvas pixels
    const bboxCanvas = {
      x: Math.min(drawStart.x, drawCurrent.x),
      y: Math.min(drawStart.y, drawCurrent.y),
      width: Math.abs(drawCurrent.x - drawStart.x),
      height: Math.abs(drawCurrent.y - drawStart.y),
    };

    // Convert canvas pixels to PNG pixels
    // Canvas: 595px wide, PNG: 1653px wide
    // Conversion: canvas pixels × (PNG width / canvas width)
    const canvasWidth = pageDimensions.width * scale;
    const canvasToPngRatio = pageDimensions.pngWidth / canvasWidth;
    const bboxPNG = {
      x: Math.round(bboxCanvas.x * canvasToPngRatio),
      y: Math.round(bboxCanvas.y * canvasToPngRatio),
      width: Math.round(bboxCanvas.width * canvasToPngRatio),
      height: Math.round(bboxCanvas.height * canvasToPngRatio),
    };

    console.log('[EquationReview] Manual extraction:', {
      canvasCoords: bboxCanvas,
      pngCoords: bboxPNG,
      canvasToPngRatio,
      pageDimensions
    });

    // Only extract if bbox is large enough (minimum 20x20 pixels in canvas space)
    if (bboxCanvas.width > 20 && bboxCanvas.height > 20) {
      setIsExtracting(true);
      try {
        const latex = await onExtractRegion(currentPage, bboxPNG);
        const newEquation: DetectedEquation = {
          id: `manual-${Date.now()}`,
          pageNumber: currentPage,
          bbox: bboxPNG, // Store in PNG coordinates to match auto-detected equations
          latex,
          context: "Manually tagged",
          confidence: 1.0,
          status: "manual",
        };
        setEquations([...equations, newEquation]);
        setSelectedEquation(newEquation);
        setEditedLatex(latex);
        setEditDialogOpen(true);
      } catch (error) {
        console.error("Failed to extract equation:", error);
        alert("Failed to extract equation from selected region");
      } finally {
        setIsExtracting(false);
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const getStatusColor = (status: EquationStatus) => {
    switch (status) {
      case "verified": return "bg-green-500/20 border-green-500";
      case "detected": return "bg-yellow-500/20 border-yellow-500";
      case "manual": return "bg-blue-500/20 border-blue-500";
      case "rejected": return "bg-red-500/20 border-red-500";
      default: return "bg-gray-500/20 border-gray-500";
    }
  };

  const getStatusBadge = (status: EquationStatus) => {
    switch (status) {
      case "verified": return <Badge className="bg-green-600">Verified</Badge>;
      case "detected": return <Badge className="bg-yellow-600">Needs Review</Badge>;
      case "manual": return <Badge className="bg-blue-600">Manual</Badge>;
      case "rejected": return <Badge className="bg-red-600">Rejected</Badge>;
      default: return null;
    }
  };

  const verifiedCount = equations.filter(eq => eq.status === "verified").length;
  const totalActive = equations.filter(eq => eq.status !== "rejected").length;
  const canProceed = verifiedCount > 0;

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel: Equation List */}
      <div className="w-96 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold mb-2">Detected Equations</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Review auto-detected equations or draw boxes to add missed ones
          </p>
          <div className="flex gap-2 mb-2">
            <Button size="sm" onClick={handleVerifyAll} className="flex-1">
              <CheckCheck className="h-4 w-4 mr-1" />
              Verify All ({totalActive})
            </Button>
          </div>
          <div className="text-sm">
            <span className="font-medium">{verifiedCount}</span> verified / 
            <span className="font-medium ml-1">{totalActive}</span> total
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {equations.filter(eq => eq.status !== "rejected").map((equation) => (
              <Card 
                key={equation.id}
                className={`cursor-pointer transition-all ${
                  selectedEquation?.id === equation.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleEquationClick(equation)}
              >
                <CardHeader className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">Page {equation.pageNumber}</span>
                        {getStatusBadge(equation.status)}
                      </div>
                      <div className="text-xs font-mono bg-muted p-2 rounded mt-2 overflow-x-auto">
                        {equation.latex.substring(0, 100)}
                        {equation.latex.length > 100 && "..."}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 flex gap-1">
                  {equation.status !== "verified" && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerifyEquation(equation.id);
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verify
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEquation(equation);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEquation(equation.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t space-y-2">
          <Button 
            className="w-full" 
            onClick={() => onConfirm(equations.filter(eq => eq.status === "verified"))}
            disabled={!canProceed}
          >
            Proceed to Model Building ({verifiedCount} equations)
          </Button>
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Right Panel: PDF Viewer */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {numPages}
            </span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setScale(Math.min(2.0, scale + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-8 flex justify-center">
            <div 
              className="relative"
              style={{ cursor: isDrawing ? "crosshair" : "default" }}
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="text-center py-8">Loading PDF...</div>}
              >
                <div
                  ref={pageRef}
                  className="relative"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                <Page 
                  pageNumber={currentPage} 
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onLoadSuccess={(page) => {
                    // PDF page dimensions in points (72 DPI)
                    // PNG dimensions = PDF points * (200/72)
                    const pngWidth = page.width * (200 / 72);
                    const pngHeight = page.height * (200 / 72);
                    setPageDimensions({ 
                      width: page.width, 
                      height: page.height,
                      pngWidth,
                      pngHeight
                    });
                    console.log('[EquationReview] Page dimensions:', {
                      pdf: { width: page.width, height: page.height },
                      png: { width: pngWidth, height: pngHeight },
                      scale: page.width / pngWidth
                    });
                    
                    // Find the actual canvas element rendered by react-pdf
                    setTimeout(() => {
                      if (pageRef.current) {
                        const canvas = pageRef.current.querySelector('canvas');
                        if (canvas) {
                          const canvasRect = canvas.getBoundingClientRect();
                          console.log('[EquationReview] Actual canvas element:', {
                            canvasWidth: canvas.width,
                            canvasHeight: canvas.height,
                            displayWidth: canvasRect.width,
                            displayHeight: canvasRect.height,
                            left: canvasRect.left,
                            top: canvasRect.top,
                          });
                        } else {
                          console.log('[EquationReview] Canvas element not found in pageRef');
                        }
                      }
                    }, 100);
                  }}
                />

                {/* Overlay bounding boxes for equations on current page */}
              {equations
                .filter(eq => eq.pageNumber === currentPage && eq.status !== "rejected")
                .map((equation) => {
                  const canvasX = equation.bbox.x * coordinateScale;
                  const canvasY = equation.bbox.y * coordinateScale;
                  const canvasW = equation.bbox.width * coordinateScale;
                  const canvasH = equation.bbox.height * coordinateScale;
                  return (
                  <div
                    key={equation.id}
                    className={`absolute border-2 ${getStatusColor(equation.status)} pointer-events-none`}
                    style={{
                      left: canvasX,
                      top: canvasY,
                      width: canvasW,
                      height: canvasH,
                    }}
                  />
                );
                })}

              {/* Drawing rectangle */}
              {isDrawing && drawStart && drawCurrent && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
                  style={{
                    left: Math.min(drawStart.x, drawCurrent.x),
                    top: Math.min(drawStart.y, drawCurrent.y),
                    width: Math.abs(drawCurrent.x - drawStart.x),
                    height: Math.abs(drawCurrent.y - drawStart.y),
                  }}
                />
              )}

              {isExtracting && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="bg-background p-4 rounded-lg">
                    <p className="text-sm">Extracting LaTeX...</p>
                  </div>
                </div>
              )}
                </div>
              </Document>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit LaTeX Equation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">LaTeX Code</label>
              <Textarea
                value={editedLatex}
                onChange={(e) => setEditedLatex(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
