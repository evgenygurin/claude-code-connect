import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch stats from the Boss Agent API
    const apiUrl = process.env.BOSS_AGENT_API_URL || 'http://localhost:3005';
    const response = await fetch(`${apiUrl}/stats`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
