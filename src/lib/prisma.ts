import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";


const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const basePrisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = basePrisma;
}

const tenantModels = [
    "Patient", "Appointment", "Treatment", "VisitNote", "TreatmentPlan",
    "Invoice", "PriceListItem", "Chair", "OdontogramSurface", "Lab", "LabSubmission",
    "LabTransaction", "InstructionTemplate", "InventoryItem", "StockEntry", "PurchaseOrder",
    "Delivery", "Dealer", "Statement", "ConsumptionRecord", "LearningCategory", 
    "LearningMaterial", "EmployeeProfile", "Holiday"
,
    "Anamnesis", "TreatmentPlanItem", "InvoiceItem", "ShiftSegment", "Attendance", "AttendanceSession", "LeaveRequest", "PayrollRecord", "ResignationRequest", "RejoinRequest", "EmployeeDocument", "LateRequest", "EarlyPunchOutRequest"];

// Helper to get organizationId dynamically
async function getOrgId() {
    try {
        const { authOptions } = await import("@/lib/auth");
        const session = await getServerSession(authOptions);
        return (session?.user as any)?.organizationId || null;
    } catch {
        return null;
    }
}

// Global extended client that automatically injects organizationId
export const prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                if (tenantModels.includes(model as string)) {
                    const orgId = await getOrgId();
                    if (orgId) {
                        args = args || {};
                        if (['findFirst', 'findMany', 'count', 'updateMany', 'deleteMany'].includes(operation)) {
                            args.where = { ...args.where, organizationId: orgId };
                        } else if (['create', 'createMany'].includes(operation)) {
                            if (operation === 'create') {
                                args.data = { ...args.data, organizationId: orgId };
                            } else if (Array.isArray(args.data)) {
                                args.data = args.data.map((d: any) => ({ ...d, organizationId: orgId }));
                            }
                        }
                    }
                }
                return query(args);
            }
        }
    }
}) as unknown as PrismaClient;
