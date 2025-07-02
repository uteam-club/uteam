import { NextRequest, NextResponse } from 'next/server';
import { createBotServiceUser, generateBotServiceToken } from '@/services/user.service';

export async function GET(req: NextRequest) {
  const email = 'bot@uteam.club';
  const password = 'StrongBotPassword123!';
  const user = await createBotServiceUser(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Не удалось создать сервисного пользователя!' }, { status: 500 });
  }
  const token = generateBotServiceToken(user);
  return NextResponse.json({ email, password, token });
} 