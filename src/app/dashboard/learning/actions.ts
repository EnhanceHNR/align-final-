'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "~/lib/auth";

export async function uploadLearningMaterial(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "MASTER") {
        throw new Error("Unauthorized. Only MASTER can upload learning materials.");
    }

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
    const material = await prisma.learningMaterial.create({
        data: {
            categoryId,
            organizationId: (session.user as any).organizationId,
            title,
            description: description || null,
            url,
            type: type || (file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'),
        }
    });

    return { success: true, material };
}
