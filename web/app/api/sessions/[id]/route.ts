import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const apiUrl = process.env.BOSS_AGENT_API_URL || 'http://localhost:3005';
    const response = await fetch(`${apiUrl}/sessions/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch session details');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching session details:', error);

    // Mock data for development
    const mockSession = {
      id,
      issueId: "test-issue-123",
      issueIdentifier: "DEV-123",
      status: "running",
      branchName: `claude/dev-123-feature-implementation`,
      startedAt: new Date(Date.now() - 600000).toISOString(),
      metadata: {
        issueTitle: "Implement new feature",
        issueDescription: "Add new authentication feature with OAuth support",
        assignee: "Boss Agent",
        labels: ["feature", "authentication", "high-priority"]
      },
      logs: [
        "Starting session...",
        "Analyzing issue requirements...",
        "Creating implementation plan...",
        "Delegating to Codegen agent...",
        "Monitoring progress..."
      ],
      changes: {
        filesModified: 5,
        linesAdded: 234,
        linesRemoved: 45
      }
    };

    return NextResponse.json(mockSession);
  }
}
