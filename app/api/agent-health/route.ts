import { NextResponse } from 'next/server';

const ADDRESSES = {
  coordinator: process.env.COORDINATOR_AGENT_ADDRESS!,
  aed: process.env.AED_AGENT_ADDRESS!,
  ems: process.env.EMS_AGENT_ADDRESS!,
  handoff: process.env.HANDOFF_AGENT_ADDRESS!,
};

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = await Promise.all(
    Object.entries(ADDRESSES).map(async ([name, addr]) => {
      if (!addr) {
        return { name, address: null, online: false, error: 'Address not configured' };
      }

      try {
        const r = await fetch(`https://agentverse.ai/v1/almanac/agents/${addr}`, {
          signal: AbortSignal.timeout(2000),
        });
        const data = r.ok ? await r.json() : null;
        return {
          name,
          address: addr,
          online: r.ok,
          endpoints: data?.endpoints ?? [],
        };
      } catch (e: any) {
        return {
          name,
          address: addr,
          online: false,
          error: e.message,
        };
      }
    })
  );

  return NextResponse.json({ agents: checks });
}
