import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { PlayerMappingService } from '@/services/playerMapping.service';

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
    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка при автоматическом сопоставлении игрока:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 