import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

/**
 * GET /api/players/documents
 * Получение списка документов игроков с возможностью фильтрации по команде
 */
export async function GET(request: NextRequest) {
  try {
    // Получаем токен пользователя
    const token = await getToken({ req: request });
    
    if (!token) {
      console.log('GET /players/documents: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    
    // Получаем параметры запроса
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');
    
    console.log(`GET /players/documents: Fetching documents for ${teamId ? `team ${teamId}` : 'all teams'} in club ${clubId}`);
    
    // Базовые условия для выборки игроков
    const whereCondition: any = {
      team: {
        clubId: clubId,
      }
    };
    
    // Если указана команда, добавляем условие фильтрации
    if (teamId && teamId !== 'all') {
      whereCondition.teamId = teamId;
    }
    
    // Получаем всех игроков с их документами
    const players = await prisma.player.findMany({
      where: whereCondition,
      include: {
        team: {
          select: {
            id: true,
            name: true,
          }
        },
        documents: {
          orderBy: {
            createdAt: 'desc',
          }
        }
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });
    
    // Формируем результат
    const result = players.map(player => {
      // Группируем документы по типу, оставляя только последний загруженный для каждого типа
      const documentsByType: Record<string, any> = {};
      
      player.documents.forEach(doc => {
        // Если такого типа еще нет или текущий документ новее
        if (!documentsByType[doc.type] || 
            new Date(doc.createdAt) > new Date(documentsByType[doc.type].createdAt)) {
          documentsByType[doc.type] = doc;
        }
      });
      
      return {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        birthCertificateNumber: player.birthCertificateNumber,
        imageUrl: player.imageUrl,
        team: player.team,
        documents: {
          PASSPORT: documentsByType['PASSPORT'] || null,
          BIRTH_CERTIFICATE: documentsByType['BIRTH_CERTIFICATE'] || null,
          MEDICAL_INSURANCE: documentsByType['MEDICAL_INSURANCE'] || null,
          OTHER: documentsByType['OTHER'] || null
        }
      };
    });
    
    console.log(`GET /players/documents: Found ${result.length} players with documents`);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching player documents:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch player documents',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 