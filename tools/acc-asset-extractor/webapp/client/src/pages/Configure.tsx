import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Configure() {
  const [, setLocation] = useLocation();
  const [projectName, setProjectName] = useState("");
  const [rclonePath, setRclonePath] = useState("");

  const createJob = trpc.extraction.createJob.useMutation({
    onSuccess: (data) => {
      toast.success("Extraction job started!");
      setLocation(`/dashboard/${data.jobId}`);
    },
    onError: (error) => {
      toast.error(`Failed to start extraction: ${error.message}`);
    },
  });

  const createDemo = trpc.extraction.createDemoJob.useMutation({
    onSuccess: (data) => {
      toast.success(`Demo job created with ${data.assetsCreated} assets!`);
      setLocation(`/dashboard/${data.jobId}`);
    },
    onError: (error) => {
      toast.error(`Failed to create demo: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !rclonePath) {
      toast.error("Please fill in all fields");
      return;
    }
    createJob.mutate({ projectName, rclonePath });
  };

  const handleDemo = () => {
    createDemo.mutate({ projectName: "Goonumbla Solar Farm (Demo)" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-4xl py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">ACC Asset Extractor</h1>
          <p className="text-muted-foreground text-lg">
            Extract and manage solar farm assets from engineering documentation
          </p>
        </div>

        <div className="grid gap-6">
          {/* Demo Data Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/20 dark:to-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Try Demo Data</CardTitle>
              </div>
              <CardDescription>
                Load a sample Goonumbla Solar Farm dataset with 537 pre-extracted assets to explore the workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleDemo}
                disabled={createDemo.isPending}
                size="lg"
                className="w-full"
              >
                {createDemo.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Demo...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Load Demo Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Real Extraction Card */}
          <Card>
            <CardHeader>
              <CardTitle>Start New Extraction</CardTitle>
              <CardDescription>
                Extract assets from your engineering documentation using rclone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    placeholder="e.g., Goonumbla Solar Farm"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    disabled={createJob.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rclonePath">Rclone Remote Path</Label>
                  <Input
                    id="rclonePath"
                    placeholder="e.g., gdrive:MCE Reference Documentation/Solar/Design Documentation/Goonumbla"
                    value={rclonePath}
                    onChange={(e) => setRclonePath(e.target.value)}
                    disabled={createJob.isPending}
                  />
                  <p className="text-sm text-muted-foreground">
                    Path to the directory containing PDF documentation
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={createJob.isPending || !projectName || !rclonePath}
                  size="lg"
                  className="w-full"
                >
                  {createJob.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting Extraction...
                    </>
                  ) : (
                    "Start Extraction"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
