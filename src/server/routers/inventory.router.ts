import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const inventoryRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.inventoryItem.findMany({
      where: { organizationId: ctx.user.organizationId },
      include: {
        dealer: true,
        stockEntries: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }),
  
  createDealer: protectedProcedure
    .input(z.object({
      name: z.string(),
      contactPerson: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      website: z.string().optional(),
      suppliedItems: z.array(z.object({
          id: z.string(),
          price: z.number().optional()
      })).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { suppliedItems, ...dealerData } = input;
      const dealer = await ctx.db.dealer.create({
        data: { ...dealerData, organizationId: ctx.user.organizationId }
      });
      
      // Update the items with this new dealer and price
      if (suppliedItems && suppliedItems.length > 0) {
         for (const item of suppliedItems) {
            await ctx.db.inventoryItem.updateMany({
               where: { id: item.id, organizationId: ctx.user.organizationId },
               data: {
                  dealerId: dealer.id,
                  ...(item.price !== undefined ? { costPerUnit: item.price } : {})
               }
            });
         }
      }
      return dealer;
    }),

  getDealers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.dealer.findMany({
      where: { organizationId: ctx.user.organizationId },
      orderBy: { name: 'asc' },
    });
  }),

  deleteDealer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.dealer.deleteMany({
        where: { id: input.id, organizationId: ctx.user.organizationId }
      });
    }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.inventoryItem.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId },
        include: {
          dealer: true,
          stockEntries: true,
          purchaseOrders: true,
        }
      });
    }),
    
  createOrder: protectedProcedure
    .input(z.object({
      inventoryItemId: z.string(),
      quantity: z.number(),
      dealerId: z.string(),
      price: z.number(),
      estimatedArrival: z.string().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.purchaseOrder.create({
        data: {
          organizationId: ctx.user.organizationId,
          inventoryItemId: input.inventoryItemId,
          quantity: input.quantity,
          dealerId: input.dealerId,
          price: input.price,
          estimatedArrival: input.estimatedArrival ? new Date(input.estimatedArrival) : null,
          notes: input.notes,
          placedById: ctx.user?.id,
          status: "Pending Approval",
          paymentStatus: "Unpaid"
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
        data: { ...input, organizationId: ctx.user.organizationId },
      });
    }),
});
