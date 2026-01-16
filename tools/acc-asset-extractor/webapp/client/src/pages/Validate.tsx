import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Download, Search } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";

export default function Validate() {
  const { jobId } = useParams();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0);

  const jobIdNum = parseInt(jobId || "0");
  
  const { data: job } = trpc.extraction.getJob.useQuery({ jobId: jobIdNum });
  
  const { data: assets, isLoading } = trpc.extraction.getAssets.useQuery({
    jobId: jobIdNum,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    minConfidence: confidenceFilter,
  });

  const filteredAssets = assets?.filter((asset) =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.assetId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(assets?.map((a) => a.category) || []));

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (confidence >= 70) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-7xl py-12">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation(`/dashboard/${jobId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Validate Assets</h1>
              <p className="text-muted-foreground">{job?.projectName}</p>
            </div>
          </div>
          <Button onClick={() => setLocation(`/export/${jobId}`)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Assets</CardTitle>
            <CardDescription>Search and filter extracted assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={confidenceFilter.toString()} 
                onValueChange={(v) => setConfidenceFilter(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Min Confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Confidence</SelectItem>
                  <SelectItem value="70">70% and above</SelectItem>
                  <SelectItem value="80">80% and above</SelectItem>
                  <SelectItem value="90">90% and above</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Assets ({filteredAssets?.length || 0})
            </CardTitle>
            <CardDescription>
              Review and validate extracted asset data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading assets...</div>
            ) : filteredAssets && filteredAssets.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-mono text-sm">{asset.assetId}</TableCell>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell className="capitalize">{asset.category}</TableCell>
                        <TableCell>{asset.type || "-"}</TableCell>
                        <TableCell>{asset.location || "-"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getConfidenceBadge(asset.confidence)}`}>
                            {asset.confidence}%
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {asset.sourceDocument}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No assets found matching your filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
