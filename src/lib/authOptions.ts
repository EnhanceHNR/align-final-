process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "https://studio-3524371045-b11af.web.app";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/password";
import { adminDb } from "@/lib/firebaseAdmin";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Lozinka", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const usersSnapshot = await adminDb.collection("users")
                    .where("email", "==", credentials.email.toLowerCase().trim())
                    .limit(1)
                    .get();

                if (usersSnapshot.empty) return null;
                const userDoc = usersSnapshot.docs[0];
                const user = { id: userDoc.id, ...userDoc.data() } as any;

                console.log("USER IS:", user); if (!user.isActive) throw new Error("ACCOUNT_INACTIVE");
                
                // Block login if explicitly marked as unverified
                if (user.emailVerified === false) {
                    throw new Error("EMAIL_NOT_VERIFIED");
                }

                const passwordValid = await verifyPassword(user.passwordHash, credentials.password);
                if (!passwordValid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    role: user.role, 
                    organizationId: user.organizationId,
                    isSuperAdmin: user.isSuperAdmin || false,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role: string }).role; 
                token.organizationId = (user as any).organizationId;
                token.isSuperAdmin = (user as any).isSuperAdmin || false;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string; 
                (session.user as any).organizationId = token.organizationId as string;
                (session.user as any).isSuperAdmin = token.isSuperAdmin as boolean;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    jwt: {
        maxAge: 30 * 24 * 60 * 60,
    },
    cookies: {
        sessionToken: {
            name: "align_token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    pages: {
        signIn: "/",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
