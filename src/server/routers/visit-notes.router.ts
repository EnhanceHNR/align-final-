
import { z } from "zod";
import { prisma } from "~/lib/prisma";
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
            return prisma.visitNote.create({
                data: {
                    content: input.content,
                    patientId: input.patientId,
                    appointmentId: input.appointmentId,
                    userId: ctx.user.id,
                },
            });
        }),


getByPatientId: protectedProcedure
    .input(
        z.object({
            patientId: z.string().cuid(),
        })
    )
    .query(async ({ input }) => {
        return prisma.visitNote.findMany({
            where: {
                organizationId: ctx.user.organizationId,
                patientId: input.patientId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }),

delete: protectedProcedure
    .input(
        z.object({
            id: z.string().cuid(),
        })
    )
    .mutation(async ({ input }) => {
        return prisma.visitNote.delete({
            where: {
                id: input.id,
            },
        });
    }),



});

