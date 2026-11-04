const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const toast=(message)=>{const t=$("#toast");t.textContent=message;t.classList.add("show");clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>t.classList.remove("show"),2300)};
function showScreen(id){const target=$("#"+id);if(!target)return;$$(".screen").forEach(s=>s.classList.toggle("active",s.id===id));$$("[data-screen]").forEach(b=>b.classList.toggle("active",b.dataset.screen===id&&b.classList.contains("nav-item")));window.scrollTo({top:0,behavior:"smooth"});}
$$("[data-screen]").forEach(b=>b.addEventListener("click",()=>showScreen(b.dataset.screen)));
function openModal(title,text){$("#modalTitle").textContent=title;$("#modalText").textContent=text;$("#modal").classList.remove("hidden")}
$("#modalClose").onclick=()=>$("#modal").classList.add("hidden");$("#modalOk").onclick=()=>$("#modal").classList.add("hidden");$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")$("#modal").classList.add("hidden")});
$$("[data-room]").forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.room||"غرفة حكاوي","دي معاينة لشكل الغرفة الملكية. هنضيف مقاعد المايك والصوت المباشر والدردشة والهدايا بعد ربط خدمة الصوت والخادم.")));
$("#searchToggle").onclick=()=>{$("#searchBar").classList.toggle("hidden");if(!$("#searchBar").classList.contains("hidden"))$("#globalSearch").focus()};
$("#closeSearch").onclick=()=>$("#searchBar").classList.add("hidden");
$("#globalSearch").addEventListener("keydown",e=>{if(e.key==="Enter")toast("البحث الحقيقي هيتفعل بعد ربط قاعدة البيانات")});
$("#notifications").onclick=()=>openModal("إشعاراتك","هنا هتظهر رسائل الأصدقاء ودعوات الغرف وتنبيهات حكاوي كوين.");
$("#createRoom").onclick=()=>openModal("غرفتك.. قوانينك","إنشاء الغرف هيحتاج حساب مسجل وخدمة قاعدة البيانات. التصميم جاهز لاستقبال شاشة الإنشاء.");
$("#startLive").onclick=()=>openModal("جاهز تطلع لايف؟","واجهة بدء البث جاهزة للتصميم، وتشغيل الكاميرا والبث محتاج خدمة بث وصلاحيات الجهاز.");
$("#createPost").onclick=()=>openModal("احكيلنا لحظتك","هنضيف هنا محرر الصور والفيديو والنصوص وربط النشر بحسابك.");
$$(".like-btn").forEach(b=>b.addEventListener("click",()=>{b.classList.toggle("liked");b.firstChild.textContent=b.classList.contains("liked")?"♥ ":"♡ "}));
$$(".mood-card").forEach(b=>b.addEventListener("click",()=>{toast("بنظبطلك أجواء: "+b.dataset.filter);showScreen("rooms")}));
$$(".filter-chips button").forEach(b=>b.addEventListener("click",()=>{$$(".filter-chips button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")}));
$$(".store-tabs button").forEach(b=>b.addEventListener("click",()=>{$$(".store-tabs button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");toast("قسم "+b.textContent+" هيتعرض بعد تجهيز عناصر المتجر")}));
$$(".gift-card button").forEach(b=>b.addEventListener("click",()=>openModal("هدية من القلب","اختيار الهدية وإرسالها هيتفعل بعد ربط المحفظة ونظام الهدايا الحقيقي.")));
$("#copyId").onclick=()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText("000000").then(()=>toast("تم نسخ المعرف"));else toast("معرفك: 000000")};
$("#sendSupport").onclick=()=>{const v=$(".support-card textarea").value.trim();if(!v){toast("اكتب رسالتك الأول");return}toast("تم تجهيز رسالتك للربط بمركز الدعم");$(".support-card textarea").value=""};
$("#logout").onclick=()=>openModal("تسجيل الخروج","تسجيل الدخول والخروج هيتفعل بعد إضافة نظام الحسابات والتحقق.");
$("#copyId").setAttribute("aria-label","نسخ المعرف");
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("#modal").classList.add("hidden")});
