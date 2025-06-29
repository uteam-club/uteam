import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { player, team, playerDocument } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { createApiResponse } from '../../config';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';

// Экспортируем конфигурацию для Next.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

/**
 * GET /api/players/documents
 * Получение списка документов игроков с возможностью фильтрации по команде
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Получаем всех игроков клуба
    const players = await db.select({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      birthCertificateNumber: player.birthCertificateNumber,
      imageUrl: player.imageUrl,
      teamId: player.teamId,
      passportData: player.passportData,
      insuranceNumber: player.insuranceNumber,
      visaExpiryDate: player.visaExpiryDate,
    })
      .from(player)
      .leftJoin(team, eq(player.teamId, team.id))
      .where(eq(team.clubId, token.clubId));

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
          name: '', // имя команды можно подтянуть отдельным запросом, если нужно
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
async function checkClubAccess(request: NextRequest, session: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return session.user.clubId === club.id;
} 