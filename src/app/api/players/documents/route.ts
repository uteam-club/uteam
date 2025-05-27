import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { prisma } from '@/lib/prisma';
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

    // Получаем всех игроков с их документами
    const players = await prisma.player.findMany({
      where: {
        team: {
          clubId: session.user.clubId
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthCertificateNumber: true,
        imageUrl: true,
        team: {
          select: {
            id: true,
            name: true
          }
        },
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            publicUrl: true,
            createdAt: true
          }
        }
      }
    });

    // Преобразуем документы в нужный формат
    const formattedPlayers = players.map(player => ({
      ...player,
      documents: {
        PASSPORT: player.documents.find(doc => doc.type === 'PASSPORT') || null,
        BIRTH_CERTIFICATE: player.documents.find(doc => doc.type === 'BIRTH_CERTIFICATE') || null,
        MEDICAL_INSURANCE: player.documents.find(doc => doc.type === 'MEDICAL_INSURANCE') || null,
        OTHER: player.documents.find(doc => doc.type === 'OTHER') || null
      }
    }));

    return createApiResponse(formattedPlayers);
  } catch (error) {
    console.error('Error fetching player documents:', error);
    return createApiResponse({ error: 'Internal Server Error' }, 500);
  }
} 