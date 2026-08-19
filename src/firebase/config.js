import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore 
} from 'firebase/firestore';

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

// Inicializa Firestore com persistência robusta em IndexedDB (suporte multi-aba e offline)
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  // Caso já tenha sido inicializado ou ambiente não suporte IndexedDB
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

// Nomes de coleções padronizados no Firestore
export const COLLECTIONS = {
  EQUIPAMENTOS: 'ferramentas_equipamentos',
  COLABORADORES: 'ferramentas_colaboradores',
  TERMOS: 'ferramentas_termos',
  OS_CONSERTO: 'ferramentas_os_conserto',
  AUDIT_LOG: 'ferramentas_audit_log'
};

export default app;
