import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "~/lib/prisma";
import { protectedProcedure, router } from "../trpc";

export const labTransactionRouter = router({
  list: protectedProcedure
    .input(z.object({ labId: z.string().cuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.labTransaction.findMany({
        where: { organizationId: ctx.user.organizationId, ...(input?.labId ? { labId: input.labId } : {}) },
        orderBy: { createdAt: "desc" },
        include: {
          lab: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        labId: z.string().cuid(),
        amount: z.number(),
        type: z.string(),
        description: z.string(),
        photoUrl: z.string().optional(),
        submissionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.db.labTransaction.create({
        data: { ...input, organizationId: ctx.user.organizationId },
        include: { lab: true },
      });
      return { success: true, transaction };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.labTransaction.deleteMany({
        where: { id: input.id, organizationId: ctx.user.organizationId },
      });
      return { success: true };
    }),
});
