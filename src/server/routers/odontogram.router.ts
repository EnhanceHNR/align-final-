import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { adminDb } from "@/lib/firebaseAdmin";
import { TRPCError } from "@trpc/server";
import { ODONTOGRAM_SURFACES, ODONTOGRAM_CONDITIONS } from "~/lib/odontogram";

// Definirat ćemo Zod sheme za validaciju ulaznih podataka
const odontogramSurfaceInput = z.enum(ODONTOGRAM_SURFACES);
const odontogramConditionInput = z.enum(ODONTOGRAM_CONDITIONS);

// Naš TRPC router za odontogram
export const odontogramRouter = router({

    /** odontogram.get - dohvaća odontogram pacijenta **/
    get: protectedProcedure
        .input(z.object({ patientId: z.string().cuid() }))
        .query(async ({ ctx, input }) => {

            const patientDoc = await adminDb.collection("patients").doc(input.patientId).get();

            if (!patientDoc.exists || patientDoc.data()?.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Patient not found",
                });
            }

            const surfacesSnap = await adminDb.collection("odontogramSurfaces")
                .where("patientId", "==", input.patientId)
                .get();

            const surfaces = surfacesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            surfaces.sort((a: any, b: any) => {
                if (a.toothNumber !== b.toothNumber) return a.toothNumber - b.toothNumber;
                if (a.surface < b.surface) return -1;
                if (a.surface > b.surface) return 1;
                return 0;
            });
            return surfaces;
        }),

    /** odontogram.save - upsertuje stanje jedne povrsine zuba **/
    save: protectedProcedure
        .input(
            z.object({
                patientId: z.string().cuid(),
                toothNumber: z.number().int().min(11).max(48),
                surface: odontogramSurfaceInput,
                condition: odontogramConditionInput,
                notes: z
                    .string()
                    .nullish()
                    .transform((val) => val?.trim() || null)
                    .optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {

            const patientDoc = await adminDb.collection("patients").doc(input.patientId).get();

            if (!patientDoc.exists || patientDoc.data()?.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Patient not found",
                });
            }

            const surfacesRef = adminDb.collection("odontogramSurfaces");
            const query = await surfacesRef
                .where("patientId", "==", input.patientId)
                .where("toothNumber", "==", input.toothNumber)
                .where("surface", "==", input.surface)
                .limit(1)
                .get();

            const existingDoc = query.docs[0];

            // Ako je healthy i nema bilješki, brišemo zapis
            if (input.condition === "healthy" && !input.notes) {
                if (existingDoc) {
                    await existingDoc.ref.delete();
                }

                return {
                    patientId: input.patientId,
                    toothNumber: input.toothNumber,
                    surface: input.surface,
                    condition: "healthy",
                    notes: null,
                };
            }

            const payload = {
                organizationId: ctx.user.organizationId,
                patientId: input.patientId,
                toothNumber: input.toothNumber,
                surface: input.surface,
                condition: input.condition,
                notes: input.notes || null,
            };

            // Inače radimo upsert
            if (existingDoc) {
                await existingDoc.ref.update({
                    condition: input.condition,
                    notes: input.notes || null,
                });
            } else {
                await surfacesRef.add(payload);
            }
            
            return payload;
        }),
});