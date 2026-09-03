import { z } from "zod";
import { createTRPCRouter, ownerOnlyProcedure } from "../trpc";
import { adminDb } from "@/lib/firebaseAdmin";
import { runBackup, restoreBackup, listBackups as listBackupRuns, getBackupConfig, setBackupConfig } from "@/lib/backup";

// Everything in this router is the platform "Owner" tier: the single account
// (or accounts) with `isSuperAdmin: true`, sitting above every organization's
// own Super Admin (MASTER). It controls cross-org visibility (MRR, all
// users), and data backups/restores.
export const superadminRouter = createTRPCRouter({
  getOrganizations: ownerOnlyProcedure.query(async () => {
    const orgsSnap = await adminDb.collection("organizations").get();

    const orgs = orgsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

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

  grantLifetime: ownerOnlyProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ input }) => {
      await adminDb.collection("organizations").doc(input.organizationId).update({
        subscriptionStatus: "lifetime",
        planId: "enterprise",
        currentPeriodEnd: null,
      });
      return { success: true };
    }),

  suspendOrganization: ownerOnlyProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ input }) => {
      await adminDb.collection("organizations").doc(input.organizationId).update({
        subscriptionStatus: "canceled",
      });
      return { success: true };
    }),

  reactivateOrganization: ownerOnlyProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ input }) => {
      await adminDb.collection("organizations").doc(input.organizationId).update({
        subscriptionStatus: "active",
      });
      return { success: true };
    }),

  // Set (or clear) the monthly price used for this org's MRR contribution.
  // There's no Stripe integration wired up yet, so MRR is derived from this
  // Owner-entered price rather than invented numbers.
  setOrgPricing: ownerOnlyProcedure
    .input(z.object({ organizationId: z.string(), monthlyPrice: z.number().min(0) }))
    .mutation(async ({ input }) => {
      await adminDb.collection("organizations").doc(input.organizationId).update({
        monthlyPrice: input.monthlyPrice,
      });
      return { success: true };
    }),

  getMrrMetrics: ownerOnlyProcedure.query(async () => {
    const orgsSnap = await adminDb.collection("organizations").get();
    const orgs = orgsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    let mrr = 0;
    let activePaying = 0;
    let lifetime = 0;
    let canceled = 0;
    for (const org of orgs) {
      if (org.subscriptionStatus === "lifetime") {
        lifetime++;
      } else if (org.subscriptionStatus === "canceled") {
        canceled++;
      } else {
        activePaying++;
        mrr += Number(org.monthlyPrice) || 0;
      }
    }

    const usersSnap = await adminDb.collection("users").get();

    return {
      mrr,
      totalOrganizations: orgs.length,
      activeOrganizations: activePaying,
      lifetimeOrganizations: lifetime,
      canceledOrganizations: canceled,
      totalUsers: usersSnap.size,
    };
  }),

  // All users across every organization, for the platform "Users &
  // Hierarchy" view.
  getPlatformUsers: ownerOnlyProcedure.query(async () => {
    const [usersSnap, orgsSnap] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("organizations").get(),
    ]);
    const orgNames: Record<string, string> = {};
    orgsSnap.docs.forEach((d: any) => { orgNames[d.id] = d.data()?.name || "Unnamed Clinic"; });

    return usersSnap.docs.map((d: any) => {
      const u = d.data();
      return {
        id: d.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive !== false,
        isSuperAdmin: !!u.isSuperAdmin,
        organizationId: u.organizationId || null,
        organizationName: u.organizationId ? (orgNames[u.organizationId] || "Unknown") : "—",
        allowedModules: u.allowedModules || [],
      };
    });
  }),

  // ---- Backups ----------------------------------------------------------
  // See src/lib/backup.ts for the safety invariant: backup and restore only
  // ever add or refresh documents, never delete them.

  runBackupNow: ownerOnlyProcedure.mutation(async ({ ctx }) => {
    const summary = await runBackup(ctx.user!.email);
    await setBackupConfig({ lastRunAt: summary.finishedAt });
    return summary;
  }),

  listBackups: ownerOnlyProcedure.query(async () => {
    return listBackupRuns();
  }),

  restoreBackup: ownerOnlyProcedure
    .input(z.object({ backupId: z.string() }))
    .mutation(async ({ input }) => {
      return restoreBackup(input.backupId);
    }),

  getBackupConfig: ownerOnlyProcedure.query(async () => {
    return getBackupConfig();
  }),

  updateBackupConfig: ownerOnlyProcedure
    .input(z.object({ frequency: z.enum(["daily", "weekly", "monthly"]), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      await setBackupConfig(input);
      return getBackupConfig();
    }),
});
