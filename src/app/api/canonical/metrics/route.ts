// app/api/canonical/metrics/route.ts
import { NextResponse } from 'next/server';
import { CANON } from '@/canon/metrics.registry';

export async function GET() {
  // Read-only registry for UI dropdowns and validations
  return NextResponse.json(CANON, { status: 200 });
}
