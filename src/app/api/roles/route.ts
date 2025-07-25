import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { roleEnum } from '@/db/schema/user';

export async function GET(request: NextRequest) {
  // Возвращаем список всех ролей из enum
  return NextResponse.json(roleEnum.enumValues);
} 