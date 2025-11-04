"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation } from "@/components/navigation";
import { Star, GitFork, Eye, ExternalLink, Code, Calendar } from "lucide-react";

interface RepoData {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string;
  updated_at: string;
  topics: string[];
  open_issues_count: number;
}

const REPOS = [
  "evgenygurin/v0-ai-agents-control-panel",
  "evgenygurin/claudecodeui2",
  "evgenygurin/v0-vercel-ai-app"
];

export default function ReposPage() {
  const [repos, setRepos] = useState<RepoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        setLoading(true);
        const repoPromises = REPOS.map(async (repo) => {
          const response = await fetch(`https://api.github.com/repos/${repo}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${repo}`);
          }
          return response.json();
        });

        const repoData = await Promise.all(repoPromises);
        setRepos(repoData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch repositories");
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      TypeScript: "bg-blue-500",
      JavaScript: "bg-yellow-500",
      Python: "bg-green-500",
      Go: "bg-cyan-500",
      Rust: "bg-orange-500",
      default: "bg-gray-500"
    };
    return colors[language] || colors.default;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">GitHub Repositories</h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI Agents Control Panel Projects
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            repos.map((repo) => (
              <Card key={repo.full_name} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        {repo.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {repo.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      <span>{repo.stargazers_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GitFork className="h-4 w-4" />
                      <span>{repo.forks_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{repo.watchers_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Updated {formatDate(repo.updated_at)}</span>
                    </div>
                  </div>

                  {/* Language and Topics */}
                  <div className="flex flex-wrap items-center gap-2">
                    {repo.language && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <div className={`h-2 w-2 rounded-full ${getLanguageColor(repo.language)}`} />
                        {repo.language}
                      </Badge>
                    )}
                    {repo.open_issues_count > 0 && (
                      <Badge variant="secondary">
                        {repo.open_issues_count} open issues
                      </Badge>
                    )}
                  </div>

                  {repo.topics && repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {repo.topics.slice(0, 5).map((topic) => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {repo.topics.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{repo.topics.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="default" size="sm" asChild>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Repository
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`${repo.html_url}/issues`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Issues
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`${repo.html_url}/pulls`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Pull Requests
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {!loading && repos.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Repository Summary</CardTitle>
              <CardDescription>Aggregate statistics across all repositories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Stars</p>
                  <p className="text-2xl font-bold">
                    {repos.reduce((sum, repo) => sum + repo.stargazers_count, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Forks</p>
                  <p className="text-2xl font-bold">
                    {repos.reduce((sum, repo) => sum + repo.forks_count, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Watchers</p>
                  <p className="text-2xl font-bold">
                    {repos.reduce((sum, repo) => sum + repo.watchers_count, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Open Issues</p>
                  <p className="text-2xl font-bold">
                    {repos.reduce((sum, repo) => sum + repo.open_issues_count, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
