const BOOKING_ENDPOINT = "https://script.google.com/macros/s/AKfycbzu8UUsLL5IwcDNNCG8eJohs2O5H0pdQ1tlQ8fGqswS8SwyTzdBRWieTKnD63jPGJXmZg/exec";

const SOAK_OFF_PRICE = 10;
const SOAK_OFF_EXTRA_MIN = 15;

const PRICE_MAP = {
  "acrylic-short": 45,
  "acrylic-medium": 50,
  "acrylic-long": 55,
  "builder-short": 40,
  "builder-medium": 45,
  "builder-long": 50,
};
const DURATION_MAP = {
  "acrylic-short": 90,
  "acrylic-medium": 105,
  "acrylic-long": 120,
  "builder-short": 75,
  "builder-medium": 90,
  "builder-long": 105,
};

const $ = (s) => document.querySelector(s);

function refs() {
  return {
    form: $("#booking-form"),
    nameEl: $("#name"),
    phoneEl: $("#phone"),
    igEl: $("#ig"),
    serviceEl: $("#service-select"),
    soakEl: $("#soakoff"),
    dateEl: $("#date-input"),
    basePriceEl: $("#base-price"),
    notesEl: $("#notes"),
    timesBox: $("#times"),
    refreshBtn: $("#refresh-times"),
    requestBtn: $("#request-btn"),
  };
}
function getSelectedServiceKey(el){ const o = el && el.options[el.selectedIndex]; return o && o.value ? o.value : null; }
function toIsoDate(v){ if(!v) return ""; if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const m=v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/); if(m){return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;} return ""; }
function setBasePriceDisplay(el, amount){ if(!el) return; if(amount==null){ el.value=""; el.placeholder="Total"; } else { el.value=`$${amount}`; } }

function computeTotals(){
  const { serviceEl, soakEl, basePriceEl } = refs();
  const key = getSelectedServiceKey(serviceEl);
  if (!key){ setBasePriceDisplay(basePriceEl, null); return { price:0, duration:60, soak:!!(soakEl&&soakEl.checked) }; }
  let price = PRICE_MAP[key], duration = DURATION_MAP[key];
  if (soakEl?.checked){ price += SOAK_OFF_PRICE; duration += SOAK_OFF_EXTRA_MIN; }
  setBasePriceDisplay(basePriceEl, price);
  return { price, duration, soak: !!(soakEl&&soakEl.checked), key };
}

function renderTimes(slots){
  const { timesBox } = refs();
  if (!Array.isArray(slots) || !slots.length){ timesBox.innerHTML = `<div class="muted">No open times. Try another date or service.</div>`; return; }
  const wrap = document.createElement("div"); wrap.className="time-grid";
  slots.forEach(t=>{
    const b=document.createElement("button"); b.type="button"; b.className="chip"; b.textContent=t;
    b.onclick=()=>{ let hidden=document.getElementById("selected-time"); if(!hidden){ hidden=document.createElement("input"); hidden.type="hidden"; hidden.id="selected-time"; hidden.name="time"; refs().form.appendChild(hidden); } hidden.value=t; wrap.querySelectorAll(".chip").forEach(x=>x.classList.remove("active")); b.classList.add("active"); };
    wrap.appendChild(b);
  });
  timesBox.innerHTML=""; timesBox.appendChild(wrap);
}

async function postForm(action, payload, token){
  const body = new URLSearchParams({ action, payload: JSON.stringify(payload||{}), ...(token?{token}: {}) }).toString();
  const res = await fetch(BOOKING_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body
  });
  return res.json();
}

async function loadAvailability(){
  const { dateEl, timesBox } = refs();
  const { duration } = computeTotals();
  const iso = toIsoDate((dateEl?.value || "").trim());
  if (!iso){ renderTimes([]); return; }
  try{
    timesBox.innerHTML = `<div class="muted">Loading…</div>`;
    const j = await postForm("availability", { date: iso, duration });
    if (!j.ok) throw new Error(j.error||"Failed");
    renderTimes(j.slots||[]);
  }catch(err){ console.error(err); timesBox.innerHTML = `<div class="muted">Couldn’t load availability. Try again.</div>`; }
}

async function submitRequest(){
  const { form, nameEl, phoneEl, igEl, serviceEl, dateEl, notesEl, basePriceEl } = refs();
  const { price, duration, soak, key } = computeTotals();
  const timeEl = document.getElementById("selected-time");

  if (!nameEl.value.trim()) return alert("Enter your name.");
  if (!phoneEl.value.trim()) return alert("Enter your phone.");
  if (!key) return alert("Select a service.");
  const dateIso = toIsoDate(dateEl.value); if (!dateIso) return alert("Pick a date.");
  if (!timeEl || !timeEl.value) return alert("Pick a time.");

  try{
    const payload = {
      name: nameEl.value.trim(),
      phone: phoneEl.value.trim(),
      igHandle: igEl.value.trim(),
      service: serviceEl.options[serviceEl.selectedIndex].text,
      notes: notesEl.value.trim(),
      date: dateIso, time: timeEl.value,
      basePrice: price, soakOff: soak, computedDurationMin: duration, totalPrice: price
    };
    const j = await postForm("request", payload);
    if (!j.ok) throw new Error(j.error||"Request failed");
    form.reset(); setBasePriceDisplay(basePriceEl, null); $("#times").innerHTML = `<div class="muted">Thanks! Dina will review and confirm.</div>`; alert("Request sent! Dina will confirm.");
  }catch(e){ alert("Could not submit. Please try again."); console.error(e); }
}

async function loadContent(){
  try{
    const j = await postForm("getContent", {});
    if(!j.ok) return;
    const c = j.content || {};
    if (c.heroTitle)  document.querySelector('[data-key="heroTitle"]').textContent = c.heroTitle;
    if (c.heroSub)    document.querySelector('[data-key="heroSub"]').textContent   = c.heroSub;
    if (c.gallery){
      const urls = c.gallery.split(',').map(s=>s.trim()).filter(Boolean);
      const grid = document.getElementById('gallery-grid');
      if (urls.length && grid){ grid.innerHTML=''; urls.forEach(u=>{ const img=document.createElement('img'); img.className='gallery-img'; img.alt='nails'; img.src=u; grid.appendChild(img); }); }
    }
  }catch(e){ console.warn('content load skipped', e); }
}

function wire(){
  const { serviceEl, soakEl, dateEl, refreshBtn, requestBtn, basePriceEl } = refs();
  basePriceEl.placeholder = "Total"; basePriceEl.readOnly = true;
  serviceEl.addEventListener("change", ()=>{ computeTotals(); loadAvailability(); });
  soakEl.addEventListener("change", ()=>{ computeTotals(); loadAvailability(); });
  dateEl.addEventListener("change", loadAvailability);
  refreshBtn.addEventListener("click", loadAvailability);
  requestBtn.addEventListener("click", submitRequest);
  computeTotals(); loadContent();
}
document.addEventListener("DOMContentLoaded", wire);

/* ================= assets/admin.js (admin) ================= */
const ENDPOINT = "https://script.google.com/macros/s/AKfycbzu8UUsLL5IwcDNNCG8eJohs2O5H0pdQ1tlQ8fGqswS8SwyTzdBRWieTKnD63jPGJXmZg/exec";
const listEl   = document.getElementById('list');
const statusEl = document.getElementById('admin-status');
const loadBtn  = document.getElementById('load');
const tokenInput = document.getElementById('token');

const heroTitleEl = document.getElementById('heroTitle');
const heroSubEl   = document.getElementById('heroSub');
const galleryEl   = document.getElementById('gallery');
const loadContentBtn = document.getElementById('load-content');
const saveContentBtn = document.getElementById('save-content');

loadBtn.addEventListener('click', loadPending);
loadContentBtn.addEventListener('click', loadContent);
saveContentBtn.addEventListener('click', saveContent);

async function postFormAdmin(action, payload, token){
  const body = new URLSearchParams({ action, payload: JSON.stringify(payload||{}), ...(token?{token}: {}) }).toString();
  const res = await fetch(ENDPOINT, {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
    body
  });
  return res.json();
}

async function loadPending(){
  statusEl.textContent = 'Loading…';
  listEl.innerHTML = '';
  const token = tokenInput.value.trim();
  if(!token) { statusEl.textContent = 'Enter your admin token.'; return; }
  try{
    const url = `${ENDPOINT}?token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    const json = await res.json();
    if(!json.ok) throw new Error(json.error||'Error');
    statusEl.textContent = `${json.items.length} pending request(s).`;
    json.items.forEach((r) => {
      const ig = r.igHandle ? `@${String(r.igHandle).replace(/^@/,'')}` : '';
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h4>${r.name||'Unknown'} — ${r.service||''}</h4>
        <p class="muted">${r.date||''} ${r.time||''} • ${r.basePrice ? ('$'+r.basePrice) : ''} • SoakOff: ${r.soakOff||'No'}</p>
        <p>${r.phone||''} • ${ig}</p>
        <p>${(r.notes||'').replace(/\n/g,'<br>')}</p>
        <div class="form" style="padding:12px;margin-top:10px;">
          <label>Admin Notes<textarea rows="2" class="admin-notes"></textarea></label>
          <div style="margin-top:8px; display:flex; gap:8px;">
            <button class="btn approve">Approve</button>
            <button class="btn decline">Decline</button>
          </div>
        </div>
      `;
      card.querySelector('.approve').addEventListener('click', ()=>act('approve', r, card));
      card.querySelector('.decline').addEventListener('click', ()=>act('decline', r, card));
      listEl.appendChild(card);
    });
  }catch(err){ statusEl.textContent = 'Error: '+err.message; }
}

async function act(action, record, card){
  const token = tokenInput.value.trim();
  const notes = card.querySelector('.admin-notes').value;
  try{
    const j2 = await postFormAdmin(action, { rowIndex: record.rowIndex, adminNotes: notes }, token);
    if(!j2.ok) throw new Error(j2.error||'Action failed');
    card.style.opacity = .5;
    statusEl.textContent = `${action} OK`;
  }catch(err){ statusEl.textContent = 'Error: '+err.message; }
}

async function loadContent(){
  try{
    const j = await postFormAdmin('getContent', {});
    if(!j.ok) throw new Error(j.error||'Cannot load content');
    const c = j.content || {};
    heroTitleEl.value = c.heroTitle || '';
    heroSubEl.value   = c.heroSub   || '';
    galleryEl.value   = c.gallery   || '';
    statusEl.textContent = 'Content loaded.';
  }catch(e){ statusEl.textContent = 'Error: '+e.message; }
}

async function saveContent(){
  const token = tokenInput.value.trim();
  if(!token) { statusEl.textContent = 'Enter your admin token.'; return; }
  const map = { heroTitle: heroTitleEl.value.trim(), heroSub: heroSubEl.value.trim(), gallery: galleryEl.value.trim() };
  try{
    const j = await postFormAdmin('saveContent', { map }, token);
    if(!j.ok) throw new Error(j.error||'Save failed');
    statusEl.textContent = 'Content saved.';
  }catch(e){ statusEl.textContent = 'Error: '+e.message; }
}
/* ================= /END ================= */
