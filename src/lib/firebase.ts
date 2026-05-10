import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Configuration auto-generated from provisioning result
const firebaseConfig = {
  apiKey: "AIzaSyD0fG3vTDsb5B7bOlbghbEohEPgRFgNLN8",
  authDomain: "gen-lang-client-0412823032.firebaseapp.com",
  projectId: "gen-lang-client-0412823032",
  storageBucket: "gen-lang-client-0412823032.firebasestorage.app",
  messagingSenderId: "1080096362685",
  appId: "1:1080096362685:web:b2bb290da4d05873ffe7d4",
  firestoreDatabaseId: "ai-studio-9c439d14-8225-4692-8953-791e8d8b4b32",
};

const isConfigValid = !!firebaseConfig.apiKey && 
                       firebaseConfig.apiKey !== 'undefined' && 
                       firebaseConfig.apiKey !== 'null' && 
                       firebaseConfig.apiKey.trim() !== '';

if (!isConfigValid) {
  console.warn('Firebase configuration is missing or invalid. Check your setup.');
}

export const app: FirebaseApp | null = isConfigValid ? initializeApp(firebaseConfig) : null;
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined) : null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
