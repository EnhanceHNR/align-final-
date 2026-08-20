import { z } from "zod";
import { router, publicProcedure, masterOnlyProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const learningRouter = router({
  // CATEGORIES
  listCategories: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.learningCategory.findMany({
      where: { organizationId: ctx.user.organizationId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });
  }),
  createCategory: masterOnlyProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.learningCategory.create({
        data: { name: input.name },
      });
    }),
  deleteCategory: masterOnlyProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.learningCategory.deleteMany({
        where: { id: input.id, organizationId: ctx.user.organizationId },
      });
    }),

  // MATERIALS
  listMaterials: publicProcedure
    .input(z.object({ categoryId: z.string().cuid().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.learningMaterial.findMany({
        where: { organizationId: ctx.user.organizationId, ...(input.categoryId ? { categoryId: input.categoryId } : {}) },
        orderBy: { createdAt: "desc" },
      });
    }),
  createMaterial: masterOnlyProcedure
    .input(
      z.object({
        categoryId: z.string().cuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        url: z.string().url(),
        type: z.enum(["IMAGE", "VIDEO"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.learningMaterial.create({
        data: {
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          url: input.url,
          type: input.type,
        },
      });
    }),
  deleteMaterial: masterOnlyProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.learningMaterial.deleteMany({
        where: { id: input.id, organizationId: ctx.user.organizationId },
      });
    }),
});
