import { z } from "zod";
import { router, publicProcedure, masterOnlyProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { adminDb } from "~/lib/firebaseAdmin";

export const learningRouter = router({
  // CATEGORIES
  listCategories: publicProcedure.query(async ({ ctx }) => {
    const snapshot = await adminDb.collection("learningCategories")
      .where("organizationId", "==", ctx.user.organizationId)
      .orderBy("name", "asc")
      .get();
    
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
  listMaterials: publicProcedure
    .input(z.object({ categoryId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      let query = adminDb.collection("learningMaterials")
        .where("organizationId", "==", ctx.user.organizationId)
        .orderBy("createdAt", "desc");
      
      if (input.categoryId) {
        query = query.where("categoryId", "==", input.categoryId);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
