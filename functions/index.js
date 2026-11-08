const crypto = require("node:crypto");
const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();
const db = admin.firestore();
const contactHashSecret = defineSecret("CONTACT_HASH_SECRET");

function normalizePhone(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const digits = raw.replace(/\\D/g, "");
  if (!digits) return null;
  if (raw.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.startsWith("00")) return digits.length >= 10 && digits.length <= 17 ? `+${digits.slice(2)}` : null;
  // Egyptian local numbers are normalized to the country code +20.
  if (digits.startsWith("0") && digits.length === 11) return `+20${digits.slice(1)}`;
  if (digits.startsWith("20") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+20${digits}`;
  return null;
}

function phoneHash(phone) {
  return crypto.createHmac("sha256", contactHashSecret.value()).update(phone).digest("hex");
}

function pairIdFor(uidA, uidB) {
  return crypto.createHash("sha256").update([uidA, uidB].sort().join(":")).digest("hex");
}

exports.syncContacts = onCall(
  { region: "us-central1", timeoutSeconds: 120, memory: "256MiB", secrets: [contactHashSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "سجّل الدخول أولاً.");
    const uid = request.auth.uid;
    const supplied = request.data && request.data.phoneNumbers;
    if (!Array.isArray(supplied) || supplied.length > 250) {
      throw new HttpsError("invalid-argument", "اختار حتى 250 رقمًا في المرة الواحدة.");
    }

    const userRecord = await admin.auth().getUser(uid);
    const ownPhone = normalizePhone(userRecord.phoneNumber || "");
    if (!ownPhone) {
      throw new HttpsError("failed-precondition", "لازم توثّق رقم هاتفك في حكاوي كوين قبل اكتشاف الأصدقاء.");
    }

    const metaRef = db.collection("contactSyncMeta").doc(uid);
    await db.runTransaction(async (tx) => {
      const meta = await tx.get(metaRef);
      const lastSync = meta.exists && meta.get("lastSyncAt") ? meta.get("lastSyncAt").toMillis() : 0;
      if (Date.now() - lastSync < 30000) {
        throw new HttpsError("resource-exhausted", "استنى 30 ثانية قبل مزامنة جهات الاتصال مرة أخرى.");
      }
      tx.set(metaRef, { lastSyncAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });

    const phones = [...new Set(supplied.map(normalizePhone).filter(Boolean))]
      .filter((phone) => phone !== ownPhone);
    const ownHash = phoneHash(ownPhone);
    const contactsRef = db.collection("contactSync").doc(uid).collection("contacts");
    const oldContacts = await contactsRef.get();
    const deleteBatch = db.batch();
    oldContacts.docs.forEach((item) => deleteBatch.delete(item.ref));
    if (!oldContacts.empty) await deleteBatch.commit();

    for (let offset = 0; offset < phones.length; offset += 400) {
      const batch = db.batch();
      phones.slice(offset, offset + 400).forEach((phone) => {
        batch.set(contactsRef.doc(phoneHash(phone)), {
          phoneHash: phoneHash(phone),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    let matchedCount = 0;
    for (const phone of phones) {
      const candidateSnapshot = await db.collection("users")
        .where("phoneNumber", "==", phone).limit(1).get();
      if (candidateSnapshot.empty) continue;
      const candidate = candidateSnapshot.docs[0];
      if (candidate.id === uid) continue;

      // Mutual match: the other account must also have imported this user's verified number.
      const reciprocal = await db.collection("contactSync").doc(candidate.id)
        .collection("contacts").doc(ownHash).get();
      if (!reciprocal.exists) continue;

      const otherAuth = await admin.auth().getUser(candidate.id);
      if (normalizePhone(otherAuth.phoneNumber || "") !== phone) continue;

      const pairId = pairIdFor(uid, candidate.id);
      const friendshipRef = db.collection("friendships").doc(pairId);
      const ownProfile = await db.collection("users").doc(uid).get();
      const otherProfile = candidate;
      const profiles = {
        [uid]: {
          displayName: ownProfile.get("displayName") || userRecord.displayName || "عضو حكاوي",
          photoURL: ownProfile.get("photoURL") || userRecord.photoURL || null,
        },
        [candidate.id]: {
          displayName: otherProfile.get("displayName") || otherAuth.displayName || "عضو حكاوي",
          photoURL: otherProfile.get("photoURL") || otherAuth.photoURL || null,
        },
      };
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(friendshipRef);
        if (!existing.exists) {
          tx.create(friendshipRef, {
            memberUids: [uid, candidate.id].sort(),
            profiles,
            source: "mutual_contacts",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          tx.set(friendshipRef, { profiles, lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
      });
      matchedCount += 1;
    }

    return { matchedCount };
  },
);
