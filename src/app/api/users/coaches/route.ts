import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

/**
 * Получение токена из запроса с проверкой
 */
async function getTokenFromRequest(req: NextRequest) {
  try {
    return await getToken({ req });
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

/**
 * GET /api/users/coaches
 * Получение списка тренеров клуба
 */
export async function GET(request: NextRequest) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('GET /users/coaches: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    
    // Фильтр для получения тренеров определенной команды
    const teamId = request.nextUrl.searchParams.get('teamId');
    
    console.log(`GET /users/coaches: Fetching coaches for club ${clubId}${teamId ? ` and team ${teamId}` : ''}`);
    
    // Если указан teamId, получаем только тренеров, которые еще не прикреплены к этой команде
    if (teamId) {
      // Проверяем, принадлежит ли команда клубу пользователя
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
          clubId
        }
      });
      
      if (!team) {
        console.log(`GET /users/coaches: Team ${teamId} not found in club ${clubId}`);
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      
      // Получаем ID тренеров, которые уже прикреплены к команде
      const teamCoaches = await prisma.teamCoach.findMany({
        where: {
          teamId
        },
        select: {
          userId: true
        }
      });
      
      const attachedCoachIds = teamCoaches.map(coach => coach.userId);
      
      // Получаем тренеров клуба, которые еще не прикреплены к этой команде
      const coaches = await prisma.user.findMany({
        where: {
          clubId,
          role: 'COACH',
          id: {
            notIn: attachedCoachIds.length > 0 ? attachedCoachIds : undefined
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true,
          role: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      
      console.log(`GET /users/coaches: Found ${coaches.length} unattached coaches`);
      
      return NextResponse.json(coaches);
    } else {
      // Получаем всех тренеров клуба
      const coaches = await prisma.user.findMany({
        where: {
          clubId,
          role: 'COACH'
        },
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true,
          role: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      
      console.log(`GET /users/coaches: Found ${coaches.length} coaches`);
      
      return NextResponse.json(coaches);
    }
  } catch (error) {
    console.error('GET /users/coaches: Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coaches' },
      { status: 500 }
    );
  }
} 