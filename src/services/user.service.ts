import { prisma } from "@/lib/prisma";
import { User } from "../generated/prisma/client";
import bcrypt from "bcryptjs";

export async function getUserById(id: string): Promise<User | null> {
  if (!id) return null;
  
  try {
    return await prisma.user.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error("Error fetching user by id:", error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (!email) return null;
  
  try {
    return await prisma.user.findUnique({
      where: { email },
    });
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

export async function getUsersByClubId(clubId: string): Promise<User[]> {
  try {
    return await prisma.user.findMany({
      where: { clubId },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error("Error fetching users by club id:", error);
    return [];
  }
}

export async function createSuperAdmin(data: {
  email: string;
  name: string;
  password: string;
  clubId: string;
}): Promise<User | null> {
  try {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        clubId: data.clubId,
      },
    });
  } catch (error) {
    console.error("Error creating super admin:", error);
    return null;
  }
}

export async function createUser(data: {
  email: string;
  name?: string;
  password: string;
  role?: string;
  clubId: string;
}): Promise<User | null> {
  try {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role as any || "MEMBER",
        clubId: data.clubId,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, user.password);
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    return await prisma.user.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    password?: string;
    role?: string;
    imageUrl?: string;
    emailVerified?: Date;
  }
): Promise<User | null> {
  try {
    const updateData: any = { ...data };
    
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    
    return await prisma.user.update({
      where: { id },
      data: updateData,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return null;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
} 