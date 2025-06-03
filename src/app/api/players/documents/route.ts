import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { player, team, playerDocument } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { createApiResponse } from '../../config';

// Экспортируем конфигурацию для Next.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/players/documents
 * Получение списка документов игроков с возможностью фильтрации по команде
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return createApiResponse({ error: 'Unauthorized' }, 401);
    }

    // Получаем всех игроков клуба
    const players = await db.select({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      birthCertificateNumber: player.birthCertificateNumber,
      imageUrl: player.imageUrl,
      teamId: player.teamId,
    })
      .from(player)
      .leftJoin(team, eq(player.teamId, team.id))
      .where(eq(team.clubId, session.user.clubId));

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