import { useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const verifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, setUser);
    getRedirectResult(auth).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "تعذر إكمال تسجيل الدخول بجوجل.");
    });
    return () => {
      unsubscribe();
      verifier.current?.clear();
      verifier.current = null;
    };
  }, []);

  async function loginWithGoogle() {
    if (!auth) { setError("تسجيل الدخول غير جاهز: إعدادات Firebase غير مكتملة."); return; }
    setBusy(true); setError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "حصلت مشكلة أثناء تسجيل الدخول بجوجل.");
      setBusy(false);
    }
  }

  async function sendPhoneCode() {
    if (!auth) { setError("تسجيل الدخول غير جاهز: إعدادات Firebase غير مكتملة."); return; }
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
      setError("اكتب رقمك بالصيغة الدولية، مثال: +201xxxxxxxxx");
      return;
    }
    setBusy(true); setError("");
    try {
      verifier.current?.clear();
      verifier.current = new RecaptchaVerifier(auth, "phone-recaptcha", { size: "invisible" });
      const result = await signInWithPhoneNumber(auth, phone.trim(), verifier.current);
      setConfirmation(result);
    } catch (reason) {
      verifier.current?.clear(); verifier.current = null;
      setError(reason instanceof Error ? reason.message : "لم نتمكن من إرسال رمز التحقق.");
    } finally { setBusy(false); }
  }

  async function verifyPhoneCode() {
    if (!confirmation) return;
    setBusy(true); setError("");
    try { await confirmation.confirm(code.trim()); }
    catch { setError("رمز التحقق غير صحيح أو انتهت صلاحيته. حاول مرة أخرى."); }
    finally { setBusy(false); }
  }

  return (
    <main className="login-page" dir="rtl" lang="ar">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <section className="login-content">
        <div className="hero-art" aria-label="حكاوي كوين">
          <div className="moon" /><div className="palace palace-one" /><div className="palace palace-two" />
          <div className="lantern lantern-left">✦</div><div className="lantern lantern-right">✦</div>
          <div className="heart heart-left">♥</div><div className="heart heart-right">♥</div>
          <div className="queen-orbit"><div className="crown">♛</div><div className="portrait">ح</div></div>
          <div className="mic-art">♬</div>
          <div className="brand-title">حكاوي</div><div className="brand-sub">كوين</div>
          <p className="tagline">مكان يجمعنا ... لحكايات أجمل</p>
        </div>

        {user ? (
          <section className="auth-panel success-panel">
            <div className="panel-heading"><span>♛</span><h1>أهلًا بيك في حكاوي</h1></div>
            <div className="user-summary">
              {user.photoURL && <img src={user.photoURL} alt="" />}
              <strong>{user.displayName || user.phoneNumber || user.email || "حسابك"}</strong>
              <small>{user.email || user.phoneNumber}</small>
            </div>
            <p className="success-note">تم تسجيل الدخول بنجاح. واجهة التطبيق الداخلية لم تُضف في هذه المرحلة.</p>
          </section>
        ) : (
          <section className="auth-panel">
            <div className="panel-heading"><span>♛</span><h1>تسجيل الدخول</h1></div>
            {!phoneMode ? (
              <>
                <button className="login-button google-button" onClick={loginWithGoogle} disabled={busy}>
                  <span className="google-mark">G</span><span>{busy ? "جاري الاتصال..." : "تسجيل الدخول بحساب جوجل"}</span>
                </button>
                <button className="login-button phone-button" onClick={() => { setPhoneMode(true); setError(""); }}>
                  <span className="phone-mark">☎</span><span>تسجيل الدخول برقم الهاتف</span>
                </button>
                <p className="signup-line">لا تملك حسابًا؟ <button onClick={loginWithGoogle}>سجل الآن</button></p>
              </>
            ) : (
              <div className="phone-form">
                {!confirmation ? <>
                  <label htmlFor="phone">رقم الهاتف بالصيغة الدولية</label>
                  <input id="phone" type="tel" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+201xxxxxxxxx" autoComplete="tel" />
                  <button className="login-button phone-button" onClick={sendPhoneCode} disabled={busy}>{busy ? "جاري إرسال الرمز..." : "إرسال رمز التحقق"}</button>
                </> : <>
                  <label htmlFor="otp">اكتب رمز التحقق المرسل لهاتفك</label>
                  <input id="otp" inputMode="numeric" dir="ltr" value={code} onChange={e => setCode(e.target.value)} placeholder="123456" autoComplete="one-time-code" />
                  <button className="login-button phone-button" onClick={verifyPhoneCode} disabled={busy}>{busy ? "جاري التحقق..." : "تأكيد الدخول"}</button>
                </>}
                <button className="back-link" onClick={() => { setPhoneMode(false); setConfirmation(null); setError(""); }}>العودة لخيارات الدخول</button>
              </div>
            )}
            <div id="phone-recaptcha" />
            {error && <p className="error-message" role="alert">{error}</p>}
            {!isFirebaseConfigured && <p className="setup-note">يلزم ضبط مفاتيح Firebase في إعدادات الاستضافة لتفعيل تسجيل الدخول.</p>}
          </section>
        )}
        <p className="footer-note">حكاوي كوين <span>•</span> حكايتك تبدأ هنا</p>
      </section>
    </main>
  );
}
