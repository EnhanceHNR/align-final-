import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "~/lib/prisma";
import { protectedProcedure, router } from "../trpc";

export const labSubmissionRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        type: z.enum(["send", "receive"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.labSubmission.findMany({
        where: { organizationId: ctx.user.organizationId, ...(input?.type ? { type: input.type } : {}) },
        orderBy: { createdAt: "desc" },
        include: {
          lab: true,
          patient: true,
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const submission = await ctx.db.labSubmission.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId },
        include: {
          lab: true,
          patient: true,
        },
      });

      if (!submission) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }

      return submission;
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.string(),
        senderName: z.string().optional(),
        receiverName: z.string().optional(),
        photoUrl: z.string().optional(),
        photoUrls: z.any().optional(),
        deliveryPersonPhotoUrl: z.string().optional(),
        senderSelfieUrl: z.string().optional(),
        item: z.string(),
        subType: z.string().optional(),
        deliveryPerson: z.string().optional(),
        labId: z.string().cuid(),
        patientName: z.string(),
        patientId: z.string().cuid().optional(),
        appointmentStatus: z.string().optional(),
        appointmentDate: z.date().optional(),
        servicePrice: z.string().optional(),
        remarks: z.string().optional(),
        tat: z.string().optional(),
        linkedRecordId: z.string().cuid().optional(),
        documents: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.labSubmission.create({
        data: { ...input, organizationId: ctx.user.organizationId },
        include: {
          lab: true,
          patient: true,
        },
      });
      return { success: true, submission };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        isReturned: z.boolean().optional(),
        approvalStatus: z.string().optional(),
        isAlertResolved: z.boolean().optional(),
        editLogs: z.any().optional(),
        // other fields can be added here if needed
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const submission = await ctx.db.labSubmission.updateMany({
        where: { id, organizationId: ctx.user.organizationId },
        data,
      });
      return { success: true, submission };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.labSubmission.deleteMany({
        where: { id: input.id, organizationId: ctx.user.organizationId },
      });
      return { success: true };
    }),
});
