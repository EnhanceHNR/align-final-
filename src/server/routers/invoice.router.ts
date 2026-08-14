import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "~/lib/prisma";
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

async function generateInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: `INV-${currentYear}-`,
      },
    },
    orderBy: {
      invoiceNumber: "desc",
    },
    select: {
      invoiceNumber: true,
    },
  });

  let sequenceNumber = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split("-")[2] || "0");
    sequenceNumber = lastSequence + 1;
  }

  // Format: INV-2026-001
  return `INV-${currentYear}-${sequenceNumber.toString().padStart(3, "0")}`;
}

export const invoiceRouter = router({

    /** invoice.create -
     * Stvara novi račun za pacijenta sa zadanim stavkama.
      * Automatski generira jedinstveni broj računa.
       * Račun se inicijalno kreira sa statusom DRAFT.
     */
    create: protectedProcedure
    .input(createInvoiceInput)
    .mutation(async ({ input }) => {
      const { patientId, items, status } = input;

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, fullName: true },
      });

      if (!patient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Patient not found.",
        });
      }

      const subtotal = items.reduce(
        (sum, item) => sum + item.priceSnapshot * item.quantity,
        0
      );

      const taxRate = 0.17;
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      const invoiceNumber = await generateInvoiceNumber();

      const invoice = await prisma.invoice.create({
        data: {
          patientId,
          invoiceNumber,
          subtotal,
          taxAmount,
          taxRate,
          totalAmount,
          status,
          items: {
            create: items.map((item) => ({
              serviceCode: item.serviceCode,
              serviceName: item.serviceName,
              quantity: item.quantity,
              unitPrice: item.priceSnapshot,
              totalPrice: item.priceSnapshot * item.quantity,
              treatmentId: item.treatmentId || null,
            })),
          },
        } as any,
        include: {
          items: true,
          patient: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              address: true,
            },
          },
        },
      });

      return { success: true as const, invoice };
    }),

  /** invoice.getById
   *
   * Vraća detalje računa po ID-u, uključujući stavke i informacije o pacijentu
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.id },
        include: {
          items: true,
          patient: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              address: true,
              jmb: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }

      return invoice;
    }),

    /** invoice.list
     * Vraća paginiranu listu računa sa opcionalnim pretraživanjem po broju računa i imenu pacijenta
     */
  list: protectedProcedure
    .input(listInvoicesInput)
    .query(async ({ input }) => {
      const { search, page, perPage, sortBy, sortDir, status } = input;
      const skip = (page - 1) * perPage;

      const where: any = {};

      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { patient: { fullName: { contains: search, mode: "insensitive" } } },
        ];
      }

      if (status) {
        where.status = status;
      }

      const [total, invoices] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.findMany({
          where,
          orderBy: { [sortBy]: sortDir },
          skip,
          take: perPage,
          include: {
            patient: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        }),
      ]);

      return {
        invoices,
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

    /** invoice.update
     * Omogućava ažuriranje računa: promjenu pacijenta, stavki i statusa
     * Ne dozvoljava izmjene na računima koji su već plaćeni
     */
  update: protectedProcedure
    .input(updateInvoiceInput)
    .mutation(async ({ input }) => {
      const { id, patientId, items, status } = input;

      // Verify invoice exists
      const existing = await prisma.invoice.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }

      if (existing.status === "PAID") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot modify paid invoices.",
        });
      }

      const updateData: any = {};

      if (patientId) {
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
          select: { id: true },
        });

        if (!patient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Patient not found.",
          });
        }

        updateData.patientId = patientId;
      }

      if (status) {
        updateData.status = status;
      }

      if (items) {
        await prisma.invoiceItem.deleteMany({
          where: { invoiceId: id },
        });

        await prisma.invoiceItem.createMany({
          data: items.map((item) => ({
            invoiceId: id,
            serviceCode: item.serviceCode,
            serviceName: item.serviceName,
            quantity: item.quantity,
            unitPrice: item.priceSnapshot,
            totalPrice: item.priceSnapshot * item.quantity,
            treatmentId: item.treatmentId || null,
          })),
        });

        const subtotal = items.reduce(
          (sum, item) => sum + item.priceSnapshot * item.quantity,
          0
        );
        const taxRate = 0.17;
        const taxAmount = subtotal * taxRate;
        updateData.subtotal = subtotal;
        updateData.taxAmount = taxAmount;
        updateData.taxRate = taxRate;
        updateData.totalAmount = subtotal + taxAmount;
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: updateData,
        include: {
          items: true,
          patient: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              address: true,
            },
          },
        },
      });

      return { success: true as const, invoice };
    }),

    /** invoice.delete
     * Briše račun po ID-u. Ne dozvoljava brisanje računa koji su već plaćeni
     */
    delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.invoice.findUnique({
        where: { id: input.id },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }

      // Prevent deletion of paid invoices
      if (existing.status === "PAID") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot delete paid invoices.",
        });
      }

      await prisma.invoice.delete({
        where: { id: input.id },
      });

      return { success: true as const };
    }),

  /** invoice.markAsPaid
   * Oznacava račun kao plaćen. Ne dozvoljava ovu operaciju ako je račun već plaćen ili ako račun ne postoji
   */
  markAsPaid: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.invoice.findUnique({
        where: { id: input.id },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }

      if (existing.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The invoice is already paid.",
        });
      }

      const invoice = await prisma.invoice.update({
        where: { id: input.id },
        data: { status: "PAID" },
        include: {
          items: true,
          patient: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      return { success: true as const, invoice };
    }),

 /** invoice.getByPatientId
   * Vraća listu računa za određenog pacijenta, sortirano po datumu nastanka (najnoviji prvi)
   * Ograničava broj vraćenih računa na zadani limit (default 10)
   */
  getByPatientId: protectedProcedure
    .input(
      z.object({
        patientId: z.string().cuid(),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const invoices = await prisma.invoice.findMany({
        where: { patientId: input.patientId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: {
          items: true,
        },
      });

      return invoices;
    }),
});
