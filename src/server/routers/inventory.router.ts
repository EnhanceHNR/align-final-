import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const inventoryRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
    const snapshot = await adminDb.collection('inventoryItems')
      .where("organizationId", "==", ctx.user.organizationId)
      .get();
    
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    
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
          price: z.number().optional(),
          expiryDate: z.string().optional()
      })).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { suppliedItems, ...dealerData } = input;
      const docRef = adminDb.collection('dealers').doc();
      const dealer = { id: docRef.id, ...dealerData, suppliedItems, organizationId: ctx.user.organizationId, createdAt: new Date() };
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
      .get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }),

  
  updateDealerItem: protectedProcedure
    .input(z.object({
      dealerId: z.string(),
      itemId: z.string(),
      price: z.number().optional(),
      expiryDate: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const dealerRef = adminDb.collection('dealers').doc(input.dealerId);
      const dealerSnap = await dealerRef.get();
      if (!dealerSnap.exists || dealerSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new Error("Dealer not found");
      }
      
      const dealer = dealerSnap.data();
      let suppliedItems = dealer.suppliedItems || [];
      
      // Remove existing entry if it exists
      suppliedItems = suppliedItems.filter((i: any) => i.id !== input.itemId);
      
      // Add updated entry
      suppliedItems.push({
        id: input.itemId,
        price: input.price,
        expiryDate: input.expiryDate
      });
      
      await dealerRef.update({
        suppliedItems
      });
      
      return { success: true };
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
  
  
  
  updateOrderStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.string(),
      bypassReason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('purchaseOrders').doc(input.id);
      const doc = await docRef.get();
      if (!doc.exists || doc.data()?.organizationId !== ctx.user.organizationId) {
        throw new Error("Order not found");
      }
      await docRef.update({
        status: input.status,
        updatedAt: new Date()
      });
      return { success: true };
    }),

  deleteOrder: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('purchaseOrders').doc(input.id);
      const doc = await docRef.get();
      if (!doc.exists || doc.data()?.organizationId !== ctx.user.organizationId) {
        throw new Error("Order not found");
      }
      await docRef.delete();
      return { success: true };
    }),

  
  getOrderById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const docRef = adminDb.collection('purchaseOrders').doc(input.id);
      const docSnap = await docRef.get();
      if (!docSnap.exists || docSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new Error("Order not found");
      }
      
      const data = docSnap.data();
      const itemSnap = await adminDb.collection('inventoryItems').doc(data.inventoryItemId).get();
      const dealerSnap = await adminDb.collection('dealers').doc(data.dealerId).get();
      
      return {
        id: docSnap.id,
        ...data,
        item: itemSnap.exists ? { id: itemSnap.id, ...itemSnap.data() } : null,
        dealer: dealerSnap.exists ? { id: dealerSnap.id, ...dealerSnap.data() } : null,
      };
    }),

  verifyDelivery: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      receivedQuantity: z.number(),
      expiryDate: z.string().optional(),
      billAmount: z.number().optional(),
      batchNumber: z.string().optional(),
      notes: z.string().optional(),
      photos: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const orderRef = adminDb.collection('purchaseOrders').doc(input.orderId);
      const orderSnap = await orderRef.get();
      
      if (!orderSnap.exists || orderSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new Error("Order not found");
      }
      
      const orderData = orderSnap.data();
      
      // Update Order Status
      await orderRef.update({
        status: 'Delivered',
        receivedQuantity: input.receivedQuantity,
        receivedDate: new Date(),
        receivedByName: ctx.user.name || "User",
        deliveryExpiry: input.expiryDate || null,
        billAmount: input.billAmount || null,
        batchNumber: input.batchNumber || null,
        deliveryNotes: input.notes || null,
        deliveryPhotos: input.photos || [],
        updatedAt: new Date()
      });
      
      // Create Stock Entry
      const stockRef = adminDb.collection('stockEntries').doc();
      await stockRef.set({
        organizationId: ctx.user.organizationId,
        inventoryItemId: orderData.inventoryItemId,
        purchaseOrderId: input.orderId,
        quantity: input.receivedQuantity,
        batchNumber: input.batchNumber || null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        receivedAt: new Date(),
        addedBy: ctx.user.id
      });
      
      // Update Global Item Count
      const itemRef = adminDb.collection('inventoryItems').doc(orderData.inventoryItemId);
      const itemSnap = await itemRef.get();
      if (itemSnap.exists) {
         const currentCount = itemSnap.data()?.itemCount || 0;
         await itemRef.update({ itemCount: currentCount + input.receivedQuantity });
      }
      
      return { success: true };
    }),

  getOrders: protectedProcedure.query(async ({ ctx }) => {
    const [ordersSnap, itemsSnap, dealersSnap, usersSnap] = await Promise.all([
      adminDb.collection('purchaseOrders').where("organizationId", "==", ctx.user.organizationId).get(),
      adminDb.collection('inventoryItems').where("organizationId", "==", ctx.user.organizationId).get(),
      adminDb.collection('dealers').where("organizationId", "==", ctx.user.organizationId).get(),
      adminDb.collection('users').where("organizationId", "==", ctx.user.organizationId).get()
    ]);

    const itemsMap = new Map();
    itemsSnap.docs.forEach(d => itemsMap.set(d.id, { id: d.id, ...d.data() }));

    const dealersMap = new Map();
    dealersSnap.docs.forEach(d => dealersMap.set(d.id, { id: d.id, ...d.data() }));

    const usersMap = new Map();
    usersSnap.docs.forEach(d => usersMap.set(d.id, { id: d.id, ...d.data() }));

    const orders = ordersSnap.docs.map(doc => {
      const data = doc.data();
      const item = itemsMap.get(data.inventoryItemId);
      const dealer = dealersMap.get(data.dealerId);
      const placedBy = usersMap.get(data.placedById);
      
      return {
        id: doc.id,
        ...data,
        itemName: item?.name || "Unknown Item",
        itemBrand: item?.brandName || "-",
        itemCompany: item?.company || "-",
        dealer: dealer?.name || "Unknown Dealer",
        dealerMobile: dealer?.phone || "-",
        orderedByName: placedBy?.name || "Unknown User",
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
        orderDate: data.createdAt?.toMillis ? new Date(data.createdAt.toMillis()).toISOString() : new Date().toISOString()
      };
    });

    return orders.sort((a, b) => b.createdAt - a.createdAt);
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
      keywords: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('inventoryItems').doc();
      const item = { ...input, organizationId: ctx.user.organizationId, createdAt: new Date() };
      await docRef.set(item);
      return { id: docRef.id, ...item };
    }),
});
