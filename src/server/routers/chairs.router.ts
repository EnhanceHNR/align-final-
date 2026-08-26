import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { adminDb } from "@/lib/firebaseAdmin";

export const chairRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const snapshot = await adminDb.collection('chairs')
      .where("organizationId", "==", ctx.user.organizationId)
      .orderBy("createdAt", "asc")
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }),
  create: publicProcedure
    .input(z.object({ name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const ref = await adminDb.collection('chairs').add({
        name: input.name,
        color: input.color ?? "#3b82f6",
        organizationId: ctx.user.organizationId,
        createdAt: new Date().toISOString(),
      });
      const doc = await ref.get();
      return { id: doc.id, ...doc.data() };
    }),
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection('chairs').doc(input.id);
      const docSnap = await docRef.get();
      if (docSnap.exists && docSnap.data()?.organizationId === ctx.user.organizationId) {
        await docRef.delete();
      }
      return { success: true };
    }),
  updateGoogleCalendar: publicProcedure
    .input(z.object({
        id: z.string(),
        googleCalendarId: z.string().nullable(),
        googleSyncEnabled: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
        const ref = adminDb.collection('chairs').doc(input.id);
        const docSnap = await ref.get();
        if (docSnap.exists && docSnap.data()?.organizationId === ctx.user.organizationId) {
            await ref.update({
                googleCalendarId: input.googleCalendarId,
                googleSyncEnabled: input.googleSyncEnabled
            });
        }
        return { success: true };
    }),
});
