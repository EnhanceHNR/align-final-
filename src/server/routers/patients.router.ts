import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "~/lib/prisma";
import { masterOnlyProcedure, protectedProcedure, router } from "../trpc";

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

/**
 * Input za kreiranje pacijenta.
 * Uključuje i anamnezne podatke — kreira se u jednoj operaciji.
 * dateOfBirth je string "dd.mm.gggg" — konvertuje se u Date prije upisa.
 */
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

// patientsRouter — svi endpointi vezani za pacijente
export const patientsRouter = router({

    /** patients.create
     *
     * Kreira pacijenta i njegovu anamnezu u jednoj operaciji.
     * Provjerava da JMB nije zauzet, jer je JMB jedinstven.
     * Datum rođenja se šalje kao string "dd.mm.gggg" i konvertuje se u Date.
     */
    create: protectedProcedure
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

            // Provjeri da pacijent sa istim JMB-om ne postoji
            const orgId = ctx.user.organizationId;
            const existing = await prisma.patient.findFirst({
                where: { jmb: patientData.jmb, organizationId: orgId },
                select: { id: true },
            });

            if (existing) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "A patient with this Patient ID already exists in the system.",
                });
            }

            const patient = await prisma.patient.create({
                data: {
                    ...patientData,
                    organizationId: orgId,
                    // Prazni string za email/notes konvertujemo u null za bazu
                    email: patientData.email || null,
                    notes: patientData.notes || null,
                    dateOfBirth: parseDateOfBirth(dateOfBirth),
                    anamnesis: {
                        create: {
                            allergiesFlag,
                            allergiesDetails,
                            anesthesiaHistoryFlag,
                            anesthesiaComplications,
                            medicationsFlag,
                            medicationsDetails,
                            previousDiseases,
                            currentDisease,
                        },
                    },
                },
                include: { anamnesis: true },
            });

            return { success: true as const, patient };
        }),

    /**
     * patients.getById
     *
     * Vraća kompletan profil pacijenta sa svim relacijama.
     * Koristi se na stranici profila pacijenta.
     */
    getById: protectedProcedure
        .input(z.object({ id: z.string().cuid() }))
        .query(async ({ input, ctx }) => {
            const patient = await prisma.patient.findFirst({
                where: { id: input.id, organizationId: ctx.user.organizationId },
                include: {
                    anamnesis:      true,
                    appointments:   { orderBy: { startTime: "desc" }, take: 10 },
                    treatments:     { orderBy: { treatmentDate: "desc" }, take: 10 },
                    treatmentPlans: {
                        orderBy: { createdAt: "desc" },
                        include: { items: true },
                    },
                    invoices: { orderBy: { createdAt: "desc" }, take: 5 },
                },
            });

            if (!patient) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Patient not found.",
                });
            }

            return patient;
        }),

    /** patients.list
     *
     * Vraća paginiranu listu pacijenata sa osnovnim informacijama.
     * Podržava pretragu po imenu, JMB-u i telefonu.
     * Podržava sortiranje po imenu, datumu rođenja i datumu kreiranja.
     */
    list: protectedProcedure
        .input(listPatientsInput)
        .query(async ({ input, ctx }) => {
            const { search, page, perPage, sortBy, sortDir } = input;
            const skip = (page - 1) * perPage;

            const baseWhere = { organizationId: ctx.user.organizationId };
            const where = search
                ? {
                    ...baseWhere,
                    OR: [
                        { fullName: { contains: search, mode: "insensitive" as const } },
                        { jmb:      { contains: search, mode: "insensitive" as const } },
                        { phone:    { contains: search, mode: "insensitive" as const } },
                    ],
                }
                : baseWhere;

            const [total, patients] = await Promise.all([
                prisma.patient.count({ where }),
                prisma.patient.findMany({
                    where,
                    orderBy: { [sortBy]: sortDir },
                    skip,
                    take: perPage,
                    select: {
                        id:          true,
                        fullName:    true,
                        dateOfBirth: true,
                        jmb:         true,
                        phone:       true,
                        email:       true,
                        sex:         true,
                        createdAt:   true,
                    },
                }),
            ]);

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

    /** patients.update
     *
     * Update pacijenta i anamneze u jednoj operaciji.
     * Podržava djelimični update — frontend šalje samo polja koja su promijenjena.
     * Ako se JMB mijenja, provjerava se da novi JMB nije zauzet drugim pacijentom.
     * Anamnezni podaci se upsertaju — kreiraju ako ne postoje, updateaju ako postoje.
     */
    update: protectedProcedure
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

            // Provjeri da pacijent postoji i dohvati trenutni JMB
            const existing = await prisma.patient.findFirst({
                where: { id, organizationId: ctx.user.organizationId },
                select: { id: true, jmb: true },
            });

            if (!existing) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Patient not found.",
                });
            }

            // Ako se JMB mijenja, provjeri da novi JMB nije zauzet drugim pacijentom
            if (jmb && jmb !== existing.jmb) {
                const jmbTaken = await prisma.patient.findFirst({
                    where: { jmb, organizationId: ctx.user.organizationId },
                    select: { id: true },
                });
                if (jmbTaken) {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "A patient with this Patient ID already exists in the system.",
                    });
                }
            }

            // Pripremi podatke za anamnezu — samo polja koja su prisutna
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

            const updated = await prisma.patient.update({
                where: { id },
                data: {
                    ...rest,
                    // Prazni string za email/notes konvertujemo u null za bazu
                    ...(rest.email !== undefined && { email: rest.email || null }),
                    ...(rest.notes !== undefined && { notes: rest.notes || null }),
                    ...(jmb         && { jmb }),
                    ...(dateOfBirth && { dateOfBirth: parseDateOfBirth(dateOfBirth) }),
                    ...(Object.keys(anamnesisData).length > 0 && {
                        anamnesis: {
                            upsert: {
                                create: { ...anamnesisData },
                                update: { ...anamnesisData },
                            },
                        },
                    }),
                },
                include: { anamnesis: true },
            });

            return { success: true as const, patient: updated };
        }),

    /** patients.delete
     *
     * Briše pacijenta i sve povezane podatke.
     * Samo MASTER korisnici imaju pravo brisanja pacijenata.
     */
    delete: masterOnlyProcedure
        .input(z.object({ id: z.string().cuid() }))
        .mutation(async ({ input, ctx }) => {
            const existing = await prisma.patient.findFirst({
                where: { id: input.id, organizationId: ctx.user.organizationId },
                select: { id: true },
            });

            if (!existing) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Patient not found.",
                });
            }

            await prisma.patient.delete({ where: { id: input.id } });

            return { success: true as const };
        }),

    /** patients.getNextPatientId
     * Fetch the next available patient ID number for a given prefix (e.g. 2025-E).
     */
    getNextPatientId: protectedProcedure
        .input(z.object({ prefix: z.string() }))
        .query(async ({ input, ctx }) => {
            const { prefix } = input;
            const prefixStr = prefix + "-";
            const patients = await prisma.patient.findMany({
                where: { jmb: { startsWith: prefixStr }, organizationId: ctx.user.organizationId },
                select: { jmb: true }
            });
            let maxNum = 0;
            for (const p of patients) {
                const parts = p.jmb.split('-');
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