import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { router, publicProcedure, protectedProcedure, createModuleProcedure } from "../trpc";

const moduleProcedure = createModuleProcedure("inventory");
// ctx.user has no `name` field (it's {id, email, role, organizationId}) —
// resolve a display name from the same employeeProfiles directory
// attendance/HR management uses.
async function getEmployeeName(userId: string, organizationId?: string): Promise<string> {
  try {
    const snap = await adminDb.collection('employeeProfiles').where('userId', '==', userId).limit(1).get();
    const doc = snap.docs[0];
    if (doc) {
      const name = (doc.data() as any)?.name;
      if (name) return name;
    }
  } catch {
    // fall through to default below
  }
  return "User";
}

export const inventoryRouter = router({
  getAll: moduleProcedure.query(async ({ ctx }) => {
    try {
    const snapshot = await adminDb.collection('inventoryItems')
      .where("organizationId", "==", ctx.user.organizationId)
      .get();
    
    // `id` must be spread LAST — some inventoryItems docs (from an old CSV
    // import) have their own stray `id` data field, which otherwise
    // silently overwrites the real Firestore doc id and produces duplicate
    // ids/React key collisions in the items table.
    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    // fetch dealers and stockEntries
    const [dealersSnap, stockEntriesSnap] = await Promise.all([
      adminDb.collection('dealers').where("organizationId", "==", ctx.user.organizationId).get(),
      adminDb.collection('stockEntries').where("organizationId", "==", ctx.user.organizationId).get()
    ]);

    const dealersMap = new Map();
    dealersSnap.docs.forEach(d => dealersMap.set(d.id, { ...d.data(), id: d.id }));

    const stockEntriesMap = new Map();
    stockEntriesSnap.docs.forEach(d => {
      const data = d.data();
      if (!stockEntriesMap.has(data.inventoryItemId)) {
        stockEntriesMap.set(data.inventoryItemId, []);
      }
      stockEntriesMap.get(data.inventoryItemId).push({ ...data, id: d.id });
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
  
  createDealer: moduleProcedure
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

  getDealers: moduleProcedure.query(async ({ ctx }) => {
    const snapshot = await adminDb.collection('dealers')
      .where("organizationId", "==", ctx.user.organizationId)
      .get();
    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    return items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }),

  
  updateDealerItem: moduleProcedure
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

  deleteDealer: moduleProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('dealers').doc(input.id);
      const doc = await docRef.get();
      if (doc.exists && doc.data()?.organizationId === ctx.user.organizationId) {
        await docRef.delete();
      }
      return { success: true };
    }),
  
  
  
  updateOrderStatus: moduleProcedure
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

  deleteOrder: moduleProcedure
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

  
  getOrderById: moduleProcedure
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
        ...data,
        id: docSnap.id,
        item: itemSnap.exists ? { ...itemSnap.data(), id: itemSnap.id } : null,
        dealer: dealerSnap.exists ? { ...dealerSnap.data(), id: dealerSnap.id } : null,
      };
    }),

  verifyDelivery: moduleProcedure
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
      const receivedByName = await getEmployeeName(ctx.user.id, ctx.user.organizationId);

      // Update Order Status
      await orderRef.update({
        status: 'Delivered',
        receivedQuantity: input.receivedQuantity,
        receivedDate: new Date(),
        receivedByName,
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

  getOrders: moduleProcedure.query(async ({ ctx }) => {
    const [ordersSnap, itemsSnap, dealersSnap, profilesSnap] = await Promise.all([
      adminDb.collection('purchaseOrders').where("organizationId", "==", ctx.user.organizationId).get(),
      adminDb.collection('inventoryItems').where("organizationId", "==", ctx.user.organizationId).get(),
      adminDb.collection('dealers').where("organizationId", "==", ctx.user.organizationId).get(),
      // Staff names come from the same employeeProfiles directory attendance/HR
      // use, not the bare auth `users` collection (which has no `name` field).
      adminDb.collection('employeeProfiles').where("organizationId", "==", ctx.user.organizationId).get()
    ]);

    const itemsMap = new Map();
    itemsSnap.docs.forEach(d => itemsMap.set(d.id, { ...d.data(), id: d.id }));

    const dealersMap = new Map();
    dealersSnap.docs.forEach(d => dealersMap.set(d.id, { ...d.data(), id: d.id }));

    const usersMap = new Map();
    profilesSnap.docs.forEach(d => {
      const profile: any = d.data();
      if (profile.userId) usersMap.set(profile.userId, { ...profile, id: d.id });
    });

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

  getById: moduleProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const docRef = adminDb.collection('inventoryItems').doc(input.id);
      const docSnap = await docRef.get();
      if (!docSnap.exists || docSnap.data()?.organizationId !== ctx.user.organizationId) {
        return null;
      }
      
      const itemData = { ...docSnap.data(), id: docSnap.id };
      
      const [dealersSnap, stockEntriesSnap, purchaseOrdersSnap] = await Promise.all([
        itemData.dealerId ? adminDb.collection('dealers').doc(itemData.dealerId as string).get() : Promise.resolve(null),
        adminDb.collection('stockEntries').where("organizationId", "==", ctx.user.organizationId).where("inventoryItemId", "==", itemData.id).get(),
        adminDb.collection('purchaseOrders').where("organizationId", "==", ctx.user.organizationId).where("inventoryItemId", "==", itemData.id).get()
      ]);
      
      return {
        ...itemData,
        dealer: dealersSnap?.exists ? { ...dealersSnap.data(), id: dealersSnap.id } : null,
        stockEntries: stockEntriesSnap ? stockEntriesSnap.docs.map((d: any) => ({ ...d.data(), id: d.id })) : [],
        purchaseOrders: purchaseOrdersSnap ? purchaseOrdersSnap.docs.map((d: any) => ({ ...d.data(), id: d.id })) : []
      };
    }),
    
  createOrder: moduleProcedure
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

  create: moduleProcedure
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

  // Recomputes total stock + status from a batch list -- shared by update
  // (full batch replacement from the Edit dialog) and adjustStock (one
  // batch at a time) so the two paths can never disagree on the totals.
  update: moduleProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      company: z.string().optional(),
      brandName: z.string().optional(),
      quantityValue: z.number().optional(),
      quantityUnit: z.string().optional(),
      dealerId: z.string().nullable().optional(),
      costPerUnit: z.number().optional(),
      minQuantity: z.number().optional(),
      category: z.string().optional(),
      keywords: z.string().optional(),
      stockEntries: z.array(z.object({
        quantity: z.number(),
        expiryDate: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, stockEntries, ...fields } = input;
      const docRef = adminDb.collection('inventoryItems').doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists || docSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new Error("Item not found");
      }

      const updateData: Record<string, any> = { ...fields };

      if (stockEntries) {
        // Full replace: this dialog edits the whole batch list at once
        // (add/remove/change quantity or expiry), so the simplest correct
        // sync is to drop the old batch docs and recreate them from what
        // was submitted, rather than trying to diff them.
        const existingSnap = await adminDb.collection('stockEntries')
          .where('inventoryItemId', '==', id)
          .where('organizationId', '==', ctx.user.organizationId)
          .get();
        const batch = adminDb.batch();
        existingSnap.docs.forEach(d => batch.delete(d.ref));
        stockEntries.forEach(entry => {
          const ref = adminDb.collection('stockEntries').doc();
          batch.set(ref, {
            inventoryItemId: id,
            organizationId: ctx.user.organizationId,
            quantity: entry.quantity,
            expiryDate: entry.expiryDate,
            createdAt: new Date(),
          });
        });
        await batch.commit();

        const totalCount = stockEntries.reduce((sum, e) => sum + (e.quantity || 0), 0);
        const minQuantity = fields.minQuantity ?? docSnap.data()?.minQuantity ?? 0;
        updateData.itemCount = totalCount;
        updateData.status = totalCount === 0 ? "Out of Stock" : (totalCount <= minQuantity ? "Low Stock" : "In Stock");
      }

      await docRef.update(updateData);
      const updated = await docRef.get();
      return { id: updated.id, ...updated.data() };
    }),

  delete: moduleProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('inventoryItems').doc(input.id);
      const docSnap = await docRef.get();
      if (!docSnap.exists || docSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new Error("Item not found");
      }
      const stockSnap = await adminDb.collection('stockEntries')
        .where('inventoryItemId', '==', input.id)
        .where('organizationId', '==', ctx.user.organizationId)
        .get();
      const batch = adminDb.batch();
      stockSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(docRef);
      await batch.commit();
      return { success: true };
    }),

  bulkDelete: moduleProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const batch = adminDb.batch();
      for (const id of input.ids) {
        const docRef = adminDb.collection('inventoryItems').doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists || docSnap.data()?.organizationId !== ctx.user.organizationId) {
          continue; // skip items that don't belong to this org rather than aborting the whole batch
        }
        const stockSnap = await adminDb.collection('stockEntries')
          .where('inventoryItemId', '==', id)
          .where('organizationId', '==', ctx.user.organizationId)
          .get();
        stockSnap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(docRef);
      }
      await batch.commit();
      return { success: true };
    }),

  adjustStock: moduleProcedure
    .input(z.object({
      id: z.string(),
      type: z.enum(["add", "use"]),
      quantity: z.number().positive(),
      expiryDate: z.string().optional(), // for "add": expiry of the new batch
      batchExpiryDate: z.string().optional(), // for "use": which existing batch to draw down
    }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('inventoryItems').doc(input.id);
      const docSnap = await docRef.get();
      if (!docSnap.exists || docSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new Error("Item not found");
      }
      const item = docSnap.data()!;
      const currentCount = item.itemCount || 0;
      const minQuantity = item.minQuantity || 0;

      if (input.type === "add") {
        await adminDb.collection('stockEntries').add({
          inventoryItemId: input.id,
          organizationId: ctx.user.organizationId,
          quantity: input.quantity,
          expiryDate: input.expiryDate || new Date().toISOString(),
          createdAt: new Date(),
        });
        const newCount = currentCount + input.quantity;
        await docRef.update({
          itemCount: newCount,
          status: newCount === 0 ? "Out of Stock" : (newCount <= minQuantity ? "Low Stock" : "In Stock"),
        });
      } else {
        if (!input.batchExpiryDate) {
          throw new Error("Select a batch to use stock from");
        }
        const batchSnap = await adminDb.collection('stockEntries')
          .where('inventoryItemId', '==', input.id)
          .where('organizationId', '==', ctx.user.organizationId)
          .where('expiryDate', '==', input.batchExpiryDate)
          .limit(1)
          .get();
        if (batchSnap.empty) {
          throw new Error("Selected batch was not found -- it may have already been used up");
        }
        const batchDoc = batchSnap.docs[0];
        const batchQty = (batchDoc.data() as any).quantity || 0;
        if (input.quantity > batchQty) {
          throw new Error(`Only ${batchQty} left in that batch`);
        }
        if (input.quantity === batchQty) {
          await batchDoc.ref.delete();
        } else {
          await batchDoc.ref.update({ quantity: batchQty - input.quantity });
        }
        const newCount = Math.max(0, currentCount - input.quantity);
        await docRef.update({
          itemCount: newCount,
          status: newCount === 0 ? "Out of Stock" : (newCount <= minQuantity ? "Low Stock" : "In Stock"),
        });
      }
      const updated = await docRef.get();
      return { id: updated.id, ...updated.data() };
    }),
});
