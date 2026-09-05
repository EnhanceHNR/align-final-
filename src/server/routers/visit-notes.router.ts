import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { createTRPCRouter, protectedProcedure, createModuleProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const moduleProcedure = createModuleProcedure("patients");
export const visitNotesRouter = createTRPCRouter({

    create: moduleProcedure
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

    getByPatientId: moduleProcedure
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

    delete: moduleProcedure
        .input(
            z.object({
                id: z.string().cuid(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const docRef = adminDb.collection("visitNotes").doc(input.id);
            const docSnap = await docRef.get();
            if (!docSnap.exists || docSnap.data()?.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Visit note not found." });
            }
            await docRef.delete();
            return { success: true };
        }),

});
