import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { masterOnlyProcedure, protectedProcedure, router, createModuleProcedure } from "../trpc";

const moduleProcedure = createModuleProcedure("patients");
import { adminDb } from "@/lib/firebaseAdmin";

function parseDateOfBirth(dob: string): Date {
    const [day, month, year] = dob.split(/[.\-\/]/).map(Number);
    const date = new Date(year!, month! - 1, day!);
    if (isNaN(date.getTime())) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid date of birth format.",
        });
    }
    return date;
}

const anamnesisFields = z.object({
    allergiesFlag:           z.boolean().default(false),
    allergiesDetails:        z.string().trim().optional(),
    anesthesiaHistoryFlag:   z.boolean().default(false),
    anesthesiaComplications: z.string().trim().optional(),
    medicationsFlag:         z.boolean().default(false),
    medicationsDetails:      z.string().trim().optional(),
    previousDiseases:        z.string().trim().optional(),
    currentDisease:          z.string().trim().optional(),
});

const createPatientInput = z
    .object({
        fullName:         z.string().min(2).trim(),
        email:            z.string().email().optional().or(z.literal("")),
        dateOfBirth:      z.string().min(8),
        jmb:              z.string().min(3),
        sex:              z.enum(["M", "F"]).optional(),
        address:          z.string().trim().optional(),
        phone:            z.string().trim().optional(),
        employmentStatus: z.string().trim().optional(),
        occupation:       z.string().trim().optional(),
        notes:            z.string().optional(),
    })
    .merge(anamnesisFields);

const updatePatientInput = createPatientInput.partial().extend({
    id: z.string().cuid(),
});

const listPatientsInput = z.object({
    search:  z.string().trim().optional(),
    page:    z.number().int().min(1).default(1),
    perPage: z.number().int().min(1).max(100).default(20),
    sortBy:  z.enum(["fullName", "createdAt", "dateOfBirth"]).default("fullName"),
    sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export const patientsRouter = router({

    create: moduleProcedure
        .input(createPatientInput)
        .mutation(async ({ input, ctx }) => {
            const {
                allergiesFlag, allergiesDetails,
                anesthesiaHistoryFlag, anesthesiaComplications,
                medicationsFlag, medicationsDetails,
                previousDiseases, currentDisease,
                dateOfBirth,
                ...patientData
            } = input;

            const orgId = ctx.user.organizationId;
            const existingQuery = await adminDb.collection("patients")
                .where("jmb", "==", patientData.jmb)
                .where("organizationId", "==", orgId)
                .limit(1)
                .get();

            if (!existingQuery.empty) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "A patient with this Patient ID already exists in the system.",
                });
            }

            const parsedDob = parseDateOfBirth(dateOfBirth);
            const newPatientRef = await adminDb.collection("patients").add({
                ...patientData,
                organizationId: orgId,
                email: patientData.email || null,
                notes: patientData.notes || null,
                dateOfBirth: parsedDob,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const anamnesisData = {
                patientId: newPatientRef.id,
                organizationId: orgId,
                allergiesFlag,
                allergiesDetails: allergiesDetails || null,
                anesthesiaHistoryFlag,
                anesthesiaComplications: anesthesiaComplications || null,
                medicationsFlag,
                medicationsDetails: medicationsDetails || null,
                previousDiseases: previousDiseases || null,
                currentDisease: currentDisease || null,
            };
            
            await adminDb.collection("anamneses").add(anamnesisData);

            return { success: true as const, patient: { id: newPatientRef.id, ...patientData, dateOfBirth: parsedDob, anamnesis: anamnesisData } };
        }),

    getById: moduleProcedure
        .input(z.object({ id: z.string().cuid() }))
        .query(async ({ input, ctx }) => {
            const patientDoc = await adminDb.collection("patients").doc(input.id).get();
            if (!patientDoc.exists || patientDoc.data()?.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Patient not found.",
                });
            }

            const patientData = patientDoc.data();

            const [anamnesisSnap, appointmentsSnap, treatmentsSnap, treatmentPlansSnap, invoicesSnap] = await Promise.all([
                adminDb.collection("anamneses").where("patientId", "==", input.id).limit(1).get(),
                adminDb.collection("appointments").where("patientId", "==", input.id).get(),
                adminDb.collection("treatments").where("patientId", "==", input.id).get(),
                adminDb.collection("treatmentPlans").where("patientId", "==", input.id).get(),
                adminDb.collection("invoices").where("patientId", "==", input.id).get(),
            ]);

            const anamnesis = !anamnesisSnap.empty ? { id: anamnesisSnap.docs[0].id, ...anamnesisSnap.docs[0].data() } : null;
            
            const sortAndTake = (docs: any[], sortField: string, take: number) => {
                const res = docs.map(d => ({ id: d.id, ...d.data() }));
                res.sort((a: any, b: any) => (b[sortField]?.toMillis?.() || 0) - (a[sortField]?.toMillis?.() || 0));
                return res.slice(0, take);
            };

            const appointments = sortAndTake(appointmentsSnap.docs, "startTime", 10);
            const treatments = sortAndTake(treatmentsSnap.docs, "treatmentDate", 10);
            const treatmentPlans = sortAndTake(treatmentPlansSnap.docs, "createdAt", 100);
            const invoices = sortAndTake(invoicesSnap.docs, "createdAt", 5);

            // Mock nested items for treatment plans as parallel fetch for each can be done here if needed
            // For brevity, not fetching treatmentPlan items deeply unless requested

            return {
                id: patientDoc.id,
                ...patientData,
                anamnesis,
                appointments,
                treatments,
                treatmentPlans,
                invoices,
            };
        }),

    list: moduleProcedure
        .input(listPatientsInput)
        .query(async ({ input, ctx }) => {
            const { search, page, perPage, sortBy, sortDir } = input;
            const skip = (page - 1) * perPage;

            const baseQuery = adminDb.collection("patients").where("organizationId", "==", ctx.user.organizationId);

            let total = 0;
            let patients = [];

            if (search) {
                const allDocsSnap = await baseQuery.get();
                const allPatients = allDocsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
                const s = search.toLowerCase();
                
                let filtered = allPatients.filter(p => 
                    (p.fullName && p.fullName.toLowerCase().includes(s)) ||
                    (p.jmb && p.jmb.toLowerCase().includes(s)) ||
                    (p.phone && p.phone.toLowerCase().includes(s))
                );
                
                total = filtered.length;
                
                filtered.sort((a, b) => {
                    let valA = a[sortBy];
                    let valB = b[sortBy];
                    if (valA < valB) return sortDir === "asc" ? -1 : 1;
                    if (valA > valB) return sortDir === "asc" ? 1 : -1;
                    return 0;
                });
                
                patients = filtered.slice(skip, skip + perPage).map(p => ({
                    id: p.id,
                    fullName: p.fullName,
                    dateOfBirth: p.dateOfBirth,
                    jmb: p.jmb,
                    phone: p.phone,
                    email: p.email,
                    sex: p.sex,
                    createdAt: p.createdAt,
                }));
            } else {
                const countSnap = await baseQuery.count().get();
                total = countSnap.data().count;

                const snapshot = await baseQuery
                    .orderBy(sortBy, sortDir)
                    .offset(skip)
                    .limit(perPage)
                    .get();

                patients = snapshot.docs.map(d => {
                    const p = d.data() as any;
                    return {
                        id: d.id,
                        fullName: p.fullName,
                        dateOfBirth: p.dateOfBirth,
                        jmb: p.jmb,
                        phone: p.phone,
                        email: p.email,
                        sex: p.sex,
                        createdAt: p.createdAt,
                    };
                });
            }

            return {
                patients,
                pagination: {
                    total,
                    page,
                    perPage,
                    totalPages: Math.ceil(total / perPage),
                    hasNext: page < Math.ceil(total / perPage),
                    hasPrev: page > 1,
                },
            };
        }),

    update: moduleProcedure
        .input(updatePatientInput)
        .mutation(async ({ input, ctx }) => {
            const {
                id,
                allergiesFlag, allergiesDetails,
                anesthesiaHistoryFlag, anesthesiaComplications,
                medicationsFlag, medicationsDetails,
                previousDiseases, currentDisease,
                dateOfBirth,
                jmb,
                ...rest
            } = input;

            const existingDoc = await adminDb.collection("patients").doc(id).get();
            if (!existingDoc.exists || existingDoc.data()?.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Patient not found.",
                });
            }
            const existingData = existingDoc.data();

            if (jmb && jmb !== existingData?.jmb) {
                const jmbTaken = await adminDb.collection("patients")
                    .where("jmb", "==", jmb)
                    .where("organizationId", "==", ctx.user.organizationId)
                    .limit(1)
                    .get();
                if (!jmbTaken.empty) {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "A patient with this Patient ID already exists in the system.",
                    });
                }
            }

            const updateData: any = {
                ...rest,
                updatedAt: new Date()
            };
            if (rest.email !== undefined) updateData.email = rest.email || null;
            if (rest.notes !== undefined) updateData.notes = rest.notes || null;
            if (jmb) updateData.jmb = jmb;
            if (dateOfBirth) updateData.dateOfBirth = parseDateOfBirth(dateOfBirth);

            await adminDb.collection("patients").doc(id).update(updateData);

            const anamnesisData = {
                ...(allergiesFlag           !== undefined && { allergiesFlag }),
                ...(allergiesDetails        !== undefined && { allergiesDetails }),
                ...(anesthesiaHistoryFlag   !== undefined && { anesthesiaHistoryFlag }),
                ...(anesthesiaComplications !== undefined && { anesthesiaComplications }),
                ...(medicationsFlag         !== undefined && { medicationsFlag }),
                ...(medicationsDetails      !== undefined && { medicationsDetails }),
                ...(previousDiseases        !== undefined && { previousDiseases }),
                ...(currentDisease          !== undefined && { currentDisease }),
            };

            if (Object.keys(anamnesisData).length > 0) {
                const anamnesisSnap = await adminDb.collection("anamneses").where("patientId", "==", id).limit(1).get();
                if (!anamnesisSnap.empty) {
                    await anamnesisSnap.docs[0].ref.update(anamnesisData);
                } else {
                    await adminDb.collection("anamneses").add({
                        patientId: id,
                        organizationId: ctx.user.organizationId,
                        ...anamnesisData
                    });
                }
            }

            return { success: true as const, patient: { id, ...existingData, ...updateData } };
        }),

    delete: masterOnlyProcedure
        .input(z.object({ id: z.string().cuid() }))
        .mutation(async ({ input, ctx }) => {
            const existingDoc = await adminDb.collection("patients").doc(input.id).get();
            if (!existingDoc.exists || existingDoc.data()?.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Patient not found.",
                });
            }

            await adminDb.collection("patients").doc(input.id).delete();

            return { success: true as const };
        }),

    getNextPatientId: moduleProcedure
        .input(z.object({ prefix: z.string() }))
        .query(async ({ input, ctx }) => {
            const { prefix } = input;
            // Searching prefix in firestore can be tricky, typically use >= and < boundaries
            const prefixStr = prefix + "-";
            const endStr = prefix + "-\uf8ff";
            
            const snap = await adminDb.collection("patients")
                .where("organizationId", "==", ctx.user.organizationId)
                .where("jmb", ">=", prefixStr)
                .where("jmb", "<", endStr)
                .get();
                
            let maxNum = 0;
            for (const doc of snap.docs) {
                const jmb = doc.data().jmb as string;
                const parts = jmb.split('-');
                if (parts.length === 3) {
                    const num = parseInt(parts[2], 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            }
            return { nextNum: String(maxNum + 1).padStart(4, '0') };
        }),
});