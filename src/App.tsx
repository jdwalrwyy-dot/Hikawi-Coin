import { useEffect, useState, type FormEvent } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, isFirebaseConfigured, saveUserProfile } from "./firebase";
import AuthDialog from "./auth/AuthDialog";
import { navItems, type PageAction, type Room, type ScreenId } from "./data";
import { createLiveRoom, joinLiveRoom, subscribePublicRooms, type LiveRoomRecord } from "./firebase";

interface ModalInfo { title: string; message: string; }

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>;
}

function RoomCard({ room, onJoin }: { room: Room | LiveRoomRecord; onJoin: (room: Room | LiveRoomRecord) => void }) {
  return <article className="room-card">
    <div className={`room-cover ${room.coverClass || "cover-gold"}`}>{room.symbol || "♛"}</div>
    <div className="room-info"><b>{room.name}</b><small>{room.description}</small><div className="room-meta"><span>◉ {typeof room.members === "number" ? room.members : "العدد غير متاح"}</span><span>♬ {room.category}</span></div></div>
    <span className="room-live">غرفة عامة</span>
    <button className="join-btn" type="button" onClick={() => onJoin(room)}>دخول</button>
  </article>;
}

function HomePage({ navigate, rooms, onJoin }: { navigate: (id: ScreenId) => void; rooms: LiveRoomRecord[]; onJoin: (room: Room | LiveRoomRecord) => void }) {
  const trends = rooms.slice(0, 3);
  const moods = [["☕", "سوالف وضحك", "قعدة خفيفة"], ["♫", "مزيكا وطرب", "عيش الإحساس"], ["⚡", "تحدي وحماس", "ورّيهم شطارتك"], ["✧", "ناس جديدة", "وسع دايرتك"]];
  return <section className="screen active" id="home">
    <div className="hero-card"><div className="hero-copy"><span className="eyebrow"><i /> المكان اللي شبهك</span><h1>مش مجرد دخول..<br /><span>دي حكايتك.</span></h1><p>ناس جديدة، ضحكة من القلب، وليالي ملهاش آخر.</p><div className="hero-actions"><button className="gold-btn" type="button" onClick={() => navigate("rooms")}>اكتشف الغرف <span>←</span></button><button className="text-btn" type="button" onClick={() => navigate("live")}>شوف اللايف <span>↗</span></button></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-crown">♛</div><div className="hero-spark spark-one">✦</div><div className="hero-spark spark-two">✧</div><div className="hero-caption"><b>ليلتك.. تبدأ هنا</b><small>صوتك له مكان</small></div></div><div className="hero-glow" /></div>
    <div className="section-heading"><div><span className="eyebrow">LIVE NOW</span><h2>الترند مولّع <span className="hot-dot">●</span></h2></div><button className="see-all" type="button" onClick={() => navigate("rooms")}>كل الغرف ←</button></div>
    <div className="trending-row">{trends.map((room, index) => <button className={`trend-card ${["trend-one", "trend-two", "trend-three"][index]}`} key={room.id} type="button" onClick={() => onJoin(room)}><span className="live-tag">غرفة عامة</span><div className="trend-bottom"><b>{room.name}</b><small>{room.category}</small></div><span className="trend-symbol">{room.symbol || "♛"}</span></button>)}{trends.length === 0 ? <p className="muted">مفيش غرف رائجة متاحة حاليًا. أول ما الغرف العامة تتسجل هتظهر هنا.</p> : null}</div>
    <div className="section-heading"><div><span className="eyebrow">PICK YOUR VIBE</span><h2>اختار مودك</h2></div></div>
    <div className="mood-grid">{moods.map(([icon, title, subtitle]) => <button className="mood-card" key={title} type="button" onClick={() => navigate("rooms")}><span>{icon}</span><b>{title}</b><small>{subtitle}</small></button>)}</div>
    <div className="section-heading"><div><span className="eyebrow">ROOMS FOR YOU</span><h2>غرف تستاهل تدخلها</h2></div><button className="see-all" type="button" onClick={() => navigate("rooms")}>عرض الكل ←</button></div>
    <div className="room-list">{rooms.slice(0, 3).map((room) => <RoomCard key={room.id} room={room} onJoin={onJoin} />)}{rooms.length === 0 ? <p className="muted">لسه مفيش غرف عامة. أنشئ أول غرفة وابدأ اللمة.</p> : null}</div>
  </section>;
}

function RoomsPage({ rooms, onJoin, onCreate }: { rooms: LiveRoomRecord[]; onJoin: (room: Room | LiveRoomRecord) => void; onCreate: (name: string, description: string, category: string) => Promise<void> }) {
  const [filter, setFilter] = useState("الكل");
  const filters = ["الكل", "الأكثر نشاطاً", "سوالف", "ترفيه", "موسيقى", "تعارف"];
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("سوالف");
  const [error, setError] = useState("");
  async function submitRoom(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { setError(""); await onCreate(name, description, category); setName(""); setDescription(""); setCreating(false); } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر إنشاء الغرفة."); } }
  return <section className="screen active" id="rooms"><PageTitle eyebrow="FIND YOUR PEOPLE" title="الغرف الصوتية" description="كل غرفة حكاية.. اختار الحكاية اللي على مزاجك." />
    <div className="filter-chips">{filters.map((item) => <button className={filter === item ? "selected" : ""} key={item} type="button" onClick={() => setFilter(item)}>{item}</button>)}</div>
    <div className="room-list roomy">{(filter === "الأكثر نشاطاً" ? [...rooms].sort((a, b) => (b.members ?? 0) - (a.members ?? 0)) : filter === "الكل" ? rooms : rooms.filter((room) => room.category === filter)).map((room) => <RoomCard key={room.id} room={room} onJoin={onJoin} />)}{rooms.length === 0 ? <p className="muted">مفيش غرف عامة لسه. أنشئ أول غرفة وابدأ اللمة.</p> : null}{rooms.length > 0 && filter !== "الكل" && filter !== "الأكثر نشاطاً" && !rooms.some((room) => room.category === filter) ? <p className="muted">مفيش غرف في التصنيف ده حاليًا.</p> : null}</div>
    <button className="create-room-btn" type="button" onClick={() => setCreating((value) => !value)}>＋ اعمل غرفتك</button>
    {creating ? <form className="support-card" onSubmit={(event) => void submitRoom(event)}><input required minLength={3} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="اسم الغرفة" /><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={160} placeholder="وصف بسيط للغرفة" /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>سوالف</option><option>ترفيه</option><option>موسيقى</option><option>تعارف</option></select>{error ? <p className="auth-error">{error}</p> : null}<button className="gold-btn" type="submit">إنشاء الغرفة</button></form> : null}
  </section>;
}

function LivePage({ onAction }: { onAction: PageAction }) {
  return <section className="screen active" id="live"><PageTitle eyebrow="LIGHTS ON. CAMERA ON." title="على الهوا 🎥" description="البثوث الفعلية هتظهر هنا بعد توصيل خدمة البث المباشر." />
    <div className="support-card"><span>🎥</span><b>منصة البث المباشر</b><p>قائمة البثوث غير متصلة حاليًا. لن نعرض أسماء مشاهدين أو أعداد مشاهدة وهمية. تفعيل البث يتطلب مزود RTC، وإصدار رموز دخول مؤقتة من الخادم، وصلاحيات الكاميرا والميكروفون.</p><button className="gold-btn" type="button" onClick={() => onAction("start-live", "بدء البث المباشر", "ميزة البث غير مفعّلة بعد. يلزم ربط مزود بث آمن على الخادم قبل تشغيل الكاميرا أو إنشاء بث حقيقي.")}>＋ تجهيز بث جديد</button></div>
  </section>;
}

function MomentsPage({ onAction }: { onAction: PageAction }) {
  return <section className="screen active" id="moments"><PageTitle eyebrow="LITTLE MOMENTS. BIG STORIES." title="لحظات ✨" description="شارك لقطة، كلمة، أو ذكرى تفضل." />
    <button className="create-post" type="button" onClick={() => onAction("post", "إنشاء لحظة", "نشر الصور والفيديو والنصوص غير متصل حاليًا. يلزم تجهيز تخزين آمن للوسائط وقواعد ملكية المحتوى قبل النشر.")}><span>＋</span><span><b>إيه الحكاية النهارده؟</b><small>شارك لحظتك مع الكل</small></span></button>
    <div className="support-card"><span>✧</span><b>لسه مفيش لحظات متصلة</b><p>موجز اللحظات هيعرض منشورات حقيقية من المستخدمين بعد ربط قاعدة البيانات وتخزين الصور والفيديو. مش هنعرض منشورات تجريبية على إنها منشورات أعضاء.</p></div>
  </section>;
}

function MessagesPage({ onAction }: { onAction: PageAction }) {
  return <section className="screen active" id="messages"><PageTitle eyebrow="YOUR PEOPLE, ONE TAP AWAY" title="الرسايل" description="رسائلك الخاصة بينك وبين أصدقائك." /><label className="message-search"><span>⌕</span><input aria-label="ابحث في محادثاتك" placeholder="ابحث في محادثاتك" /></label><div className="support-card"><span>♧</span><b>محادثاتك هتظهر هنا</b><p>قائمة المحادثات مش متصلة بقاعدة البيانات لسه. نظام الرسائل لازم يتحقق من الصداقة وصلاحية الطرفين قبل قراءة أو إرسال أي رسالة.</p><button className="outline-btn" type="button" onClick={() => onAction("messages-status", "الرسائل الخاصة", "الرسائل الفعلية تحتاج ربط مستمع Firestore للمحادثات مع قواعد الصداقة المعتمدة.")}>تفاصيل تجهيز الرسائل</button></div></section>;
}

function GamesPage({ onAction }: { onAction: PageAction }) {
  const games = [{ icon: "🎲", title: "ليلة لودو", desc: "العب مع أصحابك", action: "العب الآن ↗", cls: "game-ludo" }, { icon: "♠", title: "ورق وكوتشينة", desc: "ورّيهم شطارتك", action: "العب الآن ↗", cls: "game-cards" }, { icon: "✦", title: "مين يعرف أكتر؟", desc: "أسئلة وتحديات", action: "ابدأ التحدي ↗", cls: "game-quiz" }, { icon: "◉", title: "عجلة الحظ", desc: "جرب حظك", action: "لف العجلة ↗", cls: "game-wheel" }];
  return <section className="screen active" id="games"><PageTitle eyebrow="PLAY. LAUGH. REPEAT." title="ساحة اللعب 🎮" description="ورّيهم مين نجم الليلة." /><div className="game-feature"><span>♜</span><div><b>تحدي حكاوي اليوم</b><small>اجمع أصحابك ونافس على القمة</small></div><button type="button" onClick={() => onAction("game", "تحدي حكاوي اليوم", "الألعاب التنافسية هتتطور وتتربط في مرحلة الألعاب.")}>العب ←</button></div><div className="game-grid">{games.map((game) => <button className={`game-card ${game.cls}`} key={game.title} type="button" onClick={() => onAction("game", game.title, "دي بطاقة تعريفية للعبة، تشغيل اللعب الجماعي هيحتاج تنفيذ محرك اللعبة والخادم.")}><span>{game.icon}</span><b>{game.title}</b><small>{game.desc}</small><i>{game.action}</i></button>)}</div></section>;
}

function ProfilePage({ navigate, onAction }: { navigate: (id: ScreenId) => void; onAction: PageAction }) {
  return <section className="screen active" id="profile"><div className="profile-cover"><div className="profile-crown">♛</div><div className="profile-avatar">و</div></div><div className="profile-main"><h1>ضيف حكاوي <span>✦</span></h1><p className="muted">عضو منور حكاوي كوين</p><div className="profile-id">ID: 000000 <button type="button" onClick={() => onAction("copy-id", "معرف الحساب", "معرف العرض التجريبي: 000000")}>نسخ</button></div><div className="profile-stats"><div><b>128</b><small>متابع</small></div><div><b>64</b><small>متابَعون</small></div><div><b>12</b><small>لحظة</small></div></div></div><div className="profile-menu">
    <button type="button" onClick={() => navigate("wallet")}><span>◇</span><span><b>محفظتي</b><small>رصيدك وحركاتك</small></span><i>←</i></button>
    <button type="button" onClick={() => navigate("store")}><span>♕</span><span><b>المتجر الملكي</b><small>إطارات وهدايا مميزة</small></span><i>←</i></button>
    <button type="button" onClick={() => navigate("settings")}><span>⚙</span><span><b>الإعدادات والخصوصية</b><small>حسابك.. براحتك</small></span><i>←</i></button>
    <button type="button" onClick={() => navigate("support")}><span>♡</span><span><b>مركز المساعدة</b><small>إحنا جنبك</small></span><i>←</i></button>
  </div></section>;
}

function WalletPage({ onAction }: { onAction: PageAction }) {
  return <section className="screen active" id="wallet"><PageTitle eyebrow="YOUR TREASURE" title="المحفظة الملكية" description="رصيدك وحركاتك المالية في مكان واحد." /><div className="balance-card"><small>رصيد المحفظة</small><strong>—</strong><span>سيظهر الرصيد بعد ربط خدمة المحفظة الآمنة ◆</span><div className="balance-actions"><button className="glass-btn" type="button" onClick={() => onAction("transactions", "سجل الحركات", "سجل المعاملات غير متصل حاليًا. سيتم عرضه بعد ربط واجهة الخادم الآمنة.")}>سجل الحركات</button></div></div><div className="section-heading"><h2>حركاتك الأخيرة</h2></div><p className="muted">لا توجد معاملات معروضة؛ لن نعرض أرصدة أو حركات تجريبية على أنها حقيقية.</p></section>;
}

function StorePage({ onAction }: { onAction: PageAction }) {
  const [category, setCategory] = useState("هدايا");
  const categories = ["هدايا", "إطارات", "دخول مميز"];
  const gifts = [{ name: "التاج الملكي", price: "2,500 ◆", symbol: "♛", cls: "gift-crown" }, { name: "وردة من دهب", price: "500 ◆", symbol: "✿", cls: "gift-rose" }, { name: "نجمة الأساطير", price: "1,200 ◆", symbol: "✦", cls: "gift-star" }, { name: "قلب الملوك", price: "800 ◆", symbol: "♥", cls: "gift-heart" }];
  return <section className="screen active" id="store"><PageTitle eyebrow="THE ROYAL COLLECTION" title="المتجر الملكي ♛" description="اختار حاجة تليق بحضورك." /><div className="store-tabs">{categories.map((item) => <button className={category === item ? "selected" : ""} key={item} type="button" onClick={() => setCategory(item)}>{item}</button>)}</div><div className="gift-grid">{gifts.map((gift) => <div className="gift-card" key={gift.name}><div className={`gift-art ${gift.cls}`}>{gift.symbol}</div><b>{gift.name}</b><small>{gift.price}</small><button type="button" onClick={() => onAction("gift", gift.name, "إرسال الهدايا وخصم الرصيد مش مفعّلين قبل ربط المحفظة الآمنة.")}>اختار الهدية</button></div>)}</div></section>;
}

function SettingsPage({ navigate, onLogout }: { navigate: (id: ScreenId) => void; onLogout: () => void }) {
  return <section className="screen active" id="settings"><div className="page-title"><span className="eyebrow">MAKE IT YOURS</span><h1>الإعدادات</h1></div><div className="settings-list"><label><span>إخفاء حالة الاتصال</span><input type="checkbox" /></label><label><span>السماح برسائل الأصدقاء فقط</span><input type="checkbox" defaultChecked /></label><label><span>أصوات الهدايا المميزة</span><input type="checkbox" defaultChecked /></label><label><span>الوضع الملكي الداكن</span><input type="checkbox" defaultChecked /></label><button type="button" onClick={() => navigate("support")}>مركز المساعدة والدعم ←</button><button className="danger" type="button" onClick={onLogout}>تسجيل الخروج</button></div></section>;
}

function SupportPage({ onAction }: { onAction: PageAction }) {
  const [message, setMessage] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) { onAction("empty-support", "رسالة الدعم", "اكتب رسالتك الأول."); return; }
    onAction("support", "مركز المساعدة", "تم تجهيز رسالتك للربط بمركز الدعم. الإرسال الفعلي هيتفعل بعد ربط الخادم.");
    setMessage("");
  }
  return <section className="screen active" id="support"><PageTitle eyebrow="WE'RE HERE FOR YOU" title="مركز المساعدة" description="قولنا محتاج إيه وفريقنا هيساعدك." /><form className="support-card" onSubmit={submit}><span>♡</span><b>إحنا سامعينك</b><p>ابعتلنا مشكلتك أو اقتراحك.</p><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب رسالتك هنا..." aria-label="رسالة الدعم" /><button className="gold-btn" type="submit">إرسال الرسالة</button></form></section>;
}

function AppModal({ info, onClose }: { info: ModalInfo; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" type="button" onClick={onClose} aria-label="إغلاق">×</button><div className="modal-symbol">✦</div><h2 id="modal-title">{info.title}</h2><p>{info.message}</p><button className="gold-btn" type="button" onClick={onClose}>تمام</button></section></div>;
}

function RoomView({ room, onBack }: { room: LiveRoomRecord; onBack: () => void }) {
  return <section className="screen active"><PageTitle eyebrow="VOICE ROOM" title={room.name} description={room.description || "أهلاً بيك في الغرفة"} /><div className="support-card"><span>♛</span><b>تم تسجيل دخولك للغرفة</b><p>الغرفة جاهزة من ناحية الانضمام وحفظ العضوية. الصوت والمايك المباشر لسه محتاجين ربط خدمة RTC آمنة على الخادم؛ لذلك المقاعد ظاهرة كتجهيزات وليست مايكات عاملة حاليًا.</p><button className="gold-btn" type="button" onClick={onBack}>العودة للغرف</button></div><div className="section-heading"><h2>مقاعد المايك الـ 27</h2></div><div className="creator-grid mic-seat-grid">{Array.from({length: 27}, (_, index) => <div className="creator-card mic-seat" key={index}><div className="creator-avatar ca2">{index === 0 ? "♙" : "＋"}</div><b>مايك {index + 1}</b><small>{index === 0 ? "عضويتك محفوظة" : "مقعد متاح"}</small></div>)}</div></section>;
}


export default function App() {
  const [screen, setScreen] = useState<ScreenId>("home");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<LiveRoomRecord[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<LiveRoomRecord | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMethod, setAuthMethod] = useState<"all" | "phone">("all");
  const [modal, setModal] = useState<ModalInfo | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [screen]);
  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) {
        setAuthOpen(false);
        void saveUserProfile(user).catch((error: unknown) => console.error("تعذر حفظ الملف الشخصي:", error));
      }
    });
  }, []);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(""), 2300); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!authUser || !isFirebaseConfigured) { setRooms([]); return undefined; }
    try { return subscribePublicRooms(setRooms, (error) => setToast(error.message)); }
    catch (error) { setToast(error instanceof Error ? error.message : "تعذر تحميل الغرف"); return undefined; }
  }, [authUser]);
  const onAction: PageAction = (_action, title, message) => setModal({ title: title ?? "حكاوي كوين", message: message ?? "الميزة دي هتتجهز في مرحلة لاحقة." });
  const openPhoneLogin = () => { setAuthMethod("phone"); setAuthOpen(true); };
  const openAnyLogin = () => { setAuthMethod("all"); setAuthOpen(true); };
  const googleLogin = async () => {
    if (!auth) { setToast("تسجيل الدخول غير جاهز: إعدادات Firebase غير مكتملة."); return; }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "";
      const messages: Record<string, string> = {
        "auth/unauthorized-domain": "الدومين الحالي مش مضاف في Authorized domains داخل Firebase.",
        "auth/popup-closed-by-user": "نافذة Google اتقفلت قبل إكمال الدخول.",
        "auth/popup-blocked": "المتصفح منع نافذة Google. اسمح بالنوافذ المنبثقة وحاول تاني.",
        "auth/operation-not-allowed": "تسجيل Google مش مفعّل في إعدادات Firebase.",
        "auth/network-request-failed": "في مشكلة اتصال بالإنترنت.",
        "auth/too-many-requests": "محاولات كتير. استنى شوية وجرب تاني."
      };
      setToast(messages[code] ?? "تعذر تسجيل الدخول باستخدام Google. حاول مرة تانية.");
    }
  };
  const enterRoom = async (room: Room | LiveRoomRecord) => {
    if (!authUser) { setAuthOpen(true); setToast("سجّل دخولك الأول علشان تدخل الغرفة"); return; }
    if (!("id" in room)) { setToast("الغرفة دي بيانات قديمة تجريبية؛ اختار غرفة منشأة من قاعدة البيانات."); return; }
    try { await joinLiveRoom(room.id, authUser); setSelectedRoom(room); setScreen("room" as ScreenId); }
    catch (error) { setToast(error instanceof Error ? error.message : "تعذر دخول الغرفة"); }
  };
  const makeRoom = async (name: string, description: string, category: string) => {
    if (!authUser) { setAuthOpen(true); throw new Error("سجّل دخولك الأول لإنشاء غرفة."); }
    await createLiveRoom({ name, description, category, user: authUser });
    setToast("تم إنشاء الغرفة بنجاح");
  };
  const navigate = (next: ScreenId) => { setScreen(next); setSearchOpen(false); };
  const logout = () => { if (auth) void signOut(auth).catch((error: unknown) => setToast(error instanceof Error ? error.message : "تعذر تسجيل الخروج.")); };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setToast(search.trim() ? "البحث الحقيقي هيتفعل بعد ربط قاعدة البيانات" : "اكتب كلمة للبحث"); };
  if (!authUser) {
    return <>
      <main className="welcome-screen" dir="rtl">
        <div className="welcome-art-placeholder" role="img" aria-label="مساحة الصورة الرئيسية لحكاوي كوين">
          <div className="welcome-arch"><span className="welcome-moon" /><span className="welcome-minaret minaret-one" /><span className="welcome-minaret minaret-two" /><span className="welcome-palace">⌂</span></div>
          <span className="welcome-lantern lantern-left">✧</span><span className="welcome-lantern lantern-right">✧</span>
          <div className="welcome-glow-orb" />
          <div className="welcome-crown">♛</div>
          <div className="welcome-title-mark"><h1>حكاوي</h1><strong>كوين</strong><p>مكان يجمعنا ... لحكايات أجمل ♡</p></div>
          <div className="welcome-microphone" aria-hidden="true">🎙</div>
          <span className="welcome-heart heart-left">♥</span><span className="welcome-heart heart-right">♥</span>
          <span className="welcome-spark spark-left">✦</span><span className="welcome-spark spark-right">✧</span>
        </div>
        <div className="welcome-actions">
          <button className="welcome-primary welcome-google" type="button" onClick={() => void googleLogin()}>
            <span className="welcome-google-mark" aria-hidden="true">G</span>
            الدخول بحساب Google
          </button>
          <button className="welcome-secondary" type="button" onClick={openPhoneLogin}>
            <span aria-hidden="true">☎</span>
            الدخول برقم الهاتف
          </button>
          <p>مكان يجمعنا.. لحكايات أجمل ♡</p>
        </div>
      </main>
      {authOpen ? <div className="modal-backdrop welcome-auth-backdrop"><AuthDialog onClose={() => setAuthOpen(false)} configured={isFirebaseConfigured} method={authMethod} /></div> : null}
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </>;
  }
  return <>
    <div className="ambient ambient-a" aria-hidden="true" /><div className="ambient ambient-b" aria-hidden="true" />
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate("home")} aria-label="الرئيسية"><span className="brand-mark">H</span><span><b>حكاوي <em>كوين</em></b><small>عالمك.. على مزاجك</small></span></button>
        <div className="top-actions">
          <button className="icon-btn" type="button" onClick={() => setSearchOpen((value) => !value)} aria-label="بحث">⌕</button>
          <button className="wallet-pill" type="button" onClick={() => navigate("wallet")}><span>◆</span><b>المحفظة</b><i>＋</i></button>
          <button className="icon-btn notification-btn" type="button" onClick={() => setModal({ title: "إشعاراتك", message: "هنا هتظهر رسائل الأصدقاء ودعوات الغرف وتنبيهات حكاوي كوين." })} aria-label="الإشعارات">♧<i /></button>
          <button className="login-btn" type="button" onClick={() => authUser ? navigate("profile") : openAnyLogin()}>{authUser ? (authUser.displayName?.slice(0, 1) || "ح") : "دخول"}</button><button className="mini-avatar" type="button" onClick={() => navigate("profile")} aria-label="حسابي">{authUser?.displayName?.slice(0, 1) || "و"}</button>
        </div>
      </header>
      {searchOpen ? <form className="search-bar" onSubmit={submitSearch}><span>⌕</span><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="دور على غرفة أو شخص أو لعبة..." aria-label="البحث العام" /><button type="button" onClick={() => { setSearchOpen(false); setSearch(""); }} aria-label="إغلاق البحث">✕</button></form> : null}
      <main id="mainContent">
        {screen === "home" ? <HomePage navigate={navigate} rooms={rooms} onJoin={enterRoom} /> : null}
        {screen === "rooms" ? <RoomsPage rooms={rooms} onJoin={enterRoom} onCreate={makeRoom} /> : null}
        {screen === ("room" as ScreenId) && selectedRoom ? <RoomView room={selectedRoom} onBack={() => navigate("rooms")} /> : null}
        {screen === "live" ? <LivePage onAction={onAction} /> : null}
        {screen === "moments" ? <MomentsPage onAction={onAction} /> : null}
        {screen === "messages" ? <MessagesPage onAction={onAction} /> : null}
        {screen === "games" ? <GamesPage onAction={onAction} /> : null}
        {screen === "profile" ? <ProfilePage navigate={navigate} onAction={onAction} /> : null}
        {screen === "wallet" ? <WalletPage onAction={onAction} /> : null}
        {screen === "store" ? <StorePage onAction={onAction} /> : null}
        {screen === "settings" ? <SettingsPage navigate={navigate} onLogout={logout} /> : null}
        {screen === "support" ? <SupportPage onAction={onAction} /> : null}
      </main>
    </div>
    <nav className="bottom-nav" aria-label="التنقل الرئيسي">{navItems.map((item) => <button className={`nav-item ${screen === item.id ? "active" : ""}`} key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={screen === item.id ? "page" : undefined}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
    <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    {modal ? <AppModal info={modal} onClose={() => setModal(null)} /> : null}
    {authOpen ? <div className="modal-backdrop welcome-auth-backdrop"><AuthDialog onClose={() => setAuthOpen(false)} configured={isFirebaseConfigured} method={authMethod} /></div> : null}
  </>;
}