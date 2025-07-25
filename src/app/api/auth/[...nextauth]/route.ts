import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import NextAuth from "next-auth";
import { authOptions } from "./auth-options";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

console.log('API /api/auth/[...nextauth]/route.ts called');

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 