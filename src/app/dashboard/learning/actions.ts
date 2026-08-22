'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

export async function uploadLearningMaterial(formData: FormData) {
    const req = {
        cookies: Object.fromEntries(cookies().getAll().map(c => [c.name, c.value])),
        headers: { cookie: cookies().getAll().map(c => `${c.name}=${c.value}`).join('; ') }
    };
    const decodedUser = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET || "", cookieName: "align_token" });

    if (!decodedUser || decodedUser.role !== "MASTER") {
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
            organizationId: decodedUser.organizationId,
            title,
            description: description || null,
            url,
            type: type || (file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'),
        }
    });

    return { success: true, material };
}
