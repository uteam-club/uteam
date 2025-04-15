import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { validateCredentials } from '@/lib/auth';
import { UserRole } from '@prisma/client';

// Проверка наличия секретного ключа
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('Внимание: NEXTAUTH_SECRET не задан. Это может повлиять на безопасность сессий.');
}

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

        // Нормализуем email перед проверкой
        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        try {
          const user = await validateCredentials(email, password);

          if (!user) return null;

          // Преобразуем структуру пользователя в ожидаемую NextAuth
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole
          };
        } catch (error) {
          console.error('Ошибка авторизации:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 дней
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
  // Усиление безопасности
  jwt: {
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  debug: process.env.NODE_ENV !== 'production',
}; 