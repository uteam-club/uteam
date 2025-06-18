import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword } from "@/services/user.service";
export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "email@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const email = (credentials === null || credentials === void 0 ? void 0 : credentials.email) || '';
                const password = (credentials === null || credentials === void 0 ? void 0 : credentials.password) || '';
                if (!email || !password) {
                    return null;
                }
                const user = await getUserByEmail(email);
                if (!user) {
                    return null;
                }
                const isValid = await verifyPassword(user, password);
                if (!isValid) {
                    return null;
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
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.clubId = token.clubId;
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
        if (!process.env.NEXTAUTH_SECRET)
            throw new Error('NEXTAUTH_SECRET не задан в .env');
        return process.env.NEXTAUTH_SECRET;
    })(),
};
