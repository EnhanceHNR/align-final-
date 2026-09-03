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

                console.log("USER IS:", user); if (user.isActive === false) throw new Error("ACCOUNT_INACTIVE");
                
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
                    allowedModules: user.allowedModules || [],
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
                (token as any).allowedModules = (user as any).allowedModules || [];
                (token as any).modulesRefreshedAt = Date.now();
                return token;
            }

            // The JWT strategy keeps this token for up to 30 days without
            // re-running `authorize`, so role/module grants changed by a
            // Super Admin or the Owner wouldn't otherwise show up until the
            // user logs out and back in. Refresh the mutable fields from
            // Firestore at most once every 5 minutes so grants take effect
            // quickly without hitting the database on every request. This is
            // a UX nicety only -- the real enforcement is server-side in
            // createTRPCContext, which always reads fresh from Firestore.
            const lastRefresh = (token as any).modulesRefreshedAt || 0;
            if (token.id && Date.now() - lastRefresh > 5 * 60 * 1000) {
                try {
                    const userDoc = await adminDb.collection("users").doc(token.id as string).get();
                    if (userDoc.exists) {
                        const data: any = userDoc.data();
                        token.role = data.role;
                        token.organizationId = data.organizationId;
                        token.isSuperAdmin = data.isSuperAdmin || false;
                        (token as any).allowedModules = data.allowedModules || [];
                    }
                } catch (err) {
                    console.error("JWT_REFRESH_ERROR:", err);
                }
                (token as any).modulesRefreshedAt = Date.now();
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                (session.user as any).organizationId = token.organizationId as string;
                (session.user as any).isSuperAdmin = token.isSuperAdmin as boolean;
                (session.user as any).allowedModules = (token as any).allowedModules || [];
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
            name: "__session",
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
