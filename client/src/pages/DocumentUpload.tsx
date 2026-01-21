import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Upload, File, AlertCircle, CheckCircle, Loader2, X } from "lucide-react";
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Upload Documents</h1>
              <p className="text-slate-400 mt-1">
                {project ? `Project: ${project.name}` : "Loading project..."}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation(`/project/${projectId}`)}
            >
              Back to Project
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Area */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-700/50">
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
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragActive
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                  }`}
                >
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Drag and drop files here
                  </h3>
                  <p className="text-slate-400 mb-4">or click to browse</p>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-input"
                    accept={ALLOWED_EXTENSIONS.join(",")}
                  />
                  <label htmlFor="file-input">
                    <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer">
                      <span>Select Files</span>
                    </Button>
                  </label>
                  <p className="text-xs text-slate-500 mt-4">
                    Supported: {ALLOWED_EXTENSIONS.join(", ")}
                  </p>
                </div>

                {/* Document Type Selector */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-white mb-2">
                    Document Type (applies to all uploads)
                  </label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-white">
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
            <Card className="bg-slate-900/50 border-slate-700/50 sticky top-24">
              <CardHeader>
                <CardTitle>Upload Queue</CardTitle>
                <CardDescription>
                  {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""} selected
                </CardDescription>
              </CardHeader>
              <CardContent>
                {uploadedFiles.length === 0 ? (
                  <p className="text-slate-400 text-sm">No files selected yet</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <File className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          {file.status !== "uploading" && (
                            <button
                              onClick={() => removeFile(file.id)}
                              className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center gap-2">
                          {file.status === "pending" && (
                            <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500 w-0"></div>
                            </div>
                          )}
                          {file.status === "uploading" && (
                            <div className="flex items-center gap-2 w-full">
                              <Loader2 className="h-3 w-3 text-orange-500 animate-spin flex-shrink-0" />
                              <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-orange-500 transition-all"
                                  style={{ width: `${file.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          {file.status === "completed" && (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                          {file.status === "error" && (
                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>

                        {file.error && (
                          <p className="text-xs text-red-400 mt-2">{file.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {uploadedFiles.length > 0 && (
                  <Button
                    className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white"
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
