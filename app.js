import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig, ADMIN_EMAIL, DEFAULT_WA } from "./config.js";

/* ---------- Firebase ---------- */
const configured = !!(firebaseConfig && firebaseConfig.apiKey && !/YOUR_/.test(firebaseConfig.apiKey));
let db = null, auth = null;
if (configured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

const DEMO = [
  { name: "طابع المقروط الخشبي", cat: "طوابع وقوالب", price: 450, desc: "خشب زان، نقش هندسي، مقبض مريح." },
  { name: "طابع الغريبة بالورد", cat: "طوابع وقوالب", price: 350, desc: "نقش وردة بخمس بتلات، قطر 4 سم." },
  { name: "قالب قلب اللوز", cat: "طوابع وقوالب", price: 900, desc: "سيليكون غذائي، 12 تجويفاً." },
  { name: "قصّاصات معدنية", cat: "أدوات تزيين", price: 600, desc: "12 قطعة بأشكال نجمة وهلال وزهرة." },
  { name: "كيس تزيين مع 6 بكّات", cat: "أدوات تزيين", price: 700, desc: "للكريمة والعجين، قابل للغسل." },
  { name: "ملقط الزخرفة", cat: "أدوات تزيين", price: 250, desc: "لنقش حواف البقلاوة والمقروط." },
  { name: "ماء الزهر 250 مل", cat: "مكوّنات", price: 300, desc: "مقطّر طبيعي من الزهر." },
  { name: "لوز مطحون 500 غ", cat: "مكوّنات", price: 1100, desc: "ناعم، مناسب لقلب اللوز والمحنشة." },
  { name: "عسل للحلويات 500 غ", cat: "مكوّنات", price: 800, desc: "عسل صافٍ لغمس المقروط." },
  { name: "كاسات ورقية 100 قطعة", cat: "تغليف", price: 200, desc: "لتقديم الحلويات الصغيرة." },
  { name: "علبة كرتون لـ 12 قطعة", cat: "تغليف", price: 120, desc: "علبة بغطاء شفاف للهدايا." },
  { name: "شريط تغليف ذهبي", cat: "تغليف", price: 150, desc: "عرض 2 سم، طول 10 متر." }
].map((p, i) => ({ ...p, id: "demo" + i, createdAt: 0, img: false }));

const PAGE = 24, APAGE = 30, CACHE_KEY = "bennaSudCatalog";
const TINTS = ["#e6dcf6", "#f9d9e8", "#efe3fa", "#fbe3ee", "#e9e0f7", "#fdeaf2"];
const INKS = ["#5a2d9c", "#b8305f", "#6d3bb5", "#c24f84", "#4b2488", "#a8326a"];

let products = [], dbLoaded = false, stateV = 0, waSetting = "";
let isAdmin = false;
let current = "الكل", query = "", shown = PAGE, ashown = APAGE, aquery = "";
const order = {};
let editing = null, pendingData = null, removeImage = false;
const imgCache = new Map();

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const list = () => (dbLoaded && products.length ? products : DEMO);
const usingDemo = () => !(dbLoaded && products.length);
const byId = (id) => list().find((p) => p.id === id);
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

function rosette(petals, color, r) {
  let s = "";
  for (let i = 0; i < petals; i++) {
    s += `<ellipse cx="100" cy="${100 - r}" rx="${r * 0.34}" ry="${r * 0.62}" transform="rotate(${(360 / petals) * i} 100 100)" fill="none" stroke="${color}" stroke-width="3"/>`;
  }
  return s + `<circle cx="100" cy="100" r="${r * 0.28}" fill="${color}"/><circle cx="100" cy="100" r="${r * 1.55}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>`;
}
$("heroStamp").innerHTML = rosette(8, "#e8709f", 46);
(function () {
  let s = '<g fill="#e8709f">';
  for (let i = 0; i < 14; i++) {
    const a = (Math.PI * 2 * i) / 14;
    s += `<circle cx="${(50 + 40 * Math.cos(a)).toFixed(1)}" cy="${(50 + 40 * Math.sin(a)).toFixed(1)}" r="8"/>`;
  }
  s += '<circle cx="50" cy="50" r="40"/></g><circle cx="50" cy="50" r="35" fill="none" stroke="#1a1020" stroke-width="2"/>' +
    '<g fill="none" stroke="#1a1020" stroke-width="2" stroke-linecap="round">' +
    '<rect x="39" y="44" width="22" height="9" rx="2"/><rect x="42" y="36" width="16" height="8" rx="2"/><rect x="45" y="29" width="10" height="7" rx="2"/>' +
    '<path d="M50 29v-5M30 55h40M50 55v8M43 64h14"/></g>' +
    '<text x="50" y="80" text-anchor="middle" font-size="13" font-style="italic" font-weight="700" fill="#1a1020" font-family="Tajawal, sans-serif">SUD</text>';
  $("logo").innerHTML = s;
})();

/* ---------- storefront ---------- */
function cats() {
  const seen = {}, out = [];
  list().forEach((p) => { const c = p.cat || "أخرى"; if (!seen[c]) { seen[c] = 1; out.push(c); } });
  return out.sort((a, b) => a.localeCompare(b, "ar"));
}
function filtered() {
  const q = query.trim().toLowerCase();
  return list()
    .filter((p) => {
      if (current !== "الكل" && (p.cat || "أخرى") !== current) return false;
      if (q && (String(p.name) + " " + String(p.desc || "")).toLowerCase().indexOf(q) < 0) return false;
      return true;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}
const priceHtml = (p) => (p.price ? fmt(p.price) + " <span>دج</span>" : "<span>السعر عند الطلب</span>");
function cardHtml(p) {
  const h = hash(String(p.cat || "") + p.id) % TINTS.length;
  const cached = imgCache.get(p.id);
  const media = p.img
    ? `<img data-pid="${esc(p.id)}" alt="${esc(p.name)}"${cached ? ` src="${cached}"` : ""}>`
    : `<svg viewBox="0 0 200 200" aria-hidden="true">${rosette(5 + (hash(String(p.name)) % 4) * 2, INKS[h], 40)}</svg>`;
  return `<article class="card"><div class="swatch" style="background:${TINTS[h]}">${media}</div>` +
    `<div class="card-body"><h3>${esc(p.name)}</h3><div class="desc">${esc(p.desc)}</div>` +
    `<div class="card-foot"><div class="price">${priceHtml(p)}</div>` +
    `<button class="add" type="button" data-id="${esc(p.id)}">أضف إلى الطلب</button></div></div></article>`;
}
function renderChips() {
  const all = ["الكل"].concat(cats());
  if (all.indexOf(current) < 0) current = "الكل";
  $("chips").innerHTML = all.map((c) => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${c === current}">${esc(c)}</button>`).join("");
}
let io = null;
function loadImage(pid) {
  if (imgCache.has(pid)) return Promise.resolve(imgCache.get(pid));
  return getDoc(doc(db, "images", pid)).then((s) => {
    const d = s.exists() ? s.data().data : "";
    if (d) imgCache.set(pid, d);
    return d;
  });
}
function watchImages() {
  if (!db) return;
  if (!io && "IntersectionObserver" in window) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target; io.unobserve(el);
        loadImage(el.dataset.pid).then((d) => { if (d) el.src = d; }).catch(() => {});
      });
    }, { rootMargin: "200px" });
  }
  document.querySelectorAll("#grid img[data-pid]:not([src])").forEach((el) => {
    if (io) io.observe(el); else loadImage(el.dataset.pid).then((d) => { if (d) el.src = d; });
  });
}
function renderGrid() {
  const items = filtered();
  $("grid").innerHTML = items.length ? items.slice(0, shown).map(cardHtml).join("") : '<div class="empty">لا توجد منتجات مطابقة.</div>';
  $("more").hidden = items.length <= shown;
  $("demoNote").hidden = !usingDemo();
  watchImages();
}
function waNumber() {
  let d = String(waSetting || DEFAULT_WA).replace(/\D/g, "");
  if (d.indexOf("00") === 0) d = d.slice(2);
  if (d.charAt(0) === "0") d = "213" + d.slice(1);
  return d;
}
function renderOrder() {
  Object.keys(order).forEach((id) => { if (!byId(id)) delete order[id]; });
  const ids = Object.keys(order);
  let count = 0, total = 0;
  const lines = [];
  ids.forEach((id) => {
    const p = byId(id), q = order[id];
    count += q; total += (p.price || 0) * q; lines.push("• " + p.name + " × " + q + (p.price ? " (" + p.price + " دج)" : ""));
  });
  const sum = $("sum"), send = $("send"), lst = $("list");
  if (!count) { sum.textContent = "طلبك فارغ"; send.setAttribute("aria-disabled", "true"); send.href = "#"; lst.hidden = true; return; }
  sum.innerHTML = `<b>${count}</b> منتج · المجموع <b>${fmt(total)}</b> دج`;
  lst.hidden = false;
  lst.innerHTML = ids.map((id) => `${esc(byId(id).name)} × ${order[id]}<button type="button" data-rm="${esc(id)}" aria-label="حذف ${esc(byId(id).name)}">حذف</button>`).join(" · ");
  const msg = "السلام عليكم، أريد طلب:\n" + lines.join("\n") + "\nالمجموع: " + total + " دج";
  send.href = "https://wa.me/" + waNumber() + "?text=" + encodeURIComponent(msg);
  send.setAttribute("aria-disabled", "false");
}
function renderStore() { renderChips(); renderGrid(); renderOrder(); if (isAdmin) renderAdminList(); }

/* ---------- catalog loading (one small read when nothing changed) ---------- */
function saveCache() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ v: stateV, items: products })); } catch (e) {}
}
async function loadCatalog() {
  if (!db) { renderStore(); return; }
  try {
    const st = await getDoc(doc(db, "meta", "state"));
    const state = st.exists() ? st.data() : {};
    waSetting = state.wa || ""; stateV = state.v || 0;
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) {}
    if (cached && cached.v === stateV && Array.isArray(cached.items)) products = cached.items;
    else {
      const snap = await getDocs(collection(db, "products"));
      products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      saveCache();
    }
    dbLoaded = true;
  } catch (e) { console.error(e); dbLoaded = false; }
  renderStore();
}
async function bump() {
  stateV = Date.now();
  await setDoc(doc(db, "meta", "state"), { v: stateV }, { merge: true });
  saveCache();
}

/* ---------- admin ---------- */
function setMsg(id, text, kind) { const el = $(id); el.textContent = text || ""; el.className = "msg" + (kind ? " " + kind : ""); }
function dbErr(e) {
  const c = e && e.code;
  if (c === "permission-denied") return "لا تملك صلاحية التعديل. تأكد من الدخول ببريد المالك ومن قواعد Firestore.";
  if (c === "resource-exhausted") return "تجاوزت الحد المجاني اليومي، حاول غداً.";
  if (c === "unavailable") return "لا يوجد اتصال بالإنترنت.";
  return "تعذّر الحفظ، أعد المحاولة.";
}
function renderAdminList() {
  const q = aquery.trim().toLowerCase();
  const items = products
    .filter((p) => !q || String(p.name).toLowerCase().indexOf(q) >= 0 || String(p.cat || "").toLowerCase().indexOf(q) >= 0)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  $("cnt").textContent = products.length;
  $("alist").innerHTML = items.length ? items.slice(0, ashown).map((p) =>
    `<div class="arow"><div class="info"><b>${esc(p.name)}</b><span>${esc(p.cat || "أخرى")} · ${p.price ? fmt(p.price) + " دج" : "بدون سعر"}${p.img ? " · بصورة" : ""}</span></div>` +
    `<div class="btns"><button class="btn small ghost" type="button" data-edit="${esc(p.id)}">تعديل</button>` +
    `<button class="btn small ghost" type="button" data-del="${esc(p.id)}">حذف</button></div></div>`
  ).join("") : '<div class="msg">لا توجد منتجات بعد.</div>';
  $("aMore").hidden = items.length <= ashown;
  $("catlist").innerHTML = cats().map((c) => `<option value="${esc(c)}">`).join("");
  $("demoPanel").hidden = !(dbLoaded && !products.length);
  if (waSetting && document.activeElement !== $("s-wa")) $("s-wa").value = waSetting;
}
function resetForm() {
  editing = null; pendingData = null; removeImage = false;
  $("form").reset(); $("formTitle").textContent = "إضافة منتج"; $("cancelEdit").hidden = true;
  $("preview").hidden = true; $("prevImg").removeAttribute("src");
}
function startEdit(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  resetForm();
  editing = id;
  $("f-name").value = p.name || ""; $("f-cat").value = p.cat || ""; $("f-price").value = p.price || ""; $("f-desc").value = p.desc || "";
  if (p.img) { loadImage(id).then((d) => { if (d && editing === id) { $("prevImg").src = d; $("preview").hidden = false; } }); }
  $("formTitle").textContent = "تعديل منتج"; $("cancelEdit").hidden = false;
  setMsg("formMsg", ""); $("admin").scrollTop = 0; $("f-name").focus();
}
function shrink(file) {
  return createImageBitmap(file).then((bmp) => {
    const max = 640, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.72);
  });
}
async function saveProduct(e) {
  e.preventDefault();
  const name = $("f-name").value.trim();
  if (!name) { setMsg("formMsg", "اكتب اسم المنتج.", "err"); return; }
  const price = parseInt($("f-price").value, 10);
  const data = { name, cat: $("f-cat").value.trim() || "أخرى", price: isNaN(price) ? 0 : Math.max(0, price), desc: $("f-desc").value.trim() };
  const btn = $("saveBtn"); btn.disabled = true; setMsg("formMsg", "جارٍ الحفظ...");
  try {
    const old = editing ? products.find((x) => x.id === editing) : null;
    const ref = editing ? doc(db, "products", editing) : doc(collection(db, "products"));
    let img = old ? !!old.img : false;
    if (pendingData) { await setDoc(doc(db, "images", ref.id), { data: pendingData }); imgCache.set(ref.id, pendingData); img = true; }
    else if (removeImage && old && old.img) { await deleteDoc(doc(db, "images", ref.id)); imgCache.delete(ref.id); img = false; }
    data.img = img;
    if (editing) {
      await updateDoc(ref, data);
      Object.assign(old, data);
    } else {
      data.createdAt = Date.now();
      await setDoc(ref, data);
      products.push({ id: ref.id, ...data });
    }
    await bump();
    const wasEdit = !!editing; resetForm();
    dbLoaded = true; renderStore();
    setMsg("formMsg", wasEdit ? "تم حفظ التعديل." : "تمت إضافة المنتج.", "ok");
  } catch (err) { console.error(err); setMsg("formMsg", dbErr(err), "err"); }
  btn.disabled = false;
}
const armed = {};
async function delProduct(id, btn) {
  if (!armed[id]) {
    armed[id] = setTimeout(() => { delete armed[id]; btn.textContent = "حذف"; btn.className = "btn small ghost"; }, 4000);
    btn.textContent = "تأكيد الحذف"; btn.className = "btn small danger"; return;
  }
  clearTimeout(armed[id]); delete armed[id];
  try {
    const p = products.find((x) => x.id === id);
    await deleteDoc(doc(db, "products", id));
    if (p && p.img) { try { await deleteDoc(doc(db, "images", id)); } catch (x) {} }
    products = products.filter((x) => x.id !== id); imgCache.delete(id);
    if (editing === id) resetForm();
    await bump(); renderStore();
  } catch (err) { console.error(err); btn.textContent = "تعذّر الحذف"; }
}
function parseBulk(text) {
  const out = [];
  text.split(/\r?\n/).forEach((line) => {
    if (!line.trim()) return;
    const parts = line.indexOf("\t") >= 0 ? line.split("\t") : line.split(/[,،;]/);
    const name = (parts[0] || "").trim();
    if (!name) return;
    const price = parseInt(String(parts[1] || "").replace(/[^\d]/g, ""), 10);
    out.push({ name: name.slice(0, 120), price: isNaN(price) ? 0 : price, cat: (parts[2] || "").trim().slice(0, 60) || "أخرى", desc: parts.slice(3).join(", ").trim().slice(0, 400) });
  });
  return out;
}
async function addMany(rows, onProgress) {
  const base = Date.now(), added = [];
  for (let i = 0; i < rows.length; i += 400) {
    const b = writeBatch(db);
    rows.slice(i, i + 400).forEach((r, j) => {
      const ref = doc(collection(db, "products"));
      const item = { name: r.name, cat: r.cat, price: r.price, desc: r.desc || "", img: false, createdAt: base + (rows.length - i - j) };
      b.set(ref, item); added.push({ id: ref.id, ...item });
    });
    await b.commit();
    if (onProgress) onProgress(Math.min(i + 400, rows.length), rows.length);
  }
  products = products.concat(added); dbLoaded = true;
  await bump(); renderStore();
  return added.length;
}
async function importBulk() {
  const rows = parseBulk($("bulk").value);
  if (!rows.length) return;
  const btn = $("bulkGo"); btn.disabled = true;
  const bar = $("bulkBar"), fill = $("bulkFill"); bar.hidden = false; fill.style.width = "0";
  try {
    const n = await addMany(rows, (d, t) => { fill.style.width = Math.round((d / t) * 100) + "%"; setMsg("bulkMsg", "تمت إضافة " + d + " من " + t + "..."); });
    setMsg("bulkMsg", "تمت إضافة " + n + " منتج.", "ok"); $("bulk").value = ""; $("bulkCount").textContent = "";
  } catch (err) { console.error(err); setMsg("bulkMsg", dbErr(err), "err"); btn.disabled = false; }
  setTimeout(() => { bar.hidden = true; }, 800);
}
async function loadDemo() {
  const btn = $("loadDemo"); btn.disabled = true;
  try { await addMany(DEMO.map((p) => ({ name: p.name, cat: p.cat, price: p.price, desc: p.desc }))); }
  catch (err) { console.error(err); btn.textContent = dbErr(err); }
  btn.disabled = false;
}
async function saveWa() {
  const d = $("s-wa").value.replace(/\D/g, "");
  if (d.length < 9) { setMsg("waMsg", "اكتب رقماً صحيحاً.", "err"); return; }
  try { await setDoc(doc(db, "meta", "state"), { wa: d }, { merge: true }); waSetting = d; renderOrder(); setMsg("waMsg", "تم حفظ الرقم.", "ok"); }
  catch (err) { console.error(err); setMsg("waMsg", dbErr(err), "err"); }
}
function openAdmin() { $("admin").hidden = false; document.body.style.overflow = "hidden"; renderAdminList(); $("adminClose").focus(); }
function closeAdmin() { $("admin").hidden = true; document.body.style.overflow = ""; }

/* ---------- login ---------- */
function openLogin() {
  if (!auth) { alert("لم يُربط الموقع بـ Firebase بعد. اتبع ملف README."); return; }
  $("loginModal").hidden = false; setMsg("loginMsg", ""); $("l-email").focus();
}
async function doLogin(e) {
  e.preventDefault();
  setMsg("loginMsg", "جارٍ الدخول...");
  try {
    await signInWithEmailAndPassword(auth, $("l-email").value.trim(), $("l-pass").value);
    $("loginModal").hidden = true; $("l-pass").value = "";
  } catch (err) {
    const c = err && err.code;
    setMsg("loginMsg", /invalid-credential|wrong-password|user-not-found|invalid-email/.test(c) ? "البريد أو كلمة السر غير صحيحة." : c === "auth/too-many-requests" ? "محاولات كثيرة، انتظر قليلاً." : "تعذّر الدخول، أعد المحاولة.", "err");
  }
}
if (auth) {
  onAuthStateChanged(auth, (u) => {
    isAdmin = !!u && (!ADMIN_EMAIL || ADMIN_EMAIL === "owner@example.com" || u.email === ADMIN_EMAIL);
    $("adminBtn").hidden = !isAdmin; $("loginBtn").hidden = isAdmin;
    if (!isAdmin && !$("admin").hidden) closeAdmin();
    if (isAdmin) renderAdminList();
  });
}

/* ---------- events ---------- */
document.addEventListener("click", (e) => {
  const t = e.target.closest ? e.target.closest("button") : e.target;
  if (!t) return;
  if (t.dataset.id) { order[t.dataset.id] = (order[t.dataset.id] || 0) + 1; renderOrder(); }
  else if (t.dataset.rm) { delete order[t.dataset.rm]; renderOrder(); }
  else if (t.dataset.cat) { current = t.dataset.cat; shown = PAGE; renderChips(); renderGrid(); }
  else if (t.dataset.edit) startEdit(t.dataset.edit);
  else if (t.dataset.del) delProduct(t.dataset.del, t);
});
$("q").addEventListener("input", (e) => { query = e.target.value; shown = PAGE; renderGrid(); });
$("more").addEventListener("click", () => { shown += PAGE; renderGrid(); });
$("adminBtn").addEventListener("click", openAdmin);
$("adminClose").addEventListener("click", closeAdmin);
$("logoutBtn").addEventListener("click", () => { if (auth) signOut(auth); });
$("form").addEventListener("submit", saveProduct);
$("cancelEdit").addEventListener("click", () => { resetForm(); setMsg("formMsg", ""); });
$("f-img").addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  shrink(f).then((d) => { pendingData = d; removeImage = false; $("prevImg").src = d; $("preview").hidden = false; setMsg("formMsg", ""); })
    .catch(() => setMsg("formMsg", "تعذّرت قراءة الصورة، جرّب صورة أخرى.", "err"));
});
$("rmImg").addEventListener("click", () => { pendingData = null; removeImage = true; $("f-img").value = ""; $("preview").hidden = true; });
$("bulk").addEventListener("input", () => { const n = parseBulk($("bulk").value).length; $("bulkCount").textContent = n ? "تم التعرف على " + n + " منتج" : ""; $("bulkGo").disabled = !n; });
$("bulkGo").addEventListener("click", importBulk);
$("loadDemo").addEventListener("click", loadDemo);
$("saveWa").addEventListener("click", saveWa);
$("aq").addEventListener("input", (e) => { aquery = e.target.value; ashown = APAGE; renderAdminList(); });
$("aMore").addEventListener("click", () => { ashown += APAGE; renderAdminList(); });
$("loginBtn").addEventListener("click", openLogin);
$("loginForm").addEventListener("submit", doLogin);
$("loginCancel").addEventListener("click", () => { $("loginModal").hidden = true; });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("loginModal").hidden) $("loginModal").hidden = true;
  else if (!$("admin").hidden) closeAdmin();
});

renderStore();
loadCatalog();
