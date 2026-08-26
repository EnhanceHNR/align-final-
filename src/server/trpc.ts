import { initTRPC, TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth";
import superjson from "superjson";
import { authOptions } from "@/lib/authOptions";
import { adminDb } from "@/lib/firebaseAdmin";

export type UserRole = "MASTER" | "STAFF" | "SUPERADMIN";

export type Context = {
    user: {
        id: string;
        email: string;
        role: UserRole;
        organizationId?: string;
    } | null;
    db: any;
};

export async function createTRPCContext(opts: { req: Request }): Promise<Context> {
    let session = null;
    try {
        session = await getServerSession(authOptions);
    } catch (err) {
        console.error("GET_SERVER_SESSION ERROR:", err);
    }
    
    let orgId = (session?.user as any)?.organizationId;
    
    // Auto-heal old sessions that lack organizationId
    if (session?.user?.id && !orgId) {
        const userDoc = await adminDb.collection("users").doc(session.user.id).get();
        if (userDoc.exists) {
            orgId = userDoc.data()?.organizationId;
        }
    }

    return {
        user: session?.user ? {
            id: session.user.id,
            email: session.user.email ?? "",
            role: session.user.role as UserRole,
            organizationId: orgId,
        } : null,
        db: adminDb,
    };
}

const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

const isAuthed = t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in",
        });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
});

const isMaster = t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (ctx.user.role !== "MASTER" && ctx.user.role !== "SUPERADMIN") {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "Master access required",
        });
    }
    return next({ ctx });
});

export const router = t.router;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const masterOnlyProcedure = t.procedure.use(isMaster);
