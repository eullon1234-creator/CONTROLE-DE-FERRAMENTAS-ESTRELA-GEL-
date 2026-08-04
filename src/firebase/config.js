import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBty7Tz3RQ8bScCw4oH2b_iqA6FPc6W0t8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "controle-de-ferramentas-efde4.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "controle-de-ferramentas-efde4",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "controle-de-ferramentas-efde4.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "313513963680",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:313513963680:web:52b4df54cfd88de51899c5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XNJHJN417B"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// Collection Names to prevent clashing with other apps in the same Firebase project
export const COLLECTIONS = {
  EQUIPAMENTOS: 'ferramentas_equipamentos',
  COLABORADORES: 'ferramentas_colaboradores',
  TERMOS: 'ferramentas_termos',
  OS_CONSERTO: 'ferramentas_os_conserto'
};

export default app;
