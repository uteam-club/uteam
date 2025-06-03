import { db } from '@/lib/db';
import { user } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

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