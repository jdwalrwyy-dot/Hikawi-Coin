import { useState } from "react";
import type { LiveRoomRecord } from "../firebase";
type Props = { rooms: LiveRoomRecord[]; displayName: string; onCreateRoom: () => void; onEnterRoom: (room: LiveRoomRecord) => void };
const categories = ["الكل", "شائع 🔥", "مصر 🇪🇬", "الخليج", "دردشة", "ألعاب", "موسيقى"];
export default function V10HomeScreen({ rooms, displayName, onCreateRoom, onEnterRoom }: Props) {
 const [category,setCategory]=useState("الكل"); const [query,setQuery]=useState("");
 const filtered=rooms.filter(room=>{const q=!query||[room.name,room.ownerName,room.description].some(v=>(v||"").toLowerCase().includes(query.toLowerCase()));const c=category==="الكل"||category==="شائع 🔥"||category==="مصر 🇪🇬"||category==="الخليج"||room.category===category;return q&&c;});
 return <section className="v10-home" dir="rtl">
 <div className="v10-topbar"><div className="v10-brand"><span className="v10-crown">♛</span><div><b>حكاوي كوين</b><small>HIKAWI COIN</small></div></div><div className="v10-wallet"><span>💎 <b>—</b></span><span>🪙 <b>—</b></span></div><button className="v10-search-button" aria-label="بحث" onClick={()=>document.getElementById("v10-room-search")?.focus()}>⌕</button></div>
 <div className="v10-welcome"><span>✦ أهلاً بيك في عالم حكاوي</span><h1>{displayName}</h1><p>لمة أصحابك وحكاياتكم تبدأ من هنا</p></div>
 <label className="v10-search"><span>⌕</span><input id="v10-room-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن غرفة أو مضيف أو ID..." /></label>
 <button className="v10-event-banner" onClick={onCreateRoom}><span className="v10-banner-crown">👑</span><span className="v10-banner-copy"><small>عالمك.. أصحابك.. حكايتك</small><b>افتح مجلسك الملكي</b><em>أنشئ غرفة صوتية وابدأ اللمة الآن</em></span><span className="v10-banner-arrow">‹</span></button>
 <div className="v10-section-head"><div><small>الأكثر تفاعلاً</small><h2>مجالس حكاوي المميزة</h2></div><span className="v10-live-dot">● مباشر</span></div>
 <div className="v10-podium">{[{n:"الأولى",emoji:"🥇",name:rooms[0]?.name||"مجلس السعادة"},{n:"الثانية",emoji:"🥈",name:rooms[1]?.name||"لمة الأصدقاء"},{n:"الثالثة",emoji:"🥉",name:rooms[2]?.name||"سهرة حكاوي"}].map((r,i)=><div className={`v10-podium-item podium-${i+1}`} key={i}><span>{r.emoji}</span><b>{r.name}</b><small>{r.n}</small></div>)}</div>
 <div className="v10-section-head v10-rooms-heading"><div><small>اختار مجلسك</small><h2>الغرف الصوتية</h2></div><button onClick={onCreateRoom}>＋ إنشاء غرفة</button></div>
 <div className="v10-categories">{categories.map(item=><button key={item} className={category===item?"selected":""} onClick={()=>setCategory(item)}>{item}</button>)}</div>
 {filtered.length===0?<div className="v10-empty"><span>🎙️</span><b>{rooms.length===0?"لسه مفيش غرف عامة":"مفيش غرف مطابقة للبحث"}</b><p>{rooms.length===0?"ابدأ أول حكاية وأنشئ غرفة لأصحابك.":"جرّب كلمة بحث أو تصنيف مختلف."}</p><button onClick={onCreateRoom}>إنشاء أول غرفة</button></div>:<div className="v10-room-grid">{filtered.map((room,index)=><article className={`v10-room-card v10-room-${index%4}`} key={room.id} onClick={()=>onEnterRoom(room)}><div className="v10-room-art"><span>{["🎙️","🌙","🎮","☕"][index%4]}</span><small>● غرفة عامة</small></div><div className="v10-room-info"><b>{room.name}</b><p>{room.description||room.category||"مجلس من مجالس حكاوي"}</p><div><span>👤 {room.ownerName}</span><button onClick={e=>{e.stopPropagation();onEnterRoom(room)}}>دخول ‹</button></div></div></article>)}</div>}
 <div className="v10-footer-note">حكاوي كوين • حكايات تجمعنا</div></section>;
}