import { adminDb } from './firebaseAdmin';
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

async function getOrgId() {
    try {
        const req = {
            cookies: Object.fromEntries(cookies().getAll().map(c => [c.name, c.value])),
            headers: { cookie: cookies().getAll().map(c => `${c.name}=${c.value}`).join('; ') }
        };
        const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET || "", cookieName: "align_token" });
        return (token as any)?.organizationId || null;
    } catch (e) {
        return null;
    }
}

export const db = {
    collection: async (collectionName: string) => {
        const orgId = await getOrgId();
        const ref = adminDb.collection(collectionName);
        
        return {
            ref,
            // Automatically scope queries to the organization
            findMany: async (whereConditions: { field: string, operator: FirebaseFirestore.WhereFilterOp, value: any }[] = []) => {
                let query: FirebaseFirestore.Query = ref.where('organizationId', '==', orgId || 'UNAUTHORIZED_ACCESS');
                for (const cond of whereConditions) {
                    query = query.where(cond.field, cond.operator, cond.value);
                }
                const snapshot = await query.get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            },
            findUnique: async (id: string) => {
                const doc = await ref.doc(id).get();
                const data = doc.data();
                if (!data || data.organizationId !== orgId) return null;
                return { id: doc.id, ...data };
            },
            create: async (data: any) => {
                const docRef = ref.doc();
                const payload = { ...data, organizationId: orgId || 'UNAUTHORIZED_ACCESS', createdAt: new Date(), updatedAt: new Date() };
                await docRef.set(payload);
                return { id: docRef.id, ...payload };
            },
            update: async (id: string, data: any) => {
                const doc = await ref.doc(id).get();
                const existingData = doc.data();
                if (!existingData || existingData.organizationId !== orgId) throw new Error("Unauthorized or not found");
                
                const payload = { ...data, updatedAt: new Date() };
                await ref.doc(id).update(payload);
                return { id, ...existingData, ...payload };
            },
            delete: async (id: string) => {
                const doc = await ref.doc(id).get();
                const existingData = doc.data();
                if (!existingData || existingData.organizationId !== orgId) throw new Error("Unauthorized or not found");
                
                await ref.doc(id).delete();
                return { id, ...existingData };
            }
        };
    }
};
