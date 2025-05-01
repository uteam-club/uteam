import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить информацию об игроке
export async function GET(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const { playerId } = params;
    
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        teams: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    if (!player) {
      return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
    }
    
    return NextResponse.json(player, { status: 200 });
  } catch (error) {
    console.error('Ошибка при получении информации об игроке:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PUT - обновить информацию об игроке
export async function PUT(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const { playerId } = params;
    const data = await req.json();
    
    // Проверяем существование игрока
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId },
    });
    
    if (!existingPlayer) {
      return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
    }
    
    // Создаем объект данных для обновления
    const updateData: any = {};
    
    // Добавляем строковые поля
    const stringFields = [
      'firstName', 'lastName', 'middleName', 'nationality', 'position', 
      'foot', 'bio', 'photoUrl', 'passportUrl', 'passportFileName',
      'birthCertificateUrl', 'birthCertificateFileName', 'insuranceUrl', 
      'insuranceFileName', 'status', 'birthCertificateNumber', 'pinCode', 'teamId'
    ];
    
    // Добавляем числовые поля
    const numberFields = ['number', 'passportFileSize', 'birthCertificateFileSize', 'insuranceFileSize'];
    
    // Добавляем поля с датами
    const dateFields = ['academyJoinDate', 'birthDate'];
    
    // Обрабатываем поля с типами данных
    for (const field of stringFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }
    
    for (const field of numberFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field] !== null ? Number(data[field]) : null;
      }
    }
    
    for (const field of dateFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field] ? new Date(data[field]) : null;
      }
    }
    
    // Обновляем игрока
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: updateData,
    });
    
    return NextResponse.json(updatedPlayer, { status: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении информации об игроке:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
} 