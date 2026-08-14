import { adminDb } from '@/lib/firebase-admin';
import type { Submission, LabTransaction, Patient, Lab } from '@/lib/types';

export async function fetchSubmissions(): Promise<Submission[]> {
  try {
    const snapshot = await adminDb
      .collection('submissions')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt,
        appointmentDate: data.appointmentDate && typeof data.appointmentDate.toDate === 'function' ? data.appointmentDate.toDate().toISOString() : data.appointmentDate,
        timestamp: data.timestamp && typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate().toISOString() : data.timestamp,
      };
    }) as Submission[];
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
}

export async function fetchLabs(): Promise<Lab[]> {
  try {
    const snapshot = await adminDb.collection('labs').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lab[];
  } catch (error) {
    console.error('Error fetching labs:', error);
    return [];
  }
}

export async function fetchLabTransactions(): Promise<LabTransaction[]> {
  try {
    const snapshot = await adminDb
      .collection('lab_transactions')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LabTransaction[];
  } catch (error) {
    console.error('Error fetching lab transactions:', error);
    return [];
  }
}

export async function getSuggestions(collectionName: 'patients' | 'labs', queryText: string) {
  try {
    let query;
    if (queryText) {
      query = adminDb
        .collection(collectionName)
        .where('name', '>=', queryText)
        .where('name', '<=', queryText + '\uf8ff')
        .limit(10);
    } else {
      query = adminDb.collection(collectionName).limit(10);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as (Patient | Lab)[];
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
}
