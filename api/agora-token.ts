import { RtcTokenBuilder } from "agora-token";

type ApiRequest = {
  method?: string;
  headers: { authorization?: string; Authorization?: string };
  body?: unknown;
};
type ApiResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(value: unknown): void;
};

type FirestoreDocument = {
  fields?: Record<string, { stringValue?: string }>;
};

function numericUid(firebaseUid: string): number {
  // Keep this algorithm in sync with the client so both sides join
  // the same Agora identity, while never trusting a UID supplied by it.
  let hash = 2166136261;
  for (let i = 0; i < firebaseUid.length; i += 1) {
    hash ^= firebaseUid.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

async function getFirestoreDocument(
  projectId: string,
  documentPath: string,
  idToken: string,
): Promise<FirestoreDocument | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${documentPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(response.status === 403 ? "Firestore access denied" : "Firestore lookup failed");
  }
  return await response.json() as FirestoreDocument;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authorization = req.headers.authorization || req.headers.Authorization || "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!idToken) return res.status(401).json({ error: "Authentication required" });

  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const appId = process.env.AGORA_APP_ID;
  const certificate = process.env.AGORA_APP_CERTIFICATE;
  if (!apiKey || !projectId || !appId || !certificate) {
    return res.status(503).json({ error: "Voice service is not configured" });
  }

  try {
    const identityResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!identityResponse.ok) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const identity = await identityResponse.json() as {
      users?: Array<{ localId?: string; disabled?: boolean }>;
    };
    const firebaseUser = identity.users?.[0];
    if (!firebaseUser?.localId || firebaseUser.disabled) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const body = (req.body && typeof req.body === "object" ? req.body : {}) as {
      channel?: unknown;
    };
    const channel = typeof body.channel === "string" ? body.channel.trim() : "";
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(channel)) {
      return res.status(400).json({ error: "Invalid channel" });
    }

    // Verify the room and membership through Firestore using the verified
    // Firebase user's ID token. The client cannot assert its own membership.
    const [room, membership] = await Promise.all([
      getFirestoreDocument(projectId, `rooms/${channel}`, idToken),
      getFirestoreDocument(projectId, `rooms/${channel}/members/${firebaseUser.localId}`, idToken),
    ]);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const visibility = room.fields?.visibility?.stringValue;
    const ownerUid = room.fields?.ownerUid?.stringValue;
    const isPublic = visibility === "public";
    const isOwner = ownerUid === firebaseUser.localId;
    if (!isPublic && !membership && !isOwner) {
      return res.status(403).json({ error: "You are not allowed to join this room" });
    }

    const uid = numericUid(firebaseUser.localId);
    const tokenLifetimeSeconds = 60 * 60;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      certificate,
      channel,
      uid,
      1,
      tokenLifetimeSeconds,
      tokenLifetimeSeconds,
    );

    return res.status(200).json({
      appId,
      token,
      uid,
      expiresAt: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds,
    });
  } catch {
    return res.status(500).json({ error: "Unable to create RTC token" });
  }
}
