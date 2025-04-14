import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { validateCredentials } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await validateCredentials(
          credentials.email,
          credentials.password
        );

        if (!user) return null;

        // Преобразуем структуру пользователя в ожидаемую NextAuth
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  pages: {
    signIn: '/ru/auth/login',
    signOut: '/ru/auth/logout',
    error: '/ru/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 