// Health aggregator endpoint - checks Next.js, FastAPI backend, and Fetch.ai bus
// Returns combined health status for the developer dashboard

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const BUS_EVENT_URL = process.env.BUS_EVENT_URL || 'http://localhost:8010';

interface ServiceHealth {
  status: string;
  error?: string;
  [key: string]: any;
}

interface AggregatedHealth {
  next: ServiceHealth;
  backend: ServiceHealth;
  bus: ServiceHealth;
}

async function checkService(url: string, timeoutMs: number = 1500): Promise<ServiceHealth> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        status: 'error',
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      status: 'ok',
      ...data,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        status: 'timeout',
        error: `Timeout after ${timeoutMs}ms`,
      };
    }
    return {
      status: 'unreachable',
      error: error.message || 'Connection failed',
    };
  }
}

export async function GET() {
  // Check all services in parallel
  const [backendHealth, busHealth] = await Promise.all([
    checkService(`${BACKEND_URL}/health`),
    checkService(`${BUS_EVENT_URL}/health`),
  ]);

  const aggregated: AggregatedHealth = {
    next: {
      status: 'ok',
      version: process.env.npm_package_version || '0.2.0',
      env: process.env.NODE_ENV || 'development',
    },
    backend: backendHealth,
    bus: busHealth,
  };

  // Determine overall status code
  const hasError =
    aggregated.backend.status === 'error' ||
    aggregated.bus.status === 'error';

  const hasUnreachable =
    aggregated.backend.status === 'unreachable' ||
    aggregated.bus.status === 'unreachable';

  const statusCode = hasError ? 500 : hasUnreachable ? 503 : 200;

  return NextResponse.json(aggregated, { status: statusCode });
}
