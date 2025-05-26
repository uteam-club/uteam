import { prisma } from "@/lib/prisma";
import { Team } from "@/generated/prisma/client";

export async function getTeamsByClubId(clubId: string): Promise<Team[]> {
  try {
    return await prisma.team.findMany({
      where: { clubId },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error("Error fetching teams by club id:", error);
    return [];
  }
}

export async function getTeamById(id: string): Promise<Team | null> {
  try {
    return await prisma.team.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error("Error fetching team by id:", error);
    return null;
  }
}

export async function createTeam(data: {
  name: string;
  clubId: string;
  description?: string;
  logoUrl?: string;
}): Promise<Team | null> {
  try {
    return await prisma.team.create({
      data,
    });
  } catch (error) {
    console.error("Error creating team:", error);
    return null;
  }
}

export async function updateTeam(
  id: string,
  data: {
    name?: string;
    description?: string;
    logoUrl?: string;
  }
): Promise<Team | null> {
  try {
    return await prisma.team.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error("Error updating team:", error);
    return null;
  }
}

export async function deleteTeam(id: string): Promise<boolean> {
  try {
    await prisma.team.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error("Error deleting team:", error);
    return false;
  }
} 