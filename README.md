# موقع Benna Sud مع لوحة تحكم

موقع ثابت (HTML + JS) يعمل على **GitHub Pages**، ومنتجاته مخزّنة في **Firebase** (الخطة المجانية Spark تكفي).
أي زبون يفتح الموقع يرى المنتجات، والمالك فقط يدخل بكلمة سر ويعدّل.

## الملفات
- `index.html` و `style.css` و `app.js`: الموقع ولوحة التحكم.
- `config.js`: الملف الوحيد الذي تعدّله (إعدادات Firebase وبريد المالك).
- `firestore.rules`: قواعد الأمان تلصقها في Firebase.

## الخطوة 1: إنشاء مشروع Firebase (10 دقائق)
1. ادخل إلى https://console.firebase.google.com بحساب Google، واضغط **Add project**، واختر اسماً (مثل `benna-sud`). يمكنك إيقاف Google Analytics.
2. من القائمة اليسرى: **Build > Firestore Database > Create database**. اختر **Production mode** وأقرب موقع (مثل `eur3`).
3. من **Build > Authentication > Get started > Sign-in method**، فعّل **Email/Password**.
4. من تبويب **Users** اضغط **Add user**، واكتب بريدك وكلمة سر قوية. هذا حساب المالك. احفظهما.
5. من **Project settings** (أيقونة الترس) > **Your apps** اضغط أيقونة الويب `</>`، سمّ التطبيق، ثم انسخ قيم `firebaseConfig`.

## الخطوة 2: ضبط الملفات
1. افتح `config.js` والصق القيم التي نسختها، واكتب بريد المالك في `ADMIN_EMAIL`.
2. افتح `firestore.rules`، وبدّل `PUT_OWNER_EMAIL_HERE` ببريد المالك.
3. في Firebase: **Firestore Database > Rules**، امسح المحتوى والصق محتوى `firestore.rules`، ثم **Publish**.

## الخطوة 3: النشر على GitHub Pages
1. أنشئ حساباً على https://github.com ثم **New repository** باسم مثل `benna-sud` (Public).
2. اضغط **uploading an existing file** وارفع كل الملفات (`index.html`, `style.css`, `app.js`, `config.js`, ...) ثم **Commit changes**.
3. من **Settings > Pages**: في Source اختر **Deploy from a branch**، والفرع `main` والمجلد `/ (root)`، ثم Save.
4. بعد دقيقة أو اثنتين يظهر الرابط: `https://اسم-حسابك.github.io/benna-sud/`.

## الاستعمال
1. افتح الموقع، وانزل إلى أسفل الصفحة، واضغط **دخول المالك**، وسجّل ببريد المالك وكلمة السر.
2. يظهر في أعلى الصفحة زر **لوحة التحكم**. منه تستطيع:
   - إضافة منتج واحد مع صورته.
   - لصق قائمة كاملة من Excel (الاسم، السعر، الفئة، الوصف) لإضافة مئات المنتجات دفعة واحدة.
   - تعديل أو حذف أي منتج.
   - تغيير رقم واتساب الطلبات.
3. قبل أن تضيف منتجاتك، الموقع يعرض منتجات تجريبية. زر **نسخ المنتجات التجريبية للتعديل** يحفظها لتعدّل عليها.

## ملاحظات
- **الصور** تُصغَّر تلقائياً وتُحفظ داخل Firestore، فلا تحتاج Firebase Storage ولا بطاقة بنكية.
- **الحد المجاني**: 50,000 قراءة و20,000 كتابة في اليوم. الموقع يخزّن المنتجات في متصفح الزبون ويتحقق بقراءة واحدة فقط، لذلك يتحمل زوّاراً كثيرين.
- إذا لم يعمل تسجيل الدخول من رابط github.io، أضف النطاق في Firebase: **Authentication > Settings > Authorized domains**.
- إذا ظهر خطأ «لا تملك صلاحية التعديل»، تأكد أن البريد في `firestore.rules` هو نفس بريد الدخول بالضبط.
- لدومين خاص (مثل bennasud.com) اشتره ثم اربطه من **Settings > Pages > Custom domain**.
