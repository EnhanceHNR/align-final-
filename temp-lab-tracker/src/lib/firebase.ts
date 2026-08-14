
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, getDocs, query, where, limit, setDoc, orderBy, Timestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import type { Submission, Patient, Lab } from './types';

import { firebaseConfig } from '@/firebase/config';

const CLIENT_APP_NAME = "labtrack-client-lib";

let app;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

try {
  const apps = getApps();
  app = apps.find(a => a.name === CLIENT_APP_NAME);
  if (!app) {
    app = initializeApp(firebaseConfig, CLIENT_APP_NAME);
  }
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase Client init error:", error);
}

const submissionsCollection = db ? collection(db, 'submissions') : null as any;
const patientsCollection = db ? collection(db, 'patients') : null as any;
const labsCollection = db ? collection(db, 'labs') : null as any;

// Submissions
export const addSubmission = async (submission: Omit<Submission, 'id'>) => {
  return await addDoc(submissionsCollection, {
    ...submission,
    createdAt: Timestamp.fromDate(new Date(submission.createdAt)),
    appointmentDate: submission.appointmentDate ? Timestamp.fromDate(new Date(submission.appointmentDate)) : null,
  });
};

export const getSubmissions = async (): Promise<Submission[]> => {
    const q = query(submissionsCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate(),
            appointmentDate: (data.appointmentDate as Timestamp)?.toDate(),
        } as Submission;
    });
};


// Autocomplete Entities
export const upsertEntity = async (collectionName: 'patients' | 'labs', name: string, additionalData?: Record<string, any>) => {
  const coll = collectionName === 'patients' ? patientsCollection : labsCollection;
  const docRef = doc(coll, name.toLowerCase().replace(/\s+/g, '-'));
  await setDoc(docRef, { name, createdAt: Timestamp.now(), ...additionalData }, { merge: true });
};

export const getAutocompleteSuggestions = async (collectionName: 'patients' | 'labs', queryString: string): Promise<(Patient | Lab)[]> => {
  const coll = collectionName === 'patients' ? patientsCollection : labsCollection;
  const q = query(
    coll,
    where('name', '>=', queryString),
    where('name', '<=', queryString + '\uf8ff'),
    limit(10)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient | Lab));
};

export { db, storage };
