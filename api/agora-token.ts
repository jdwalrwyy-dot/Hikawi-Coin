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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authorization = req.headers.authorization || req.headers.Authorization || "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!idToken) return res.status(401).json({ error: "Authentication required" });

  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY;
  const appId = process.env.AGORA_APP_ID;
  const certificate = process.env.AGORA_APP_CERTIFICATE;
  if (!apiKey || !appId || !certificate) {
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
    if (!identityResponse.ok) return res.status(401).json({ error: "Invalid session" });
    const identity = await identityResponse.json() as { users?: Array<{ localId?: string; disabled?: boolean }> };
    const firebaseUser = identity.users?.[0];
    if (!firebaseUser?.localId || firebaseUser.disabled) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const body = (req.body && typeof req.body === "object" ? req.body : {}) as {
      channel?: unknown; uid?: unknown;
    };
    const channel = typeof body.channel === "string" ? body.channel.trim() : "";
    const uid = body.uid;
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(channel) || !Number.isInteger(uid) ||
        typeof uid !== "number" || uid < 1 || uid > 4294967295) {
      return res.status(400).json({ error: "Invalid channel or uid" });
    }

    const tokenLifetimeSeconds = 60 * 60;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId, certificate, channel, uid, 1,
      tokenLifetimeSeconds, tokenLifetimeSeconds,
    );
    return res.status(200).json({
      appId, token, uid,
      expiresAt: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds,
    });
  } catch {
    return res.status(500).json({ error: "Unable to create RTC token" });
  }
}
