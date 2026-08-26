import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { protectedProcedure, router } from "../trpc";

const invoiceItemInput = z.object({
  serviceCode: z.string(),
  serviceName: z.string(),
  quantity: z.number().int().min(1),
  priceSnapshot: z.number().positive(),
  treatmentId: z.string().optional(),
});

const createInvoiceInput = z.object({
  patientId: z.string().cuid(),
  items: z.array(invoiceItemInput).min(1),
  status: z.enum(["DRAFT", "PAID", "UNPAID"]).default("DRAFT"),
});

const updateInvoiceInput = z.object({
  id: z.string().cuid(),
  patientId: z.string().cuid().optional(),
  items: z.array(invoiceItemInput).optional(),
  status: z.enum(["DRAFT", "PAID", "UNPAID"]).optional(),
});

const listInvoicesInput = z.object({
  search: z.string().trim().optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "invoiceNumber", "totalAmount"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["DRAFT", "PAID", "UNPAID"]).optional(),
});

async function generateInvoiceNumber(organizationId: string): Promise<string> {
  const currentYear = new Date().getFullYear();

  const snapshot = await adminDb.collection('invoices')
    .where('organizationId', '==', organizationId)
    .orderBy('invoiceNumber', 'desc')
    .limit(1)
    .get();

  let sequenceNumber = 1;
  if (!snapshot.empty) {
    const lastInvoice = snapshot.docs[0].data();
    if (lastInvoice.invoiceNumber && lastInvoice.invoiceNumber.startsWith(`INV-${currentYear}-`)) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split("-")[2] || "0");
      sequenceNumber = lastSequence + 1;
    }
  }

  return `INV-${currentYear}-${sequenceNumber.toString().padStart(3, "0")}`;
}

export const invoiceRouter = router({
  create: protectedProcedure
    .input(createInvoiceInput)
    .mutation(async ({ ctx, input }) => {
      const { patientId, items, status } = input;

      const patientDoc = await adminDb.collection('patients').doc(patientId).get();
      if (!patientDoc.exists || patientDoc.data()?.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Patient not found.",
        });
      }
      const patientData = patientDoc.data()!;

      const subtotal = items.reduce(
        (sum, item) => sum + item.priceSnapshot * item.quantity,
        0
      );
      const taxRate = 0.17;
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      const invoiceNumber = await generateInvoiceNumber(ctx.user.organizationId as string);

      const docRef = adminDb.collection('invoices').doc();
      const invoiceData = {
        organizationId: ctx.user.organizationId,
        patientId,
        invoiceNumber,
        subtotal,
        taxAmount,
        taxRate,
        totalAmount,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const invoiceItems = items.map((item) => ({
        serviceCode: item.serviceCode,
        serviceName: item.serviceName,
        quantity: item.quantity,
        unitPrice: item.priceSnapshot,
        totalPrice: item.priceSnapshot * item.quantity,
        treatmentId: item.treatmentId || null,
      }));

      await docRef.set(invoiceData);
      
      const batch = adminDb.batch();
      const itemsList: any[] = [];
      invoiceItems.forEach(item => {
        const itemRef = docRef.collection('items').doc();
        batch.set(itemRef, item);
        itemsList.push({ id: itemRef.id, ...item });
      });
      await batch.commit();

      const invoice = {
        id: docRef.id,
        ...invoiceData,
        items: itemsList,
        patient: {
          id: patientDoc.id,
          fullName: patientData.fullName,
          phone: patientData.phone,
          address: patientData.address,
        }
      };

      return { success: true as const, invoice };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const docRef = adminDb.collection('invoices').doc(input.id);
      const docSnap = await docRef.get();

      if (!docSnap.exists || docSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }
      const data = docSnap.data()!;
      
      const [patientSnap, itemsSnap] = await Promise.all([
        adminDb.collection('patients').doc(data.patientId).get(),
        docRef.collection('items').get()
      ]);

      const patientData = patientSnap.data() || {};
      
      return {
        id: docSnap.id,
        ...data,
        items: itemsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        patient: {
          id: patientSnap.id,
          fullName: patientData.fullName,
          phone: patientData.phone,
          address: patientData.address,
          jmb: patientData.jmb,
        }
      };
    }),

  list: protectedProcedure
    .input(listInvoicesInput)
    .query(async ({ ctx, input }) => {
      const { search, page, perPage, sortBy, sortDir, status } = input;
      
      let query: any = adminDb.collection('invoices')
        .where('organizationId', '==', ctx.user.organizationId);
        
      if (status) {
        query = query.where('status', '==', status);
      }
      
      const snapshot = await query.get();
      let invoices = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      const allPatientsSnap = await adminDb.collection('patients').where('organizationId', '==', ctx.user.organizationId).get();
      const patientsMap = new Map();
      allPatientsSnap.docs.forEach((d: any) => patientsMap.set(d.id, { id: d.id, ...d.data() }));

      invoices = invoices.map(inv => ({
        ...inv,
        patient: {
          id: inv.patientId,
          fullName: patientsMap.get(inv.patientId)?.fullName || 'Unknown'
        }
      }));

      if (search) {
        const lowerSearch = search.toLowerCase();
        invoices = invoices.filter(inv => 
          (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(lowerSearch)) ||
          (inv.patient.fullName.toLowerCase().includes(lowerSearch))
        );
      }

      invoices.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (sortBy === 'createdAt') {
           valA = valA?.toMillis ? valA.toMillis() : new Date(valA).getTime();
           valB = valB?.toMillis ? valB.toMillis() : new Date(valB).getTime();
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });

      const total = invoices.length;
      const skip = (page - 1) * perPage;
      const paginatedInvoices = invoices.slice(skip, skip + perPage);

      return {
        invoices: paginatedInvoices,
        pagination: {
          total,
          page,
          perPage,
          totalPages: Math.ceil(total / perPage),
          hasNext: page < Math.ceil(total / perPage),
          hasPrev: page > 1,
        },
      };
    }),

  update: protectedProcedure
    .input(updateInvoiceInput)
    .mutation(async ({ ctx, input }) => {
      const { id, patientId, items, status } = input;

      const docRef = adminDb.collection('invoices').doc(id);
      const existingSnap = await docRef.get();

      if (!existingSnap.exists || existingSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }

      const existingData = existingSnap.data()!;
      if (existingData.status === "PAID") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot modify paid invoices.",
        });
      }

      const updateData: any = { updatedAt: new Date() };

      let patientDataToReturn: any = null;

      if (patientId) {
        const patientSnap = await adminDb.collection('patients').doc(patientId).get();
        if (!patientSnap.exists || patientSnap.data()?.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Patient not found.",
          });
        }
        updateData.patientId = patientId;
        patientDataToReturn = patientSnap.data();
      } else {
        const patientSnap = await adminDb.collection('patients').doc(existingData.patientId).get();
        patientDataToReturn = patientSnap.data();
      }

      if (status) {
        updateData.status = status;
      }

      if (items) {
        const itemsSnap = await docRef.collection('items').get();
        const batch = adminDb.batch();
        itemsSnap.docs.forEach(d => batch.delete(d.ref));
        
        items.forEach(item => {
          const itemRef = docRef.collection('items').doc();
          batch.set(itemRef, {
            serviceCode: item.serviceCode,
            serviceName: item.serviceName,
            quantity: item.quantity,
            unitPrice: item.priceSnapshot,
            totalPrice: item.priceSnapshot * item.quantity,
            treatmentId: item.treatmentId || null,
          });
        });
        await batch.commit();

        const subtotal = items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
        const taxRate = 0.17;
        const taxAmount = subtotal * taxRate;
        updateData.subtotal = subtotal;
        updateData.taxAmount = taxAmount;
        updateData.taxRate = taxRate;
        updateData.totalAmount = subtotal + taxAmount;
      }

      await docRef.update(updateData);

      const itemsAfterSnap = await docRef.collection('items').get();
      
      return { 
        success: true as const, 
        invoice: {
          id: docRef.id,
          ...existingData,
          ...updateData,
          items: itemsAfterSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          patient: {
            id: patientId || existingData.patientId,
            fullName: patientDataToReturn.fullName,
            phone: patientDataToReturn.phone,
            address: patientDataToReturn.address,
          }
        }
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('invoices').doc(input.id);
      const existingSnap = await docRef.get();

      if (!existingSnap.exists || existingSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }

      if (existingSnap.data()?.status === "PAID") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot delete paid invoices.",
        });
      }

      const itemsSnap = await docRef.collection('items').get();
      const batch = adminDb.batch();
      itemsSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(docRef);
      await batch.commit();

      return { success: true as const };
    }),

  markAsPaid: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('invoices').doc(input.id);
      const existingSnap = await docRef.get();

      if (!existingSnap.exists || existingSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }

      const existingData = existingSnap.data()!;
      if (existingData.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The invoice is already paid.",
        });
      }

      await docRef.update({ status: "PAID", updatedAt: new Date() });

      const [patientSnap, itemsSnap] = await Promise.all([
        adminDb.collection('patients').doc(existingData.patientId).get(),
        docRef.collection('items').get()
      ]);

      return { 
        success: true as const, 
        invoice: {
          id: docRef.id,
          ...existingData,
          status: "PAID",
          items: itemsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          patient: {
            id: existingData.patientId,
            fullName: patientSnap.data()?.fullName,
          }
        } 
      };
    }),

  getByPatientId: protectedProcedure
    .input(
      z.object({
        patientId: z.string().cuid(),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const snapshot = await adminDb.collection('invoices')
        .where('organizationId', '==', ctx.user.organizationId)
        .where('patientId', '==', input.patientId)
        .orderBy('createdAt', 'desc')
        .limit(input.limit)
        .get();

      const invoices = await Promise.all(snapshot.docs.map(async doc => {
        const itemsSnap = await doc.ref.collection('items').get();
        return {
          id: doc.id,
          ...doc.data(),
          items: itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        };
      }));

      return invoices;
    }),
});
