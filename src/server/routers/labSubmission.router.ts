import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminDb } from "~/lib/firebaseAdmin";
import { protectedProcedure, router, createModuleProcedure } from "../trpc";

const moduleProcedure = createModuleProcedure("lab");
export const labSubmissionRouter = router({
  list: moduleProcedure
    .input(
      z.object({
        type: z.enum(["send", "receive"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      let query = adminDb.collection("labSubmissions")
        .where("organizationId", "==", ctx.user.organizationId)
        .orderBy("createdAt", "desc");
      
      if (input?.type) {
        query = query.where("type", "==", input.type);
      }

      const snapshot = await query.get();
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Resolve relations manually
      return Promise.all(submissions.map(async (sub) => {
        let lab = null;
        if (sub.labId) {
          const labDoc = await adminDb.collection("labs").doc(sub.labId).get();
          if (labDoc.exists) {
            lab = { id: labDoc.id, ...labDoc.data() };
          }
        }
        let patient = null;
        if (sub.patientId) {
          const patientDoc = await adminDb.collection("patients").doc(sub.patientId).get();
          if (patientDoc.exists) {
            patient = { id: patientDoc.id, ...patientDoc.data() };
          }
        }
        return { ...sub, lab, patient };
      }));
    }),

  getById: moduleProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const doc = await adminDb.collection("labSubmissions").doc(input.id).get();
      
      if (!doc.exists) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }

      const data = doc.data()!;
      if (data.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }

      let lab = null;
      if (data.labId) {
        const labDoc = await adminDb.collection("labs").doc(data.labId).get();
        if (labDoc.exists) {
          lab = { id: labDoc.id, ...labDoc.data() };
        }
      }

      let patient = null;
      if (data.patientId) {
        const patientDoc = await adminDb.collection("patients").doc(data.patientId).get();
        if (patientDoc.exists) {
          patient = { id: patientDoc.id, ...patientDoc.data() };
        }
      }

      return { id: doc.id, ...data, lab, patient };
    }),

  create: moduleProcedure
    .input(
      z.object({
        type: z.string(),
        senderName: z.string().optional(),
        receiverName: z.string().optional(),
        photoUrl: z.string().optional(),
        photoUrls: z.any().optional(),
        deliveryPersonPhotoUrl: z.string().optional(),
        senderSelfieUrl: z.string().optional(),
        item: z.string(),
        subType: z.string().optional(),
        deliveryPerson: z.string().optional(),
        labId: z.string(),
        patientName: z.string(),
        patientId: z.string().optional(),
        appointmentStatus: z.string().optional(),
        appointmentDate: z.date().optional(),
        servicePrice: z.string().optional(),
        remarks: z.string().optional(),
        tat: z.string().optional(),
        linkedRecordId: z.string().optional(),
        documents: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        ...input,
        organizationId: ctx.user.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await adminDb.collection("labSubmissions").add(data);
      const submission = { id: docRef.id, ...data };

      let lab = null;
      if (data.labId) {
        const labDoc = await adminDb.collection("labs").doc(data.labId).get();
        if (labDoc.exists) {
          lab = { id: labDoc.id, ...labDoc.data() };
        }
      }

      let patient = null;
      if (data.patientId) {
        const patientDoc = await adminDb.collection("patients").doc(data.patientId).get();
        if (patientDoc.exists) {
          patient = { id: patientDoc.id, ...patientDoc.data() };
        }
      }

      return { success: true, submission: { ...submission, lab, patient } };
    }),

  update: moduleProcedure
    .input(
      z.object({
        id: z.string(),
        isReturned: z.boolean().optional(),
        approvalStatus: z.string().optional(),
        isAlertResolved: z.boolean().optional(),
        editLogs: z.any().optional(),
        // other fields can be added here if needed
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      
      const docRef = adminDb.collection("labSubmissions").doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists || docSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }

      await docRef.update({ ...data, updatedAt: new Date() });
      return { success: true };
    }),

  delete: moduleProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection("labSubmissions").doc(input.id);
      const docSnap = await docRef.get();

      if (docSnap.exists && docSnap.data()?.organizationId === ctx.user.organizationId) {
        await docRef.delete();
      }
      
      return { success: true };
    }),
});
