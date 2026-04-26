// This endpoint is deprecated. Emergencies are now triggered via ASI:One chat.
// Judges chat the Coordinator agent directly at https://asi1.ai
// The frontend is visualization-only.

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Emergencies are now triggered via ASI:One chat. Use https://asi1.ai to chat with the Coordinator agent.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Emergencies are now triggered via ASI:One chat. Use https://asi1.ai to chat with the Coordinator agent.',
    },
    { status: 410 }
  );
}
