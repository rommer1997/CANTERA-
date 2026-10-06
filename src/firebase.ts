import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import localConfig from '../firebase-applet-config.json';

// Public Firebase configuration is compiled by Vite, independently of Hosting.
const getFirebaseConfig = () => {
  const env = import.meta.env;
  
  // Prefer explicit build environment variables.
  if (env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
      databaseId: env.VITE_FIREBASE_DATABASE_ID
    };
  }
  
  // Fallback to local JSON
  return {
    apiKey: localConfig.apiKey,
    authDomain: localConfig.authDomain,
    projectId: localConfig.projectId,
    storageBucket: localConfig.storageBucket,
    messagingSenderId: localConfig.messagingSenderId,
    appId: localConfig.appId,
    databaseId: localConfig.firestoreDatabaseId
  };
};

const config = getFirebaseConfig();

if (!config.apiKey || config.apiKey.includes('TODO')) {
  console.warn("Firebase API Key is missing or invalid. Check the public Firebase build configuration.");
}

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, config.databaseId || '(default)');
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
