import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { adminDb } from "@/lib/firebaseAdmin";

export const proceduresRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        const snapshot = await adminDb.collection("procedures")
            .where("organizationId", "==", ctx.user.organizationId)
            .orderBy("name", "asc")
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }),
    create: protectedProcedure
        .input(z.object({ name: z.string().min(1), duration: z.number().optional() }))
        .mutation(async ({ ctx, input }) => {
            const data = {
                name: input.name,
                duration: input.duration ?? 30,
                organizationId: ctx.user.organizationId,
                createdAt: new Date().toISOString(),
            };
            const docRef = await adminDb.collection("procedures").add(data);
            return { id: docRef.id, ...data };
        }),
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await adminDb.collection("procedures").doc(input.id).delete();
            return { success: true };
        }),
});
