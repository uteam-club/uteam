import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { User } from "@prisma/client";

/**
 * Get the current authenticated user from the session
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.id) {
    return null;
  }
  
  // Return the user from the session
  return {
    id: session.user.id,
    name: session.user.name || null,
    email: session.user.email || null,
    image: session.user.image || null,
    role: session.user.role,
    password: null, // The password is not available in the session
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: null
  } as User;
} 