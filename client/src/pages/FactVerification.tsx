import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Edit, FileText, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Fact {
  id: number;
  category: string;
  fact_key: string;
  value: string;
  confidence_score: number;
  source_document_id: number;
  source_page: number | null;
  extraction_method: string;
  verification_status: string;
  created_at: string;
}

export default function FactVerification() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const projectIdStr = searchParams.get("projectId");
  const projectId = projectIdStr ? parseInt(projectIdStr, 10) : null;

  const [selectedFact, setSelectedFact] = useState<Fact | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedValue, setEditedValue] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch project details to get dbName
  const { data: project, isLoading: isLoadingProject } = trpc.projects.get.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  // Fetch facts using dbName from project
  const { data: facts, isLoading: isLoadingFacts, refetch } = trpc.facts.list.useQuery(
    { projectId: project?.dbName || "" },
    { enabled: !!project?.dbName }
  );

  const isLoading = isLoadingProject || isLoadingFacts;

  const updateFactMutation = trpc.facts.update.useMutation({
    onSuccess: () => {
      toast.success("Fact updated successfully");
      refetch();
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to update fact: ${error.message}`);
    },
  });

  if (!projectId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="p-6 bg-slate-900/50 border-slate-800">
          <p className="text-slate-400">No project selected</p>
          <Button
            onClick={() => navigate("/projects")}
            className="mt-4 bg-orange-500 hover:bg-orange-600"
          >
            Go to Projects
          </Button>
        </Card>
      </div>
    );
  }

  const handleApprove = (factId: number) => {
    if (!project?.dbName) return;
    updateFactMutation.mutate({
      projectId: project.dbName,
      factId,
      status: "approved",
    });
  };

  const handleReject = (factId: number) => {
    if (!project?.dbName) return;
    updateFactMutation.mutate({
      projectId: project.dbName,
      factId,
      status: "rejected",
    });
  };

  const handleEdit = (fact: Fact) => {
    setSelectedFact(fact);
    setEditedValue(fact.value);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedFact || !project?.dbName) return;
    
    updateFactMutation.mutate({
      projectId: project.dbName,
      factId: selectedFact.id,
      status: "approved",
      value: editedValue,
    });
  };

  const filteredFacts = facts?.filter((fact) => {
    if (filterCategory !== "all" && fact.category !== filterCategory) return false;
    if (filterStatus !== "all" && fact.verification_status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: facts?.length || 0,
    pending: facts?.filter((f) => f.verification_status === "pending").length || 0,
    approved: facts?.filter((f) => f.verification_status === "approved").length || 0,
    rejected: facts?.filter((f) => f.verification_status === "rejected").length || 0,
    avgConfidence: facts?.length
      ? (facts.reduce((sum, f) => sum + f.confidence_score, 0) / facts.length).toFixed(1)
      : "0",
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">High</Badge>;
    if (score >= 0.6) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium</Badge>;
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Low</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>;
    if (status === "rejected") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
    return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Pending</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Fact Verification</h1>
              <p className="text-sm text-slate-400 mt-1">Review and approve extracted facts</p>
            </div>
            <Button
              onClick={() => navigate(`/projects`)}
              variant="outline"
              className="border-slate-700 hover:bg-slate-800"
            >
              Back to Projects
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-4 bg-slate-900/50 border-slate-800">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-slate-400">Total Facts</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-900/50 border-slate-800">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-sm text-slate-400">Pending</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-900/50 border-slate-800">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.approved}</p>
                <p className="text-sm text-slate-400">Approved</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-900/50 border-slate-800">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.rejected}</p>
                <p className="text-sm text-slate-400">Rejected</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-900/50 border-slate-800">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.avgConfidence}</p>
                <p className="text-sm text-slate-400">Avg Confidence</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 bg-slate-900/50 border-slate-800 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-2 block">Category</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="specification">Specification</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-2 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Facts Table */}
        <Card className="bg-slate-900/50 border-slate-800">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-300">Category</TableHead>
                  <TableHead className="text-slate-300">Key</TableHead>
                  <TableHead className="text-slate-300">Value</TableHead>
                  <TableHead className="text-slate-300">Confidence</TableHead>
                  <TableHead className="text-slate-300">Method</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                      Loading facts...
                    </TableCell>
                  </TableRow>
                ) : filteredFacts && filteredFacts.length > 0 ? (
                  filteredFacts.map((fact) => (
                    <TableRow key={fact.id} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell>
                        <Badge variant="outline" className="border-slate-700 text-slate-300">
                          {fact.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-white">{fact.fact_key}</TableCell>
                      <TableCell className="text-slate-300 max-w-md truncate">{fact.value}</TableCell>
                      <TableCell>{getConfidenceBadge(fact.confidence_score)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-700 text-slate-400">
                          {fact.extraction_method}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(fact.verification_status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {fact.verification_status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(fact.id)}
                                className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleEdit(fact)}
                                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleReject(fact.id)}
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                      No facts found. Upload documents to extract facts.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Fact</DialogTitle>
            <DialogDescription className="text-slate-400">
              Modify the extracted value before approving
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Key</label>
              <Input
                value={selectedFact?.fact_key || ""}
                disabled
                className="bg-slate-800 border-slate-700 text-slate-300"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Value</label>
              <Input
                value={editedValue}
                onChange={(e) => setEditedValue(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-slate-700 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Save & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
