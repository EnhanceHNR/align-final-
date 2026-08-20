import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const hrRouter = createTRPCRouter({
  // Leaves
  getLeaves: protectedProcedure
    .input(z.object({ employeeProfileId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.user.organizationId };
      if (input.employeeProfileId) {
        where.employeeProfileId = input.employeeProfileId;
      }
      return ctx.db.leaveRequest.findMany({ where, include: { employeeProfile: true }, orderBy: { dateOfApplying: "desc" } });
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
      return ctx.db.leaveRequest.create({ data: { ...input, organizationId: ctx.user.organizationId } });
    }),

  // Payroll
  getPayrolls: protectedProcedure
    .input(z.object({ employeeProfileId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.user.organizationId };
      if (input.employeeProfileId) {
        where.employeeProfileId = input.employeeProfileId;
      }
      return ctx.db.payrollRecord.findMany({ where, include: { employeeProfile: true }, orderBy: { createdAt: "desc" } });
    }),

  // Resignations
  getResignations: protectedProcedure
    .input(z.object({ employeeProfileId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.user.organizationId };
      if (input.employeeProfileId) {
        where.employeeProfileId = input.employeeProfileId;
      }
      return ctx.db.resignationRequest.findMany({ where, include: { employeeProfile: true }, orderBy: { createdAt: "desc" } });
    }),
    
  submitResignation: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      reason: z.string(),
      lastWorkingDay: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.resignationRequest.create({ data: { ...input, organizationId: ctx.user.organizationId } });
    }),

  // Documents
  getDocuments: protectedProcedure
    .input(z.object({ employeeProfileId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.user.organizationId };
      if (input.employeeProfileId) {
        where.employeeProfileId = input.employeeProfileId;
      }
      return ctx.db.employeeDocument.findMany({ where, include: { employeeProfile: true }, orderBy: { uploadedAt: "desc" } });
    }),

  // Holidays
  getHolidays: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.holiday.findMany({ where: { organizationId: ctx.user.organizationId }, orderBy: { date: "asc" } });
    }),
    
  // Approvals (Late/Early)
  getPendingRequests: protectedProcedure
    .query(async ({ ctx }) => {
      const late = await ctx.db.lateRequest.findMany({ where: { status: "Pending", organizationId: ctx.user.organizationId }, include: { employeeProfile: true } });
      const early = await ctx.db.earlyPunchOutRequest.findMany({ where: { status: "Pending", organizationId: ctx.user.organizationId }, include: { employeeProfile: true } });
      const leaves = await ctx.db.leaveRequest.findMany({ where: { status: "Pending", organizationId: ctx.user.organizationId }, include: { employeeProfile: true } });
      return { late, early, leaves };
    }),
});
