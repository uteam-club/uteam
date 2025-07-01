import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword, getClubBySubdomain } from "@/services/user.service";
import { headers } from "next/headers";
import { getSubdomain } from "@/lib/utils";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const email = credentials?.email || '';
        const password = credentials?.password || '';
        
        if (!email || !password) {
          console.error('Authorize error: missing email or password', { email, password });
          return null;
        }

        const user = await getUserByEmail(email);
        if (!user) {
          console.error('Authorize error: user not found', { email });
          return null;
        }

        const isValid = await verifyPassword(user, password);
        if (!isValid) {
          console.error('Authorize error: invalid password', { email });
          return null;
        }

        // Проверяем, что пользователь принадлежит к клубу поддомена (если это не супер-админ)
        if (user.role !== 'SUPER_ADMIN') {
          try {
            const host = req.headers?.get('host') || '';
            const subdomain = getSubdomain(host);
            
            if (subdomain) {
              const club = await getClubBySubdomain(subdomain);
              if (club && user.clubId !== club.id) {
                console.error('Authorize error: user does not belong to club', { 
                  email, 
                  userClubId: user.clubId, 
                  subdomainClubId: club.id 
                });
                return null;
              }
            }
          } catch (e) {
            console.error('Error checking club access:', e);
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || "",
          role: user.role,
          clubId: user.clubId,
          image: user.imageUrl || ""
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.clubId = user.clubId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.clubId = token.clubId as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: (() => {
    if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET не задан в .env');
    return process.env.NEXTAUTH_SECRET;
  })(),
}; 