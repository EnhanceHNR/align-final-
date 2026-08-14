import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const inventoryRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.inventoryItem.findMany({
      include: {
        dealer: true,
        stockEntries: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.inventoryItem.findUnique({
        where: { id: input.id },
        include: {
          dealer: true,
          stockEntries: true,
          purchaseOrders: true,
        }
      });
    }),
    
  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      company: z.string().optional(),
      brandName: z.string().optional(),
      itemCount: z.number().default(0),
      quantityValue: z.number().default(1),
      quantityUnit: z.string().default("pcs"),
      dealerId: z.string().optional(),
      costPerUnit: z.number().default(0),
      minQuantity: z.number().default(5),
      cases: z.number().default(0),
      category: z.string().optional(),
      status: z.string().default("In Stock"),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.inventoryItem.create({
        data: input,
      });
    }),
});
