import { prisma } from "@/lib/prisma";
import { Club } from "../generated/prisma/client";

export async function getClubBySubdomain(subdomain: string): Promise<Club | null> {
  if (!subdomain) return null;
  
  try {
    const club = await prisma.club.findUnique({
      where: { subdomain },
    });

    return club;
  } catch (error) {
    console.error("Error fetching club by subdomain:", error);
    return null;
  }
}

export async function getAllClubs(): Promise<Club[]> {
  try {
    return await prisma.club.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error("Error fetching all clubs:", error);
    return [];
  }
}

export async function createClub(data: {
  name: string;
  subdomain: string;
  logoUrl?: string;
}): Promise<Club | null> {
  try {
    // Проверяем, что поддомен уникален
    const existingClub = await prisma.club.findUnique({
      where: { subdomain: data.subdomain },
    });

    if (existingClub) {
      throw new Error(`Клуб с поддоменом ${data.subdomain} уже существует`);
    }

    // Создаем новый клуб
    return await prisma.club.create({
      data,
    });
  } catch (error) {
    console.error("Error creating club:", error);
    return null;
  }
}

export async function updateClub(
  id: string,
  data: {
    name?: string;
    logoUrl?: string;
  }
): Promise<Club | null> {
  try {
    return await prisma.club.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error("Error updating club:", error);
    return null;
  }
}

export async function deleteClub(id: string): Promise<boolean> {
  try {
    await prisma.club.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error("Error deleting club:", error);
    return false;
  }
} 