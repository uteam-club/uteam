import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@/generated/prisma';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const date = searchParams.get('date');

    if (!teamId || !date) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    const schedule = await prisma.schedule.findFirst({
      where: {
        teamId,
        date: new Date(date),
      },
      include: {
        events: true,
      },
    });

    return NextResponse.json({
      events: schedule?.events || [],
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { teamId, date, events } = body;

    if (!teamId || !date || !events) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Удаляем старые события
    await prisma.scheduleEvent.deleteMany({
      where: {
        schedule: {
          teamId,
          date: new Date(date),
        },
      },
    });

    // Создаем или обновляем расписание
    const schedule = await prisma.schedule.upsert({
      where: {
        teamId_date: {
          teamId,
          date: new Date(date),
        },
      },
      create: {
        teamId,
        date: new Date(date),
        events: {
          create: events.map((event: any) => ({
            time: event.time,
            description: event.description,
            type: event.type,
          })),
        },
      },
      update: {
        events: {
          create: events.map((event: any) => ({
            time: event.time,
            description: event.description,
            type: event.type,
          })),
        },
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error saving schedule:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 