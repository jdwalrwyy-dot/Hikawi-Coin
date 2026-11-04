import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getFirestore, onSnapshot, query, serverTimestamp, setDoc, where, type Unsubscribe } from "firebase/firestore";

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


export interface LiveRoomRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  ownerUid: string;
  ownerName: string;
  visibility: "public" | "private";
  createdAt?: unknown;
  members?: number;
  coverClass?: string;
  symbol?: string;
}

export function subscribePublicRooms(onRooms: (rooms: LiveRoomRecord[]) => void, onError: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase غير مُعدّ بعد.");
  return onSnapshot(query(collection(db, "rooms"), where("visibility", "==", "public")), (snapshot) => {
    const rooms = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() } as LiveRoomRecord))
      .filter((room) => room.visibility === "public");
    onRooms(rooms);
  }, (error) => onError(error));
}

export async function createLiveRoom(input: { name: string; description: string; category: string; user: User }): Promise<string> {
  if (!db) throw new Error("Firebase غير مُعدّ بعد.");
  const name = input.name.trim();
  if (name.length < 3 || name.length > 40) throw new Error("اسم الغرفة لازم يكون من 3 إلى 40 حرف.");
  const ref = await addDoc(collection(db, "rooms"), {
    name,
    description: input.description.trim().slice(0, 160),
    category: input.category,
    ownerUid: input.user.uid,
    ownerName: input.user.displayName || "عضو حكاوي",
    visibility: "public",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, "rooms", ref.id, "members", input.user.uid), {
    uid: input.user.uid,
    displayName: input.user.displayName || "عضو حكاوي",
    joinedAt: serverTimestamp(),
    role: "owner",
  });
  return ref.id;
}

export async function joinLiveRoom(roomId: string, user: User): Promise<void> {
  if (!db) throw new Error("Firebase غير مُعدّ بعد.");
  const roomRef = doc(db, "rooms", roomId);
  const roomSnapshot = await getDoc(roomRef);
  if (!roomSnapshot.exists() || roomSnapshot.data().visibility !== "public") {
    throw new Error("الغرفة غير موجودة أو غير متاحة.");
  }
  const membershipRef = doc(db, "rooms", roomId, "members", user.uid);
  const membershipSnapshot = await getDoc(membershipRef);
  const membershipData = {
    uid: user.uid,
    displayName: user.displayName || "عضو حكاوي",
    joinedAt: serverTimestamp(),
  };
  if (membershipSnapshot.exists()) {
    await setDoc(membershipRef, membershipData, { merge: true });
  } else {
    await setDoc(membershipRef, {
      ...membershipData,
      role: roomSnapshot.data().ownerUid === user.uid ? "owner" : "member",
    });
  }
}
