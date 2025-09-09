// src/app/api/debug/gps-reports/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { diagnoseReport } from '@/services/gps.debug';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Проверяем флаг GPS_DEBUG
  if (process.env.GPS_DEBUG !== '1') {
    return NextResponse.json(
      { error: 'GPS debug mode is disabled' },
      { status: 404 }
    );
  }

  try {
    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const diagnosticReport = await diagnoseReport(reportId);
    
    return NextResponse.json(diagnosticReport, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GPS Debug Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to diagnose report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
