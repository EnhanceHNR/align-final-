import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id:   string;
            role: "MASTER" | "ADMIN" | "STAFF";
            organizationId?: string;
            isSuperAdmin?: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        id:   string;
        role: "MASTER" | "ADMIN" | "STAFF";
        organizationId?: string;
        isSuperAdmin?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id:   string;
        role: "MASTER" | "ADMIN" | "STAFF";
        organizationId?: string;
        isSuperAdmin?: boolean;
    }
}