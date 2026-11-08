# تفعيل حساب مالك حكاوي كوين

المالك الرئيسي المحدد في المشروع هو `jdwalrwyy@gmail.com`.

## المتطلبات الأمنية

- يلزم حساب Google Cloud/Firebase موثوق لديه صلاحية إدارة Firebase Authentication.
- لا ترفع ملف Service Account إلى GitHub، ولا تضعه داخل `public` أو `src` أو أي ملف يصل للمتصفح.
- شغّل الأوامر في جهاز أو Cloud Shell موثوق فقط، ولا ترسل مفتاح الخدمة في المحادثات.

## التنفيذ

1. نزّل نسخة المشروع من الفرع `design-v10-ui`.
2. ثبّت الحزم: `npm install`.
3. عيّن متغير `GOOGLE_APPLICATION_CREDENTIALS` ليشير إلى ملف Service Account المحفوظ خارج مجلد المشروع.
4. عيّن `GCLOUD_PROJECT` إلى معرّف مشروع Firebase الصحيح.
5. نفّذ: `npm run set:owner`.

السكربت يبحث عن الحساب المحدد بالبريد الإلكتروني في Firebase Authentication، ويحافظ على الـ Custom Claims الموجودة، ثم يضيف `admin: true` و`owner: true` و`role: "owner"`.

بعد نجاح التنفيذ، يجب على المالك تسجيل الخروج والدخول مجددًا حتى يحصل على ID token جديد يحمل الصلاحيات.

## التحقق

افحص Custom Claims من بيئة خادم موثوقة باستخدام Firebase Admin SDK. لا تعتمد على قيمة بريد إلكتروني يرسلها العميل، ولا تمنح صلاحية الإدارة من واجهة التطبيق أو من كود المتصفح.

قواعد Firestore تعتمد على `request.auth.token.admin == true`. تعيين هذه المطالبة لا ينشر قواعد Firestore تلقائيًا؛ انشر القواعد بعد اختبارها على نسخة اختبارية من المشروع.
