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

    const documents = await prisma.playerDocument.findMany({
      where: {
        player: {
          team: {
            clubId: session.user.clubId
          }
        }
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    return createApiResponse({ documents });
  } catch (error) {
    console.error('Error fetching player documents:', error);
    return createApiResponse({ error: 'Internal Server Error' }, 500);
  }
} 