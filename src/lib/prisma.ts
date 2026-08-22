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

import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

// Helper to get organizationId dynamically
async function getOrgId() {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("align_token")?.value || cookieStore.get("__Secure-align_token")?.value;
        if (token) {
            const decoded = await decode({ token, secret: process.env.NEXTAUTH_SECRET || "" });
            return (decoded as any)?.organizationId || null;
        }
        return null;
    } catch (e) {
        console.error("Error in getOrgId:", e);
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
                    
                    if (['findFirst', 'findMany', 'count', 'updateMany', 'deleteMany'].includes(operation)) {
                        args = args || {};
                        // Only inject if not explicitly provided
                        if (!args.where || !('organizationId' in args.where)) {
                            if (orgId) {
                                args.where = { ...args.where, organizationId: orgId };
                            } else {
                                // If orgId is not found, force a mismatch to prevent data breach
                                args.where = { ...args.where, organizationId: 'UNAUTHORIZED_ACCESS' };
                            }
                        }
                    } else if (['create', 'createMany'].includes(operation)) {
                        args = args || {};
                        if (operation === 'create') {
                            if (!args.data || !('organizationId' in args.data)) {
                                args.data = { ...args.data, organizationId: orgId || 'UNAUTHORIZED_ACCESS' };
                            }
                        } else if (Array.isArray(args.data)) {
                            args.data = args.data.map((d: any) => {
                                if (!d.organizationId) {
                                    return { ...d, organizationId: orgId || 'UNAUTHORIZED_ACCESS' };
                                }
                                return d;
                            });
                        }
                    }
                }
                return query(args);
            }
        }
    }
}) as unknown as PrismaClient;
