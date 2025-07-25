import { db } from '@/lib/db';
import { user, club } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import * as schema from '@/db/schema';

export async function getUserById(id: string) {
  if (!id) return null;
  try {
    const [result] = await db.select().from(user).where(eq(user.id, id));
    return result ?? null;
  } catch (error) {
    console.error('Error fetching user by id:', error);
    return null;
  }
}

export async function getUserByEmail(email: string) {
  if (!email) return null;
  try {
    const [result] = await db.select().from(user).where(eq(user.email, email));
    return result ?? null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

export async function getUsersByClubId(clubId: string) {
  try {
    return await db.select().from(user).where(eq(user.clubId, clubId)).orderBy(asc(user.name));
  } catch (error) {
    console.error('Error fetching users by club id:', error);
    return [];
  }
}

export async function createSuperAdmin(data: {
  email: string;
  name: string;
  password: string;
  clubId: string;
}) {
  try {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [created] = await db.insert(user).values({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      clubId: data.clubId,
    }).returning();
    return created ?? null;
  } catch (error) {
    console.error('Error creating super admin:', error);
    return null;
  }
}

export async function createUser(data: {
  email: string;
  name?: string;
  password: string;
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'COACH' | 'MEMBER' | 'SCOUT' | 'DOCTOR' | 'DIRECTOR';
  clubId: string;
}) {
  try {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [created] = await db.insert(user).values({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: data.role ?? 'MEMBER',
      clubId: data.clubId,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created ?? null;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function verifyPassword(userObj: { password: string }, password: string) {
  try {
    return await bcrypt.compare(password, userObj.password);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(user).orderBy(asc(user.name));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    password?: string;
    role?: 'SUPER_ADMIN' | 'ADMIN' | 'COACH' | 'MEMBER' | 'SCOUT' | 'DOCTOR' | 'DIRECTOR';
    imageUrl?: string;
    emailVerified?: Date;
  }
) {
  try {
    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    const [updated] = await db.update(user)
      .set(updateData)
      .where(eq(user.id, id))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

export async function deleteUser(id: string) {
  try {
    await db.delete(user).where(eq(user.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

export async function getClubBySubdomain(subdomain: string) {
  if (!subdomain) return null;
  try {
    const [result] = await db.select().from(club).where(eq(club.subdomain, subdomain));
    if (!result) return null;
    return {
      ...result,
      logoUrl: result.logoUrl === null ? undefined : result.logoUrl,
    };
  } catch (error) {
    console.error('Error fetching club by subdomain:', error);
    return null;
  }
}

export async function createBotServiceUser(email: string, password: string) {
  try {
    // Проверяем, есть ли уже такой пользователь
    const existing = await getUserByEmail(email);
    if (existing) return existing;
    // Создаём пользователя без clubId (или с null/специальным clubId)
    const hashedPassword = await bcrypt.hash(password, 10);
    const [created] = await db.insert(user).values({
      email,
      name: 'Telegram Bot Service',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      clubId: '00000000-0000-0000-0000-000000000000', // специальный clubId для сервисных пользователей
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created ?? null;
  } catch (error) {
    console.error('Error creating bot service user:', error);
    return null;
  }
}

export function generateBotServiceToken(userObj: any) {
  if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET не задан в .env');
  return jwt.sign({
    id: userObj.id,
    email: userObj.email,
    name: userObj.name,
    role: userObj.role,
    clubId: userObj.clubId,
  }, process.env.NEXTAUTH_SECRET, { expiresIn: '365d' });
}

// Получить итоговые права пользователя (учитывая overrides)
export async function getUserPermissions(userId: string): Promise<Record<string, boolean>> {
  // Получаем пользователя и его роль
  const [usr] = await db.select().from(user).where(eq(user.id, userId));
  if (!usr) return {};
  const roleValue = usr.role;

  // Получаем все права роли
  const rolePerms = await db
    .select({
      permissionId: schema.rolePermission.permissionId,
      allowed: schema.rolePermission.allowed,
      code: schema.permission.code,
    })
    .from(schema.rolePermission)
    .leftJoin(schema.permission, eq(schema.rolePermission.permissionId, schema.permission.id))
    .where(eq(schema.rolePermission.role, roleValue));

  // Получаем индивидуальные overrides
  const userPerms = await db
    .select({
      permissionId: schema.userPermission.permissionId,
      allowed: schema.userPermission.allowed,
    })
    .from(schema.userPermission)
    .where(eq(schema.userPermission.userId, userId));
  // Фильтрую rolePerms и userPerms, чтобы не было permissionId === null
  const filteredRolePerms = rolePerms.filter(p => p.permissionId !== null && p.permissionId !== undefined);
  const filteredUserPerms = userPerms.filter(p => p.permissionId !== null && p.permissionId !== undefined);
  const userPermsMap = Object.fromEntries(filteredUserPerms.map(p => [String(p.permissionId), p.allowed]));

  // Итоговые права: если есть override — используем его, иначе право роли
  const finalPerms: Record<string, boolean> = {};
  for (const p of rolePerms) {
    if (p.code == null) continue;
    if (p.permissionId == null) {
      finalPerms[p.code] = p.allowed;
    } else {
      const permKey = String(p.permissionId);
      finalPerms[p.code] = userPermsMap[permKey] !== undefined ? userPermsMap[permKey] : p.allowed;
    }
  }
  // Добавляем индивидуальные права, которых нет в роли
  for (const p of filteredUserPerms) {
    const code = filteredRolePerms.find(rp => rp.permissionId === p.permissionId)?.code;
    if (!code) continue;
    if (!(code in finalPerms)) {
      finalPerms[code] = p.allowed;
    }
  }
  console.log('getUserPermissions:', { userId, role: roleValue, finalPerms });
  return finalPerms;
} 