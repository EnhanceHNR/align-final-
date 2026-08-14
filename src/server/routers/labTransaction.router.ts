import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "~/lib/prisma";
import { protectedProcedure, router } from "../trpc";

export const labTransactionRouter = router({
  list: protectedProcedure
    .input(z.object({ labId: z.string().cuid().optional() }).optional())
    .query(async ({ input }) => {
      return prisma.labTransaction.findMany({
        where: input?.labId ? { labId: input.labId } : undefined,
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
    .mutation(async ({ input }) => {
      const transaction = await prisma.labTransaction.create({
        data: input,
        include: { lab: true },
      });
      return { success: true, transaction };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input }) => {
      await prisma.labTransaction.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});
