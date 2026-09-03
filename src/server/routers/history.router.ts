import { router, protectedProcedure, createModuleProcedure } from "../trpc";

const moduleProcedure = createModuleProcedure("patients");
import { adminDb } from "@/lib/firebaseAdmin";

export const historyRouter = router({
    getGlobalHistory: moduleProcedure.query(async ({ ctx }) => {
        const organizationId = ctx.user.organizationId;
        
        const appointmentsSnapshot = await adminDb.collection("appointments")
            .where("organizationId", "==", organizationId)
            .where("status", "in", ["COMPLETED", "CANCELLED"])
            .orderBy("startTime", "desc")
            .limit(100)
            .get();

        const treatmentsSnapshot = await adminDb.collection("treatments")
            .where("organizationId", "==", organizationId)
            .where("status", "in", ["COMPLETED", "INVOICED"])
            .orderBy("createdAt", "desc")
            .limit(100)
            .get();

        const appointmentsDocs = appointmentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const treatmentsDocs = treatmentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const appointments = await Promise.all(
            appointmentsDocs.map(async (appointment: any) => {
                if (!appointment.patientId) return { ...appointment, patient: null };
                const patientDoc = await adminDb.collection("patients").doc(appointment.patientId).get();
                const patientData = patientDoc.exists ? patientDoc.data() : null;
                return {
                    ...appointment,
                    patient: patientData ? { id: patientDoc.id, fullName: patientData.fullName } : null
                };
            })
        );

        const treatments = await Promise.all(
            treatmentsDocs.map(async (treatment: any) => {
                if (!treatment.patientId) return { ...treatment, patient: null };
                const patientDoc = await adminDb.collection("patients").doc(treatment.patientId).get();
                const patientData = patientDoc.exists ? patientDoc.data() : null;
                return {
                    ...treatment,
                    patient: patientData ? { id: patientDoc.id, fullName: patientData.fullName } : null
                };
            })
        );

        return { appointments, treatments };
    })
});
