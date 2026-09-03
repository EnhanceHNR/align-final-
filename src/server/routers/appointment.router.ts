import { google } from "googleapis";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { router, protectedProcedure, masterOnlyProcedure, createModuleProcedure } from "../trpc";

const moduleProcedure = createModuleProcedure("patients");
const appointmentStatusInput = z.enum([
    "SCHEDULED",
    "WAITING",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
]);

async function checkOverlap(params: {
    organizationId: string;
    startTime: Date;
    endTime: Date;
    excludeId?: string;
    chairId?: string | null;
}) {
    let query: any = adminDb.collection("appointments").where("organizationId", "==", params.organizationId);
    if (params.chairId) {
        query = query.where("chairId", "==", params.chairId);
    }
    
    const snapshot = await query.get();
    for (const doc of snapshot.docs) {
        if (params.excludeId && doc.id === params.excludeId) continue;
        const data = doc.data();
        if (data.status === "CANCELLED") continue;
        
        const apptStart = data.startTime.toDate ? data.startTime.toDate() : new Date(data.startTime);
        const apptEnd = data.endTime.toDate ? data.endTime.toDate() : new Date(data.endTime);
        
        if (apptStart < params.endTime && apptEnd > params.startTime) {
            return { id: doc.id, ...data };
        }
    }
    return null;
}

export const appointmentRouter = router({
    create: moduleProcedure
        .input(
            z.object({
                patientId: z.string().min(1, "Please select a patient."),
                chairId: z.string().min(1, "Please select a chair.").optional().nullable(),
                startTime: z.coerce.date(),
                endTime: z.coerce.date().optional(),
                reason: z.string().trim().optional(),
                doctorId: z.string().optional().nullable(),
                procedureId: z.string().optional().nullable(),
                teeth: z.string().optional().nullable(),
                cancelReason: z.string().optional().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const startTime = input.startTime;
            const endTime = input.endTime ?? new Date(startTime.getTime() + 30 * 60 * 1000);

            if (endTime <= startTime) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "End time must be after start time." });
            }

            const conflictingAppointment = await checkOverlap({
                organizationId: ctx.user.organizationId,
                startTime,
                endTime,
                chairId: input.chairId,
            });

            if (conflictingAppointment) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "The selected time slot is already booked for this chair. Please choose another time.",
                });
            }

            const dataToSave = {
                organizationId: ctx.user.organizationId,
                patientId: input.patientId,
                chairId: input.chairId ?? null,
                startTime,
                endTime,
                reason: input.reason ?? null,
                status: "SCHEDULED",
                doctorId: input.doctorId ?? null,
                procedureId: input.procedureId ?? null,
                teeth: input.teeth ?? null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const docRef = await adminDb.collection("appointments").add(dataToSave);
            
            let patientData = null;
            if (input.patientId) {
                const pDoc = await adminDb.collection("patients").doc(input.patientId).get();
                if (pDoc.exists) {
                    const pd = pDoc.data()!;
                    patientData = { fullName: pd.fullName, phone: pd.phone };
                }
            }

            const appointment = { id: docRef.id, ...dataToSave, patient: patientData };

            if (input.chairId) {
                const chairDoc = await adminDb.collection("chairs").doc(input.chairId).get();
                if (chairDoc.exists) {
                    const chair = chairDoc.data()!;
                    if (chair.googleSyncEnabled && chair.googleRefreshToken) {
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
            }

            return appointment;
        }),

    update: moduleProcedure
        .input(
            z.object({
                id: z.string().min(1),
                chairId: z.string().min(1).optional().nullable(),
                startTime: z.coerce.date().optional(),
                endTime: z.coerce.date().optional(),
                reason: z.string().trim().optional(),
                doctorId: z.string().optional().nullable(),
                procedureId: z.string().optional().nullable(),
                teeth: z.string().optional().nullable(),
                cancelReason: z.string().optional().nullable(),
                status: appointmentStatusInput.optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const existingDoc = await adminDb.collection("appointments").doc(input.id).get();
            if (!existingDoc.exists) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found." });
            }
            const existingAppointment = existingDoc.data()!;
            if (existingAppointment.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
            }

            const updatedStartTime = input.startTime ?? (existingAppointment.startTime.toDate ? existingAppointment.startTime.toDate() : new Date(existingAppointment.startTime));
            const updatedEndTime = input.endTime ?? (existingAppointment.endTime.toDate ? existingAppointment.endTime.toDate() : new Date(existingAppointment.endTime));
            const updatedChairId = input.chairId !== undefined ? input.chairId : existingAppointment.chairId;

            if (updatedEndTime <= updatedStartTime) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "End time must be after start time." });
            }

            const conflict = await checkOverlap({
                organizationId: ctx.user.organizationId,
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

            const updateData: any = { updatedAt: new Date() };
            if (input.chairId !== undefined) updateData.chairId = input.chairId;
            if (input.startTime !== undefined) updateData.startTime = input.startTime;
            if (input.endTime !== undefined) updateData.endTime = input.endTime;
            if (input.reason !== undefined) updateData.reason = input.reason;
            if (input.doctorId !== undefined) updateData.doctorId = input.doctorId;
            if (input.procedureId !== undefined) updateData.procedureId = input.procedureId;
            if (input.teeth !== undefined) updateData.teeth = input.teeth;
            if (input.cancelReason !== undefined) updateData.cancelReason = input.cancelReason;
            if (input.status !== undefined) updateData.status = input.status;

            await adminDb.collection("appointments").doc(input.id).update(updateData);
            
            const updatedDoc = await adminDb.collection("appointments").doc(input.id).get();
            const apptData = updatedDoc.data()!;

            let patientData = null;
            if (apptData.patientId) {
                const pDoc = await adminDb.collection("patients").doc(apptData.patientId).get();
                if (pDoc.exists) patientData = { fullName: pDoc.data()!.fullName };
            }
            let chairData = null;
            if (apptData.chairId) {
                const cDoc = await adminDb.collection("chairs").doc(apptData.chairId).get();
                if (cDoc.exists) chairData = { id: cDoc.id, ...cDoc.data() };
            }

            return { id: updatedDoc.id, ...apptData, patient: patientData, chair: chairData };
        }),

    getById: moduleProcedure
        .input(z.object({ id: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const docRef = await adminDb.collection("appointments").doc(input.id).get();
            if (!docRef.exists) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found." });
            }
            const data = docRef.data()!;
            if (data.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
            }

            const [patientDoc, chairDoc, visitNotesSnap] = await Promise.all([
                data.patientId ? adminDb.collection("patients").doc(data.patientId).get() : Promise.resolve(null),
                data.chairId ? adminDb.collection("chairs").doc(data.chairId).get() : Promise.resolve(null),
                adminDb.collection("visitNotes").where("appointmentId", "==", input.id).get()
            ]);

            const patient = patientDoc?.exists ? { id: patientDoc.id, fullName: patientDoc.data()!.fullName, phone: patientDoc.data()!.phone, email: patientDoc.data()!.email } : null;
            const chair = chairDoc?.exists ? { id: chairDoc.id, ...chairDoc.data() } : null;
            
            const visitNotes = visitNotesSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => {
                    const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                    const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                    return dB.getTime() - dA.getTime();
                });

            return {
                id: docRef.id,
                ...data,
                patient,
                chair,
                visitNotes
            };
        }),

    list: moduleProcedure
        .input(
            z.object({
                patientId: z.string().optional(),
                status: appointmentStatusInput.optional(),
                page: z.number().int().min(1).default(1),
                pageSize: z.number().int().min(1).max(100).default(20),
            })
        )
        .query(async ({ ctx, input }) => {
            const skip = (input.page - 1) * input.pageSize;

            let query: any = adminDb.collection("appointments").where("organizationId", "==", ctx.user.organizationId);
            if (input.patientId) {
                query = query.where("patientId", "==", input.patientId);
            }
            if (input.status) {
                query = query.where("status", "==", input.status);
            }

            const [countSnap, snapshot] = await Promise.all([
                query.count().get(),
                query.get()
            ]);

            const total = countSnap.data().count;
            
            const sortedDocs = snapshot.docs.sort((a, b) => {
                const aTime = a.data().startTime?.toDate ? a.data().startTime.toDate().getTime() : new Date(a.data().startTime).getTime();
                const bTime = b.data().startTime?.toDate ? b.data().startTime.toDate().getTime() : new Date(b.data().startTime).getTime();
                return bTime - aTime;
            });
            const paginatedDocs = sortedDocs.slice(skip, skip + input.pageSize);

            const appointments = await Promise.all(paginatedDocs.map(async (doc: any) => {
                const data = doc.data();
                
                let patientData = null;
                if (data.patientId) {
                    const pDoc = await adminDb.collection("patients").doc(data.patientId).get();
                    if (pDoc.exists) {
                        patientData = { id: pDoc.id, fullName: pDoc.data()!.fullName };
                    }
                }

                let chairData = null;
                if (data.chairId) {
                    const cDoc = await adminDb.collection("chairs").doc(data.chairId).get();
                    if (cDoc.exists) chairData = { id: cDoc.id, ...cDoc.data() };
                }

                return {
                    id: doc.id,
                    ...data,
                    startTime: data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime),
                    endTime: data.endTime?.toDate ? data.endTime.toDate() : new Date(data.endTime),
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
                    patient: patientData,
                    chair: chairData
                };
            }));

            return {
                appointments,
                pagination: {
                    total,
                    page: input.page,
                    pageSize: input.pageSize,
                    totalPages: Math.ceil(total / input.pageSize),
                    hasNextPage: input.page < Math.ceil(total / input.pageSize),
                    hasPreviousPage: input.page > 1,
                },
            };
        }),

    getCalendarEvents: moduleProcedure
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
                const diff = start.getDate() - day + (day === 0 ? -6 : 1);
                start.setDate(diff);
                end.setDate(diff + 6);
            }
            end.setHours(23, 59, 59, 999);

            const appointmentsQuery = adminDb.collection("appointments")
                .where("organizationId", "==", ctx.user.organizationId)
                .where("startTime", ">=", start)
                .where("startTime", "<=", end);
            
            const [appointmentsSnap, chairsSnap] = await Promise.all([
                appointmentsQuery.get(),
                adminDb.collection("chairs")
                    .where("organizationId", "==", ctx.user.organizationId)
                    .where("googleSyncEnabled", "==", true)
                    .get()
            ]);

            const localAppointments = await Promise.all(appointmentsSnap.docs.map(async (doc: any) => {
                const data = doc.data();
                let patientData = null;
                if (data.patientId) {
                    const pDoc = await adminDb.collection("patients").doc(data.patientId).get();
                    if (pDoc.exists) {
                        const pd = pDoc.data()!;
                        patientData = { id: pDoc.id, fullName: pd.fullName, phone: pd.phone };
                    }
                }

                let chairData = null;
                if (data.chairId) {
                    const cDoc = await adminDb.collection("chairs").doc(data.chairId).get();
                    if (cDoc.exists) chairData = { id: cDoc.id, ...cDoc.data() };
                }
                
                return {
                    id: doc.id,
                    ...data,
                    startTime: data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime),
                    endTime: data.endTime?.toDate ? data.endTime.toDate() : new Date(data.endTime),
                    patient: patientData,
                    chair: chairData
                };
            }));

            localAppointments.sort((a: any, b: any) => a.startTime.getTime() - b.startTime.getTime());

            const chairs = chairsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            const googleEvents: any[] = [];

            for (const chair of chairs) {
                if (chair.googleRefreshToken) {
                    try {
                        const oauth2Client = new google.auth.OAuth2(
                            process.env.GOOGLE_CALENDAR_CLIENT_ID,
                            process.env.GOOGLE_CALENDAR_CLIENT_SECRET
                        );
                        oauth2Client.setCredentials({ refresh_token: chair.googleRefreshToken as string });
                        
                        const calendar = google.calendar({ version: "v3", auth: oauth2Client });
                        
                        const res = await calendar.events.list({
                            calendarId: "primary",
                            timeMin: start.toISOString(),
                            timeMax: end.toISOString(),
                            singleEvents: true,
                            orderBy: "startTime",
                        });

                        const events = res.data.items || [];
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
                    } catch (e: any) {
                        console.error("Failed to fetch Google events for chair", chair.id, e.message);
                    }
                }
            }

            const combined = [...localAppointments, ...googleEvents].sort(
                (a: any, b: any) => a.startTime.getTime() - b.startTime.getTime()
            );

            return combined;
        }),

    checkAvailability: moduleProcedure
        .input(
            z.object({
                startTime: z.coerce.date(),
                endTime: z.coerce.date().optional(),
                excludeId: z.string().min(1).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const startTime = input.startTime;
            const endTime = input.endTime ?? new Date(startTime.getTime() + 30 * 60 * 1000);

            const conflict = await checkOverlap({
                organizationId: ctx.user.organizationId,
                startTime,
                endTime,
                excludeId: input.excludeId,
            });

            return {
                available: !conflict,
                conflictingAppointment: conflict ?? null,
            };
        }),

    getDashboardStats: moduleProcedure.query(async ({ ctx }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const appointmentsSnap = await adminDb.collection("appointments")
            .where("organizationId", "==", ctx.user.organizationId)
            .get();

        const allAppointments = appointmentsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

        const counts = {
            SCHEDULED: 0,
            WAITING: 0,
            IN_PROGRESS: 0,
            COMPLETED: 0,
            CANCELLED: 0
        };

        const todaysAppointments: any[] = [];
        
        for (const appt of allAppointments) {
            if (appt.status in counts) {
                (counts as any)[appt.status]++;
            }

            if (appt.status !== "CANCELLED") {
                const sTime = appt.startTime?.toDate ? appt.startTime.toDate() : new Date(appt.startTime);
                if (sTime >= today && sTime <= todayEnd) {
                    todaysAppointments.push({
                        ...appt,
                        id: appt.id,
                        startTime: sTime,
                        endTime: appt.endTime?.toDate ? appt.endTime.toDate() : new Date(appt.endTime)
                    });
                }
            }
        }
        
        todaysAppointments.sort((a: any, b: any) => a.startTime.getTime() - b.startTime.getTime());

        for (const appt of todaysAppointments) {
            if (appt.patientId) {
                const pDoc = await adminDb.collection("patients").doc(appt.patientId).get();
                if (pDoc.exists) {
                    appt.patient = { id: pDoc.id, fullName: pDoc.data()!.fullName };
                }
            }
        }

        const newPatientsCountSnap = await adminDb.collection("patients")
            .where("organizationId", "==", ctx.user.organizationId)
            .where("createdAt", ">=", thisMonthStart)
            .count()
            .get();

        return {
            statusCounts: counts,
            total: Object.values(counts).reduce((a, b) => a + b, 0),
            todaysAppointments,
            newPatientsThisMonth: newPatientsCountSnap.data().count,
        };
    }),

    delete: masterOnlyProcedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const docRef = adminDb.collection("appointments").doc(input.id);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found." });
            }

            if (docSnap.data()?.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
            }

            await docRef.delete();
            return { success: true as const };
        }),
});