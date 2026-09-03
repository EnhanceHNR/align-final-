import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminDb } from "~/lib/firebaseAdmin";
import { protectedProcedure, router, createModuleProcedure } from "../trpc";

const moduleProcedure = createModuleProcedure("lab");
export const labTransactionRouter = router({
  list: moduleProcedure
    .input(z.object({ labId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let query = adminDb.collection("labTransactions")
        .where("organizationId", "==", ctx.user.organizationId)
        .orderBy("createdAt", "desc");
      
      if (input?.labId) {
        query = query.where("labId", "==", input.labId);
      }

      const snapshot = await query.get();
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return Promise.all(transactions.map(async (txn) => {
        let lab = null;
        if (txn.labId) {
          const labDoc = await adminDb.collection("labs").doc(txn.labId).get();
          if (labDoc.exists) {
            lab = { id: labDoc.id, ...labDoc.data() };
          }
        }
        return { ...txn, lab };
      }));
    }),

  create: moduleProcedure
    .input(
      z.object({
        labId: z.string(),
        amount: z.number(),
        type: z.string(),
        description: z.string(),
        photoUrl: z.string().optional(),
        submissionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        ...input,
        organizationId: ctx.user.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await adminDb.collection("labTransactions").add(data);
      const transaction = { id: docRef.id, ...data };

      let lab = null;
      if (data.labId) {
        const labDoc = await adminDb.collection("labs").doc(data.labId).get();
        if (labDoc.exists) {
          lab = { id: labDoc.id, ...labDoc.data() };
        }
      }

      return { success: true, transaction: { ...transaction, lab } };
    }),

  delete: moduleProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const docRef = adminDb.collection("labTransactions").doc(input.id);
      const docSnap = await docRef.get();

      if (docSnap.exists && docSnap.data()?.organizationId === ctx.user.organizationId) {
        await docRef.delete();
      }

      return { success: true };
    }),
});
