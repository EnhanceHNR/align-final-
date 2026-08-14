import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "~/lib/prisma";
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
        .query(async ({ input }) => {

            const patient = await prisma.patient.findUnique({
                where: { id: input.patientId },
                select: { id: true },
            });

            if (!patient) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Patient not found",
                });
            }

            return await prisma.odontogramSurface.findMany({
                where: { patientId: input.patientId },
                orderBy: [
                    { toothNumber: "asc" },
                    { surface: "asc" },
                ],
            });
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
        .mutation(async ({ input }) => {

            const patient = await prisma.patient.findUnique({
                where: { id: input.patientId },
                select: { id: true },
            });

            if (!patient) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Patient not found",
                });
            }

            const where = {
                patientId_toothNumber_surface: {
                    patientId: input.patientId,
                    toothNumber: input.toothNumber,
                    surface: input.surface,
                },
            };

            // Ako je healthy i nema bilješki, brišemo zapis
            if (input.condition === "healthy" && !input.notes) {

                const existing =
                    await prisma.odontogramSurface.findUnique({
                        where,
                    });

                if (existing) {
                    await prisma.odontogramSurface.delete({
                        where,
                    });
                }

                return {
                    patientId: input.patientId,
                    toothNumber: input.toothNumber,
                    surface: input.surface,
                    condition: "healthy",
                    notes: null,
                };
            }

            // Inače radimo upsert
            return await prisma.odontogramSurface.upsert({
                where,

                update: {
                    condition: input.condition,
                    notes: input.notes,
                },

                create: {
                    patientId: input.patientId,
                    toothNumber: input.toothNumber,
                    surface: input.surface,
                    condition: input.condition,
                    notes: input.notes,
                },
            });
        }),
});