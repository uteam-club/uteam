import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { PlayerMappingService } from '@/services/playerMapping.service';
import { db } from '@/lib/db';
import { player, playerMapping } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Проверка доступа к клубу
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

// POST - автоматическое сопоставление игрока
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsReports.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { reportName, teamId, clubId, gpsSystem } = body;

    if (!reportName || !teamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await PlayerMappingService.autoMatchPlayer(reportName, teamId, token.clubId, gpsSystem);
    
    // GPS Debug: логируем входные/выходные данные
    if (process.env.GPS_DEBUG === '1') {
      console.log('[AUTO-MATCH]', { 
        reportName, 
        best: { 
          id: result.suggestedPlayer?.id, 
          name: result.suggestedPlayer ? `${result.suggestedPlayer.firstName || ''} ${result.suggestedPlayer.lastName || ''}`.trim() : null, 
          score: result.confidence 
        }, 
        action: result.action,
        source: result.source,
        alternatives: result.alternatives?.slice(0, 3).map(alt => ({
          id: alt.id,
          name: `${alt.firstName || ''} ${alt.lastName || ''}`.trim(),
          score: result.confidence
        }))
      });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка при автоматическом сопоставлении игрока:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 