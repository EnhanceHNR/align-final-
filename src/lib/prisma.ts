import { PrismaClient } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

async function getOrgId() {
    try {
        const req = {
            cookies: Object.fromEntries(cookies().getAll().map(c => [c.name, c.value])),
            headers: { cookie: cookies().toString() }
        };
        const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET || "", cookieName: "align_token" });
        return (token as any)?.organizationId || null;
    } catch (e) {
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
