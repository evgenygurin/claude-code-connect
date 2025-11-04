"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, GitBranch, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Navigation } from "@/components/navigation";

interface Session {
  id: string;
  issueId: string;
  issueIdentifier: string;
  status: "created" | "running" | "completed" | "failed";
  branchName: string;
  startedAt: string;
  metadata?: {
    triggerCommentId?: string;
    issueTitle?: string;
  };
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions");
      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();
      setSessions(data.sessions || []);
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
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
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

  const filterSessions = (filter: string) => {
    if (filter === "all") return sessions;
    return sessions.filter((s) => s.status === filter);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Sessions</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage development sessions delegated to Codegen agents</p>
          </div>
          <Button onClick={fetchSessions} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({sessions.length})</TabsTrigger>
            <TabsTrigger value="running">Running ({filterSessions("running").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filterSessions("completed").length})</TabsTrigger>
            <TabsTrigger value="failed">Failed ({filterSessions("failed").length})</TabsTrigger>
          </TabsList>

          {["all", "running", "completed", "failed"].map((filter) => (
            <TabsContent key={filter} value={filter}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {filter === "all" ? "All Sessions" : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Sessions`}
                  </CardTitle>
                  <CardDescription>
                    {filterSessions(filter).length === 0
                      ? `No ${filter !== "all" ? filter : ""} sessions found`
                      : `Showing ${filterSessions(filter).length} ${filter !== "all" ? filter : ""} session${filterSessions(filter).length !== 1 ? "s" : ""}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <XCircle className="h-12 w-12 text-red-500 mb-4" />
                      <p className="text-sm text-muted-foreground">Error loading sessions: {error}</p>
                      <Button onClick={fetchSessions} className="mt-4">Try Again</Button>
                    </div>
                  ) : filterSessions(filter).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        {filter === "all"
                          ? "No sessions yet. Boss Agent is ready to coordinate tasks."
                          : `No ${filter} sessions at the moment.`}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Issue</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Branch</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterSessions(filter).map((session) => (
                          <TableRow key={session.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(session.status)}
                                {getStatusBadge(session.status)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{session.issueIdentifier}</TableCell>
                            <TableCell>{session.metadata?.issueTitle || "No title"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <GitBranch className="h-3 w-3" />
                                <span className="font-mono text-xs">{session.branchName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(session.startedAt).toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link href={`/sessions/${session.id}`}>
                                <Button variant="outline" size="sm">View Details</Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
