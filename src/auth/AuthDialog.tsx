import { useEffect, useRef, useState, type FormEvent } from "react";
import { GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, signInWithRedirect, type ConfirmationResult } from "firebase/auth";
import { auth } from "../firebase";

interface AuthDialogProps { onClose: () => void; configured: boolean; mode?: "login" | "register"; }
function readableError(error: unknown): string {
  if (!(error instanceof Error)) return "حصل خطأ غير متوقع. حاول تاني.";
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const messages: Record<string,string> = {
    "auth/popup-closed-by-user":"نافذة تسجيل Google اتقفلت قبل إكمال الدخول.",
    "auth/unauthorized-domain":"الدومين الحالي مش مضاف في Authorized domains داخل Firebase.",
    "auth/invalid-phone-number":"رقم الموبايل مش مكتوب بصيغة دولية صحيحة.",
    "auth/too-many-requests":"محاولات كتير. استنى شوية وجرب تاني.",
    "auth/invalid-verification-code":"رمز التأكيد غير صحيح.",
    "auth/network-request-failed":"في مشكلة اتصال بالإنترنت.",
    "auth/popup-blocked":"المتصفح منع نافذة Google. هنحوّلك لطريقة تسجيل الدخول الآمنة.",
    "auth/operation-not-allowed":"طريقة تسجيل الدخول دي مش مفعّلة في Firebase لهذا التطبيق.",
    "auth/account-exists-with-different-credential":"الحساب موجود بطريقة دخول مختلفة. جرّب نفس الطريقة اللي سجلت بيها أول مرة."
  };
  return messages[code] ?? "تعذر تسجيل الدخول. راجع إعدادات Firebase وحاول مرة أخرى.";
}
export default function AuthDialog({ onClose, configured, mode = "login" }: AuthDialogProps) {
  const [phone,setPhone]=useState("+20"); const [code,setCode]=useState("");
  const [confirmation,setConfirmation]=useState<ConfirmationResult|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [success,setSuccess]=useState("");
  const verifier=useRef<RecaptchaVerifier|null>(null);
  useEffect(()=>()=>{verifier.current?.clear();},[]);
  async function googleLogin() {
    if (!auth) {
      setError("تسجيل الدخول غير جاهز: إعدادات Firebase ناقصة أو لم يتم تحميلها. راجع متغيرات VITE_FIREBASE في إعدادات Vercel.");
      return;
    }
    setBusy(true); setError(""); setSuccess("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
      setSuccess("تم تسجيل الدخول بنجاح.");
      window.setTimeout(onClose, 500);
    } catch (cause) {
      const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
      if (code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          setError(readableError(redirectError));
        }
      } else {
        setError(readableError(cause));
      }
    } finally {
      setBusy(false);
    }
  }
  async function sendCode(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!auth){setError("تسجيل الدخول برقم الموبايل غير جاهز: إعدادات Firebase ناقصة.");return;}setBusy(true);setError("");setSuccess("");
    try { verifier.current??=new RecaptchaVerifier(auth,"phone-recaptcha",{size:"invisible"});const result=await signInWithPhoneNumber(auth,phone.trim(),verifier.current);setConfirmation(result);setSuccess("بعتنالك رمز التأكيد برسالة SMS."); }
    catch(cause){verifier.current?.clear();verifier.current=null;setError(readableError(cause));}finally{setBusy(false);}
  }
  async function verifyCode(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!confirmation)return;setBusy(true);setError("");setSuccess("");
    try{await confirmation.confirm(code.trim());setSuccess("تم تأكيد رقم الموبايل بنجاح.");window.setTimeout(onClose,500);}
    catch(cause){setError(readableError(cause));}finally{setBusy(false);}
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section className="modal auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="auth-close" type="button" onClick={onClose} aria-label="إغلاق">×</button>
      <div className="modal-symbol">♛</div><h2 id="auth-title">{mode === "register" ? "إنشاء حساب في حكاوي كوين" : "أهلاً بيك في حكاوي كوين"}</h2>
      <p className="auth-intro">{mode === "register" ? "اختار Google أو رقم الموبايل لإنشاء حسابك والبدء." : "سجّل دخولك عشان تحتفظ بحسابك وتبدأ حكايتك."}</p>
      {!configured?<p className="auth-error">تسجيل الدخول مش متاح لسه: إعدادات Firebase الخاصة بالمشروع لم تُضف. أضف القيم الموجودة في ملف .env.example إلى إعدادات بيئة التشغيل.</p>:<>
        <button className="auth-action primary" type="button" disabled={busy} onClick={()=>void googleLogin()}>◉　المتابعة باستخدام Google</button>
        <div className="auth-divider">أو رقم الموبايل</div>
        {!confirmation?<form onSubmit={event=>void sendCode(event)}><input type="tel" autoComplete="tel" value={phone} onChange={event=>setPhone(event.target.value)} placeholder="+201xxxxxxxxx" aria-label="رقم الموبايل بصيغة دولية" required /><button className="auth-action" type="submit" disabled={busy||phone.trim().length<8}>{busy?"جاري الإرسال...":"ابعت رمز التأكيد"}</button></form>:<form onSubmit={event=>void verifyCode(event)}><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event=>setCode(event.target.value)} placeholder="اكتب رمز التأكيد" aria-label="رمز التأكيد" required /><button className="auth-action primary" type="submit" disabled={busy||code.trim().length<4}>{busy?"جاري التأكيد...":"تأكيد الرقم"}</button></form>}
        <div id="phone-recaptcha" />
      </>}
      {error?<p className="auth-error" role="alert">{error}</p>:null}{success?<p className="auth-success" role="status">{success}</p>:null}
      <p className="auth-note">باستمرارك، أنت توافق على شروط الاستخدام وسياسة الخصوصية. لا تشارك رمز التأكيد مع أي شخص.</p>
    </section>
  </div>;
}
