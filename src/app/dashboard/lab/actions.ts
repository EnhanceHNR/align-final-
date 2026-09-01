'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebaseAdmin';

function serializeData(data: any) {
    if (!data) return data;
    const result = { ...data };
    for (const key in result) {
        if (result[key] && typeof result[key].toDate === 'function') {
            result[key] = result[key].toDate().toISOString();
        } else if (result[key] && result[key].constructor && result[key].constructor.name === 'Timestamp') {
            result[key] = new Date(result[key]._seconds * 1000).toISOString();
        }
    }
    return result;
}

import { sendSchema, receiveSchema } from '@/lib/schemas';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// User Management Actions
export async function createInternalUserAction(adminUid: string, userData: { email: string; password: string; fullName: string; role: 'admin' | 'staff' }) {
  // Mocked for now, Align.io handles users differently
  return { success: true, message: `Successfully created ${userData.role} account for ${userData.fullName}.` };
}

async function getActionOrgId() {
    try {
        const session = await getServerSession(authOptions);
        let orgId = (session?.user as any)?.organizationId;
        
        if (session?.user?.id && !orgId) {
            const userDoc = await adminDb.collection("users").doc(session.user.id).get();
            if (userDoc.exists) {
                orgId = userDoc.data()?.organizationId;
            }
        }
        
        return orgId || null;
    } catch (e: any) {
        console.error("Session error:", e);
        return null;
    }
}

async function upsertEntityPrisma(type: 'labs' | 'patients', name: string) {
  const orgId = await getActionOrgId();
  if (!orgId) throw new Error('Unauthorized');
  if (!name || typeof name !== 'string') return null;
  const safeName = name.trim();
  
  if (type === 'labs') {
    const snapshot = await adminDb.collection('labs').where('name', '==', safeName).where('organizationId', '==', orgId).limit(1).get();
    if (snapshot.empty) {
      const docRef = await adminDb.collection('labs').add({ name: safeName, organizationId: orgId, createdAt: new Date() });
      return { id: docRef.id, name: safeName, organizationId: orgId };
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } else if (type === 'patients') {
    const snapshot = await adminDb.collection('patients').where('fullName', '==', safeName).where('organizationId', '==', orgId).limit(1).get();
    if (snapshot.empty) {
      const docRef = await adminDb.collection('patients').add({ fullName: safeName, organizationId: orgId, createdAt: new Date() });
      return { id: docRef.id, fullName: safeName, organizationId: orgId };
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
}

async function handleSubmission(
  schema: typeof sendSchema | typeof receiveSchema,
  formData: FormData
) {
  const orgId = await getActionOrgId();
  if (!orgId) return { success: false, message: 'Unauthorized (orgId missing)' };
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

  if (rawFormData.documentsMeta) {
    try {
        const meta = JSON.parse(rawFormData.documentsMeta);
        rawFormData.documents = meta.map((m, i) => ({
            type: m.type,
            amount: m.amount,
            photo: formData.get(`documentFile_${i}`)
        }));
    } catch(e) {}
  }

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
            senderSelfieUrl = await (await import('@/lib/firebase/storage')).uploadFile(data.senderSelfie, `submissions/${timestampPrefix}-selfie-${data.senderSelfie.name}`);
        }

        if (data.productPhotos && Array.isArray(data.productPhotos)) {
            const uploadPromises = data.productPhotos.map(async (file: File, index: number) => {
                if (file.size > 0) return await (await import('@/lib/firebase/storage')).uploadFile(file, `submissions/${timestampPrefix}-product-${index}-${file.name}`);
                return null;
            });
            const results = await Promise.all(uploadPromises);
            photoUrls = results.filter(Boolean) as string[];
            photoUrl = photoUrls[0] || '';
        }

        if (data.deliveryPersonPhoto && data.deliveryPersonPhoto instanceof File && data.deliveryPersonPhoto.size > 0) {
            deliveryPersonPhotoUrl = await (await import('@/lib/firebase/storage')).uploadFile(data.deliveryPersonPhoto, `submissions/${timestampPrefix}-delivery-${data.deliveryPersonPhoto.name}`);
        }
    } else {
        const data = validatedFields.data as z.infer<typeof receiveSchema>;
        
        if (data.photo && Array.isArray(data.photo)) {
            const uploadPromises = data.photo.map(async (file: File, index: number) => {
                if (file.size > 0) return await (await import('@/lib/firebase/storage')).uploadFile(file, `submissions/${timestampPrefix}-received-${index}-${file.name}`);
                return null;
            });
            const results = await Promise.all(uploadPromises);
            photoUrls = results.filter(Boolean) as string[];
            photoUrl = photoUrls[0] || '';
        }
        
        if (data.documents && Array.isArray(data.documents)) {
            const docPromises = data.documents.map(async (doc: any, index: number) => {
                let docPhotoUrl = null;
                if (doc.photo && doc.photo instanceof File && doc.photo.size > 0) {
                    docPhotoUrl = await (await import('@/lib/firebase/storage')).uploadFile(doc.photo, `submissions/${timestampPrefix}-doc-${index}-${doc.photo.name}`);
                }
                return { type: doc.type, amount: doc.amount, photoUrl: docPhotoUrl };
            });
            rawFormData.processedDocuments = await Promise.all(docPromises);
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
        organizationId: orgId,
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
        documents: rawFormData.processedDocuments || null,
        createdAt: new Date(),
    };

    const submissionRef = await adminDb.collection('labSubmissions').add(submissionData);
    const submissionId = submissionRef.id;

    // Handle bill transaction for receives via new documents array
    if (submissionType === 'receive' && rawFormData.processedDocuments) {
        for (const doc of rawFormData.processedDocuments) {
            if (doc.type === 'Bill' && doc.amount) {
                const amt = parseFloat(doc.amount);
                if (!isNaN(amt) && amt > 0) {
                    await adminDb.collection('labTransactions').add({
                        labId: lab.id,
                        amount: amt,
                        type: 'bill',
                        description: `Bill for ${rawFormData.item} (${rawFormData.patientName})`,
                        photoUrl: doc.photoUrl || null,
                        submissionId: submissionId,
                        organizationId: orgId,
                        createdAt: new Date()
                    });
                }
            }
        }
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
  try {
    return await handleSubmission(sendSchema, formData);
  } catch (e: any) {
    return { success: false, message: "FATAL ERROR IN SEND: " + (e.stack || e.message) };
  }
}

export async function receiveSubmissionAction(prevState: any, formData: FormData) {
  try {
    return await handleSubmission(receiveSchema, formData);
  } catch (e: any) {
    return { success: false, message: "FATAL ERROR IN RECEIVE: " + (e.stack || e.message) };
  }
}

export async function addLabTransactionAction(prevState: any, formData: FormData) {
  try {
    const labName = formData.get('labName') as string;
    const amount = formData.get('amount') as string;
    const type = formData.get('type') as 'payment' | 'bill';
    const description = formData.get('description') as string;
    const photo = formData.get('photo') as File;

    const orgId = await getActionOrgId();
    if (!orgId) throw new Error('Unauthorized');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return { success: false, error: 'Invalid amount' };
    }

    const lab = await upsertEntityPrisma('labs', labName);
    if (!lab) throw new Error("Lab not found");

    let photoUrl = '';
    if (photo && photo.size > 0) {
      photoUrl = await (await import('@/lib/firebase/storage')).uploadFile(photo, `transactions/${Date.now()}-${photo.name}`);
    }

    const transactionRef = await adminDb.collection('labTransactions').add({
        labId: lab.id,
        amount: parsedAmount,
        type,
        description,
        photoUrl: photoUrl || null,
        organizationId: orgId,
        createdAt: new Date()
    });

    revalidatePath('/dashboard/lab/bills');
    return { success: true, id: transactionRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchEntitiesAction(collectionName: 'labs' | 'patients' | 'templates' | 'items') {
    try {
        const orgId = await getActionOrgId();
        if (collectionName === 'labs') {
            const snapshot = await adminDb.collection('labs').where('organizationId', '==', orgId).orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...serializeData(doc.data()) }));
        } else if (collectionName === 'patients') {
            const snapshot = await adminDb.collection('patients').where('organizationId', '==', orgId).orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...serializeData(doc.data()), name: doc.data().fullName }));
        } else if (collectionName === 'templates') {
            const snapshot = await adminDb.collection('instructionTemplates').where('organizationId', '==', orgId).orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...serializeData(doc.data()) }));
        } else if (collectionName === 'items') {
            const snapshot = await adminDb.collection('labSubmissions').where('organizationId', '==', orgId).get();
            const items = new Set();
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.item) items.add(data.item);
            });
            return Array.from(items).map(i => ({ name: i }));
        }
        return [];
    } catch (error: any) {
        console.error('Error fetching entities:', error);
        return [];
    }
}

export async function fetchSubmissions() {
    const orgId = await getActionOrgId();
    const snapshot = await adminDb.collection('labSubmissions')
        .where('organizationId', '==', orgId)
        .orderBy('createdAt', 'desc')
        .get();
        
    const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...serializeData(doc.data()) }));
    
    const [labsSnap, patientsSnap] = await Promise.all([
        adminDb.collection('labs').where('organizationId', '==', orgId).get(),
        adminDb.collection('patients').where('organizationId', '==', orgId).get()
    ]);
    
    const labsMap = new Map();
    labsSnap.forEach(d => labsMap.set(d.id, serializeData(d.data())));
    
    const patientsMap = new Map();
    patientsSnap.forEach(d => patientsMap.set(d.id, serializeData(d.data())));
    
    return submissions.map(sub => ({
        ...sub,
        labName: labsMap.get(sub.labId)?.name || 'Unknown Lab',
        patientName: patientsMap.get(sub.patientId)?.fullName || sub.patientName
    }));
}

// Staff picker for the send/receive forms. Sourced from the same
// employeeProfiles directory that attendance/HR management uses, so lab
// module shows employees' real names rather than a name guessed from their
// login email.
export async function fetchUsersAction() {
    const orgId = await getActionOrgId();
    const profilesSnap = await adminDb.collection('employeeProfiles')
        .where('organizationId', '==', orgId)
        .get();

    const profiles = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const users = await Promise.all(profiles.map(async (profile) => {
        let email = '';
        if (profile.userId) {
            const userDoc = await adminDb.collection('users').doc(profile.userId).get();
            email = userDoc.exists ? (userDoc.data()?.email || '') : '';
        }
        return {
            id: profile.id,
            email,
            fullName: profile.name || (email ? email.split('@')[0] : 'Unnamed Staff'),
        };
    }));

    return users.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function fetchLabTransactions() {
    const orgId = await getActionOrgId();
    const snapshot = await adminDb.collection('labTransactions')
        .where('organizationId', '==', orgId)
        .orderBy('createdAt', 'desc')
        .get();
    
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...serializeData(doc.data()) }));
    
    const labsSnap = await adminDb.collection('labs').where('organizationId', '==', orgId).get();
    const labsMap = new Map();
    labsSnap.forEach(d => labsMap.set(d.id, d.data()));
    
    return transactions.map(tx => ({
        ...tx,
        labName: labsMap.get(tx.labId)?.name || 'Unknown Lab'
    }));
}

export async function updateSubmissionRemarksAction(id: string, newRemarks: string) {
    try {
        const orgId = await getActionOrgId();
        const docRef = adminDb.collection('labSubmissions').doc(id);
        const doc = await docRef.get();
        if (doc.exists && doc.data()?.organizationId === orgId) {
            await docRef.update({ remarks: newRemarks });
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteSubmissionAction(id: string) {
    try {
        const orgId = await getActionOrgId();
        const docRef = adminDb.collection('labSubmissions').doc(id);
        const doc = await docRef.get();
        if (doc.exists && doc.data()?.organizationId === orgId) {
            await docRef.delete();
        }
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
        
        const orgId = await getActionOrgId();
        const docRef = adminDb.collection('labSubmissions').doc(submissionId);
        const doc = await docRef.get();
        if (doc.exists && doc.data()?.organizationId === orgId) {
            await docRef.update({ paymentStatus: status });
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateEntityAction(collectionName: string, oldName: string, newName: string, additionalData?: any) {
    try {
        if (collectionName === 'labs') {
            const orgId = await getActionOrgId();
            const snapshot = await adminDb.collection('labs').where('name', '==', oldName).where('organizationId', '==', orgId).limit(1).get();
            if (!snapshot.empty) {
                await snapshot.docs[0].ref.update({
                    name: newName,
                    phone: additionalData?.phone || null,
                    services: additionalData?.services || null
                });
            } else {
                throw new Error("Lab not found");
            }
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addEntityAction(collectionName: string, name: string, additionalData?: any) {
    try {
        if (collectionName === 'labs') {
            const orgId = await getActionOrgId();
            await adminDb.collection('labs').add({
                name,
                organizationId: orgId,
                phone: additionalData?.phone || null,
                services: additionalData?.services || null,
                createdAt: new Date()
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
            const orgId = await getActionOrgId();
            const snapshot = await adminDb.collection('labs').where('name', '==', name).where('organizationId', '==', orgId).limit(1).get();
            if (!snapshot.empty) {
                await snapshot.docs[0].ref.delete();
            } else {
                throw new Error("Lab not found");
            }
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
