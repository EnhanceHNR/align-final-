import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const inventoryRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
    const snapshot = await adminDb.collection('inventoryItems')
      .where("organizationId", "==", ctx.user.organizationId)
      .orderBy("createdAt", "desc")
      .get();
    
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // fetch dealers and stockEntries
    const [dealersSnap, stockEntriesSnap] = await Promise.all([
      adminDb.collection('dealers').where("organizationId", "==", ctx.user.organizationId).get(),
      adminDb.collection('stockEntries').where("organizationId", "==", ctx.user.organizationId).get()
    ]);
    
    const dealersMap = new Map();
    dealersSnap.docs.forEach(d => dealersMap.set(d.id, { id: d.id, ...d.data() }));
    
    const stockEntriesMap = new Map();
    stockEntriesSnap.docs.forEach(d => {
      const data = d.data();
      if (!stockEntriesMap.has(data.inventoryItemId)) {
        stockEntriesMap.set(data.inventoryItemId, []);
      }
      stockEntriesMap.get(data.inventoryItemId).push({ id: d.id, ...data });
    });

    return items.map((item: any) => ({
      ...item,
      dealer: item.dealerId ? dealersMap.get(item.dealerId) : null,
      stockEntries: stockEntriesMap.get(item.id) || []
    }));
    } catch (err) {
      console.error("INVENTORY GETALL ERROR:", err);
      throw err;
    }
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
      const docRef = adminDb.collection('dealers').doc();
      const dealer = { id: docRef.id, ...dealerData, organizationId: ctx.user.organizationId, createdAt: new Date() };
      await docRef.set(dealer);
      
      if (suppliedItems && suppliedItems.length > 0) {
         for (const item of suppliedItems) {
            const itemRef = adminDb.collection('inventoryItems').doc(item.id);
            const itemSnap = await itemRef.get();
            if (itemSnap.exists && itemSnap.data()?.organizationId === ctx.user.organizationId) {
                await itemRef.update({
                  dealerId: dealer.id,
                  ...(item.price !== undefined ? { costPerUnit: item.price } : {})
                });
            }
         }
      }
      return dealer;
    }),

  getDealers: protectedProcedure.query(async ({ ctx }) => {
    const snapshot = await adminDb.collection('dealers')
      .where("organizationId", "==", ctx.user.organizationId)
      .orderBy("name", "asc")
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }),

  deleteDealer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('dealers').doc(input.id);
      const doc = await docRef.get();
      if (doc.exists && doc.data()?.organizationId === ctx.user.organizationId) {
        await docRef.delete();
      }
      return { success: true };
    }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const docRef = adminDb.collection('inventoryItems').doc(input.id);
      const docSnap = await docRef.get();
      if (!docSnap.exists || docSnap.data()?.organizationId !== ctx.user.organizationId) {
        return null;
      }
      
      const itemData = { id: docSnap.id, ...docSnap.data() };
      
      const [dealersSnap, stockEntriesSnap, purchaseOrdersSnap] = await Promise.all([
        itemData.dealerId ? adminDb.collection('dealers').doc(itemData.dealerId as string).get() : Promise.resolve(null),
        adminDb.collection('stockEntries').where("organizationId", "==", ctx.user.organizationId).where("inventoryItemId", "==", itemData.id).get(),
        adminDb.collection('purchaseOrders').where("organizationId", "==", ctx.user.organizationId).where("inventoryItemId", "==", itemData.id).get()
      ]);
      
      return {
        ...itemData,
        dealer: dealersSnap?.exists ? { id: dealersSnap.id, ...dealersSnap.data() } : null,
        stockEntries: stockEntriesSnap ? stockEntriesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [],
        purchaseOrders: purchaseOrdersSnap ? purchaseOrdersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : []
      };
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
      const docRef = adminDb.collection('purchaseOrders').doc();
      const order = {
        organizationId: ctx.user.organizationId,
        inventoryItemId: input.inventoryItemId,
        quantity: input.quantity,
        dealerId: input.dealerId,
        price: input.price,
        estimatedArrival: input.estimatedArrival ? new Date(input.estimatedArrival) : null,
        notes: input.notes,
        placedById: ctx.user?.id,
        status: "Pending Approval",
        paymentStatus: "Unpaid",
        createdAt: new Date()
      };
      await docRef.set(order);
      return { id: docRef.id, ...order };
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
      const docRef = adminDb.collection('inventoryItems').doc();
      const item = { ...input, organizationId: ctx.user.organizationId, createdAt: new Date() };
      await docRef.set(item);
      return { id: docRef.id, ...item };
    }),
});
