'use client';

import { firebaseConfig } from '@/lib/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export function initializeFirebase() {
  const CLIENT_APP_NAME = "dental-client";
  const apps = getApps();
  const existingApp = apps.find(app => app.name === CLIENT_APP_NAME);

  if (existingApp) {
    return getSdks(existingApp);
  }

  let firebaseApp;
  try {
    firebaseApp = initializeApp(firebaseConfig, CLIENT_APP_NAME);
  } catch (e) {
    firebaseApp = getApp(CLIENT_APP_NAME);
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  let authInstance = null;
  let firestoreInstance = null;

  try {
    authInstance = getAuth(firebaseApp);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.warn('Firebase Client Auth init error:', error);
    }
  }

  try {
    firestoreInstance = getFirestore(firebaseApp);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.warn('Firebase Client Firestore init error:', error);
    }
  }

  return {
    firebaseApp,
    auth: authInstance,
    firestore: firestoreInstance
  };
}
