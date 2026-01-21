import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Upload, File, AlertCircle, CheckCircle, Loader2, X, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

const DOCUMENT_TYPES = [
  { value: "IM", label: "Investment Memorandum" },
  { value: "DD_Pack", label: "Due Diligence Pack" },
  { value: "Contract", label: "Contract" },
  { value: "Grid_Study", label: "Grid Study" },
  { value: "Planning", label: "Planning Document" },
  { value: "Design", label: "Design Document" },
  { value: "Other", label: "Other" },
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".doc", ".xls", ".txt", ".pptx"];

export default function DocumentUpload() {
  const { user, isAuthenticated } = useAuth();
  const [, params] = useRoute("/project/:id/upload");
  const [, setLocation] = useLocation();

  const projectId = params?.id ? parseInt(params.id) : null;
  const [selectedType, setSelectedType] = useState("Other");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  // Fetch project details
  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { projectId: projectId || 0 },
    { enabled: !!projectId && isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to upload documents.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Project Not Found</CardTitle>
            <CardDescription>Please select a project first.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        newFiles.push({
          id: `${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          type: selectedType,
          progress: 0,
          status: "error",
          error: `File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
        });
      } else {
        newFiles.push({
          id: `${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          type: selectedType,
          progress: 0,
          status: "pending",
        });
      }
    }

    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(`/project/${projectId}`)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold text-foreground">Upload Documents</h1>
              </div>
              <p className="text-muted-foreground ml-11">
                {project ? `Project: ${project.name}` : "Loading project..."}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Area */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Select Documents</CardTitle>
                <CardDescription>
                  Upload project documents (IMs, DD packs, contracts, grid studies, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Drag and Drop Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Drag and drop files here
                  </h3>
                  <p className="text-muted-foreground mb-4">or click to browse</p>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-input"
                    accept={ALLOWED_EXTENSIONS.join(",")}
                  />
                  <label htmlFor="file-input">
                    <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer">
                      <span>Select Files</span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-4">
                    Supported: {ALLOWED_EXTENSIONS.join(", ")}
                  </p>
                </div>

                {/* Document Type Selector */}
                <div className="mt-8">
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Document Type (applies to all uploads)
                  </label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-foreground">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upload Queue */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border sticky top-24">
              <CardHeader>
                <CardTitle>Upload Queue</CardTitle>
                <CardDescription>
                  {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""} selected
                </CardDescription>
              </CardHeader>
              <CardContent>
                {uploadedFiles.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No files selected yet</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 bg-background rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <File className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          {file.status !== "uploading" && (
                            <button
                              onClick={() => removeFile(file.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center gap-2">
                          {file.status === "pending" && (
                            <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                              <div className="h-full bg-primary w-0"></div>
                            </div>
                          )}
                          {file.status === "uploading" && (
                            <div className="flex items-center gap-2 w-full">
                              <Loader2 className="h-3 w-3 text-primary animate-spin flex-shrink-0" />
                              <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${file.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          {file.status === "completed" && (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                          {file.status === "error" && (
                            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                          )}
                        </div>

                        {file.error && (
                          <p className="text-xs text-destructive mt-2">{file.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {uploadedFiles.length > 0 && (
                  <Button
                    className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={uploadedFiles.some((f) => f.status === "error")}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload All Files
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
