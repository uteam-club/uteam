import { NextRequest, NextResponse } from 'next/server';

// GET /api/gps/canonical-metrics-for-mapping - РЕДИРЕКТ на canonical-metrics-all
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.pathname = '/api/gps/canonical-metrics-all';
  
  return NextResponse.redirect(url);
}
