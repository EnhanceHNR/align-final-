'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const CLIENT_APP_NAME = "labtrack-client";
  const apps = getApps();
  const existingApp = apps.find(app => app.name === CLIENT_APP_NAME);

  if (existingApp) {
    return getSdks(existingApp);
  }

  // Initialize a NAMED app to avoid conflicting with the incomplete [DEFAULT] app 
  // that Firebase Web Frameworks automatically injects during SSR.
  let firebaseApp;
  try {
    firebaseApp = initializeApp(firebaseConfig, CLIENT_APP_NAME);
  } catch (e: any) {
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
    auth: authInstance as ReturnType<typeof getAuth>,
    firestore: firestoreInstance as ReturnType<typeof getFirestore>
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
