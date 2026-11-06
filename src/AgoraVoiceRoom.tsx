import { useEffect, useRef, useState } from "react";
import AgoraRTC, { type IAgoraRTCClient, type ILocalAudioTrack, type IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import type { User } from "firebase/auth";
import type { LiveRoomRecord } from "./firebase";

type Props = { room: LiveRoomRecord; user: User };

function numericUid(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

export default function AgoraVoiceRoom({ room, user }: Props) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const trackRef = useRef<ILocalAudioTrack | null>(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);

  async function getToken() {
    const idToken = await user.getIdToken();
    const response = await fetch("/api/agora-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ channel: room.id, uid: numericUid(user.uid) }),
    });
    const result = await response.json() as { appId?: string; token?: string; uid?: number; error?: string };
    if (!response.ok || !result.appId || !result.token || !result.uid) {
      throw new Error(result.error || "تعذر الحصول على تصريح الاتصال.");
    }
    return result;
  }

  useEffect(() => () => {
    const client = clientRef.current;
    const track = trackRef.current;
    track?.stop();
    track?.close();
    if (client) void client.leave().catch(() => undefined);
  }, []);

  async function join() {
    if (busy || connected) return;
    setBusy(true);
    setError("");
    let client: IAgoraRTCClient | null = null;
    try {
      const credentials = await getToken();
      client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;
      client.on("user-published", async (remoteUser, mediaType) => {
        await client?.subscribe(remoteUser, mediaType);
        if (mediaType === "audio") remoteUser.audioTrack?.play();
        setRemoteUsers([...client!.remoteUsers]);
      });
      client.on("user-unpublished", () => setRemoteUsers([...client!.remoteUsers]));
      client.on("user-left", () => setRemoteUsers([...client!.remoteUsers]));
      client.on("token-privilege-will-expire", async () => {
        try { const renewed = await getToken(); await client?.renewToken(renewed.token!); }
        catch { setError("انتهت صلاحية الاتصال. اخرج وادخل الغرفة مرة تانية."); }
      });
      await client.join(credentials.appId, room.id, credentials.token, credentials.uid);
      const track = await AgoraRTC.createMicrophoneAudioTrack();
      trackRef.current = track;
      await client.publish([track]);
      setConnected(true);
      setRemoteUsers([...client.remoteUsers]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "تعذر تشغيل المايك.";
      setError(message.includes("Permission") || message.includes("NotAllowed")
        ? "اسمح للمتصفح باستخدام الميكروفون من إعدادات الموقع."
        : message);
      if (trackRef.current) { trackRef.current.stop(); trackRef.current.close(); trackRef.current = null; }
      if (client) { await client.leave().catch(() => undefined); clientRef.current = null; }
      setConnected(false);
    } finally { setBusy(false); }
  }

  async function toggleMute() {
    const track = trackRef.current;
    if (!track) return;
    const next = !muted;
    await track.setEnabled(!next);
    setMuted(next);
  }

  async function leave() {
    setBusy(true);
    try {
      trackRef.current?.stop();
      trackRef.current?.close();
      trackRef.current = null;
      await clientRef.current?.leave();
      clientRef.current = null;
      setRemoteUsers([]);
      setConnected(false);
      setMuted(false);
    } catch {
      setError("حصلت مشكلة أثناء مغادرة القناة. جرّب تاني.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <section className="mic-panel">
        <div className="section-title"><div><span className="kicker">مجلس حكاوي</span><h2>مقاعد المايك</h2></div><span className="subtle">27 مقعد</span></div>
        <div className="mic-grid">
          {Array.from({ length: 27 }, (_, index) => {
            const isLocal = index === 0 && connected;
            const remote = remoteUsers[index - 1];
            const occupied = isLocal || Boolean(remote);
            return <div className={occupied ? "mic-seat occupied" : "mic-seat"} key={index}>
              <span>{isLocal ? (muted ? "🔇" : "🎙️") : remote ? "🎙️" : "＋"}</span>
              <small>{isLocal ? (muted ? "أنت · صامت" : "أنت") : remote ? `عضو ${String(remote.uid).slice(-4)}` : "متاح"}</small>
            </div>;
          })}
        </div>
      </section>
      <div className="room-controls">
        {!connected
          ? <button className="primary-button" type="button" onClick={() => void join()} disabled={busy}>{busy ? "جاري الاتصال..." : "🎙️ تشغيل المايك والانضمام للصوت"}</button>
          : <>
              <button className="primary-button" type="button" onClick={() => void toggleMute()} disabled={busy}>{muted ? "🔊 إلغاء كتم المايك" : "🔇 كتم المايك"}</button>
              <button className="ghost-button" type="button" onClick={() => void leave()} disabled={busy}>مغادرة الصوت</button>
            </>}
      </div>
      {connected && <p className="room-warning">اتصلت بقناة الصوت. عدد المشاركين الآخرين: {remoteUsers.length}.</p>}
      {error && <p className="room-warning" role="alert">{error}</p>}
    </>
  );
}
