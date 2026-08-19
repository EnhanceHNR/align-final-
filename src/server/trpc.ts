import { initTRPC, TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth";
import superjson from "superjson";
import { authOptions } from "~/lib/auth";
import { prisma as db } from "../lib/prisma";

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

const tenantModels = [
    "Patient", "Appointment", "Treatment", "VisitNote", "TreatmentPlan",
    "Invoice", "PriceListItem", "Chair", "OdontogramSurface", "Lab", "LabSubmission",
    "LabTransaction", "InstructionTemplate", "InventoryItem", "StockEntry", "PurchaseOrder",
    "Delivery", "Dealer", "Statement", "ConsumptionRecord", "LearningCategory", 
    "LearningMaterial", "EmployeeProfile", "Holiday"
];

export async function createTRPCContext(opts: { req: Request }): Promise<Context> {
    const session = await getServerSession(authOptions);
    const orgId = (session?.user as any)?.organizationId;

    return {
        user: session?.user ? {
            id: session.user.id,
            email: session.user.email ?? "",
            role: session.user.role as UserRole,
            organizationId: orgId,
        } : null,
        db,
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
