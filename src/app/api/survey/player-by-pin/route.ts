import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const pinCode = req.nextUrl.searchParams.get('pinCode');
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  if (!pinCode || !tenantId) {
    return NextResponse.json({ error: 'Missing pinCode or tenantId' }, { status: 400 });
  }
  const player = await prisma.player.findFirst({
    where: {
      pinCode,
      team: { clubId: tenantId },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      teamId: true,
    },
  });
  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }
  return NextResponse.json({ player });
} 