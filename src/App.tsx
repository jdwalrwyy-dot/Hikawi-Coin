import { useEffect, useState, type FormEvent } from "react";
import { demoRooms, navItems, type PageAction, type Room, type ScreenId } from "./data";

interface ModalInfo { title: string; message: string; }

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>;
}

function RoomCard({ room, onAction }: { room: Room; onAction: PageAction }) {
  return <article className="room-card">
    <div className={`room-cover ${room.coverClass}`}>{room.symbol}</div>
    <div className="room-info"><b>{room.name}</b><small>{room.description}</small><div className="room-meta"><span>◉ {room.members}</span><span>♬ {room.category}</span></div></div>
    <span className="room-live">مباشر</span>
    <button className="join-btn" type="button" onClick={() => onAction("room", room.name, "دي معاينة للغرفة. تشغيل الصوت ومقاعد المايك والدردشة يحتاج ربط الخادم وخدمة الصوت في مرحلة لاحقة.")}>دخول</button>
  </article>;
}

function HomePage({ navigate, onAction }: { navigate: (id: ScreenId) => void; onAction: PageAction }) {
  const trends = [
    { name: "ليالي الملوك", count: "248 بيتونسوا", cls: "trend-one", symbol: "♛" },
    { name: "قعدة رايقة", count: "126 موجودين", cls: "trend-two", symbol: "☾" },
    { name: "نجوم الطرب", count: "89 مستمع", cls: "trend-three", symbol: "♫" },
  ];
  const moods = [["☕", "سوالف وضحك", "قعدة خفيفة"], ["♫", "مزيكا وطرب", "عيش الإحساس"], ["⚡", "تحدي وحماس", "ورّيهم شطارتك"], ["✧", "ناس جديدة", "وسع دايرتك"]];
  return <section className="screen active" id="home">
    <div className="hero-card"><div className="hero-copy"><span className="eyebrow"><i /> المكان اللي شبهك</span><h1>مش مجرد دخول..<br /><span>دي حكايتك.</span></h1><p>ناس جديدة، ضحكة من القلب، وليالي ملهاش آخر.</p><div className="hero-actions"><button className="gold-btn" type="button" onClick={() => navigate("rooms")}>اكتشف الغرف <span>←</span></button><button className="text-btn" type="button" onClick={() => navigate("live")}>شوف اللايف <span>↗</span></button></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-crown">♛</div><div className="hero-spark spark-one">✦</div><div className="hero-spark spark-two">✧</div><div className="hero-caption"><b>ليلتك.. تبدأ هنا</b><small>صوتك له مكان</small></div></div><div className="hero-glow" /></div>
    <div className="section-heading"><div><span className="eyebrow">LIVE NOW</span><h2>الترند مولّع <span className="hot-dot">●</span></h2></div><button className="see-all" type="button" onClick={() => navigate("rooms")}>كل الغرف ←</button></div>
    <div className="trending-row">{trends.map((item) => <article className={`trend-card ${item.cls}`} key={item.name} role="button" tabIndex={0} onClick={() => onAction("room", item.name, "دي معاينة للغرفة. الخدمات الصوتية الحقيقية هتتربط في مرحلة مستقلة.")} onKeyDown={(event) => { if (event.key === "Enter") onAction("room", item.name, "دي معاينة للغرفة. الخدمات الصوتية الحقيقية هتتربط في مرحلة مستقلة."); }}><span className="live-tag">● مباشر</span><div className="trend-bottom"><b>{item.name}</b><small>◉ {item.count}</small></div><span className="trend-symbol">{item.symbol}</span></article>)}</div>
    <div className="section-heading"><div><span className="eyebrow">PICK YOUR VIBE</span><h2>اختار مودك</h2></div></div>
    <div className="mood-grid">{moods.map(([icon, title, subtitle]) => <button className="mood-card" key={title} type="button" onClick={() => navigate("rooms")}><span>{icon}</span><b>{title}</b><small>{subtitle}</small></button>)}</div>
    <div className="section-heading"><div><span className="eyebrow">ROOMS FOR YOU</span><h2>غرف تستاهل تدخلها</h2></div><button className="see-all" type="button" onClick={() => navigate("rooms")}>عرض الكل ←</button></div>
    <div className="room-list">{demoRooms.slice(0, 3).map((room) => <RoomCard key={room.name} room={room} onAction={onAction} />)}</div>
  </section>;
}

function RoomsPage({ onAction }: { onAction: PageAction }) {
  const [filter, setFilter] = useState("الكل");
  const filters = ["الكل", "الأكثر نشاطاً", "أصدقاء", "موسيقى", "تعارف"];
  return <section className="screen active" id="rooms"><PageTitle eyebrow="FIND YOUR PEOPLE" title="الغرف الصوتية" description="كل غرفة حكاية.. اختار الحكاية اللي على مزاجك." />
    <div className="filter-chips">{filters.map((item) => <button className={filter === item ? "selected" : ""} key={item} type="button" onClick={() => setFilter(item)}>{item}</button>)}</div>
    <div className="room-list roomy">{demoRooms.map((room) => <RoomCard key={room.name} room={room} onAction={onAction} />)}</div>
    <button className="create-room-btn" type="button" onClick={() => onAction("create-room", "غرفتك.. قوانينك", "إنشاء الغرف الحقيقي يحتاج حسابًا مسجلًا وقاعدة بيانات وخدمة صوت.")}>＋ اعمل غرفتك</button>
  </section>;
}

function LivePage({ onAction }: { onAction: PageAction }) {
  const creators = [{ name: "نورهان", views: "1.2K مشاهدة", initial: "ن", cls: "ca1" }, { name: "مروان", views: "840 مشاهدة", initial: "م", cls: "ca2" }, { name: "ليلى", views: "620 مشاهدة", initial: "ل", cls: "ca3" }];
  return <section className="screen active" id="live"><PageTitle eyebrow="LIGHTS ON. CAMERA ON." title="على الهوا 🎥" description="لحظات حقيقية.. وناس تستاهل تتشاف." />
    <div className="live-feature"><div className="live-feature-art"><span className="live-tag">● LIVE</span><span className="live-big-icon">✦</span><div><b>ليلة النجوم</b><small>أقوى لايف الليلة</small></div></div><div className="live-feature-info"><b>السهرة بدأت.. ناقصك إنت</b><p>ادخل شاركهم اللحظة وخلي حضورك يفرق.</p><button className="gold-btn" type="button" onClick={() => onAction("live", "ليلة النجوم", "مشاهدة البث الفعلي هتحتاج ربط خدمة البث المباشر.")}>ادخل البث ←</button></div></div>
    <div className="section-heading"><div><span className="eyebrow">CREATORS</span><h2>ناس على الهوا</h2></div></div>
    <div className="creator-grid">{creators.map((creator) => <div className="creator-card" key={creator.name}><div className={`creator-avatar ${creator.cls}`}>{creator.initial}</div><b>{creator.name}</b><small>◉ {creator.views}</small></div>)}</div>
    <button className="outline-btn" type="button" onClick={() => onAction("start-live", "جاهز تطلع لايف؟", "تشغيل الكاميرا والبث محتاج خدمة بث وصلاحيات الجهاز.")}>＋ ابدأ البث بتاعك</button>
  </section>;
}

function MomentsPage({ onAction }: { onAction: PageAction }) {
  const [liked, setLiked] = useState<string[]>([]);
  const toggleLike = (name: string) => setLiked((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  const posts = [{ name: "سارة أحمد", initial: "س", avatar: "pa1", time: "منذ ١٢ دقيقة", text: "أحلى حاجة لما تلاقي ناس شبه روحك.. مساء الفل على أحلى ناس ❤️", art: "post-art-one", caption: "الحياة أحلى باللمة", count: "١٢٤" }, { name: "عمر الملك", initial: "ع", avatar: "pa2", time: "منذ ساعة", text: "مين صاحي نعمل تحدي أسئلة؟ 😎", art: "post-art-two", caption: "التحدي بدأ ⚡", count: "٨٧" }];
  return <section className="screen active" id="moments"><PageTitle eyebrow="LITTLE MOMENTS. BIG STORIES." title="لحظات ✨" description="شارك لقطة، كلمة، أو ذكرى تفضل." />
    <button className="create-post" type="button" onClick={() => onAction("post", "احكيلنا لحظتك", "محرر الصور والفيديو والنصوص والنشر هيتجهز مع ربط الحسابات.")}><span>＋</span><span><b>إيه الحكاية النهارده؟</b><small>شارك لحظتك مع الكل</small></span></button>
    {posts.map((post) => <article className="post-card" key={post.name}><div className="post-head"><div className={`post-avatar ${post.avatar}`}>{post.initial}</div><div><b>{post.name}</b><small>{post.time} · <span>✦</span></small></div><button className="more-btn" type="button" onClick={() => onAction("post-menu", "خيارات المنشور", "إدارة المنشورات هتتوفر بعد ربط الحسابات.")}>•••</button></div><p>{post.text}</p><div className={`post-art ${post.art}`}><span>{post.caption}</span><i>✧</i></div><div className="post-actions"><button className={liked.includes(post.name) ? "liked" : ""} type="button" onClick={() => toggleLike(post.name)}>{liked.includes(post.name) ? "♥" : "♡"} <span>{liked.includes(post.name) ? "تم الإعجاب" : post.count}</span></button><button type="button" onClick={() => onAction("comments", "التعليقات", "عرض وإضافة التعليقات هيتفعل بعد ربط الخدمة.")}>♧ تعليق</button><button type="button" onClick={() => onAction("share", "مشاركة", "مشاركة اللحظات هتتفعّل بعد تجهيز روابط المحتوى.")}>↗ مشاركة</button></div></article>)}
  </section>;
}

function MessagesPage({ onAction }: { onAction: PageAction }) {
  const chats = [{ name: "نورهان", initial: "ن", cls: "ca1", message: "ضحكتني والله 😂", time: "١٢:٤٥", online: true }, { name: "مروان", initial: "م", cls: "ca2", message: "هستناك في الغرفة", time: "١١:٢٠", online: false }, { name: "ليلى", initial: "ل", cls: "ca3", message: "بعتلك صورة ✨", time: "أمس", online: false }];
  return <section className="screen active" id="messages"><PageTitle eyebrow="YOUR PEOPLE, ONE TAP AWAY" title="الرسايل" description="الكلام الحلو ملوش وقت." /><label className="message-search"><span>⌕</span><input aria-label="ابحث في محادثاتك" placeholder="ابحث في محادثاتك" /></label><div className="chat-list">{chats.map((chat) => <button className="chat-row" key={chat.name} type="button" onClick={() => onAction("chat", chat.name, "فتح المحادثة وإرسال الرسائل يحتاج ربط نظام الحسابات والرسائل.")}><div className={`chat-avatar ${chat.cls}`}>{chat.initial}{chat.online ? <i /> : null}</div><div><b>{chat.name}</b><small>{chat.message}</small></div><time>{chat.time}</time></button>)}</div></section>;
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
  return <section className="screen active" id="wallet"><PageTitle eyebrow="YOUR TREASURE" title="المحفظة الملكية" /><div className="balance-card"><small>رصيدك الحالي</small><strong>12,850</strong><span>كوين ◆</span><div className="balance-actions"><button className="gold-btn" type="button" onClick={() => onAction("top-up", "شحن الرصيد", "عمليات الشحن الحقيقية مش مفعّلة في النموذج الحالي.")}>اشحن رصيدك ＋</button><button className="glass-btn" type="button" onClick={() => onAction("transactions", "سجل الحركات", "ده سجل تجريبي، والسجل الحقيقي هيعتمد على قاعدة بيانات آمنة.")}>سجل الحركات</button></div></div><div className="section-heading"><h2>حركاتك الأخيرة</h2></div><div className="transaction"><span>♛</span><div><b>هدية ملكية</b><small>اليوم · ٨:٣٠ م</small></div><strong className="negative">− 250</strong></div><div className="transaction"><span>✦</span><div><b>مكافأة يومية</b><small>أمس · ١٠:٠٠ ص</small></div><strong className="positive">+ 50</strong></div></section>;
}

function StorePage({ onAction }: { onAction: PageAction }) {
  const [category, setCategory] = useState("هدايا");
  const categories = ["هدايا", "إطارات", "دخول مميز"];
  const gifts = [{ name: "التاج الملكي", price: "2,500 ◆", symbol: "♛", cls: "gift-crown" }, { name: "وردة من دهب", price: "500 ◆", symbol: "✿", cls: "gift-rose" }, { name: "نجمة الأساطير", price: "1,200 ◆", symbol: "✦", cls: "gift-star" }, { name: "قلب الملوك", price: "800 ◆", symbol: "♥", cls: "gift-heart" }];
  return <section className="screen active" id="store"><PageTitle eyebrow="THE ROYAL COLLECTION" title="المتجر الملكي ♛" description="اختار حاجة تليق بحضورك." /><div className="store-tabs">{categories.map((item) => <button className={category === item ? "selected" : ""} key={item} type="button" onClick={() => setCategory(item)}>{item}</button>)}</div><div className="gift-grid">{gifts.map((gift) => <div className="gift-card" key={gift.name}><div className={`gift-art ${gift.cls}`}>{gift.symbol}</div><b>{gift.name}</b><small>{gift.price}</small><button type="button" onClick={() => onAction("gift", gift.name, "إرسال الهدايا وخصم الرصيد مش مفعّلين قبل ربط المحفظة الآمنة.")}>اختار الهدية</button></div>)}</div></section>;
}

function SettingsPage({ navigate, onAction }: { navigate: (id: ScreenId) => void; onAction: PageAction }) {
  return <section className="screen active" id="settings"><div className="page-title"><span className="eyebrow">MAKE IT YOURS</span><h1>الإعدادات</h1></div><div className="settings-list"><label><span>إخفاء حالة الاتصال</span><input type="checkbox" /></label><label><span>السماح برسائل الأصدقاء فقط</span><input type="checkbox" defaultChecked /></label><label><span>أصوات الهدايا المميزة</span><input type="checkbox" defaultChecked /></label><label><span>الوضع الملكي الداكن</span><input type="checkbox" defaultChecked /></label><button type="button" onClick={() => navigate("support")}>مركز المساعدة والدعم ←</button><button className="danger" type="button" onClick={() => onAction("logout", "تسجيل الخروج", "تسجيل الدخول والخروج هيتفعل بعد إضافة نظام الحسابات والتحقق.")}>تسجيل الخروج</button></div></section>;
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

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("home");
  const [modal, setModal] = useState<ModalInfo | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [screen]);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(""), 2300); return () => window.clearTimeout(timer); }, [toast]);
  const onAction: PageAction = (_action, title, message) => setModal({ title: title ?? "حكاوي كوين", message: message ?? "الميزة دي هتتجهز في مرحلة لاحقة." });
  const navigate = (next: ScreenId) => { setScreen(next); setSearchOpen(false); };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setToast(search.trim() ? "البحث الحقيقي هيتفعل بعد ربط قاعدة البيانات" : "اكتب كلمة للبحث"); };
  return <>
    <div className="ambient ambient-a" aria-hidden="true" /><div className="ambient ambient-b" aria-hidden="true" />
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate("home")} aria-label="الرئيسية"><span className="brand-mark">H</span><span><b>حكاوي <em>كوين</em></b><small>عالمك.. على مزاجك</small></span></button>
        <div className="top-actions">
          <button className="icon-btn" type="button" onClick={() => setSearchOpen((value) => !value)} aria-label="بحث">⌕</button>
          <button className="wallet-pill" type="button" onClick={() => navigate("wallet")}><span>◆</span><b>12,850</b><small>كوين</small><i>＋</i></button>
          <button className="icon-btn notification-btn" type="button" onClick={() => setModal({ title: "إشعاراتك", message: "هنا هتظهر رسائل الأصدقاء ودعوات الغرف وتنبيهات حكاوي كوين." })} aria-label="الإشعارات">♧<i /></button>
          <button className="mini-avatar" type="button" onClick={() => navigate("profile")} aria-label="حسابي">و</button>
        </div>
      </header>
      {searchOpen ? <form className="search-bar" onSubmit={submitSearch}><span>⌕</span><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="دور على غرفة أو شخص أو لعبة..." aria-label="البحث العام" /><button type="button" onClick={() => { setSearchOpen(false); setSearch(""); }} aria-label="إغلاق البحث">✕</button></form> : null}
      <main id="mainContent">
        {screen === "home" ? <HomePage navigate={navigate} onAction={onAction} /> : null}
        {screen === "rooms" ? <RoomsPage onAction={onAction} /> : null}
        {screen === "live" ? <LivePage onAction={onAction} /> : null}
        {screen === "moments" ? <MomentsPage onAction={onAction} /> : null}
        {screen === "messages" ? <MessagesPage onAction={onAction} /> : null}
        {screen === "games" ? <GamesPage onAction={onAction} /> : null}
        {screen === "profile" ? <ProfilePage navigate={navigate} onAction={onAction} /> : null}
        {screen === "wallet" ? <WalletPage onAction={onAction} /> : null}
        {screen === "store" ? <StorePage onAction={onAction} /> : null}
        {screen === "settings" ? <SettingsPage navigate={navigate} onAction={onAction} /> : null}
        {screen === "support" ? <SupportPage onAction={onAction} /> : null}
      </main>
    </div>
    <nav className="bottom-nav" aria-label="التنقل الرئيسي">{navItems.map((item) => <button className={`nav-item ${screen === item.id ? "active" : ""}`} key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={screen === item.id ? "page" : undefined}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
    <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    {modal ? <AppModal info={modal} onClose={() => setModal(null)} /> : null}
  </>;
}