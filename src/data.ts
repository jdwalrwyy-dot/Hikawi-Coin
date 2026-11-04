export type ScreenId = "home" | "rooms" | "room" | "live" | "moments" | "messages" | "games" | "profile" | "wallet" | "store" | "settings" | "support";
export type PageAction = (action: string, title?: string, message?: string) => void;

export interface Room {
  name: string;
  description: string;
  members: number;
  category: string;
  coverClass: string;
  symbol: string;
}

export const demoRooms: Room[] = [
  { name: "لمة حبايبنا", description: "ضحك وسوالف من القلب", members: 72, category: "سوالف", coverClass: "cover-rose", symbol: "✿" },
  { name: "مملكة السهر", description: "الليلة لسه في أولها", members: 54, category: "ترفيه", coverClass: "cover-gold", symbol: "♛" },
  { name: "على كيفك", description: "مكانك لو بتحب الهدوء", members: 31, category: "رايقة", coverClass: "cover-blue", symbol: "☾" },
  { name: "نجوم الطرب", description: "غنّي واسمع أحلى الأصوات", members: 89, category: "موسيقى", coverClass: "cover-purple", symbol: "♫" },
];

export const navItems: { id: ScreenId; label: string; icon: string }[] = [
  { id: "home", label: "الغرف الصوتية", icon: "⌂" },
  { id: "live", label: "البث المباشر", icon: "▣" },
  { id: "moments", label: "اللحظات", icon: "✧" },
  { id: "games", label: "الألعاب", icon: "♟" },
  { id: "messages", label: "الرسائل", icon: "♧" },
  { id: "profile", label: "الملف الشخصي", icon: "◉" },
];