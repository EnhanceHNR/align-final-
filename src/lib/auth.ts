import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const authOptions: NextAuthOptions = {
    // ─> Provider koji koristi email i lozinku za autentifikaciju
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Lozinka", type: "password" },
            },

            /**
             * authorize() — glavna funkcija za provjeru korisnika.
             *
             * Poziva se kada korisnik pošalje login formu.
             * Vraća user objekat ako su podaci ispravni, null ako nisu.
             */
            async authorize(credentials) {
                // 1. Provjera da su email i password uneseni
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // 2. Pronadi korisnika iz baze po emailu (case-insensitive)
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email.toLowerCase().trim() },
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        isActive: true,
                        passwordHash: true,
                    },
                });

                // 3. Ako korisnik ne postoji, vrati null (neispravni podaci)
                if (!user) return null;

                // 4. Racun je deaktiviran
                if (!user.isActive) {
                    // Bacamo posebnu poruku koja će biti prikazana korisniku
                    throw new Error("ACCOUNT_INACTIVE");
                }

                // 5. Provjera lozinke
                const passwordValid = await verifyPassword(
                    user.passwordHash,
                    credentials.password
                );

                if (!passwordValid) return null;

                // 6. Ako je sve validno, vrati user objekat (bez passwordHash-a)
                return {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                };
            },
        }),
    ],

    // -> JWT i session callbackovi za dodavanje user ID-a i role u token i session
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role: string }).role;
            }
            return token;
        },

        // session() se poziva pri provjeri sesije na klijentu
        // Ovdje dodajemo id i role u session.user objekat, koji je dostupan putem useSession() i getServerSession() helpera
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },

    // -> Session strategija
    session: {
        strategy: "jwt",
        maxAge: 10 * 60,
    },

    // -> JWT opcije
    jwt: {
        maxAge: 10 * 60,
    },

    // -> Cookie konfiguracija
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

    // -> Custom stranice za prijavu, odjavu, greške itd.
    pages: {
        signIn: "/",
    },

    // -> Secret
    secret: process.env.NEXTAUTH_SECRET,
};