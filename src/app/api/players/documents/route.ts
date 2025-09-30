import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { player, team, playerDocument } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { createApiResponse } from '../../config';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';

// Экспортируем конфигурацию для Next.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * GET /api/players/documents
 * Получение списка документов игроков с возможностью фильтрации по команде
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'documents.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Получаем teamId из query string
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    // Получаем всех игроков клуба или только выбранной команды
    const players = await db.select({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      middleName: player.middleName,
      dateOfBirth: player.dateOfBirth,
      nationality: player.nationality,
      birthCertificateNumber: player.birthCertificateNumber,
      imageUrl: player.imageUrl,
      teamId: player.teamId,
      passportData: player.passportData,
      insuranceNumber: player.insuranceNumber,
      visaExpiryDate: player.visaExpiryDate,
      teamName: team.name,
    })
      .from(player)
      .leftJoin(team, eq(player.teamId, team.id))
      .where(
        teamId && teamId !== 'all'
          ? and(eq(team.clubId, token.clubId), eq(player.teamId, teamId))
          : eq(team.clubId, token.clubId)
      );

    const playerIds = players.map(p => p.id);
    if (playerIds.length === 0) return createApiResponse([]);

    // Получаем все документы этих игроков
    const documents = await db.select().from(playerDocument)
      .where(inArray(playerDocument.playerId, playerIds));

    // Группируем документы по playerId
    const docsByPlayer: Record<string, any[]> = {};
    for (const doc of documents) {
      if (!docsByPlayer[doc.playerId]) docsByPlayer[doc.playerId] = [];
      docsByPlayer[doc.playerId].push(doc);
    }

    // Собираем финальную структуру
    const formattedPlayers = players.map(p => {
      const docs = docsByPlayer[p.id] || [];
      return {
        ...p,
        documents: {
          PASSPORT: docs.find(doc => doc.type === 'PASSPORT') || null,
          BIRTH_CERTIFICATE: docs.find(doc => doc.type === 'BIRTH_CERTIFICATE') || null,
          MEDICAL_INSURANCE: docs.find(doc => doc.type === 'MEDICAL_INSURANCE') || null,
          VISA: docs.find(doc => doc.type === 'VISA') || null,
          OTHER: docs.find(doc => doc.type === 'OTHER') || null,
        },
        team: {
          id: p.teamId,
          name: p.teamName || 'Не указана',
        },
      };
    });

    return createApiResponse(formattedPlayers);
  } catch (error) {
    console.error('Error fetching player documents:', error);
    return createApiResponse({ error: 'Internal Server Error' }, 500);
  }
}

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
} 