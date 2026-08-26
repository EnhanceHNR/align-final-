import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const visitNotesRouter = createTRPCRouter({

    create: protectedProcedure
        .input(
            z.object({
                patientId: z.string().cuid(),
                appointmentId: z.string().cuid().optional(),
                content: z.string().min(1),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const data = {
                content: input.content,
                patientId: input.patientId,
                appointmentId: input.appointmentId ?? null,
                userId: ctx.user.id,
                organizationId: ctx.user.organizationId,
                createdAt: new Date().toISOString(),
            };
            const docRef = await adminDb.collection("visitNotes").add(data);
            return { id: docRef.id, ...data };
        }),

    getByPatientId: protectedProcedure
        .input(
            z.object({
                patientId: z.string().cuid(),
            })
        )
        .query(async ({ ctx, input }) => {
            const snapshot = await adminDb.collection("visitNotes")
                .where("organizationId", "==", ctx.user.organizationId)
                .where("patientId", "==", input.patientId)
                .orderBy("createdAt", "desc")
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }),

    delete: protectedProcedure
        .input(
            z.object({
                id: z.string().cuid(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await adminDb.collection("visitNotes").doc(input.id).delete();
            return { success: true };
        }),

});
