import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { protectedProcedure, router, createModuleProcedure } from "../trpc";

const moduleProcedure = createModuleProcedure("lab");
export const labRouter = router({
  listLabs: moduleProcedure.query(async ({ ctx }) => {
    const snapshot = await adminDb.collection('labs')
      .where("organizationId", "==", ctx.user.organizationId)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }),

  createLab: moduleProcedure
    .input(
      z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        services: z.any().optional(), // Json array of services
      })
    )
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('labs').doc();
      const labData = { ...input, organizationId: ctx.user.organizationId, createdAt: new Date() };
      await docRef.set(labData);
      return { success: true, lab: { id: docRef.id, ...labData } };
    }),

  updateLab: moduleProcedure
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
      const snapshot = await adminDb.collection('labs')
        .where("organizationId", "==", ctx.user.organizationId)
        .get();
      
      const docToUpdate = snapshot.docs.find(doc => doc.id === id);
      if (docToUpdate) {
        await docToUpdate.ref.update(data);
      }
      return { success: true };
    }),

  deleteLab: moduleProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const snapshot = await adminDb.collection('labs')
        .where("organizationId", "==", ctx.user.organizationId)
        .get();
        
      const docToDelete = snapshot.docs.find(doc => doc.id === input.id);
      if (docToDelete) {
        await docToDelete.ref.delete();
      }
      return { success: true };
    }),

  listTemplates: moduleProcedure.query(async ({ ctx }) => {
    const snapshot = await adminDb.collection('instructionTemplates')
      .where("organizationId", "==", ctx.user.organizationId)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }),

  createTemplate: moduleProcedure
    .input(
      z.object({
        name: z.string().min(1),
        text: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('instructionTemplates').doc();
      const templateData = { ...input, organizationId: ctx.user.organizationId, createdAt: new Date() };
      await docRef.set(templateData);
      return { success: true, template: { id: docRef.id, ...templateData } };
    }),

  updateTemplate: moduleProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).optional(),
        text: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const snapshot = await adminDb.collection('instructionTemplates')
        .where("organizationId", "==", ctx.user.organizationId)
        .get();
      
      const docToUpdate = snapshot.docs.find(doc => doc.id === id);
      if (docToUpdate) {
        await docToUpdate.ref.update(data);
      }
      return { success: true };
    }),

  deleteTemplate: moduleProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const snapshot = await adminDb.collection('instructionTemplates')
        .where("organizationId", "==", ctx.user.organizationId)
        .get();
        
      const docToDelete = snapshot.docs.find(doc => doc.id === input.id);
      if (docToDelete) {
        await docToDelete.ref.delete();
      }
      return { success: true };
    }),
});
