"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TerminalLine {
  id: string
  type: "info" | "success" | "warning" | "error" | "debug"
  timestamp: string
  message: string
}

interface TerminalProps {
  lines: TerminalLine[]
  className?: string
  maxLines?: number
}

const terminalColors = {
  info: "text-[hsl(var(--terminal-green))]",
  success: "text-[hsl(var(--terminal-green))]",
  warning: "text-[hsl(var(--terminal-yellow))]",
  error: "text-[hsl(var(--terminal-red))]",
  debug: "text-[hsl(var(--terminal-cyan))]",
}

const terminalPrefixes = {
  info: "[INFO]",
  success: "[SUCCESS]",
  warning: "[WARN]",
  error: "[ERROR]",
  debug: "[DEBUG]",
}

export function Terminal({ lines, className, maxLines = 100 }: TerminalProps) {
  const terminalRef = React.useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = React.useState(true)

  // Auto-scroll to bottom when new lines are added
  React.useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines, autoScroll])

  const displayedLines = lines.slice(-maxLines)

  return (
    <div
      ref={terminalRef}
      className={cn(
        "font-mono text-sm overflow-auto rounded-lg border",
        "bg-[hsl(var(--terminal-bg))] text-[hsl(var(--terminal-fg))]",
        "p-4 h-[600px]",
        className
      )}
      onScroll={(e) => {
        const el = e.currentTarget
        const isAtBottom =
          Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 10
        setAutoScroll(isAtBottom)
      }}
    >
      {displayedLines.map((line) => (
        <div key={line.id} className="py-1 hover:bg-accent/10">
          <span className="text-[hsl(var(--terminal-gray))]">
            {line.timestamp}
          </span>
          {" "}
          <span className={cn("font-bold", terminalColors[line.type])}>
            {terminalPrefixes[line.type]}
          </span>
          {" "}
          <span>{line.message}</span>
        </div>
      ))}
      {lines.length === 0 && (
        <div className="text-[hsl(var(--terminal-gray))] italic">
          Waiting for logs...
        </div>
      )}
    </div>
  )
}
