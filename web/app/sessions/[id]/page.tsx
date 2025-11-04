"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/navigation";
import {
  Activity,
  GitBranch,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  ExternalLink,
  FileText,
  Terminal,
  User
} from "lucide-react";

interface SessionDetails {
  id: string;
  issueId: string;
  issueIdentifier: string;
  status: "created" | "running" | "completed" | "failed";
  branchName: string;
  startedAt: string;
  completedAt?: string;
  metadata?: {
    triggerCommentId?: string;
    issueTitle?: string;
    issueDescription?: string;
    assignee?: string;
    labels?: string[];
  };
  logs?: string[];
  changes?: {
    filesModified: number;
    linesAdded: number;
    linesRemoved: number;
  };
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessionDetails();
    const interval = setInterval(fetchSessionDetails, 10000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch session details");
      const data = await response.json();
      setSession(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      running: "secondary",
      created: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg font-medium mb-2">Session Not Found</p>
              <p className="text-sm text-muted-foreground mb-4">{error || "This session does not exist"}</p>
              <Button onClick={() => router.push("/sessions")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sessions
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/sessions")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">{session.issueIdentifier}</h2>
              <p className="text-muted-foreground mt-1">{session.metadata?.issueTitle || "No title"}</p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(session.status)}
              {getStatusBadge(session.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{formatDuration(session.startedAt, session.completedAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Branch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono truncate">{session.branchName}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{new Date(session.startedAt).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="changes">Changes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
                <CardDescription>Information about this development session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Session ID</p>
                    <p className="font-mono text-sm">{session.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Issue ID</p>
                    <p className="font-mono text-sm">{session.issueId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Assignee</p>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <p className="text-sm">{session.metadata?.assignee || "Unassigned"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Labels</p>
                    <div className="flex gap-1 mt-1">
                      {session.metadata?.labels && session.metadata.labels.length > 0 ? (
                        session.metadata.labels.map((label) => (
                          <Badge key={label} variant="outline" className="text-xs">{label}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No labels</span>
                      )}
                    </div>
                  </div>
                </div>

                {session.metadata?.issueDescription && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap">{session.metadata.issueDescription}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Execution Logs</CardTitle>
                <CardDescription>Real-time logs from the development session</CardDescription>
              </CardHeader>
              <CardContent>
                {session.logs && session.logs.length > 0 ? (
                  <div className="bg-black dark:bg-slate-950 rounded-lg p-4 font-mono text-sm text-green-400 max-h-96 overflow-auto">
                    {session.logs.map((log, index) => (
                      <div key={index} className="mb-1">
                        <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Terminal className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">No logs available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="changes">
            <Card>
              <CardHeader>
                <CardTitle>Code Changes</CardTitle>
                <CardDescription>Files and lines modified during this session</CardDescription>
              </CardHeader>
              <CardContent>
                {session.changes ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Files Modified</p>
                        <p className="text-2xl font-bold">{session.changes.filesModified}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Lines Added</p>
                        <p className="text-2xl font-bold text-green-600">+{session.changes.linesAdded}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Lines Removed</p>
                        <p className="text-2xl font-bold text-red-600">-{session.changes.linesRemoved}</p>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on GitHub
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">No changes tracked yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
