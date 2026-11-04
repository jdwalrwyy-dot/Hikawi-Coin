import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type User } from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const isFirebaseConfigured = Object.values(firebaseConfig).every((value) => typeof value === "string" && value.length > 0);
let firebaseApp: FirebaseApp | null = null;
if (isFirebaseConfigured) firebaseApp = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;

export async function saveUserProfile(user: User): Promise<void> {
  if (!db) throw new Error("Firebase غير مُعدّ بعد.");
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    displayName: user.displayName ?? "عضو حكاوي",
    photoURL: user.photoURL ?? null,
    email: user.email ?? null,
    phoneNumber: user.phoneNumber ?? null,
    lastSignInAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
