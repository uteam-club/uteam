import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить список игроков команды для страницы посещаемости
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    console.log('GET: Fetching players for team', params.teamId);
    
    const teamId = params.teamId;
    
    // Проверяем существование команды
    const team = await prisma.team.findUnique({
      where: {
        id: teamId
      }
    });
    
    if (!team) {
      console.error('Team not found:', teamId);
      return NextResponse.json(
        { error: 'Команда не найдена' }, 
        { status: 404 }
      );
    }
    
    // Получаем игроков команды
    const players = await prisma.player.findMany({
      where: {
        teamId: teamId
      },
      orderBy: {
        lastName: 'asc'
      }
    });
    
    console.log(`GET: Found ${players.length} players for team ${teamId}`);
    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players for team:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении игроков команды' }, 
      { status: 500 }
    );
  }
} 