import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import config from '../firebase-applet-config.json';

export const isFirestoreConfigured = Boolean(
  config.projectId &&
  config.projectId.trim() !== '' &&
  config.apiKey &&
  config.apiKey.trim() !== ''
);

const firebaseConfig = {
  apiKey: config.apiKey || 'demo-key',
  authDomain: config.authDomain || '',
  projectId: config.projectId || 'demo-project',
  storageBucket: config.storageBucket || '',
  messagingSenderId: config.messagingSenderId || '',
  appId: config.appId || '',
};

// Initialize Firebase App only if properly configured
const app = isFirestoreConfigured
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : null;

// Get Firestore instance safely
export const db: Firestore | null = (() => {
  if (!app || !isFirestoreConfigured) return null;
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (e) {
    try {
      return (config as any).firestoreDatabaseId
        ? getFirestore(app, (config as any).firestoreDatabaseId)
        : getFirestore(app);
    } catch (err) {
      return null;
    }
  }
})();

// Safely initialize Auth instance only if valid API key is present
let authInstance: Auth | null = null;
if (app && isFirestoreConfigured) {
  try {
    authInstance = getAuth(app);
  } catch (e) {
    console.warn('Firebase Auth setup skipped:', e);
  }
}

export const auth = authInstance;

export default app;


