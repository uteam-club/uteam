import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { permission } from '@/db/schema';

export async function GET(request: NextRequest) {
  try {
    const permissions = await db.select().from(permission);
    return NextResponse.json(permissions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch permissions', details: (error as Error).message }, { status: 500 });
  }
} 