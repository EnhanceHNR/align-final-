'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { adminAuth, adminDb, FieldValue } from '@/lib/firebase-admin';
import { uploadFile } from '@/lib/firebase/storage';
import { sendSchema, receiveSchema } from '@/lib/schemas';
import type { Submission, LabTransaction, Patient, Lab } from '@/lib/types';
import { upsertEntity, db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';

// User Management Actions
export async function createInternalUserAction(adminUid: string, userData: { email: string; password: string; fullName: string; role: 'admin' | 'staff' }) {
  try {
    // 1. Verify Admin Permissions
    const adminDoc = await adminDb.collection('users').doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new Error('Unauthorized. Only Admins can create new accounts.');
    }

    // 2. Create user in Auth using Admin SDK
    const userRecord = await adminAuth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.fullName,
    });

    // 3. Create record in Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      email: userData.email,
      fullName: userData.fullName,
      role: userData.role,
      createdAt: new Date().toISOString(),
    });

    return { success: true, message: `Successfully created ${userData.role} account for ${userData.fullName}.` };
  } catch (error: any) {
    console.error('Create internal user error:', error);
    return { success: false, error: error.message };
  }
}

async function handleSubmission(
  schema: typeof sendSchema | typeof receiveSchema,
  formData: FormData
) {
  const submissionType = formData.get('type') as 'send' | 'receive';
  
  // Extract all fields from FormData
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
    console.error(validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Validation failed. Please check your inputs.',
    };
  }

  try {
    const now = new Date();
    const timestampPrefix = Date.now();
    
    let photoUrl = '';
    let photoUrls: string[] = [];
    let deliveryPersonPhotoUrl = null;
    let senderSelfieUrl = null;
    let billPhotoUrl = null;

    if (submissionType === 'send') {
        const data = validatedFields.data as z.infer<typeof sendSchema>;
        
        // 1. Upload Sender Selfie
        if (data.senderSelfie && data.senderSelfie instanceof File) {
            senderSelfieUrl = await uploadFile(data.senderSelfie, `submissions/${timestampPrefix}-selfie-${data.senderSelfie.name}`);
        }

        // 2. Upload Product Photos
        if (data.productPhotos && Array.isArray(data.productPhotos)) {
            const uploadPromises = data.productPhotos.map(async (file: File, index: number) => {
                return await uploadFile(file, `submissions/${timestampPrefix}-product-${index}-${file.name}`);
            });
            photoUrls = await Promise.all(uploadPromises);
            photoUrl = photoUrls[0] || ''; // Fallback for backward compatibility
        }

        // 3. Upload Delivery Person Photo
        if (data.deliveryPersonPhoto && data.deliveryPersonPhoto instanceof File && data.deliveryPersonPhoto.size > 0) {
            deliveryPersonPhotoUrl = await uploadFile(data.deliveryPersonPhoto, `submissions/${timestampPrefix}-delivery-${data.deliveryPersonPhoto.name}`);
        }
    } else {
        const data = validatedFields.data as z.infer<typeof receiveSchema>;
        // 1. Upload Verification Photos
        if (data.photo && Array.isArray(data.photo)) {
            const uploadPromises = data.photo.map(async (file: File, index: number) => {
                return await uploadFile(file, `submissions/${timestampPrefix}-receive-${index}-${file.name}`);
            });
            photoUrls = await Promise.all(uploadPromises);
            photoUrl = photoUrls[0] || ''; // Fallback for backward compatibility
        }

        // 2. Upload Receiver Selfie
        if (data.receiverSelfie && data.receiverSelfie instanceof File) {
            senderSelfieUrl = await uploadFile(data.receiverSelfie, `submissions/${timestampPrefix}-receiver-selfie-${data.receiverSelfie.name}`);
        }

        // 3. Upload Delivery Person Photo
        if (data.deliveryPersonPhoto && data.deliveryPersonPhoto instanceof File && data.deliveryPersonPhoto.size > 0) {
            deliveryPersonPhotoUrl = await uploadFile(data.deliveryPersonPhoto, `submissions/${timestampPrefix}-delivery-${data.deliveryPersonPhoto.name}`);
        }
    }

    const data = validatedFields.data as any;
    
    // Handle Documents (Receive form)
    let documents: any[] = [];
    if (submissionType === 'receive' && rawFormData.documentsMeta) {
        const meta = JSON.parse(rawFormData.documentsMeta as string);
        const uploadPromises = meta.map(async (docMeta: any, idx: number) => {
            let docPhotoUrl = '';
            if (docMeta.hasFile) {
                const file = formData.get(`documentFile_${idx}`) as File;
                if (file) {
                    docPhotoUrl = await uploadFile(file, `submissions/${timestampPrefix}-doc-${idx}-${file.name}`);
                }
            }
            return {
                type: docMeta.type,
                amount: docMeta.amount || '',
                photoUrl: docPhotoUrl
            };
        });
        documents = await Promise.all(uploadPromises);
    }

    // 2. Prepare submission data
    const { productPhotos, senderSelfie, photo, deliveryPersonPhoto, billPhoto, receiverSelfie, ...otherData } = validatedFields.data as any;
    
    let submissionData: any = {
      ...otherData,
      photoUrl,
      photoUrls,
      deliveryPersonPhotoUrl,
      senderSelfieUrl,
      ...(documents.length > 0 && { documents }),
      ...(documents.some(d => d.type === 'Bill') && { paymentStatus: 'Pending' }),
      createdAt: now.toISOString(),
      appointmentDate: otherData.appointmentDate ? otherData.appointmentDate.toISOString() : null,
      timestamp: FieldValue.serverTimestamp(),
    };

    // If receiving and linked to a sent item, we can optionally link documents back.
    // For now, documents are stored in the receive submission itself.

    // 3. Save to Firestore using Admin SDK
    await adminDb.collection('submissions').add(submissionData);

    // 4. Upsert patient and lab names for autocomplete using Admin SDK
    const upsert = async (coll: string, name: string) => {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        await adminDb.collection(coll).doc(id).set({
            name,
            createdAt: now.toISOString()
        }, { merge: true });
    };

    await Promise.all([
      upsert('patients', otherData.patientName),
      upsert('labs', otherData.labName),
    ]);
    
    // Trigger Email for new send order approval
    if (submissionType === 'send' && submissionData.approvalStatus === 'Pending') {
        const adminUsers = await adminDb.collection('users').where('role', '==', 'admin').get();
        const adminEmails = adminUsers.docs.map(doc => doc.data().email).filter(Boolean);
        
        if (adminEmails.length > 0) {
            await adminDb.collection('mail').add({
                to: adminEmails,
                message: {
                    subject: `New Send Order Pending Approval - ${otherData.patientName}`,
                    html: `
                        <h2>New Order Requires Approval</h2>
                        <p><b>Patient:</b> ${otherData.patientName}</p>
                        <p><b>Service/Item:</b> ${otherData.item}</p>
                        <p><b>Lab:</b> ${otherData.labName}</p>
                        <p><b>Sender:</b> ${otherData.senderName} (${submissionData.senderEmail || 'N/A'})</p>
                        <br/>
                        <p>Please log in to the admin dashboard to approve or reject this order.</p>
                    `
                }
            });
        }
    }
    
    // Update Lab Service Price and TAT if it was edited during a Send submission
    if (submissionType === 'send' && (data.servicePrice || data.tat)) {
        const labId = otherData.labName.toLowerCase().replace(/\s+/g, '-');
        const labRef = adminDb.collection('labs').doc(labId);
        const labDoc = await labRef.get();
        
        if (labDoc.exists) {
            const labData = labDoc.data();
            let services = labData?.services || [];
            let serviceIndex = services.findIndex((s: any) => s.name === otherData.item);
            
            let updated = false;
            if (serviceIndex >= 0) {
                if (data.servicePrice && services[serviceIndex].price !== data.servicePrice) {
                    services[serviceIndex].price = data.servicePrice;
                    updated = true;
                }
                if (data.tat && services[serviceIndex].tat !== data.tat) {
                    services[serviceIndex].tat = data.tat;
                    updated = true;
                }
            } else {
                services.push({
                    name: otherData.item,
                    price: data.servicePrice || '',
                    tat: data.tat || ''
                });
                updated = true;
            }
            
            if (updated) {
                await labRef.update({ services });
            }
        }
    }
    
    // 6. Revalidate paths
    revalidatePath('/');
    revalidatePath('/records');
    revalidatePath(submissionType === 'send' ? '/receive' : '/send');

    return { message: `${submissionType.charAt(0).toUpperCase() + submissionType.slice(1)} submission successful!` };
  } catch (e: any) {
    console.error('Submission error:', e);
    return { message: `An error occurred while creating the submission: ${e.message || 'Unknown error'}` };
  }
}

export async function sendSubmissionAction(prevState: any, formData: FormData) {
  return handleSubmission(sendSchema, formData);
}

export async function receiveSubmissionAction(prevState: any, formData: FormData) {
  return handleSubmission(receiveSchema, formData);
}

import { getSuggestions as getSuggestionsData, fetchSubmissions as fetchSubmissionsData, fetchLabTransactions as fetchLabTransactionsData } from '@/lib/data';

export async function getSuggestions(collectionName: 'patients' | 'labs', queryText: string) {
  return await getSuggestionsData(collectionName, queryText);
}

export async function fetchSubmissions() {
  return await fetchSubmissionsData();
}

export async function fetchLabTransactionsAction() {
  return await fetchLabTransactionsData();
}

// Entity Management Actions (use Admin SDK to bypass Firestore security rules server-side)
export async function addEntityAction(collectionName: 'patients' | 'labs' | 'templates', name: string, additionalData?: Record<string, any>) {
  try {
    const docId = name.toLowerCase().replace(/\s+/g, '-');
    const data = { name, createdAt: new Date().toISOString(), ...additionalData };

    // Try Admin SDK first (required in production); fallback to client SDK in local dev
    try {
      await adminDb.collection(collectionName).doc(docId).set(
        data,
        { merge: true }
      );
    } catch (adminError: any) {
      console.warn('Admin SDK write failed, falling back to client SDK:', adminError.message);
      // Fallback: use client SDK (works if Firestore rules are permissive in dev)
      await upsertEntity(collectionName, name, additionalData);
    }

    revalidatePath('/');
    revalidatePath(`/${collectionName}`);
    return { success: true, message: `Successfully added ${name}.` };
  } catch (error: any) {
    console.error(`Add entity error (${collectionName}):`, error);
    return { success: false, error: error.message };
  }
}

export async function fetchEntitiesAction(collectionName: 'patients' | 'labs' | 'templates') {
  try {
    const snapshot = await adminDb
      .collection(collectionName)
      .orderBy('name', 'asc')
      .get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt
      };
    });
  } catch (error: any) {
    console.error(`Fetch entities error (${collectionName}):`, error);
    // Fallback to client SDK
    try {
      const coll = collection(db, collectionName);
      const q = query(coll, orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch {
      return [];
    }
  }
}

export async function deleteEntityAction(collectionName: 'patients' | 'labs' | 'templates', id: string) {
  console.log(`Attempting to delete from ${collectionName} with id: ${id}`);
  try {
    // 1. Try Admin SDK (bypasses rules)
    await adminDb.collection(collectionName).doc(id).delete();
    console.log(`Admin SDK: Successfully deleted ${id} from ${collectionName}`);
    revalidatePath(`/${collectionName}`);
    return { success: true };
  } catch (adminError: any) {
    console.error(`Admin SDK deletion failed for ${collectionName}/${id}:`, adminError.message);
    
    // 2. Fallback to Client SDK (respects rules)
    try {
      await deleteDoc(doc(db, collectionName, id));
      console.log(`Client SDK: Successfully deleted ${id} from ${collectionName}`);
      revalidatePath(`/${collectionName}`);
      return { success: true };
    } catch (clientError: any) {
      console.error(`Client SDK deletion failed for ${collectionName}/${id}:`, clientError.message);
      return { 
        success: false, 
        error: `Failed to delete. ${clientError.message === 'Permission denied' ? 'You do not have permission to delete this record.' : clientError.message}`
      };
    }
  }
}

export async function updateEntityAction(collectionName: 'patients' | 'labs' | 'templates', id: string, name: string, additionalData?: Record<string, any>) {
  try {
    const data = { name, updatedAt: new Date().toISOString(), ...additionalData };

    await adminDb.collection(collectionName).doc(id).update(data);

    revalidatePath('/');
    revalidatePath(`/${collectionName}`);
    return { success: true, message: `Successfully updated ${name}.` };
  } catch (error: any) {
    console.error(`Update entity error (${collectionName}):`, error);
    return { success: false, error: error.message };
  }
}

export async function updateSubmissionRemarksAction(submissionId: string, remarks: string) {
  try {
    await adminDb.collection('submissions').doc(submissionId).update({
      remarks,
      updatedAt: new Date().toISOString(),
    });

    revalidatePath('/records');
    return { success: true };
  } catch (error: any) {
    console.error('Update submission remarks error:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchUsersAction() {
  try {
    const snapshot = await adminDb.collection('users').get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        fullName: data.fullName || (data.email ? data.email.split('@')[0] : 'Unnamed Staff'),
        email: data.email,
        role: data.role
      };
    }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function deleteSubmissionAction(id: string) {
  try {
    await adminDb.collection('submissions').doc(id).delete();
    revalidatePath('/records');
    revalidatePath('/bills');
    return { success: true };
  } catch (error: any) {
    console.error('Delete submission error:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePaymentStatusAction(formData: FormData) {
  try {
    const submissionId = formData.get('submissionId') as string;
    const status = formData.get('status') as 'Paid' | 'Pending';
    const proofFile = formData.get('proofFile') as File | null;

    let paymentProofUrl = null;

    if (proofFile && proofFile.size > 0) {
      paymentProofUrl = await uploadFile(proofFile, `payments/${Date.now()}-proof-${proofFile.name}`);
    }

    const updateData: any = {
      paymentStatus: status,
      updatedAt: new Date().toISOString(),
    };

    if (paymentProofUrl) {
      updateData.paymentProofUrl = paymentProofUrl;
    }

    await adminDb.collection('submissions').doc(submissionId).update(updateData);

    revalidatePath('/bills');
    return { success: true };
  } catch (error: any) {
    console.error('Update payment status error:', error);
    return { success: false, error: error.message };
  }
}

export async function addLabTransactionAction(formData: FormData) {
  try {
    console.log('--- Starting addLabTransactionAction ---');
    const labName = formData.get('labName') as string;
    const amount = Number(formData.get('amount'));
    const type = formData.get('type') as 'Bill' | 'Payment' | 'Adjustment';
    const description = formData.get('description') as string;
    const photoFile = formData.get('photoFile') as File | null;

    console.log(`Transaction Details: Lab=${labName}, Amount=${amount}, Type=${type}`);

    let photoUrl = null;
    if (photoFile && photoFile.size > 0) {
      console.log(`Uploading photo: ${photoFile.name} (${photoFile.size} bytes)`);
      photoUrl = await uploadFile(photoFile, `transactions/${Date.now()}-${photoFile.name}`);
      console.log(`Photo uploaded: ${photoUrl}`);
    }

    const transaction = {
      labName,
      amount,
      type,
      description,
      photoUrl,
      createdAt: new Date().toISOString(),
    };

    console.log('Saving transaction to Firestore...');
    const docRef = await adminDb.collection('lab_transactions').add(transaction);
    console.log(`Transaction saved with ID: ${docRef.id}`);
    
    console.log('Revalidating /bills path...');
    revalidatePath('/bills');
    console.log('--- addLabTransactionAction Success ---');
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Add lab transaction error:', error);
    return { success: false, error: error.message };
  }
}

export async function approveOrderAction(submissionId: string, status: 'Approved' | 'Rejected', rejectReason?: string) {
  try {
    const docRef = adminDb.collection('submissions').doc(submissionId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error('Submission not found.');
    }
    
    const data = doc.data();
    
    const updateData: any = {
      approvalStatus: status,
      updatedAt: new Date().toISOString(),
    };
    
    if (rejectReason) {
      updateData.remarks = rejectReason;
    }
    
    await docRef.update(updateData);
    
    // Trigger Email for approval status
    const adminUsers = await adminDb.collection('users').where('role', '==', 'admin').get();
    const adminEmails = adminUsers.docs.map(u => u.data().email).filter(Boolean);
    const emailsToNotify = new Set(adminEmails);
    if (data?.senderEmail) {
        emailsToNotify.add(data.senderEmail);
    }
    
    if (emailsToNotify.size > 0) {
        await adminDb.collection('mail').add({
            to: Array.from(emailsToNotify),
            message: {
                subject: `Order ${status} - ${data?.patientName}`,
                html: `
                    <h2>Order has been ${status}</h2>
                    <p><b>Patient:</b> ${data?.patientName}</p>
                    <p><b>Service/Item:</b> ${data?.item}</p>
                    <p><b>Lab:</b> ${data?.labName}</p>
                    ${rejectReason ? `<p><b>Reason:</b> ${rejectReason}</p>` : ''}
                `
            }
        });
    }

    revalidatePath('/admin/approvals');
    revalidatePath('/records');
    return { success: true };
  } catch (error: any) {
    console.error('Approve order error:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchSubmissionByIdAction(id: string) {
    try {
        const doc = await adminDb.collection('submissions').doc(id).get();
        if (!doc.exists) {
            return { success: false, error: 'Submission not found' };
        }
        return { success: true, data: { id: doc.id, ...doc.data() } };
    } catch (error: any) {
        console.error('Error fetching submission:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchSubmissionTrailAction(id: string) {
    try {
        const rootDoc = await adminDb.collection('submissions').doc(id).get();
        if (!rootDoc.exists) return { success: false, error: 'Submission not found' };
        
        let rootData = { id: rootDoc.id, ...rootDoc.data() } as any;
        
        // Trace backwards to find the ultimate root
        let current = rootData;
        const ancestors = [];
        while (current.linkedRecordId) {
            const parentDoc = await adminDb.collection('submissions').doc(current.linkedRecordId).get();
            if (parentDoc.exists) {
                current = { id: parentDoc.id, ...parentDoc.data() };
                ancestors.unshift(current); // Insert at the beginning so the oldest is first
            } else {
                break; // Broken link
            }
        }
        
        // Trace forwards to find all descendants
        const descendants = [];
        let forwardCurrent = rootData;
        while (true) {
            const querySnapshot = await adminDb.collection('submissions')
                .where('linkedRecordId', '==', forwardCurrent.id)
                .limit(1)
                .get();
                
            if (!querySnapshot.empty) {
                forwardCurrent = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
                descendants.push(forwardCurrent);
            } else {
                break;
            }
        }
        
        const trail = [...ancestors, rootData, ...descendants];
        return { success: true, data: trail };
    } catch (error: any) {
        console.error('Error fetching submission trail:', error);
        return { success: false, error: error.message };
    }
}

export async function dismissAlertAction(id: string, note: string) {
    try {
        const docRef = adminDb.collection('submissions').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return { success: false, error: 'Submission not found' };
        }
        
        const data = doc.data();
        const newRemark = `[Alert Resolved]: ${note}`;
        const updatedRemarks = data?.remarks ? `${data.remarks}\n\n${newRemark}` : newRemark;
        
        await docRef.update({
            isAlertResolved: true,
            remarks: updatedRemarks,
            updatedAt: new Date().toISOString()
        });
        
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error('Error dismissing alert:', error);
        return { success: false, error: error.message };
    }
}

export async function editSubmissionAction(formData: FormData) {
  try {
    const id = formData.get('id') as string;
    const editorName = formData.get('editorName') as string;
    const editorSelfie = formData.get('editorSelfie') as File;
    const changes = formData.get('changes') as string;
    const updatesJson = formData.get('updates') as string;
    
    if (!id || !editorName || !editorSelfie || !changes || !updatesJson) {
      return { success: false, error: 'Missing required fields for edit.' };
    }

    const updates = JSON.parse(updatesJson);

    // Upload selfie
    let selfieUrl = '';
    if (editorSelfie.size > 0) {
      selfieUrl = await uploadFile(editorSelfie, `edits/${id}-selfie-${Date.now()}`);
    } else {
      return { success: false, error: 'Editor selfie is mandatory.' };
    }

    const docRef = adminDb.collection('submissions').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: 'Submission not found.' };

    const existingData = doc.data() as Submission;
    
    const newPhotos = formData.getAll('newPhotos') as File[];
    let newPhotoUrls: string[] = [];
    if (newPhotos && newPhotos.length > 0) {
      for (const photo of newPhotos) {
         if (photo.size > 0) {
           const url = await uploadFile(photo, `submissions/${id}-${Date.now()}-${photo.name}`);
           newPhotoUrls.push(url);
         }
      }
    }

    if (updates.photoUrls) {
      updates.photoUrls = [...updates.photoUrls, ...newPhotoUrls];
    } else if (newPhotoUrls.length > 0) {
      let existingPhotos = existingData.photoUrls || [];
      if (existingData.photoUrl && !existingPhotos.includes(existingData.photoUrl)) {
        existingPhotos.push(existingData.photoUrl);
      }
      updates.photoUrls = [...existingPhotos, ...newPhotoUrls];
    }

    const editLog = {
      timestamp: new Date().toISOString(),
      editorSelfieUrl: selfieUrl,
      editorName,
      changes
    };

    const editLogs = existingData.editLogs ? [...existingData.editLogs, editLog] : [editLog];

    await docRef.update({
      ...updates,
      editLogs,
      updatedAt: new Date().toISOString()
    });

    if (updates.patientName && updates.patientName !== existingData.patientName) {
       await upsertEntity('patients', updates.patientName);
    }
    if (updates.item && updates.item !== existingData.item) {
       await upsertEntity('items', updates.item);
    }
    if (updates.labName && updates.labName !== existingData.labName) {
       await upsertEntity('labs', updates.labName);
    }

    revalidatePath('/');
    revalidatePath('/records');
    
    return { success: true };
  } catch (error: any) {
    console.error('Edit submission error:', error);
    return { success: false, error: error.message };
  }
}
