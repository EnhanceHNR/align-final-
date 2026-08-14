import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "~/lib/prisma";
import { protectedProcedure, router } from "../trpc";

export const labRouter = router({
  listLabs: protectedProcedure.query(async () => {
    return prisma.lab.findMany({
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
    .mutation(async ({ input }) => {
      const lab = await prisma.lab.create({
        data: input,
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
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const lab = await prisma.lab.update({
        where: { id },
        data,
      });
      return { success: true, lab };
    }),

  deleteLab: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input }) => {
      await prisma.lab.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  listTemplates: protectedProcedure.query(async () => {
    return prisma.instructionTemplate.findMany({
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
    .mutation(async ({ input }) => {
      const template = await prisma.instructionTemplate.create({
        data: input,
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
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const template = await prisma.instructionTemplate.update({
        where: { id },
        data,
      });
      return { success: true, template };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input }) => {
      await prisma.instructionTemplate.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});
