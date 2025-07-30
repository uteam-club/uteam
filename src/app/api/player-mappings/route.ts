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

// GET - получение маппингов для команды
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsReports.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const mappings = await PlayerMappingService.getTeamMappings(teamId, token.clubId);
    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Ошибка при получении маппингов игроков:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создание нового маппинга
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
    const {
      reportName,
      playerId,
      gpsSystem,
      teamId,
      confidenceScore,
      mappingType,
      notes
    } = body;

    if (!reportName || !playerId || !gpsSystem || !teamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const mapping = await PlayerMappingService.saveMapping(
      reportName,
      playerId,
      gpsSystem,
      teamId,
      token.clubId,
      token.id,
      confidenceScore || 1.0,
      mappingType || 'manual',
      notes
    );

    return NextResponse.json(mapping);
  } catch (error) {
    console.error('Ошибка при создании маппинга игрока:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 