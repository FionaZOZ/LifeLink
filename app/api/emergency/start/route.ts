import { NextRequest } from 'next/server';
import { runCoordinator } from '@/lib/agents/coordinator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emergency_id } = body;

    if (!emergency_id) {
      return new Response(JSON.stringify({ error: 'emergency_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[API] Starting coordinator for emergency ${emergency_id}`);

    // Create a Server-Sent Events stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream coordinator reasoning to the client
          await runCoordinator(emergency_id, (text) => {
            const data = `data: ${JSON.stringify({ type: 'text', content: text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          });

          // Send completion signal
          const doneData = `data: ${JSON.stringify({ type: 'done' })}\n\n`;
          controller.enqueue(encoder.encode(doneData));
          controller.close();
        } catch (error) {
          console.error('[API] Coordinator error:', error);
          const errorData = `data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[API] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
