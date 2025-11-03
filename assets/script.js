/* dinaxnails — resilient booking script (v3)
   - tolerant to different IDs and markup
   - parses price/duration from the visible service label
*/

const BOOKING_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzu8UUsLL5IwcDNNCG8eJohs2O5H0pdQ1tlQ8fGqswS8SwyTzdBRWieTKnD63jPGJXmZg/exec";

const SOAK_OFF_PRICE = 10;
const SOAK_OFF_EXTRA_MIN = 15;

/* ---------- helpers to find elements even if IDs differ ---------- */
const $ = (s) => document.querySelector(s);

function byLabel(text){
  // find an input/select next to a <label> that contains given text
  const labels = Array.from(document.querySelectorAll("label"));
  const lbl = labels.find(l => (l.textContent||"").toLowerCase().includes(text.toLowerCase()));
  if(!lbl) return null;
  // try: label -> nextElementSibling; or parent contains an input/select
  const sib = lbl.nextElementSibling;
  if(sib && (sib.tagName === "INPUT" || sib.tagName === "SELECT" || sib.tagName === "TEXTAREA")) return sib;
  const parent = lbl.parentElement;
  if(!parent) return null;
  const cand = parent.querySelector("input,select,textarea");
  return cand || null;
}

/* try multiple selectors for each control */
const serviceEl =
  $("#service-select") ||
  byLabel("service") ||
  document.querySelector('select[name="service"]') ||
  document.querySelector('select');

const soakEl =
  $("#soakoff") ||
  $("#soak-off") ||
  (document.querySelector('.soak-card input[type="checkbox"]')) ||
  document.querySelector('input[name="soakoff"]');

const dateEl =
  $("#date-input") ||
  byLabel("date") ||
  document.querySelector('input[name="date"]') ||
  document.querySelector('input[type="date"]') ||
  document.querySelector('input[placeholder*="MM"]');

const basePriceEl =
  $("#base-price") ||
  byLabel("base price") ||
  document.querySelector('input[name="basePrice"]');

const timesBox =
  $("#times") ||
  document.getElementById("available-times") ||
  document.querySelector("#times-list") ||
  document.querySelector(".times");

const refreshBtn =
  $("#refresh-times") ||
  document.getElementById("refresh") ||
  document.querySelector('button#refresh, button[data-refresh], .btn#refresh-times');

/* ---------- derive price + duration from service label ---------- */
function parseServiceFromLabel(label){
  // examples:
  // "Acrylic • Short Full Set — $45"
  // "Acrylic • Long Full Set — $55"
  // "Builder Gel • Medium — $45"
  const raw = (label || "").toLowerCase();

  // price
  const priceMatch = label.match(/\$ *(\d+)/);
  const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

  // duration mapping by keywords
  // tweak here if Dina changes her timing
  let duration = 60;
  if (raw.includes("acrylic") && raw.includes("short"))  duration = 90;
  if (raw.includes("acrylic") && raw.includes("medium")) duration = 105;
  if (raw.includes("acrylic") && raw.includes("long"))   duration = 120;
  if (raw.includes("builder") && raw.includes("short"))  duration = 75;
  if (raw.includes("builder") && raw.includes("medium")) duration = 90;
  if (raw.includes("builder") && raw.includes("long"))   duration = 105;

  return { price, duration };
}

function getServiceLabel(){
  if (!serviceEl) return "";
  // if it's a <select>, prefer the selected option's text
  if (serviceEl.tagName === "SELECT") {
    const opt = serviceEl.options[serviceEl.selectedIndex];
    return (opt && (opt.textContent || opt.innerText)) || serviceEl.value || "";
  }
  // fallback to its value/text content
  return serviceEl.value || serviceEl.textContent || "";
}

/* ---------- date helpers ---------- */
function toIsoDate(mmddyyyy){
  if (!mmddyyyy) return "";
  const parts = mmddyyyy.split(/[\/\-]/);
  if (parts.length === 3 && parts[0].length <= 2) {
    const [mm, dd, yyyy] = parts;
    return `${yyyy.padStart(4,"0")}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(mmddyyyy)) return mmddyyyy;
  return "";
}

/* ---------- display + compute ---------- */
function setBasePriceDisplay(amount){
  if (basePriceEl) basePriceEl.value = `$${amount}`;
}

function computeTotals(){
  const label = getServiceLabel();
  const svc = parseServiceFromLabel(label);
  let price = svc.price;
  let duration = svc.duration;

  if (soakEl && soakEl.checked){
    price += SOAK_OFF_PRICE;
    duration += SOAK_OFF_EXTRA_MIN;
  }
  setBasePriceDisplay(price);
  return { price, duration };
}

/* ---------- render times ---------- */
function renderTimes(slots){
  if (!timesBox) return;
  if (!Array.isArray(slots) || !slots.length){
    timesBox.innerHTML = `<div class="muted">No open times. Try another date or service.</div>`;
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "time-grid";
  wrap.innerHTML = "";
  slots.forEach(t=>{
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = t;
    b.onclick = ()=> {
      let hidden = document.getElementById("selected-time");
      if (!hidden){
        hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.id = "selected-time";
        hidden.name = "time";
        (document.getElementById("booking-form") || document.body).appendChild(hidden);
      }
      hidden.value = t;
      wrap.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
    };
    wrap.appendChild(b);
  });
  timesBox.innerHTML = "";
  timesBox.appendChild(wrap);
}

/* ---------- availability ---------- */
async function loadAvailability(){
  if (!dateEl || !serviceEl) return;
  const rawDate = (dateEl.value || "").trim();
  const iso = toIsoDate(rawDate);
  const { duration } = computeTotals();

  if (!iso){
    renderTimes([]);
    return;
  }

  try{
    if (timesBox) timesBox.innerHTML = `<div class="muted">Loading…</div>`;
    const res = await fetch(BOOKING_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        action: "availability",
        payload: { date: iso, duration }
      })
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "Failed");
    renderTimes(j.slots || []);
  }catch(err){
    console.error("Availability error:", err);
    if (timesBox) timesBox.innerHTML =
      `<div class="muted">Couldn’t load availability. Try again.</div>`;
  }
}

/* ---------- wire events ---------- */
serviceEl && serviceEl.addEventListener("change", ()=>{ computeTotals(); loadAvailability(); });
soakEl && soakEl.addEventListener("change", ()=>{ computeTotals(); loadAvailability(); });
dateEl && dateEl.addEventListener("change", loadAvailability);
refreshBtn && refreshBtn.addEventListener("click", loadAvailability);

/* initial draw */
computeTotals();
