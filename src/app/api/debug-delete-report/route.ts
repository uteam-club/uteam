import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    
    if (!reportId) {
      return NextResponse.json({ error: 'Missing reportId parameter' }, { status: 400 });
    }

    console.log('🗑️ Удаляем GPS отчет:', reportId);

    // Удаляем отчет
    const result = await db
      .delete(gpsReport)
      .where(eq(gpsReport.id, reportId));

    console.log('✅ GPS отчет удален');

    return NextResponse.json({ 
      success: true, 
      message: 'GPS отчет успешно удален',
      deletedReportId: reportId
    });

  } catch (error) {
    console.error('❌ Ошибка при удалении GPS отчета:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 