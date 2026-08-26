import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { adminDb } from "@/lib/firebaseAdmin";

export const doctorsRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        const snapshot = await adminDb.collection('doctors')
            .where("organizationId", "==", ctx.user.organizationId)
            .orderBy("name", "asc")
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }),
    create: protectedProcedure
        .input(z.object({ name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const ref = await adminDb.collection('doctors').add({
                name: input.name,
                organizationId: ctx.user.organizationId,
                createdAt: new Date().toISOString(),
            });
            const doc = await ref.get();
            return { id: doc.id, ...doc.data() };
        }),
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const docRef = adminDb.collection('doctors').doc(input.id);
            const docSnap = await docRef.get();
            if (docSnap.exists && docSnap.data()?.organizationId === ctx.user.organizationId) {
                await docRef.delete();
            }
            return { success: true };
        }),
});
