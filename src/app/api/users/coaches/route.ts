import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, team, teamCoach } from '@/db/schema';
import { eq, and, not, inArray, asc } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



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
      const [foundTeam]: any = await db.select().from(team)
        .where(and(eq(team.id, teamId), eq(team.clubId, clubId)))
        .limit(1);
      if (!foundTeam) {
        console.log(`GET /users/coaches: Team ${teamId} not found in club ${clubId}`);
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      // Получаем ID тренеров, которые уже прикреплены к команде
      const teamCoaches = await db.select({ userId: teamCoach.userId })
        .from(teamCoach)
        .where(eq(teamCoach.teamId, teamId));
      const attachedCoachIds = teamCoaches.map(coach => coach.userId);
      // Получаем тренеров клуба, которые еще не прикреплены к этой команде
      const coaches = await db.select({
        id: user.id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
        role: user.role
      })
        .from(user)
        .where(and(
          eq(user.clubId, clubId),
          eq(user.role, 'COACH'),
          attachedCoachIds.length > 0 ? not(inArray(user.id, attachedCoachIds)) : undefined
        ))
        .orderBy(asc(user.name));
      console.log(`GET /users/coaches: Found ${coaches.length} unattached coaches`);
      return NextResponse.json(coaches);
    } else {
      // Получаем всех тренеров клуба
      const coaches = await db.select({
        id: user.id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
        role: user.role
      })
        .from(user)
        .where(and(
          eq(user.clubId, clubId),
          eq(user.role, 'COACH')
        ))
        .orderBy(asc(user.name));
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