import { google } from "googleapis";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "~/lib/prisma";
import { router, protectedProcedure, masterOnlyProcedure } from "../trpc";

const appointmentStatusInput = z.enum([
    "SCHEDULED",
    "WAITING",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
]);
async function checkOverlap(params: {
    startTime: Date;
    endTime: Date;
    excludeId?: string;
    chairId?: string | null;
}) {
    return prisma.appointment.findFirst({
        where: {
            ...(params.excludeId && {
                id: { not: params.excludeId },
            }),
            ...(params.chairId && {
                chairId: params.chairId,
            }),
            status: { notIn: ["CANCELLED"] },
            AND: [
                { startTime: { lt: params.endTime } },
                { endTime: { gt: params.startTime } },
            ],
        },
    });
}

export const appointmentRouter = router({

    /**
     * appointment.create - kreira novi termin za pacijenta
     * Validacija uključuje provjeru da li je kraj termina nakon početka
     * i da li postoji sukob s drugim terminom.
     */
    create: protectedProcedure
        .input(
            z.object({
                patientId: z
                    .string()
                    .cuid("Please select a patient."),
                chairId: z.string().cuid("Please select a chair.").optional().nullable(),
                startTime: z.coerce.date(),
                endTime: z.coerce.date().optional(),
                reason: z.string().trim().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const startTime = input.startTime;

            const endTime =
                input.endTime ??
                new Date(startTime.getTime() + 30 * 60 * 1000);

            if (endTime <= startTime) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "End time must be after start time.",
                });
            }

            const conflictingAppointment = await checkOverlap({
                startTime,
                endTime,
                chairId: input.chairId,
            });

            if (conflictingAppointment) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message:
                        "The selected time slot is already booked for this chair. Please choose another time.",
                });
            }

            const appointment = await prisma.appointment.create({
                data: {
                    patientId: input.patientId,
                    chairId: input.chairId,
                    startTime,
                    endTime,
                    reason: input.reason ?? null,
                    status: "SCHEDULED",
                },
                include: {
                    patient: {
                        select: {
                            fullName: true,
                            
                            phone: true,
                        }
                    }
                }
            });

            // Sync to Google Calendar
            if (input.chairId) {
                const chair = await prisma.chair.findUnique({ where: { id: input.chairId } });
                if (chair && chair.googleSyncEnabled && chair.googleRefreshToken) {
                    try {
                        const oauth2Client = new google.auth.OAuth2(
                            process.env.GOOGLE_CALENDAR_CLIENT_ID,
                            process.env.GOOGLE_CALENDAR_CLIENT_SECRET
                        );
                        oauth2Client.setCredentials({ refresh_token: chair.googleRefreshToken });
                        const calendar = google.calendar({ version: "v3", auth: oauth2Client });
                        
                        const title = appointment.patient ? `Appointment: ${appointment.patient.fullName}` : "Patient Appointment";

                        await calendar.events.insert({
                            calendarId: chair.googleCalendarId || "primary",
                            requestBody: {
                                summary: title,
                                description: input.reason || "Scheduled via Align.io",
                                start: { dateTime: startTime.toISOString() },
                                end: { dateTime: endTime.toISOString() },
                            }
                        });
                        console.log("Successfully synced appointment to Google Calendar.");
                    } catch (error) {
                        console.error("Failed to sync to Google Calendar:", error);
                    }
                }
            }

            return appointment;
        }),

    /**
     * appointment.update - ažurira postojeći termin
     * Validacija uključuje provjeru da li je kraj termina nakon početka
     * i da li postoji sukob s drugim terminom (osim samog sebe).
     */
    update: protectedProcedure
        .input(
            z.object({
                id: z.string().cuid(),
                chairId: z.string().cuid().optional().nullable(),
                startTime: z.coerce.date().optional(),
                endTime: z.coerce.date().optional(),
                reason: z.string().trim().optional(),
                status: appointmentStatusInput.optional(),
            })
        )
        .mutation(async ({ input }) => {
            const existingAppointment =
                await prisma.appointment.findUnique({
                    where: { id: input.id },
                });

            if (!existingAppointment) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Appointment not found.",
                });
            }

            const updatedStartTime =
                input.startTime ?? existingAppointment.startTime;

            const updatedEndTime =
                input.endTime ?? existingAppointment.endTime;

            const updatedChairId = 
                input.chairId !== undefined ? input.chairId : existingAppointment.chairId;

            if (updatedEndTime <= updatedStartTime) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "End time must be after start time.",
                });
            }

            // FIX: prevent overlap on update (was missing)
            const conflict = await checkOverlap({
                startTime: updatedStartTime,
                endTime: updatedEndTime,
                excludeId: input.id,
                chairId: updatedChairId,
            });

            if (conflict) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "The appointment overlaps with another appointment on this chair.",
                });
            }

            return prisma.appointment.update({
                where: { id: input.id },
                data: {
                    ...input,
                    chairId: input.chairId,
                    startTime: input.startTime ?? undefined,
                    endTime: input.endTime ?? undefined,
                },
                include: {
                    patient: {
                        select: {
                            fullName: true,
                        },
                    },
                    chair: true,
                },
            });
        }),

    /**
     * appointment.getById - vraća kompletne podatke o terminu
     */
    getById: protectedProcedure
        .input(
            z.object({
                id: z.string().cuid(),
            })
        )
        .query(async ({ input }) => {
            const appointment =
                await prisma.appointment.findUnique({
                    where: {
                        id: input.id,
                    },
                    include: {
                        patient: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true,
                                email: true,
                            },
                        },
                        chair: true,
                        visitNotes: {
                            orderBy: {
                                createdAt: "desc",
                            },
                        },
                    },
                });

            if (!appointment) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Appointment not found.",
                });
            }

            return appointment;
        }),

    /**
     * appointment.list - vraća paginiranu listu termina
     */
    list: protectedProcedure
        .input(
            z.object({
                patientId: z.string().cuid().optional(),
                status: appointmentStatusInput.optional(),
                page: z.number().int().min(1).default(1),
                pageSize: z.number().int().min(1).max(100).default(20),
            })
        )
        .query(async ({ input }) => {
            const skip = (input.page - 1) * input.pageSize;

            const where = {
                ...(input.patientId && { patientId: input.patientId }),
                ...(input.status && { status: input.status }),
            };

            const [total, appointments] = await Promise.all([
                prisma.appointment.count({ where }),
                prisma.appointment.findMany({
                    where,
                    orderBy: {
                        startTime: "desc",
                    },
                    skip,
                    take: input.pageSize,
                    include: {
                        patient: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                        chair: true,
                    },
                }),
            ]);

            return {
                appointments,
                pagination: {
                    total,
                    page: input.page,
                    pageSize: input.pageSize,
                    totalPages: Math.ceil(total / input.pageSize),
                    hasNextPage:
                        input.page < Math.ceil(total / input.pageSize),
                    hasPreviousPage: input.page > 1,
                },
            };
        }),

    /**
     * appointment.getCalendarEvents - vraća termine za određeni dan ili sedmicu
     */
    getCalendarEvents: protectedProcedure
        .input(
            z.object({
                date: z.coerce.date(),
                view: z.enum(["day", "week"]).default("day"),
            })
        )
        .query(async ({ ctx, input }) => {
            const start = new Date(input.date);
            start.setHours(0, 0, 0, 0);

            const end = new Date(input.date);

            if (input.view === "week") {
                const day = start.getDay();
                const diff =
                    start.getDate() -
                    day +
                    (day === 0 ? -6 : 1);

                start.setDate(diff);
                end.setDate(diff + 6);
            }

            end.setHours(23, 59, 59, 999);

            // 1. Fetch Local Appointments
            const localAppointments = await ctx.db.appointment.findMany({
                where: {
                    startTime: {
                        gte: start,
                        lte: end,
                    },
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            fullName: true,
                            phone: true,
                        },
                    },
                    chair: true,
                },
                orderBy: {
                    startTime: "asc",
                },
            });

            // 2. Fetch Google Calendar Events for connected Chairs
            const chairs = await ctx.db.chair.findMany({
                where: { googleSyncEnabled: true, googleRefreshToken: { not: null } }
            });

            const googleEvents: any[] = [];

            for (const chair of chairs) {
                try {
                    const oauth2Client = new google.auth.OAuth2(
                        process.env.GOOGLE_CALENDAR_CLIENT_ID,
                        process.env.GOOGLE_CALENDAR_CLIENT_SECRET
                    );
                    oauth2Client.setCredentials({ refresh_token: chair.googleRefreshToken });
                    
                    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
                    
                    const res = await calendar.events.list({
                        calendarId: "primary",
                        timeMin: start.toISOString(),
                        timeMax: end.toISOString(),
                        singleEvents: true,
                        orderBy: "startTime",
                    });

                    const events = res.data.items || [];
                    console.log("Fetched Google Events for chair", chair.id, "Count:", events.length);
                    for (const ev of events) {
                        if (ev.start?.dateTime && ev.end?.dateTime) {
                            googleEvents.push({
                                id: `google-${ev.id}`,
                                patientId: "google-event",
                                chairId: chair.id,
                                startTime: new Date(ev.start.dateTime),
                                endTime: new Date(ev.end.dateTime),
                                status: "SCHEDULED",
                                reason: `(Google) ${ev.summary || "Busy"}`,
                                isGoogleEvent: true,
                                patient: {
                                    id: "google-event",
                                    fullName: `(Google) ${ev.summary || "Busy"}`,
                                    phone: ""
                                },
                                chair: chair
                            });
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch Google events for chair", chair.id, e.message);
                }
            }

            const combined = [...localAppointments, ...googleEvents].sort(
                (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );

            return combined;
        }),

    /**
     * appointment.checkAvailability - provjerava da li je termin slobodan
     */
    checkAvailability: protectedProcedure
        .input(
            z.object({
                startTime: z.coerce.date(),
                endTime: z.coerce.date().optional(),
                excludeId: z.string().cuid().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const startTime = input.startTime;

            const endTime =
                input.endTime ??
                new Date(startTime.getTime() + 30 * 60 * 1000);

            const conflict = await checkOverlap({
                startTime,
                endTime,
                excludeId: input.excludeId,
            });

            return {
                available: !conflict,
                conflictingAppointment: conflict ?? null,
            };
        }),

    /**
     * appointment.getDashboardStats - statistika za dashboard
     */
    getDashboardStats: protectedProcedure.query(async () => {
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const todayEnd = new Date(today);

        todayEnd.setHours(23, 59, 59, 999);

        const thisMonthStart = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

        const [
            statusCounts,
            todaysAppointments,
            newPatientsThisMonth,
        ] = await Promise.all([
            prisma.appointment.groupBy({
                by: ["status"],
                _count: {
                    status: true,
                },
            }),

            prisma.appointment.findMany({
                where: {
                    startTime: {
                        gte: today,
                        lte: todayEnd,
                    },
                    status: {
                        notIn: ["CANCELLED"],
                    },
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            fullName: true,
                        },
                    },
                },
                orderBy: {
                    startTime: "asc",
                },
            }),

            prisma.patient.count({
                where: {
                    createdAt: {
                        gte: thisMonthStart,
                    },
                },
            }),
        ]);

        const counts = Object.fromEntries(
            statusCounts.map((s) => [
                s.status,
                s._count.status,
            ])
        );

        return {
            statusCounts: {
                SCHEDULED:
                    counts.SCHEDULED ?? 0,

                WAITING:
                    counts.WAITING ?? 0,

                IN_PROGRESS:
                    counts.IN_PROGRESS ?? 0,

                COMPLETED:
                    counts.COMPLETED ?? 0,

                CANCELLED:
                    counts.CANCELLED ?? 0,
            },

            total: Object.values(counts).reduce(
                (a, b) => a + b,
                0
            ),

            todaysAppointments,
            newPatientsThisMonth,
        };
    }),

    /**
     * appointment.delete - brise termin
     */
    delete: masterOnlyProcedure
        .input(
            z.object({
                id: z.string().cuid(),
            })
        )
        .mutation(async ({ input }) => {
            const existing =
                await prisma.appointment.findUnique({
                    where: {
                        id: input.id,
                    },
                    select: {
                        id: true,
                    },
                });

            if (!existing) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Appointment not found.",
                });
            }

            await prisma.appointment.delete({
                where: {
                    id: input.id,
                },
            });

            return {
                success: true as const,
            };
        }),
});