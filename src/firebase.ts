import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type User } from "firebase/auth";
import {
  addDoc, collection, deleteField, doc, getDoc, getFirestore, limit, onSnapshot,
  orderBy, query, runTransaction, serverTimestamp, setDoc, where,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.length > 0,
);

let firebaseApp: FirebaseApp | null = null;
if (isFirebaseConfigured) {
  firebaseApp = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
}
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;

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
export function subscribePublicRooms(
  onRooms: (rooms: LiveRoomRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Firebase غير مُعدّ بعد.");
  return onSnapshot(
    query(collection(db, "rooms"), where("visibility", "==", "public")),
    (snapshot) => onRooms(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as LiveRoomRecord))),
    onError,
  );
}
export async function createLiveRoom(input: {
  name: string; description: string; category: string; user: User;
}): Promise<LiveRoomRecord> {
  if (!db) throw new Error("Firebase غير مُعدّ بعد.");
  const name = input.name.trim();
  if (name.length < 3 || name.length > 40) throw new Error("اسم الغرفة لازم يكون من 3 إلى 40 حرف.");
  const roomRef = doc(collection(db, "rooms"));
  // Create the room as a single write. Keeping membership as a separate operation
  // avoids an atomic parent/subcollection write being rejected by stricter rules.
  await setDoc(roomRef, {
    name,
    description: input.description.trim().slice(0, 160),
    category: input.category,
    ownerUid: input.user.uid,
    ownerName: input.user.displayName || "عضو حكاوي",
    visibility: "public",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return {
    id: roomRef.id, name, description: input.description, category: input.category,
    ownerUid: input.user.uid, ownerName: input.user.displayName || "عضو حكاوي",
    visibility: "public",
  };
}
export async function joinLiveRoom(roomId: string, user: User): Promise<void> {
  if (!db) throw new Error("Firebase غير مُعدّ بعد.");
  const roomRef = doc(db, "rooms", roomId);
  const roomSnapshot = await getDoc(roomRef);
  if (!roomSnapshot.exists() || roomSnapshot.data().visibility !== "public") {
    throw new Error("الغرفة غير موجودة أو غير متاحة.");
  }
  const memberRef = doc(db, "rooms", roomId, "members", user.uid);
  const memberSnapshot = await getDoc(memberRef);
  const base = { uid: user.uid, displayName: user.displayName || "عضو حكاوي", joinedAt: serverTimestamp() };
  if (memberSnapshot.exists()) {
    await setDoc(memberRef, base, { merge: true });
  } else {
    await setDoc(memberRef, {
      ...base,
      role: roomSnapshot.data().ownerUid === user.uid ? "owner" : "member",
    });
  }
}

export interface MicSeatRecord {
  id: string;
  seatNumber: number;
  uid: string;
  displayName: string;
  photoURL: string | null;
}

export function subscribeMicSeats(
  roomId: string,
  onSeats: (seats: MicSeatRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  return onSnapshot(
    collection(db, "rooms", roomId, "micSeats"),
    (snapshot) => onSeats(snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    } as MicSeatRecord))),
    onError,
  );
}

export async function claimMicSeat(roomId: string, seatNumber: number, user: User): Promise<void> {
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > 27) {
    throw new Error("اختار مقعد مايك صحيح.");
  }

  const memberRef = doc(db, "rooms", roomId, "members", user.uid);
  const targetSeatRef = doc(db, "rooms", roomId, "micSeats", String(seatNumber));

  await runTransaction(db, async (transaction) => {
    const [memberSnapshot, targetSeatSnapshot] = await Promise.all([
      transaction.get(memberRef),
      transaction.get(targetSeatRef),
    ]);
    if (!memberSnapshot.exists()) throw new Error("لازم تدخل الغرفة الأول.");
    if (targetSeatSnapshot.exists() && targetSeatSnapshot.data().uid !== user.uid) {
      throw new Error("المايك ده مشغول. اختار مقعد تاني.");
    }

    const currentSeat = memberSnapshot.data().micSeat as number | undefined;
    if (currentSeat === seatNumber && targetSeatSnapshot.exists()) return;

    if (Number.isInteger(currentSeat) && currentSeat! >= 1 && currentSeat! <= 27 && currentSeat !== seatNumber) {
      const previousSeatRef = doc(db, "rooms", roomId, "micSeats", String(currentSeat));
      const previousSeatSnapshot = await transaction.get(previousSeatRef);
      if (previousSeatSnapshot.exists() && (previousSeatSnapshot.data() as { uid?: string }).uid === user.uid) {
        transaction.delete(previousSeatRef);
      }
    }
    transaction.set(targetSeatRef, {
      seatNumber,
      uid: user.uid,
      displayName: user.displayName || "عضو حكاوي",
      photoURL: user.photoURL || null,
      updatedAt: serverTimestamp(),
    });
    transaction.set(memberRef, { micSeat: seatNumber }, { merge: true });
  });
}

export async function releaseMicSeat(roomId: string, user: User): Promise<void> {
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const memberRef = doc(db, "rooms", roomId, "members", user.uid);

  await runTransaction(db, async (transaction) => {
    const memberSnapshot = await transaction.get(memberRef);
    if (!memberSnapshot.exists()) return;
    const currentSeat = memberSnapshot.data().micSeat as number | undefined;
    if (!Number.isInteger(currentSeat) || currentSeat! < 1 || currentSeat! > 27) return;

    const seatRef = doc(db, "rooms", roomId, "micSeats", String(currentSeat));
    const seatSnapshot = await transaction.get(seatRef);
    if (seatSnapshot.exists() && seatSnapshot.data().uid === user.uid) {
      transaction.delete(seatRef);
    }
    transaction.set(memberRef, { micSeat: deleteField() }, { merge: true });
  });
}

export interface MomentRecord {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhotoURL: string | null;
  text: string;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  likesCount: number;
  createdAt?: unknown;
}
export interface MomentComment {
  id: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt?: unknown;
}
export function subscribeMoments(
  onMoments: (moments: MomentRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Firebase غير مُعدّ بعد.");
  return onSnapshot(
    query(collection(db, "moments"), orderBy("createdAt", "desc"), limit(40)),
    (snapshot) => onMoments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as MomentRecord))),
    onError,
  );
}
export async function createMoment(input: { user: User; text: string; file?: File | null }): Promise<void> {
  if (!db || !storage) throw new Error("خدمة التخزين غير مُعدّة.");
  const text = input.text.trim();
  const file = input.file ?? null;
  if (!text && !file) throw new Error("اكتب منشور أو اختار صورة أو فيديو.");
  if (file && file.size > 100 * 1024 * 1024) throw new Error("حجم الملف أكبر من 100 ميجابايت.");
  if (file && !["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
    throw new Error("نوع الملف غير مدعوم. استخدم صورة أو فيديو شائع.");
  }
  let mediaUrl: string | null = null;
  let mediaType: "image" | "video" | null = null;
  if (file) {
    mediaType = file.type.startsWith("video/") ? "video" : "image";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileRef = ref(storage, `moments/${input.user.uid}/${crypto.randomUUID()}_${safeName}`);
    await uploadBytes(fileRef, file, { contentType: file.type });
    mediaUrl = await getDownloadURL(fileRef);
  }
  await addDoc(collection(db, "moments"), {
    authorUid: input.user.uid,
    authorName: input.user.displayName || "عضو حكاوي",
    authorPhotoURL: input.user.photoURL || null,
    text: text.slice(0, 5000),
    mediaUrl,
    mediaType,
    likesCount: 0,
    createdAt: serverTimestamp(),
  });
}
export async function toggleMomentLike(momentId: string, uid: string): Promise<boolean> {
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const momentRef = doc(db, "moments", momentId);
  const likeRef = doc(db, "moments", momentId, "likes", uid);
  return runTransaction(db, async (transaction) => {
    const [momentSnapshot, likeSnapshot] = await Promise.all([
      transaction.get(momentRef), transaction.get(likeRef),
    ]);
    if (!momentSnapshot.exists()) throw new Error("المنشور لم يعد موجودًا.");
    const count = Number(momentSnapshot.data().likesCount || 0);
    if (likeSnapshot.exists()) {
      transaction.delete(likeRef);
      transaction.update(momentRef, { likesCount: Math.max(0, count - 1) });
      return false;
    }
    transaction.set(likeRef, { uid, createdAt: serverTimestamp() });
    transaction.update(momentRef, { likesCount: count + 1 });
    return true;
  });
}
export async function hasLikedMoment(momentId: string, uid: string): Promise<boolean> {
  if (!db) return false;
  return (await getDoc(doc(db, "moments", momentId, "likes", uid))).exists();
}
export function subscribeMomentComments(
  momentId: string,
  onComments: (comments: MomentComment[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  return onSnapshot(
    query(collection(db, "moments", momentId, "comments"), orderBy("createdAt", "asc"), limit(50)),
    (snapshot) => onComments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as MomentComment))),
    onError,
  );
}
export async function addMomentComment(momentId: string, user: User, text: string): Promise<void> {
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const clean = text.trim();
  if (!clean || clean.length > 1000) throw new Error("اكتب تعليقًا لا يزيد عن 1000 حرف.");
  await addDoc(collection(db, "moments", momentId, "comments"), {
    authorUid: user.uid,
    authorName: user.displayName || "عضو حكاوي",
    text: clean,
    createdAt: serverTimestamp(),
  });
}
