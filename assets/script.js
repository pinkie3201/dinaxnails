/* dinaxnails — booking front-end (drop-in) */

const BOOKING_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzu8UUsLL5IwcDNNCG8eJohs2O5H0pdQ1tlQ8fGqswS8SwyTzdBRWieTKnD63jPGJXmZg/exec";

/* ----- service catalog (price + duration min) ----- */
const SERVICES = {
  "acrylic-short":  { label:"Acrylic • Short Full Set — $45",  price:45, duration:90 },
  "acrylic-medium": { label:"Acrylic • Medium Full Set — $50", price:50, duration:105 },
  "acrylic-long":   { label:"Acrylic • Long Full Set — $55",   price:55, duration:120 },
  "builder-short":  { label:"Builder Gel • Short — $40",       price:40, duration:75 },
  "builder-medium": { label:"Builder Gel • Medium — $45",      price:45, duration:90 },
  "builder-long":   { label:"Builder Gel • Long — $50",        price:50, duration:105 },
};

const SOAK_OFF_PRICE = 10;
const SOAK_OFF_EXTRA_MIN = 15;

/* ----- element helpers (works even if your IDs differ slightly) ----- */
const $ = (s) => document.querySelector(s);
const serviceEl   = $("#service-select") || document.getElementById("service") || document.querySelector('select[name="service"]');
const soakEl      = $("#soakoff") || document.getElementById("soak-off") || document.querySelector('input[name="soakoff"]');
const dateEl      = $("#date-input") || document.getElementById("date") || document.querySelector('input[type="date"], input[name="date"]');
const basePriceEl = $("#base-price") || document.getElementById("price") || document.querySelector('input[name="basePrice"]');
const timesBox    = $("#times") || document.getElementById("times-container") || document.querySelector("#times-list") || $("#available-times") || document.querySelector(".times");
const refreshBtn  = $("#refresh-btn") || document.getElementById("refresh-times") || document.querySelector('#refresh, button[data-refresh]');

function setBasePriceDisplay(amount){
  if (!basePriceEl) return;
  basePriceEl.value = `$${amount}`;
}

/* build service select if empty */
(function initServiceSelect(){
  if (!serviceEl) return;
  if (serviceEl.options && serviceEl.options.length <= 1) {
    serviceEl.innerHTML = "";
    Object.entries(SERVICES).forEach(([key, s])=>{
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = s.label;
      serviceEl.appendChild(opt);
    });
  }
})();

/* current selection helpers */
function getSelectedServiceKey(){
  if (!serviceEl) return "acrylic-short";
  const v = (serviceEl.value || "").trim();
  if (SERVICES[v]) return v;
  // try to match by label if value is label text
  const match = Object.entries(SERVICES).find(([k,s]) => s.label === v);
  return match ? match[0] : "acrylic-short";
}
function selectedService(){
  return SERVICES[getSelectedServiceKey()];
}

/* format MM/DD/YYYY -> YYYY-MM-DD */
function toIsoDate(mmddyyyy){
  if (!mmddyyyy) return "";
  const parts = mmddyyyy.split(/[\/\-]/); // handles 11/03/2025 or 11-03-2025
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts;
    return `${yyyy.padStart(4,"0")}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
  }
  // if it's already yyyy-mm-dd, pass through
  if (/^\d{4}-\d{2}-\d{2}$/.test(mmddyyyy)) return mmddyyyy;
  return "";
}

/* compute price + duration considering soak off */
function computeTotals(){
  const svc = selectedService();
  let price = svc.price;
  let duration = svc.duration;
  if (soakEl && soakEl.checked){
    price += SOAK_OFF_PRICE;
    duration += SOAK_OFF_EXTRA_MIN;
  }
  setBasePriceDisplay(price);
  return { price, duration };
}

/* render times */
function renderTimes(slots){
  if (!timesBox) return;
  if (!Array.isArray(slots) || !slots.length){
    timesBox.innerHTML = `<div class="muted">No open times in this window. Try another date or service.</div>`;
    return;
  }
  timesBox.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "time-grid";
  slots.forEach(t=>{
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = t;
    b.onclick = ()=> {
      // store selected time in a hidden input if you have one
      let hidden = document.getElementById("selected-time");
      if (!hidden){
        hidden = document.createElement("input");
        hidden.type="hidden";
        hidden.id="selected-time";
        hidden.name="time";
        (document.getElementById("booking-form") || document.body).appendChild(hidden);
      }
      hidden.value = t;
      // give a tiny visual confirmation
      document.querySelectorAll(".time-grid .chip").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
    };
    wrap.appendChild(b);
  });
  timesBox.appendChild(wrap);
}

/* availability loader */
async function loadAvailability(){
  if (!dateEl || !serviceEl) return;
  const rawDate = (dateEl.value || "").trim();
  const iso = toIsoDate(rawDate);
  if (!iso){
    renderTimes([]);
    console.warn("Invalid date format:", rawDate);
    return;
  }
  const { duration } = computeTotals();

  try{
    // small UX
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

/* wire events */
serviceEl && serviceEl.addEventListener("change", ()=>{ computeTotals(); loadAvailability(); });
soakEl && soakEl.addEventListener("change", ()=>{ computeTotals(); loadAvailability(); });
dateEl && dateEl.addEventListener("change", loadAvailability);
refreshBtn && refreshBtn.addEventListener("click", loadAvailability);

/* initial state */
computeTotals();

