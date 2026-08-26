import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { adminDb } from "@/lib/firebaseAdmin";
import { TRPCError } from "@trpc/server";

const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.isSuperAdmin) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "SuperAdmin only" });
  }
  return next({ ctx });
});

export const superadminRouter = createTRPCRouter({
  getOrganizations: superAdminProcedure.query(async () => {
    const orgsSnap = await adminDb.collection("organizations").get();
    
    const orgs = orgsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // For each org, fetch user count
    const orgsWithCount = await Promise.all(
      orgs.map(async (org: any) => {
        const usersSnap = await adminDb.collection("users")
          .where("organizationId", "==", org.id)
          .get();
        return {
          ...org,
          userCount: usersSnap.size
        };
      })
    );
    
    return orgsWithCount;
  }),
  
  grantLifetime: superAdminProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ input }) => {
      await adminDb.collection("organizations").doc(input.organizationId).update({
        subscriptionStatus: "lifetime",
        planId: "enterprise",
        currentPeriodEnd: null,
      });
      return { success: true };
    }),

  suspendOrganization: superAdminProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ input }) => {
      await adminDb.collection("organizations").doc(input.organizationId).update({
        subscriptionStatus: "canceled",
      });
      return { success: true };
    }),
});
