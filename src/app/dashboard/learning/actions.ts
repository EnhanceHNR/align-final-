'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function uploadLearningMaterial(formData: FormData) {
    const session = await getServerSession(authOptions);
    const decodedUser = session?.user as any;

    let orgId = decodedUser?.organizationId;
    if (decodedUser?.id && !orgId) {
        const userDoc = await adminDb.collection("users").doc(decodedUser.id).get();
        orgId = userDoc.data()?.organizationId;
    }

    if (!decodedUser || decodedUser.role !== "MASTER") {
        throw new Error("Unauthorized. Only MASTER can upload learning materials.");
    }
    
    decodedUser.organizationId = orgId;

    const categoryId = formData.get('categoryId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as string;
    const file = formData.get('file') as File;

    if (!categoryId || !title || !file) {
        throw new Error("Missing required fields");
    }

    // Upload to Firebase Storage
    const timestampPrefix = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const path = `learning/${categoryId}/${timestampPrefix}-${cleanFileName}`;
    
    const url = await (await import('@/lib/firebase/storage')).uploadFile(file, path);

    // Save to Database
    const docRef = adminDb.collection("learningMaterials").doc();
    const data = {
        categoryId,
        organizationId: decodedUser.organizationId,
        title,
        description: description || null,
        url,
        type: type || (file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'),
        createdAt: new Date(),
        updatedAt: new Date()
    };
    await docRef.set(data);

    return { success: true, material: { id: docRef.id, ...data } };
}
