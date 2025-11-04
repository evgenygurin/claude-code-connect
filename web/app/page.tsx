"use client"

import * as React from "react"
import { Activity, Bot, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Terminal, type TerminalLine } from "@/components/terminal"
import { ThemeToggle } from "@/components/theme-toggle"

interface Stats {
  activeTasks: number
  completedToday: number
  failedToday: number
  avgResponseTime: string
}

interface Task {
  id: string
  title: string
  status: "pending" | "running" | "completed" | "failed"
  agent: string
  startedAt: string
}

export default function BossAgentDashboard() {
  const [stats, setStats] = React.useState<Stats>({
    activeTasks: 0,
    completedToday: 0,
    failedToday: 0,
    avgResponseTime: "0ms",
  })

  const [tasks, setTasks] = React.useState<Task[]>([])
  const [logs, setLogs] = React.useState<TerminalLine[]>([])

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await fetch("http://localhost:3005/stats")
        if (statsRes.ok) {
          const data = await statsRes.json()
          setStats({
            activeTasks: data.activeSessions || 0,
            completedToday: data.completedSessions || 0,
            failedToday: data.failedSessions || 0,
            avgResponseTime: data.averageResponseTime || "0ms",
          })
        }

        const sessionsRes = await fetch("http://localhost:3005/sessions/active")
        if (sessionsRes.ok) {
          const data = await sessionsRes.json()
          setTasks(
            data.sessions?.map((s: any) => ({
              id: s.id,
              title: s.metadata?.issueTitle || s.issueIdentifier || "Unknown Task",
              status: s.status,
              agent: "Codegen",
              startedAt: s.startedAt,
            })) || []
          )
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  React.useEffect(() => {
    const addLog = (type: TerminalLine["type"], message: string) => {
      const newLog: TerminalLine = {
        id: Math.random().toString(),
        type,
        timestamp: new Date().toISOString().split("T")[1].split(".")[0],
        message,
      }
      setLogs((prev) => [...prev, newLog])
    }

    addLog("info", "Boss Agent Control Panel initialized")
    addLog("success", "Connected to backend API at http://localhost:3005")
    addLog("info", "Monitoring active sessions and tasks...")
  }, [])

  const statusIcons = {
    pending: <Clock className="h-4 w-4 text-yellow-500" />,
    running: <Activity className="h-4 w-4 text-blue-500 animate-pulse" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
  }

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    running: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20",
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Boss Agent</h1>
              <p className="text-sm text-muted-foreground">Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Online
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeTasks}</div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedToday}</div>
              <p className="text-xs text-muted-foreground">Successfully finished</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Today</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failedToday}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
              <p className="text-xs text-muted-foreground">Processing time</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Tasks</CardTitle>
              <CardDescription>Tasks currently being processed by agents</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No active tasks</div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="mt-0.5">{statusIcons[task.status]}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">{task.title}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[task.status]}`}>
                            {task.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Bot className="h-3 w-3" />
                          <span>{task.agent}</span>
                          <span>•</span>
                          <span>{new Date(task.startedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Real-time logs from Boss Agent and delegates</CardDescription>
            </CardHeader>
            <CardContent className="p-0 px-6 pb-6">
              <Terminal lines={logs} className="h-[400px]" />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
