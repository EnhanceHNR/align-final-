import { z } from "zod";
import { router, publicProcedure, protectedProcedure, masterOnlyProcedure, createModuleProcedure } from "../trpc";

const moduleProcedure = createModuleProcedure("learning");
import { TRPCError } from "@trpc/server";
import { adminDb } from "~/lib/firebaseAdmin";

export const learningRouter = router({
  // CATEGORIES
  listCategories: moduleProcedure.query(async ({ ctx }) => {
    const snapshot = await adminDb.collection("learningCategories")
      .where("organizationId", "==", ctx.user.organizationId)
      .get();
    
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    categories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return Promise.all(categories.map(async (cat) => {
      const materialsSnapshot = await adminDb.collection("learningMaterials")
        .where("organizationId", "==", ctx.user.organizationId)
        .where("categoryId", "==", cat.id)
        .count()
        .get();
        
      return {
        ...cat,
        _count: {
          materials: materialsSnapshot.data().count,
        }
      };
    }));
  }),
  createCategory: masterOnlyProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const docRef = await adminDb.collection("learningCategories").add({
        name: input.name,
        organizationId: ctx.user.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { id: docRef.id, name: input.name, organizationId: ctx.user.organizationId };
    }),
  deleteCategory: masterOnlyProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection("learningCategories").doc(input.id);
      const docSnap = await docRef.get();
      if (docSnap.exists && docSnap.data()?.organizationId === ctx.user.organizationId) {
        await docRef.delete();
      }
      return { success: true };
    }),

  // MATERIALS
  listMaterials: moduleProcedure
    .input(z.object({ categoryId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      let query = adminDb.collection("learningMaterials")
        .where("organizationId", "==", ctx.user.organizationId);
      
      if (input.categoryId) {
        query = query.where("categoryId", "==", input.categoryId);
      }

      const snapshot = await query.get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to avoid composite index requirements
      docs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
      });
      return docs;
    }),
  createMaterial: masterOnlyProcedure
    .input(
      z.object({
        categoryId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        url: z.string().url(),
        type: z.enum(["IMAGE", "VIDEO"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        url: input.url,
        type: input.type,
        organizationId: ctx.user.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await adminDb.collection("learningMaterials").add(data);
      return { id: docRef.id, ...data };
    }),
  deleteMaterial: masterOnlyProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection("learningMaterials").doc(input.id);
      const docSnap = await docRef.get();
      if (docSnap.exists && docSnap.data()?.organizationId === ctx.user.organizationId) {
        await docRef.delete();
      }
      return { success: true };
    }),
});
