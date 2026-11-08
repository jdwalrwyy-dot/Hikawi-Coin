import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  GoogleAuthProvider, RecaptchaVerifier, onAuthStateChanged,
  signInWithPhoneNumber, signInWithPopup, signOut,
  type ConfirmationResult, type User,
} from "firebase/auth";
import type { LiveRoomRecord, MomentComment, MomentRecord } from "./firebase";
import {
  auth, db, isFirebaseConfigured, saveUserProfile, subscribePublicRooms,
  createLiveRoom, joinLiveRoom, subscribeMoments, createMoment, toggleMomentLike,
  hasLikedMoment, subscribeMomentComments, addMomentComment,
} from "./firebase";

type Tab = "home" | "live" | "moments" | "games" | "messages" | "profile";
type Notice = { kind: "success" | "error" | "info"; text: string };
const navigation: { id: Tab; icon: string; label: string }[] = [
  { id: "home", icon: "⌂", label: "الرئيسية" },
  { id: "live", icon: "◉", label: "مباشر" },
  { id: "moments", icon: "▧", label: "لحظات" },
  { id: "games", icon: "♟", label: "ألعاب" },
  { id: "messages", icon: "▤", label: "رسائل" },
  { id: "profile", icon: "♙", label: "حسابي" },
];
const games = [
  { q: "ما هي عاصمة مصر؟", answers: ["الإسكندرية", "القاهرة", "الأقصر"], correct: 1 },
  { q: "كم عدد أيام الأسبوع؟", answers: ["5 أيام", "6 أيام", "7 أيام"], correct: 2 },
  { q: "أي كوكب يُعرف بالكوكب الأحمر؟", answers: ["المريخ", "الزهرة", "زحل"], correct: 0 },
];

function friendlyError(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code) : "";
  if (code.includes("auth/unauthorized-domain")) return "الدومين غير مضاف في Firebase Authorized domains.";
  if (code.includes("auth/operation-not-allowed")) return "طريقة الدخول دي مش مفعّلة في Firebase Authentication.";
  if (code.includes("auth/popup-closed-by-user")) return "تم إغلاق نافذة تسجيل الدخول قبل اكتمال العملية.";
  if (code.includes("auth/invalid-phone-number")) return "رقم الهاتف غير صحيح. اكتب الرقم بصيغة مصرية.";
  if (code.includes("auth/too-many-requests")) return "محاولات كتير خلال وقت قصير. جرّب بعد شوية.";
  if (code.includes("auth/invalid-verification-code")) return "رمز التحقق غير صحيح.";
  if (code.includes("auth/code-expired")) return "رمز التحقق انتهت صلاحيته. اطلب رمز جديد.";
  if (code.includes("permission-denied")) return "Firebase رفض العملية بسبب قواعد الصلاحيات. راجع نشر firestore.rules وstorage.rules.";
  if (error instanceof Error && error.message) return error.message;
  return "حصل خطأ غير متوقع. جرّب مرة تانية.";
}

function phoneToE164(value: string): string {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return "+" + digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("20")) return "+" + digits;
  if (digits.startsWith("0")) return "+20" + digits.slice(1);
  if (digits.length === 10) return "+20" + digits;
  return "+20" + digits;
}

function Avatar({ user, size = "normal" }: { user: Pick<User, "photoURL" | "displayName"> | null; size?: "normal" | "large" }) {
  const className = size === "large" ? "avatar avatar-large" : "avatar";
  return <div className={className}>{user?.photoURL ? <img src={user.photoURL} alt="" /> : <span>{(user?.displayName || "ح").slice(0, 1)}</span>}</div>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const [rooms, setRooms] = useState<LiveRoomRecord[]>([]);
  const [roomFilter, setRoomFilter] = useState("الكل");
  const [moments, setMoments] = useState<MomentRecord[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [momentText, setMomentText] = useState("");
  const [momentFile, setMomentFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomCategory, setRoomCategory] = useState("دردشة");
  const [selectedRoom, setSelectedRoom] = useState<LiveRoomRecord | null>(null);
  const [commentMoment, setCommentMoment] = useState<MomentRecord | null>(null);
  const [comments, setComments] = useState<MomentComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [gameIndex, setGameIndex] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const filteredRooms = roomFilter === "الكل" ? rooms : rooms.filter((room) => room.category === roomFilter);

  useEffect(() => {
    if (!auth) { setAuthReady(true); return; }
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try { await saveUserProfile(nextUser); }
        catch (error) { setNotice({ kind: "error", text: friendlyError(error) }); }
      }
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user || !db) { setRooms([]); setMoments([]); return; }
    const stopRooms = subscribePublicRooms(setRooms, (error) => setNotice({ kind: "error", text: friendlyError(error) }));
    const stopMoments = subscribeMoments(setMoments, (error) => setNotice({ kind: "error", text: friendlyError(error) }));
    return () => { stopRooms(); stopMoments(); };
  }, [user]);

  useEffect(() => {
    if (!user || !db || moments.length === 0) { setLikedIds([]); return; }
    let active = true;
    void Promise.all(moments.map(async (moment) => ({ id: moment.id, liked: await hasLikedMoment(moment.id, user.uid) })))
      .then((items) => { if (active) setLikedIds(items.filter((item) => item.liked).map((item) => item.id)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [user, moments]);

  useEffect(() => {
    if (!commentMoment) { setComments([]); return; }
    const stop = subscribeMomentComments(
      commentMoment.id,
      setComments,
      (error) => setNotice({ kind: "error", text: friendlyError(error) }),
    );
    return () => stop();
  }, [commentMoment]);

  useEffect(() => () => { recaptchaRef.current?.clear(); }, []);

  async function googleLogin() {
    if (!auth) return setNotice({ kind: "error", text: "إعدادات Firebase غير مكتملة على الموقع." });
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (error) { setNotice({ kind: "error", text: friendlyError(error) }); }
    finally { setBusy(false); }
  }

  async function requestPhoneCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return setNotice({ kind: "error", text: "إعدادات Firebase غير مكتملة على الموقع." });
    const normalized = phoneToE164(phone);
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      return setNotice({ kind: "error", text: "اكتب رقم هاتف صحيح، مثال: 01012345678." });
    }
    setBusy(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      }
      const result = await signInWithPhoneNumber(auth, normalized, recaptchaRef.current);
      setConfirmation(result);
      setNotice({ kind: "success", text: "بعتنالك رمز التحقق برسالة SMS." });
    } catch (error) {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      setNotice({ kind: "error", text: friendlyError(error) });
    } finally { setBusy(false); }
  }

  async function verifyPhoneCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmation) return;
    if (!/^\d{6}$/.test(code.trim())) return setNotice({ kind: "error", text: "اكتب رمز التحقق المكوّن من 6 أرقام." });
    setBusy(true);
    try { await confirmation.confirm(code.trim()); }
    catch (error) { setNotice({ kind: "error", text: friendlyError(error) }); }
    finally { setBusy(false); }
  }

  async function logout() {
    if (!auth) return;
    try { await signOut(auth); setTab("home"); setSelectedRoom(null); setConfirmation(null); }
    catch (error) { setNotice({ kind: "error", text: friendlyError(error) }); }
  }

  async function publishMoment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setPosting(true);
    try {
      await createMoment({ user, text: momentText, file: momentFile });
      setMomentText(""); setMomentFile(null);
      const input = document.getElementById("moment-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setNotice({ kind: "success", text: "تم نشر اللحظة بنجاح." });
    } catch (error) { setNotice({ kind: "error", text: friendlyError(error) }); }
    finally { setPosting(false); }
  }

  async function likeMoment(moment: MomentRecord) {
    if (!user) return;
    try {
      const liked = await toggleMomentLike(moment.id, user.uid);
      setLikedIds((current) => liked ? [...current, moment.id] : current.filter((id) => id !== moment.id));
    } catch (error) { setNotice({ kind: "error", text: friendlyError(error) }); }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !commentMoment) return;
    try {
      await addMomentComment(commentMoment.id, user, commentText);
      setCommentText("");
    } catch (error) { setNotice({ kind: "error", text: friendlyError(error) }); }
  }

  async function submitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    try {
      const room = await createLiveRoom({ name: roomName, description: roomDescription, category: roomCategory, user });
      setRooms((current) => [room, ...current]);
      setSelectedRoom(room);
      setCreateRoomOpen(false);
      setRoomName(""); setRoomDescription("");
      setNotice({ kind: "success", text: "اتعملت الغرفة واتسجلت في قاعدة البيانات." });
    } catch (error) { setNotice({ kind: "error", text: friendlyError(error) }); }
  }

  async function enterRoom(room: LiveRoomRecord) {
    if (!user) return;
    try {
      await joinLiveRoom(room.id, user);
      setSelectedRoom(room);
    } catch (error) { setNotice({ kind: "error", text: friendlyError(error) }); }
  }

  if (!authReady) return <div className="loading-screen"><div className="brand-mark">ح</div><strong>حكاوي كوين</strong><span className="loader" /><small>بنجهز مكانك...</small></div>;

  if (!user) {
    return (
      <main className="auth-screen" dir="rtl" lang="ar">
        <div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" />
        <header className="auth-header"><div className="brand-lockup"><div className="brand-mark">ح</div><div><b>حكاوي كوين</b><small>كل حكاية ليها مكان</small></div></div><span className="secure-label">● مجتمعك في مكان واحد</span></header>
        <section className="auth-layout">
          <div className="auth-story"><span className="kicker">أهلاً بيك في عالمك</span><h1>قريبين من بعض،<br /><em>مهما بعدت المسافات.</em></h1><p>غرف صوتية، بث مباشر، لحظات من يومك، وأصحابك في مساحة واحدة.</p>
            <div className="feature-pills"><span>🎙️ غرف صوتية</span><span>📱 بث مباشر</span><span>✨ لحظات</span><span>💬 رسائل</span></div>
            <div className="auth-art"><div className="art-orb orb-a">✦</div><div className="art-orb orb-b">♬</div><div className="art-crown">♛</div><div className="art-disc">ح</div><div className="art-ring" /></div>
          </div>
          <section className="auth-card">
            <div className="card-top"><span className="kicker">ابدأ رحلتك</span><h2>سجّل دخولك</h2><p>اختار الطريقة المناسبة ليك وادخل حكاوي كوين.</p></div>
            <button className="google-login" type="button" onClick={googleLogin} disabled={busy || !isFirebaseConfigured}><span className="google-g">G</span>{busy ? "جاري الاتصال..." : "المتابعة باستخدام Google"}</button>
            <div className="or-divider"><span>أو برقم الموبايل</span></div>
            {!confirmation ? (
              <form onSubmit={requestPhoneCode} className="auth-form">
                <label htmlFor="phone-number">رقم الهاتف</label>
                <div className="phone-field"><span>🇪🇬 +20</span><input id="phone-number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10xxxxxxxx" inputMode="tel" autoComplete="tel" /></div>
                <button className="primary-button full" type="submit" disabled={busy || !isFirebaseConfigured}>{busy ? "جاري إرسال الرمز..." : "إرسال رمز التحقق"}</button>
              </form>
            ) : (
              <form onSubmit={verifyPhoneCode} className="auth-form">
                <label htmlFor="verify-code">رمز التحقق</label>
                <input className="code-field" id="verify-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="● ● ● ● ● ●" inputMode="numeric" autoComplete="one-time-code" />
                <button className="primary-button full" type="submit" disabled={busy}>{busy ? "جاري التحقق..." : "تأكيد الدخول"}</button>
                <button type="button" className="text-action" onClick={() => { setConfirmation(null); setCode(""); }}>تغيير رقم الهاتف</button>
              </form>
            )}
            <div id="recaptcha-container" />
            {!isFirebaseConfigured && <div className="config-alert">إعدادات Firebase غير موجودة في بيئة الموقع. أضف مفاتيح VITE_FIREBASE_* إلى إعدادات Vercel.</div>}
            <p className="legal-note">بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية الخاصة بحكاوي كوين.</p>
          </section>
        </section>
        {notice && <div className={`toast toast-${notice.kind}`} role="status">{notice.text}<button onClick={() => setNotice(null)}>×</button></div>}
      </main>
    );
  }

  if (selectedRoom) {
    return (
      <main className="room-screen v10-room-screen" dir="rtl" lang="ar">
        <header className="subpage-header v10-room-header">
          <button className="round-button" onClick={() => setSelectedRoom(null)} aria-label="العودة">→</button>
          <div className="v10-room-heading"><b>{selectedRoom.name}</b><small>{selectedRoom.category} · غرفة صوتية</small></div>
          <span className="live-chip">غرفة عامة</span>
        </header>
        <section className="room-stage v10-room-stage">
          <span className="kicker">مجلس حكاوي الملكي</span>
          <h1>{selectedRoom.name}</h1>
          <p>{selectedRoom.description || "لمة حلوة وأصحاب جداد."}</p>
          <div className="room-owner v10-room-owner"><Avatar user={user} /><span><b>{selectedRoom.ownerName}</b><small>صاحب الغرفة</small></span><span className="v10-owner-crown">♛</span></div>
        </section>
        <section className="mic-panel v10-mic-panel">
          <div className="section-title">
            <div><span className="kicker">مقاعد المشاركة</span><h2>مسرح المايكات الملكي</h2></div>
            <span className="subtle">27 مقعد</span>
          </div>
          <p className="v10-mic-hint">اختار مقعداً للمشاركة عندما تتوفر خدمة الصوت المباشر.</p>
          <div className="v10-mic-rows">
            {[0, 1, 2].map((row) => (
              <div className="v10-mic-row" key={row}>
                {Array.from({ length: 9 }, (_, col) => {
                  const seat = row * 9 + col;
                  const isHost = seat === 0;
                  return (
                    <div className={isHost ? "v10-mic-seat v10-mic-host" : "v10-mic-seat"} key={seat}>
                      <span>{isHost ? "♛" : "＋"}</span>
                      <small>{isHost ? "المالك" : seat + 1}</small>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="v10-seat-legend"><span><i className="seat-dot occupied-dot" /> مقعد المالك</span><span><i className="seat-dot free-dot" /> مقعد متاح</span></div>
        </section>
        <div className="room-warning v10-room-warning">تم تسجيل دخولك للغرفة. الصوت المباشر وفتح المايك يحتاجان ربط مزود RTC آمن؛ لذلك المايك غير مفعّل حالياً.</div>
        <div className="room-controls v10-room-controls"><button disabled className="primary-button">🎙️ الصوت غير متاح حالياً</button><button className="ghost-button" onClick={() => setSelectedRoom(null)}>مغادرة الغرفة</button></div>
        {notice && <div className={`toast toast-${notice.kind}`} role="status">{notice.text}<button onClick={() => setNotice(null)}>×</button></div>}
      </main>
    );
  }

  return (
    <main className="app-shell" dir="rtl" lang="ar">
      <header className="main-header">
        <div className="brand-lockup compact"><div className="brand-mark">ح</div><div><b>حكاوي كوين</b><small>HIKAWI COIN</small></div></div>
        <div className="header-actions"><button className="header-icon" onClick={() => setNotice({ kind: "info", text: "كل إشعاراتك هتظهر هنا بعد تفعيل خدمة الإشعارات." })} aria-label="الإشعارات">♧</button><Avatar user={user} /></div>
      </header>

      {tab === "home" && <section className="page-content">
        <div className="welcome-strip"><div><span className="kicker">مساء الخير</span><h1>{user.displayName || "صاحب حكاوي"} 👋</h1><p>مستنيين حكايتك النهارده.</p></div><div className="welcome-symbol">✦</div></div>
        <section className="v10-home-hero">
          <div className="v10-hero-copy">
            <span className="kicker">عالمك الملكي في حكاوي</span>
            <h1>كل حكاية تبدأ بلمة</h1>
            <p>ادخل غرفتك المفضلة، قابل ناس جديدة وشارك لحظاتك.</p>
            <button className="v10-hero-action" onClick={() => setCreateRoomOpen(true)}>＋ أنشئ غرفتك</button>
          </div>
          <div className="v10-hero-crown" aria-hidden="true">♛</div>
          <span className="v10-hero-orbit orbit-one" aria-hidden="true" />
          <span className="v10-hero-orbit orbit-two" aria-hidden="true" />
        </section>
        <section className="v10-featured-section">
          <div className="section-title"><div><span className="kicker">من مجتمع حكاوي</span><h2>غرف تستحق الزيارة</h2></div><span className="v10-live-count">{rooms.length} غرفة</span></div>
          {rooms.length > 0 ? <div className="v10-featured-rooms">{rooms.slice(0, 3).map((room, index) => <button className="v10-featured-room" key={room.id} onClick={() => void enterRoom(room)}><span className="v10-featured-medal">{["✦","♛","✧"][index]}</span><span className="v10-featured-info"><b>{room.name}</b><small>{room.ownerName} · {room.category || "غرفة صوتية"}</small></span><span className="v10-featured-enter">دخول ←</span></button>)}</div> : <div className="v10-featured-empty">أول غرفة هتظهر هنا بمجرد إنشائها.</div>}
        </section>
        <section className="section-block">
          <div className="section-title"><div><span className="kicker">اتكلم واتعرف</span><h2>الغرف الصوتية</h2></div><button className="outline-small" onClick={() => setCreateRoomOpen(true)}>＋ غرفة جديدة</button></div>
          <div className="room-categories">{["الكل","دردشة","تعرف على أصحاب","موسيقى","ألعاب"].map((x) => <button key={x} onClick={() => setRoomFilter(x)} className={roomFilter === x ? "category-active" : ""}>{x}</button>)}</div>
          {filteredRooms.length === 0 ? <div className="empty-card"><div className="empty-icon">🎙️</div><h3>{rooms.length === 0 ? "لسه مفيش غرف عامة" : "مفيش غرف في التصنيف ده"}</h3><p>{rooms.length === 0 ? "ابدأ اللمة واعمل أول غرفة صوتية في حكاوي." : "اختار تصنيف تاني أو ارجع لعرض كل الغرف."}</p>{rooms.length === 0 && <button className="primary-button" onClick={() => setCreateRoomOpen(true)}>إنشاء أول غرفة</button>}</div> :
            <div className="rooms-grid">{filteredRooms.map((room, index) => <article className="room-tile" key={room.id}><div className={`room-cover cover-${index % 4}`}><span>{["🎙️","🌙","🎮","☕"][index % 4]}</span><small>غرفة عامة</small></div><div className="room-tile-body"><b>{room.name}</b><p>{room.description || room.category || "غرفة حكاوي"}</p><div><span>👤 {room.ownerName}</span><button onClick={() => void enterRoom(room)}>دخول الغرفة</button></div></div></article>)}</div>}
        </section>
        <section className="promo-card"><div><span className="kicker">حكاوي تجمعنا</span><h2>صوتك مسموع هنا</h2><p>شارك أصحابك لحظاتك وافتح مساحة جديدة للكلام.</p></div><div className="promo-emoji">💬</div></section>
      </section>}

      {tab === "live" && <section className="page-content">
        <div className="page-heading"><span className="kicker">شاهد وشارك</span><h1>البث المباشر</h1><p>تابع صناع المحتوى وشارك في البثوث الحية.</p></div>
        <div className="live-empty"><div className="live-emblem">▶</div><h2>منصة البث في مرحلة التجهيز</h2><p>هنربط الفيديو المباشر والهدايا والتعليقات ومشاركة الضيوف بخدمة بث حقيقية، بدل عرض بث تجريبي على إنه مباشر.</p><button className="primary-button" onClick={() => setNotice({ kind: "info", text: "مطلوب إعداد مزود بث RTC ومفاتيح الخادم قبل بدء بث حقيقي." })}>تفاصيل تجهيز البث</button></div>
      </section>}

      {tab === "moments" && <section className="page-content">
        <div className="page-heading"><span className="kicker">شارك يومك</span><h1>اللحظات</h1><p>منشورات وصور وفيديوهات من مجتمع حكاوي.</p></div>
        <form className="composer-card" onSubmit={publishMoment}>
          <div className="composer-head"><Avatar user={user} /><div><b>{user.displayName || "عضو حكاوي"}</b><small>مشاركة عامة</small></div></div>
          <textarea value={momentText} onChange={(e) => setMomentText(e.target.value)} placeholder="بتفكر في إيه؟ احكيلنا..." rows={3} maxLength={5000} />
          {momentFile && <div className="file-chip">📎 {momentFile.name}<button type="button" onClick={() => setMomentFile(null)}>×</button></div>}
          <div className="composer-actions"><label className="file-pick" htmlFor="moment-file">▧ صورة أو فيديو</label><input id="moment-file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(e) => setMomentFile(e.target.files?.[0] || null)} /><button className="primary-button" type="submit" disabled={posting || (!momentText.trim() && !momentFile)}>{posting ? "جاري النشر..." : "نشر اللحظة"}</button></div>
        </form>
        {moments.length === 0 ? <div className="empty-card"><div className="empty-icon">✦</div><h3>ابدأ أول لحظة</h3><p>اكتب منشور أو شارك صورة وفيديو يظهروا للمجتمع.</p></div> :
          <div className="moments-feed">{moments.map((moment) => <article className="moment-card" key={moment.id}>
            <div className="moment-author"><div className="avatar">{moment.authorPhotoURL ? <img src={moment.authorPhotoURL} alt="" /> : <span>{moment.authorName.slice(0,1)}</span>}</div><div><b>{moment.authorName}</b><small>من مجتمع حكاوي · منشور عام</small></div><button className="more-button" onClick={() => setNotice({ kind: "info", text: "إدارة المنشور والإبلاغ هتتوفر في أدوات المجتمع." })}>•••</button></div>
            {moment.text && <p className="moment-text">{moment.text}</p>}
            {moment.mediaUrl && (moment.mediaType === "video" ? <video className="moment-media" src={moment.mediaUrl} controls playsInline preload="metadata" /> : <img className="moment-media" src={moment.mediaUrl} alt="مرفق من لحظات حكاوي" loading="lazy" />)}
            <div className="moment-counts"><span>♥ {moment.likesCount || 0} إعجاب</span><button onClick={() => setCommentMoment(moment)}>التعليقات</button></div>
            <div className="moment-actions"><button className={likedIds.includes(moment.id) ? "liked" : ""} onClick={() => void likeMoment(moment)}>♡ إعجاب</button><button onClick={() => setCommentMoment(moment)}>◯ تعليق</button><button onClick={() => { void navigator.clipboard?.writeText(location.href).then(() => setNotice({kind:"success",text:"اتنسخ رابط الموقع."})).catch(() => setNotice({kind:"info",text:"انسخ رابط الصفحة من شريط المتصفح."})); }}>↗ مشاركة</button></div>
          </article>)}</div>}
      </section>}

      {tab === "games" && <section className="page-content">
        <div className="page-heading"><span className="kicker">العب مع أصحابك</span><h1>الألعاب</h1><p>تحديات خفيفة لحد ما نربط الألعاب الجماعية.</p></div>
        <div className="games-grid"><article className="game-card"><span>🧠</span><h3>تحدي المعلومات</h3><p>اختبر معلوماتك في 3 أسئلة.</p><b>نقاطك: {gameScore}</b></article><article className="game-card"><span>🎲</span><h3>لودو</h3><p>اللعب الجماعي أونلاين قيد الربط.</p><small>قريبًا</small></article><article className="game-card"><span>🃏</span><h3>ورق وكوتشينة</h3><p>غرف لعب مع الأصدقاء.</p><small>قريبًا</small></article></div>
        <div className="quiz-card"><span className="kicker">تحدي سريع · {gameIndex + 1} من {games.length}</span><h2>{games[gameIndex].q}</h2><div className="quiz-options">{games[gameIndex].answers.map((answer, i) => <button key={answer} disabled={answered !== null} className={answered === i ? (i === games[gameIndex].correct ? "answer-correct" : "answer-wrong") : ""} onClick={() => {setAnswered(i);if(i === games[gameIndex].correct)setGameScore((s)=>s+1);}}>{answer}</button>)}</div>{answered !== null && <button className="primary-button" onClick={() => {setGameIndex((x)=>(x+1)%games.length);setAnswered(null);}}>السؤال التالي</button>}</div>
      </section>}

      {tab === "messages" && <section className="page-content">
        <div className="page-heading"><span className="kicker">قريبين دايمًا</span><h1>الرسائل</h1><p>محادثاتك ومكالماتك الخاصة.</p></div>
        <div className="messages-empty"><div className="chat-bubbles">💬</div><h2>محادثاتك في مكانها</h2><p>واجهة الرسائل جاهزة للتصميم، لكن المحادثات المشفرة والمكالمات الصوتية والمرئية تحتاج خدمة محادثات واتصال وخادم لإدارة الأصدقاء. مش هنفتح رسائل وهمية أو مكالمات لا تتصل.</p><button className="ghost-button" onClick={() => setNotice({ kind: "info", text: "المرحلة التالية: الأصدقاء والمحادثات والمكالمات عبر RTC." })}>عرض حالة تجهيز الرسائل</button></div>
      </section>}

      {tab === "profile" && <section className="page-content">
        <div className="profile-hero"><Avatar user={user} size="large" /><h1>{user.displayName || "عضو حكاوي"}</h1><p>{user.email || user.phoneNumber || "حساب حكاوي"}</p><span className="member-badge">عضو في حكاوي كوين</span></div>
        <div className="settings-list"><button onClick={() => setNotice({ kind: "info", text: "إعدادات الملف الشخصي قيد الإضافة." })}>✎ <span>تعديل الملف الشخصي</span> <b>←</b></button><button onClick={() => setNotice({ kind: "info", text: "إعدادات الخصوصية والأمان قيد الإضافة." })}>◈ <span>الخصوصية والأمان</span> <b>←</b></button><button onClick={() => setNotice({ kind: "info", text: "سجل النشاط والمعاملات قيد الإضافة." })}>◷ <span>سجل النشاط</span> <b>←</b></button><button onClick={() => void logout()} className="logout-row">↪ <span>تسجيل الخروج</span> <b>←</b></button></div>
      </section>}

      <nav className="bottom-nav">{navigation.map((item) => <button key={item.id} className={tab === item.id ? "nav-active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>

      {createRoomOpen && <div className="modal-backdrop" onClick={() => setCreateRoomOpen(false)}><form className="modal-card" onSubmit={submitRoom} onClick={(e) => e.stopPropagation()}><div className="modal-heading"><div><span className="kicker">ابدأ اللمة</span><h2>إنشاء غرفة صوتية</h2></div><button type="button" onClick={() => setCreateRoomOpen(false)}>×</button></div><label>اسم الغرفة<input required minLength={3} maxLength={40} value={roomName} onChange={(e)=>setRoomName(e.target.value)} placeholder="مثلاً: سهرات حكاوي" /></label><label>وصف الغرفة<textarea value={roomDescription} maxLength={160} onChange={(e)=>setRoomDescription(e.target.value)} placeholder="قول للناس هيتكلموا عن إيه..." /></label><label>التصنيف<select value={roomCategory} onChange={(e)=>setRoomCategory(e.target.value)}><option>دردشة</option><option>تعرف على أصحاب</option><option>موسيقى</option><option>ألعاب</option><option>شعر وثقافة</option></select></label><button className="primary-button full" type="submit">إنشاء الغرفة</button></form></div>}

      {commentMoment && <div className="modal-backdrop" onClick={() => setCommentMoment(null)}><section className="modal-card comments-modal" onClick={(e)=>e.stopPropagation()}><div className="modal-heading"><div><span className="kicker">نقاش المجتمع</span><h2>التعليقات</h2></div><button onClick={()=>setCommentMoment(null)}>×</button></div><div className="comments-list">{comments.length===0?<p className="subtle">لسه مفيش تعليقات. ابدأ الحوار.</p>:comments.map((comment)=><div className="comment-row" key={comment.id}><b>{comment.authorName}</b><p>{comment.text}</p></div>)}</div><form className="comment-form" onSubmit={submitComment}><input value={commentText} onChange={(e)=>setCommentText(e.target.value)} placeholder="اكتب تعليقك..." maxLength={1000} /><button className="primary-button" type="submit" disabled={!commentText.trim()}>إرسال</button></form></section></div>}

      {notice && <div className={`toast toast-${notice.kind}`} role="status">{notice.text}<button onClick={() => setNotice(null)}>×</button></div>}
    </main>
  );
}
