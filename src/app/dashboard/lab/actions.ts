'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { uploadFile } from '@/lib/firebase/storage';
import { prisma } from '@/lib/prisma';
import { sendSchema, receiveSchema } from '@/lib/schemas';

// User Management Actions
export async function createInternalUserAction(adminUid: string, userData: { email: string; password: string; fullName: string; role: 'admin' | 'staff' }) {
  // Mocked for now, City Dent handles users differently
  return { success: true, message: `Successfully created ${userData.role} account for ${userData.fullName}.` };
}

// Ensure entities like Labs and Patients exist
async function upsertEntityPrisma(type: 'labs' | 'patients', name: string) {
  if (!name || typeof name !== 'string') return null;
  const safeName = name.trim();
  
  if (type === 'labs') {
    let lab = await prisma.lab.findFirst({ where: { name: safeName } });
    if (!lab) {
      lab = await prisma.lab.create({ data: { name: safeName } });
    }
    return lab;
  } else if (type === 'patients') {
    let patient = await prisma.patient.findFirst({ where: { fullName: safeName } });
    if (!patient) {
      patient = await prisma.patient.create({ data: { fullName: safeName } });
    }
    return patient;
  }
}

async function handleSubmission(
  schema: typeof sendSchema | typeof receiveSchema,
  formData: FormData
) {
  const submissionType = formData.get('type') as 'send' | 'receive';
  
  const rawFormData: any = {};
  formData.forEach((value, key) => {
    if (key === 'hasBill') {
        rawFormData[key] = value === 'true';
    } else if (key === 'photo' || key === 'productPhotos') {
        if (!rawFormData[key]) rawFormData[key] = [];
        rawFormData[key].push(value);
    } else {
        rawFormData[key] = value;
    }
  });

  const validatedFields = schema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Validation failed. Please check your inputs.',
    };
  }

  try {
    const timestampPrefix = Date.now();
    
    let photoUrl = '';
    let photoUrls: string[] = [];
    let deliveryPersonPhotoUrl = null;
    let senderSelfieUrl = null;
    let billPhotoUrl = null;

    if (submissionType === 'send') {
        const data = validatedFields.data as z.infer<typeof sendSchema>;
        
        if (data.senderSelfie && data.senderSelfie instanceof File && data.senderSelfie.size > 0) {
            senderSelfieUrl = await uploadFile(data.senderSelfie, `submissions/${timestampPrefix}-selfie-${data.senderSelfie.name}`);
        }

        if (data.productPhotos && Array.isArray(data.productPhotos)) {
            const uploadPromises = data.productPhotos.map(async (file: File, index: number) => {
                if (file.size > 0) return await uploadFile(file, `submissions/${timestampPrefix}-product-${index}-${file.name}`);
                return null;
            });
            const results = await Promise.all(uploadPromises);
            photoUrls = results.filter(Boolean) as string[];
            photoUrl = photoUrls[0] || '';
        }

        if (data.deliveryPersonPhoto && data.deliveryPersonPhoto instanceof File && data.deliveryPersonPhoto.size > 0) {
            deliveryPersonPhotoUrl = await uploadFile(data.deliveryPersonPhoto, `submissions/${timestampPrefix}-delivery-${data.deliveryPersonPhoto.name}`);
        }
    } else {
        const data = validatedFields.data as z.infer<typeof receiveSchema>;
        
        if (data.photo && Array.isArray(data.photo)) {
            const uploadPromises = data.photo.map(async (file: File, index: number) => {
                if (file.size > 0) return await uploadFile(file, `submissions/${timestampPrefix}-received-${index}-${file.name}`);
                return null;
            });
            const results = await Promise.all(uploadPromises);
            photoUrls = results.filter(Boolean) as string[];
            photoUrl = photoUrls[0] || '';
        }
        
        if (data.billPhoto && data.billPhoto instanceof File && data.billPhoto.size > 0) {
            billPhotoUrl = await uploadFile(data.billPhoto, `submissions/${timestampPrefix}-bill-${data.billPhoto.name}`);
        }
    }

    const lab = await upsertEntityPrisma('labs', rawFormData.labName);
    const patient = await upsertEntityPrisma('patients', rawFormData.patientName);
    
    if (!lab) throw new Error("Lab could not be created/found");

    const submissionData = {
        type: submissionType,
        senderName: rawFormData.senderName || null,
        receiverName: rawFormData.receiverName || null,
        photoUrl: photoUrl || null,
        photoUrls: photoUrls.length ? photoUrls : null,
        deliveryPersonPhotoUrl: deliveryPersonPhotoUrl || null,
        senderSelfieUrl: senderSelfieUrl || null,
        item: rawFormData.item,
        subType: rawFormData.subType || null,
        deliveryPerson: rawFormData.deliveryPerson || null,
        labId: lab.id,
        patientName: rawFormData.patientName,
        patientId: patient?.id || null,
        appointmentStatus: rawFormData.appointmentStatus || null,
        appointmentDate: rawFormData.appointmentDate ? new Date(rawFormData.appointmentDate) : null,
        servicePrice: rawFormData.servicePrice || null,
        remarks: rawFormData.remarks || null,
        tat: rawFormData.tat || null,
        linkedRecordId: rawFormData.linkedRecordId || null,
        approvalStatus: rawFormData.approvalStatus || "Pending",
    };

    const submission = await prisma.labSubmission.create({ data: submissionData });

    // Handle bill transaction for receives
    if (submissionType === 'receive' && rawFormData.hasBill && rawFormData.billAmount) {
        await prisma.labTransaction.create({
            data: {
                labId: lab.id,
                amount: parseFloat(rawFormData.billAmount),
                type: 'bill',
                description: `Bill for ${rawFormData.item} (${rawFormData.patientName})`,
                photoUrl: billPhotoUrl || null,
                submissionId: submission.id
            }
        });
    }

    revalidatePath('/dashboard/lab/send');
    revalidatePath('/dashboard/lab/receive');
    revalidatePath('/dashboard/lab/records');
    
    return { success: true, message: `Successfully logged ${submissionType} entry.` };
  } catch (error: any) {
    console.error('Submission error:', error);
    return { success: false, message: 'Internal server error', errors: { form: [error.message] } };
  }
}

export async function sendSubmissionAction(prevState: any, formData: FormData) {
  return handleSubmission(sendSchema, formData);
}

export async function receiveSubmissionAction(prevState: any, formData: FormData) {
  return handleSubmission(receiveSchema, formData);
}

export async function addLabTransactionAction(prevState: any, formData: FormData) {
  try {
    const labName = formData.get('labName') as string;
    const amount = formData.get('amount') as string;
    const type = formData.get('type') as 'payment' | 'bill';
    const description = formData.get('description') as string;
    const photo = formData.get('photo') as File;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return { success: false, error: 'Invalid amount' };
    }

    const lab = await upsertEntityPrisma('labs', labName);
    if (!lab) throw new Error("Lab not found");

    let photoUrl = '';
    if (photo && photo.size > 0) {
      photoUrl = await uploadFile(photo, `transactions/${Date.now()}-${photo.name}`);
    }

    const transaction = await prisma.labTransaction.create({
      data: {
        labId: lab.id,
        amount: parsedAmount,
        type,
        description,
        photoUrl: photoUrl || null,
      }
    });

    revalidatePath('/dashboard/lab/bills');
    return { success: true, id: transaction.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchEntitiesAction(collectionName: 'labs' | 'patients' | 'templates' | 'items') {
    try {
        if (collectionName === 'labs') {
            return await prisma.lab.findMany({ orderBy: { createdAt: 'desc' } });
        } else if (collectionName === 'patients') {
            const patients = await prisma.patient.findMany({ orderBy: { createdAt: 'desc' } });
            return patients.map(p => ({ ...p, name: p.fullName }));
        } else if (collectionName === 'templates') {
            return await prisma.instructionTemplate.findMany({ orderBy: { createdAt: 'desc' } });
        } else if (collectionName === 'items') {
            // Just return unique items from submissions
            const items = await prisma.labSubmission.findMany({ select: { item: true }, distinct: ['item'] });
            return items.map(i => ({ name: i.item }));
        }
        return [];
    } catch (error: any) {
        console.error('Error fetching entities:', error);
        return [];
    }
}

export async function fetchSubmissions() {
    return await prisma.labSubmission.findMany({
        orderBy: { createdAt: 'desc' },
        include: { lab: true, patient: true }
    }).then(submissions => submissions.map(sub => ({
        ...sub,
        labName: sub.lab.name,
        patientName: sub.patient?.fullName || sub.patientName
    })));
}

export async function fetchUsersAction() {
    const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, email: true }
    });
    
    return users.map(u => ({
        id: u.id,
        email: u.email,
        fullName: u.email.split('@')[0] // Use email prefix as name
    }));
}

export async function fetchLabTransactions() {
    return await prisma.labTransaction.findMany({
        orderBy: { createdAt: "desc" },
        include: { lab: true }
    }).then(transactions => transactions.map(tx => ({
        ...tx,
        labName: tx.lab.name
    })));
}

export async function updateSubmissionRemarksAction(id: string, newRemarks: string) {
    try {
        await prisma.labSubmission.update({
            where: { id },
            data: { remarks: newRemarks }
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteSubmissionAction(id: string) {
    try {
        await prisma.labSubmission.delete({ where: { id } });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function editSubmissionAction(formData: FormData) { 
    return { success: true }; 
}

export async function updatePaymentStatusAction(formData: FormData) {
    try {
        const submissionId = formData.get('submissionId') as string;
        const status = formData.get('status') as string;
        
        await prisma.labSubmission.update({
            where: { id: submissionId },
            data: { paymentStatus: status }
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateEntityAction(collectionName: string, oldName: string, newName: string, additionalData?: any) {
    try {
        if (collectionName === 'labs') {
            const lab = await prisma.lab.findFirst({ where: { name: oldName } });
            if (!lab) throw new Error("Lab not found");
            
            await prisma.lab.update({
                where: { id: lab.id },
                data: {
                    name: newName,
                    phone: additionalData?.phone,
                    services: additionalData?.services,
                }
            });
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addEntityAction(collectionName: string, name: string, additionalData?: any) {
    try {
        if (collectionName === 'labs') {
            await prisma.lab.create({
                data: {
                    name,
                    phone: additionalData?.phone,
                    services: additionalData?.services,
                }
            });
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteEntityAction(collectionName: string, name: string) {
    try {
        if (collectionName === 'labs') {
            const lab = await prisma.lab.findFirst({ where: { name } });
            if (!lab) throw new Error("Lab not found");
            await prisma.lab.delete({ where: { id: lab.id } });
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

