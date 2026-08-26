import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { adminDb } from "@/lib/firebaseAdmin";

const fetchWithProfiles = async (collectionName: string, organizationId: string, employeeProfileId?: string) => {
    let query: FirebaseFirestore.Query = adminDb.collection(collectionName).where("organizationId", "==", organizationId);
    if (employeeProfileId) {
        query = query.where("employeeProfileId", "==", employeeProfileId);
    }
    const snap = await query.get();
    const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Fetch profiles
    const profileIds = [...new Set(records.map((r: any) => r.employeeProfileId).filter(Boolean))];
    const profiles = {};
    if (profileIds.length > 0) {
        await Promise.all(profileIds.map(async (id) => {
            const pDoc = await adminDb.collection("employeeProfiles").doc(id as string).get();
            if (pDoc.exists) {
                (profiles as any)[id as string] = { id: pDoc.id, ...pDoc.data() };
            }
        }));
    }
    
    return records.map((r: any) => ({
        ...r,
        employeeProfile: r.employeeProfileId ? (profiles as any)[r.employeeProfileId] || null : null
    }));
};

export const hrRouter = createTRPCRouter({
  // Leaves
  getLeaves: protectedProcedure
    .input(z.object({ employeeProfileId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const records = await fetchWithProfiles("leaveRequests", ctx.user.organizationId, input.employeeProfileId);
      return records.sort((a: any, b: any) => (b.dateOfApplying?.toMillis?.() || 0) - (a.dateOfApplying?.toMillis?.() || 0));
    }),
    
  applyLeave: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      type: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      days: z.number(),
      reason: z.string().optional(),
      emergencyContact: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ref = await adminDb.collection("leaveRequests").add({ 
        ...input, 
        organizationId: ctx.user.organizationId,
        status: "Pending",
        dateOfApplying: new Date()
      });
      return { id: ref.id, ...input };
    }),

  // Payroll
  getPayrolls: protectedProcedure
    .input(z.object({ employeeProfileId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const records = await fetchWithProfiles("payrollRecords", ctx.user.organizationId, input.employeeProfileId);
      return records.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    }),

  // Resignations
  getResignations: protectedProcedure
    .input(z.object({ employeeProfileId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const records = await fetchWithProfiles("resignationRequests", ctx.user.organizationId, input.employeeProfileId);
      return records.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    }),
    
  submitResignation: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      reason: z.string(),
      lastWorkingDay: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ref = await adminDb.collection("resignationRequests").add({ 
        ...input, 
        organizationId: ctx.user.organizationId,
        status: "Pending",
        createdAt: new Date()
      });
      return { id: ref.id, ...input };
    }),

  // Documents
  getDocuments: protectedProcedure
    .input(z.object({ employeeProfileId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const records = await fetchWithProfiles("employeeDocuments", ctx.user.organizationId, input.employeeProfileId);
      return records.sort((a: any, b: any) => (b.uploadedAt?.toMillis?.() || 0) - (a.uploadedAt?.toMillis?.() || 0));
    }),

  // Holidays
  getHolidays: protectedProcedure
    .query(async ({ ctx }) => {
      const snap = await adminDb.collection("holidays").where("organizationId", "==", ctx.user.organizationId).get();
      const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return records.sort((a: any, b: any) => (a.date?.toMillis?.() || 0) - (b.date?.toMillis?.() || 0));
    }),
    
  // Approvals (Late/Early)
  getPendingRequests: protectedProcedure
    .query(async ({ ctx }) => {
      const [lateSnap, earlySnap, leaveSnap] = await Promise.all([
          adminDb.collection("lateRequests").where("status", "==", "Pending").where("organizationId", "==", ctx.user.organizationId).get(),
          adminDb.collection("earlyPunchOutRequests").where("status", "==", "Pending").where("organizationId", "==", ctx.user.organizationId).get(),
          adminDb.collection("leaveRequests").where("status", "==", "Pending").where("organizationId", "==", ctx.user.organizationId).get()
      ]);
      
      const getProfiles = async (docs: any[]) => {
          const records = docs.map(d => ({ id: d.id, ...d.data() }));
          const pIds = [...new Set(records.map(r => r.employeeProfileId).filter(Boolean))];
          const profiles: any = {};
          await Promise.all(pIds.map(async id => {
              const p = await adminDb.collection("employeeProfiles").doc(id as string).get();
              if (p.exists) profiles[id as string] = { id: p.id, ...p.data() };
          }));
          return records.map(r => ({ ...r, employeeProfile: r.employeeProfileId ? profiles[r.employeeProfileId] || null : null }));
      };

      const late = await getProfiles(lateSnap.docs);
      const early = await getProfiles(earlySnap.docs);
      const leaves = await getProfiles(leaveSnap.docs);
      
      return { late, early, leaves };
    }),
});
