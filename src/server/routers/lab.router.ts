import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "~/lib/prisma";
import { protectedProcedure, router } from "../trpc";

export const labRouter = router({
  listLabs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.lab.findMany({
      where: { organizationId: ctx.user.organizationId },
      orderBy: { createdAt: "desc" },
    });
  }),

  createLab: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        services: z.any().optional(), // Json array of services
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lab = await ctx.db.lab.create({
        data: { ...input, organizationId: ctx.user.organizationId },
      });
      return { success: true, lab };
    }),

  updateLab: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        services: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const lab = await ctx.db.lab.updateMany({
        where: { id, organizationId: ctx.user.organizationId },
        data,
      });
      return { success: true, lab };
    }),

  deleteLab: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.lab.deleteMany({
        where: { id: input.id, organizationId: ctx.user.organizationId },
      });
      return { success: true };
    }),

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.instructionTemplate.findMany({
      where: { organizationId: ctx.user.organizationId },
      orderBy: { createdAt: "desc" },
    });
  }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        text: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.instructionTemplate.create({
        data: { ...input, organizationId: ctx.user.organizationId },
      });
      return { success: true, template };
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).optional(),
        text: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const template = await ctx.db.instructionTemplate.updateMany({
        where: { id, organizationId: ctx.user.organizationId },
        data,
      });
      return { success: true, template };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.instructionTemplate.deleteMany({
        where: { id: input.id, organizationId: ctx.user.organizationId },
      });
      return { success: true };
    }),
});
