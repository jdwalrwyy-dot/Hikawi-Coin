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
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  async function getToken(): Promise<{ appId: string; token: string; uid: number }> {
    const idToken = await user.getIdToken();
    const response = await fetch("/api/agora-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ channel: room.id, uid: numericUid(user.uid) }),
    });
    const responseText = await response.text();
    let result: { appId?: string; token?: string; uid?: number; error?: string } = {};
    try {
      result = responseText ? JSON.parse(responseText) as typeof result : {};
    } catch {
      const serverMessage = responseText.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim().slice(0, 180);
      if (response.status >= 500) {
        throw new Error("خدمة الصوت على الخادم فيها خطأ مؤقت. راجع إعدادات Agora في Vercel ثم أعد المحاولة.");
      }
      throw new Error(serverMessage || "استجابة خادم الصوت غير مفهومة.");
    }
    if (!response.ok || !result.appId || !result.token || !result.uid) {
      const statusMessage = response.status === 401
        ? "انتهت جلسة الدخول. سجّل خروج وادخل تاني."
        : response.status === 503
          ? "خدمة الصوت غير مكتملة الإعداد. راجع مفاتيح Agora في Vercel."
          : result.error || "تعذر الحصول على تصريح الاتصال.";
      throw new Error(statusMessage);
    }
    return { appId: result.appId, token: result.token, uid: result.uid };
  }

  useEffect(() => () => {
    const client = clientRef.current;
    const track = trackRef.current;
    track?.stop();
    track?.close();
    if (client) void client.leave().catch(() => undefined);
  }, []);

  async function join(seatIndex = 0) {
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
      setSelectedSeat(seatIndex);
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
      setSelectedSeat(null);
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
      setSelectedSeat(null);
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
            const isLocal = index === selectedSeat;
            const remoteIndex = selectedSeat !== null && index > selectedSeat ? index - 1 : index;
            const remote = connected && !isLocal && remoteIndex >= 0 ? remoteUsers[remoteIndex] : undefined;
            const occupied = (isLocal && connected) || Boolean(remote);
            const chosen = isLocal && !connected;
            return <button
              className={occupied || chosen ? "mic-seat occupied" : "mic-seat"}
              key={index}
              type="button"
              disabled={busy || occupied || connected}
              aria-label={isLocal ? "مقعد المايك المختار لك" : remote ? "مقعد مشغول" : `اختيار مقعد المايك رقم ${index + 1}`}
              onClick={() => { setSelectedSeat(index); setError(""); }}
            >
              <span>{isLocal ? (connected ? (muted ? "🔇" : "🎙️") : "✓") : remote ? "🎙️" : "＋"}</span>
              <small>{isLocal ? (connected ? (muted ? "أنت · صامت" : "أنت") : "مختار لك") : remote ? `عضو ${String(remote.uid).slice(-4)}` : "متاح"}</small>
            </button>;
          })}
        </div>
      </section>
      <div className="room-controls">
        {!connected
          ? <button className="primary-button" type="button" onClick={() => void join(selectedSeat ?? 0)} disabled={busy || selectedSeat === null}>{busy ? "جاري الاتصال..." : selectedSeat === null ? "🎙️ اختر مقعدًا أولًا" : "🎙️ تشغيل المايك والانضمام للصوت"}</button>
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
