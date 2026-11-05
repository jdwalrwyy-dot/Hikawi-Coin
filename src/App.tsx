import { useMemo, useState } from "react";

type Room = { name: string; host: string; count: string; mood: string; icon: string; tag?: string };
const rooms: Room[] = [
  { name: "سهرات العرب", host: "الأميرة ليلى", count: "2.4K", mood: "دردشة وسوالف", icon: "🌙", tag: "نشطة الآن" },
  { name: "أصدقاء حكاوي", host: "ملك حكاوي", count: "1.9K", mood: "لمة الأصحاب", icon: "👑" },
  { name: "ديوان الشعر", host: "شاعر الليل", count: "1.3K", mood: "شعر وطرب", icon: "🎙️" },
  { name: "ضحكة ولمّة", host: "نجم السهرة", count: "860", mood: "ترفيه وتحديات", icon: "🎉" },
];
const gifts = [
  { name: "الأسد", price: "1000", icon: "🦁", rare: true },
  { name: "الصقر", price: "800", icon: "🦅" },
  { name: "التاج", price: "500", icon: "👑", rare: true },
  { name: "الساعة", price: "300", icon: "⌚" },
  { name: "العصفورة", price: "200", icon: "🐦" },
  { name: "وردة ذهبية", price: "100", icon: "🌹" },
  { name: "سيارة فاخرة", price: "1500", icon: "🏎️", rare: true },
  { name: "يخت ملكي", price: "2000", icon: "🛥️", rare: true },
  { name: "قصر", price: "3000", icon: "🏰", rare: true },
];
const nav = [{ id: "home", label: "الرئيسية", icon: "⌂" }, { id: "live", label: "مباشر", icon: "◉" }, { id: "games", label: "ألعاب", icon: "♟" }, { id: "moments", label: "لحظات", icon: "✦" }, { id: "messages", label: "رسائل", icon: "▤" }, { id: "profile", label: "حسابي", icon: "♙" }];

export default function App() {
  const [active, setActive] = useState("home");
  const [query, setQuery] = useState("");
  const [giftTab, setGiftTab] = useState("الكل");
  const [selectedGift, setSelectedGift] = useState("الأسد");
  const filtered = useMemo(() => rooms.filter(r => (r.name + r.host).includes(query)), [query]);
  const shownGifts = gifts.filter(g => giftTab === "الكل" || (giftTab === "فخمة" ? g.rare : !g.rare));
  return (
    <main className="app-shell" dir="rtl" lang="ar">
      <header className="topbar">
        <div className="profile"><div className="avatar">👑</div><div><b>ملك حكاوي</b><small>المستوى 56</small></div></div>
        <div className="brand"><span className="brand-crown">♛</span><strong>حكاوي كوين</strong><small>HIKAWI COIN</small></div>
        <button className="icon-button" aria-label="الإشعارات">♧<i>3</i></button>
      </header>
      <section className="wallet-row">
        <div className="wallet"><span>🪙</span><b>12,450</b><button>＋</button></div>
        <div className="wallet"><span>💎</span><b>86,300</b><button>＋</button></div>
      </section>
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow">أهلاً بيك في عالم حكاوي</span><h1>حكاوي كوين</h1><p>غرف صوتية · بث مباشر · ألعاب · فعاليات</p><button onClick={() => setActive("live")}>اكتشف البث المباشر <span>←</span></button></div>
        <div className="hero-lion">🦁</div><span className="hero-spark">✦</span>
      </section>
      <section className="section">
        <div className="section-heading"><div><span className="eyebrow">المجتمع</span><h2>أكثر الغرف نشاطاً 🔥</h2></div><button className="text-button">عرض الكل ←</button></div>
        <div className="top-rooms">
          {["قمر الليل", "ملك حكاوي", "هواها مصري"].map((n) => <article className="top-room" key={n}><span className="rank">{i + 1}</span><div className="top-avatar">{["🌙","👑","🌸"][i]}</div><b>{n}</b><small>💎 {["5.4K","3.2K","1.8K"][i]}</small></article>)}
        </div>
      </section>
      <section className="pinned-room"><span className="pin-label">مثبتة</span><div className="pin-crown">👑</div><div className="pin-info"><b>غرفة الإدارة الرسمية</b><small>حكاوي كوين · غرفة موثقة</small></div><strong>12.6K <small>متصل</small></strong></section>
      <section className="section room-section">
        <div className="section-heading"><div><span className="eyebrow">ادخل واتعرف على ناس جديدة</span><h2>الغرف الصوتية العامة</h2></div><span className="live-dot">● مباشر</span></div>
        <label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن غرفة أو مضيف..." /></label>
        <div className="room-list">{filtered.map((r, i) => <article className="room-card" key={r.name}><div className="room-art">{r.icon}<span>●</span></div><div className="room-info"><b>{r.name}</b><small>{r.mood} · {r.host}</small><small>♟ {r.count} متصل</small></div><button className="join-button" onClick={() => setActive("live")}>دخول</button></article>)}</div>
        {filtered.length === 0 && <p className="empty">مفيش غرف مطابقة للبحث.</p>}
      </section>
      <section className="section gift-section">
        <div className="section-heading"><div><span className="eyebrow">عبّر عن تقديرك</span><h2>متجر الهدايا 🎁</h2></div><button className="text-button">كل الهدايا ←</button></div>
        <div className="gift-tabs">{["الكل","فخمة","مميزة"].map(t => <button key={t} className={giftTab === t ? "chosen" : ""} onClick={() => setGiftTab(t)}>{t}</button>)}</div>
        <div className="gift-grid">{shownGifts.map(g => <button className={selectedGift === g.name ? "gift-card selected" : "gift-card"} key={g.name} onClick={() => setSelectedGift(g.name)}><span className="gift-art">{g.icon}</span><b>{g.name}</b><small>💎 {g.price}</small>{g.rare && <i>فخمة</i>}</button>)}</div>
        <div className="gift-selected">الهدية المختارة: <b>{selectedGift}</b><button onClick={() => alert("اختيار الهدية للمعاينة فقط — الإرسال سيتصل بالخادم لاحقاً.")}>معاينة الإرسال</button></div>
      </section>
      <button className="create-room" onClick={() => alert("إنشاء الغرفة سيتصل بخدمة الغرف بعد ربط الخادم.")}>＋ <span>إنشاء غرفة</span></button>
      <nav className="bottom-nav">{nav.map(n => <button key={n.id} className={active === n.id ? "active" : ""} onClick={() => setActive(n.id)}><span>{n.icon}</span>{n.label}</button>)}</nav>
    </main>
  );
}
