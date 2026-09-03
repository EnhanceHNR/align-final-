import { initTRPC, TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth";
import superjson from "superjson";
import { authOptions } from "@/lib/authOptions";
import { adminDb } from "@/lib/firebaseAdmin";

// The real, live role enum (matches src/types/next-auth.d.ts). "SUPERADMIN" used
// to appear here but was never actually produced anywhere in the app -- the
// platform "Owner" tier is the separate `isSuperAdmin` boolean below, not a role
// value.
export type UserRole = "MASTER" | "ADMIN" | "STAFF";

// The five sidebar module groups that per-user access can be scoped to. Keep
// this in sync with the top-level sections in dashboard-sidebar.tsx.
export const MODULE_KEYS = ["patients", "lab", "inventory", "attendance", "learning"] as const;
export type ModuleKey = typeof MODULE_KEYS[number];

export type Context = {
    user: {
        id: string;
        email: string;
        role: UserRole;
        organizationId?: string;
        // Platform Owner: subscribed/master account across the whole SaaS,
        // controls every organization (MRR, backups, all users). Independent
        // of `role`, which only describes standing within one organization.
        isSuperAdmin: boolean;
        // Which modules a non-MASTER user (ADMIN or STAFF) may see/use.
        // MASTER (and the platform Owner) always have every module.
        allowedModules: string[];
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

    if (!session?.user?.id) {
        return { user: null, db: adminDb };
    }

    // Role, organizationId, module grants and active/suspended status are
    // read fresh from Firestore on every request rather than trusted from the
    // (potentially stale, up to 30 days old) JWT. This is what makes module
    // grants and deactivation from the admin panel take effect immediately,
    // and it's the real security boundary since every mutation goes through
    // this context.
    const userDoc = await adminDb.collection("users").doc(session.user.id).get();
    if (!userDoc.exists) {
        return { user: null, db: adminDb };
    }
    const userData: any = userDoc.data();
    if (userData.isActive === false) {
        return { user: null, db: adminDb };
    }

    return {
        user: {
            id: session.user.id,
            email: userData.email ?? session.user.email ?? "",
            role: (userData.role as UserRole) ?? "STAFF",
            organizationId: userData.organizationId,
            isSuperAdmin: !!userData.isSuperAdmin,
            allowedModules: Array.isArray(userData.allowedModules) ? userData.allowedModules : [],
        },
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

// Org-level full control: MASTER (the org's Super Admin / paying account) or
// the platform Owner. This intentionally does NOT include ADMIN -- ADMIN only
// gets elevated rights inside the specific modules assigned to them (see
// requireModuleAdmin below), not org-wide control.
const isMaster = t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (ctx.user.role !== "MASTER" && !ctx.user.isSuperAdmin) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "Master access required",
        });
    }
    return next({ ctx });
});

const isPlatformOwner = t.middleware(({ ctx, next }) => {
    if (!ctx.user || !ctx.user.isSuperAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
    }
    return next({ ctx });
});

export const router = t.router;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const masterOnlyProcedure = t.procedure.use(isMaster);
export const ownerOnlyProcedure = t.procedure.use(isPlatformOwner);

// True if this user can see/use the given module at all (any level).
export function hasModuleAccess(user: NonNullable<Context["user"]>, moduleKey: ModuleKey): boolean {
    if (user.isSuperAdmin || user.role === "MASTER") return true;
    return user.allowedModules.includes(moduleKey);
}

// True if this user has elevated ("admin") rights *within* the given module --
// full org MASTER, the platform Owner, or an ADMIN who has been granted that
// specific module.
export function hasModuleAdminAccess(user: NonNullable<Context["user"]>, moduleKey: ModuleKey): boolean {
    if (user.isSuperAdmin || user.role === "MASTER") return true;
    return user.role === "ADMIN" && user.allowedModules.includes(moduleKey);
}

export function requireModule(ctx: Context, moduleKey: ModuleKey) {
    if (!ctx.user || !hasModuleAccess(ctx.user, moduleKey)) {
        throw new TRPCError({ code: "FORBIDDEN", message: `You don't have access to ${moduleKey}` });
    }
}

export function requireModuleAdmin(ctx: Context, moduleKey: ModuleKey) {
    if (!ctx.user || !hasModuleAdminAccess(ctx.user, moduleKey)) {
        throw new TRPCError({ code: "FORBIDDEN", message: `You don't have admin access to ${moduleKey}` });
    }
}

// A procedure factory: every module router can do
//   const patientsProcedure = createModuleProcedure("patients");
// and use it in place of protectedProcedure for all of its queries/mutations.
export function createModuleProcedure(moduleKey: ModuleKey) {
    return protectedProcedure.use(({ ctx, next }) => {
        requireModule(ctx, moduleKey);
        return next({ ctx });
    });
}
