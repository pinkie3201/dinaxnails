/* dinaxnails — resilient booking script (v3.1, harden selectors + fallbacks) */

const BOOKING_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzu8UUsLL5IwcDNNCG8eJohs2O5H0pdQ1tlQ8fGqswS8SwyTzdBRWieTKnD63jPGJXmZg/exec";

const SOAK_OFF_PRICE = 10;
const SOAK_OFF_EXTRA_MIN = 15;

// canonical maps (works even if labels change)
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
    serviceEl: $("#service-select") || document.querySelector('select[name="service"]') || document.querySelector("select"),
    soakEl: $("#soakoff") || document.querySelector('.soak-card input[type="checkbox"]'),
    dateEl:
      $("#date-input") ||
      document.querySelector('input[name="date"]') ||
      document.querySelector('input[type="date"]') ||
      document.querySelector('input[placeholder*="MM"]'),
    basePriceEl: $("#base-price") || document.querySelector('input[name="basePrice"]'),
    timesBox: $("#times") || document.getElementById("available-times") || document.querySelector("#times-list") || document.querySelector(".times"),
    refreshBtn: $("#refresh-times") || document.getElementById("refresh") || document.querySelector('button#refresh, button[data-refresh], .btn#refresh-times'),
  };
}

function getSelectedServiceKey(serviceEl) {
  if (!serviceEl) return null;
  if (serviceEl.tagName === "SELECT") {
    const opt = serviceEl.options[serviceEl.selectedIndex];
    if (opt?.value) return opt.value; // our values match the maps
  }
  // fallback: try to infer from label text
  const txt = (serviceEl.textContent || serviceEl.value || "").toLowerCase();
  if (/acrylic/.test(txt)) {
    if (/long/.test(txt)) return "acrylic-long";
    if (/medium/.test(txt)) return "acrylic-medium";
    return "acrylic-short";
  }
  if (/builder/.test(txt) || /gel/.test(txt)) {
    if (/long/.test(txt)) return "builder-long";
    if (/medium/.test(txt)) return "builder-medium";
    return "builder-short";
  }
  return null;
}

function toIsoDate(input) {
  if (!input) return "";
  // accept input[type=date] (already yyyy-mm-dd)
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  // accept mm/dd/yyyy
  const m = input.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const mm = m[1].padStart(2, "0");
    const dd = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
}

function setBasePriceDisplay(el, amount) {
  if (el) el.value = `$${amount}`;
}

function computeTotals() {
  // re-grab refs in case DOM changed
  const { serviceEl, soakEl, basePriceEl } = refs();
  const key = getSelectedServiceKey(serviceEl);
  // default sensible fallback
  let price = key ? PRICE_MAP[key] : 45;
  let duration = key ? DURATION_MAP[key] : 60;

  if (soakEl?.checked) {
    price += SOAK_OFF_PRICE;
    duration += SOAK_OFF_EXTRA_MIN;
  }
  setBasePriceDisplay(basePriceEl, price);
  return { price, duration };
}

function renderTimes(slots) {
  const { timesBox } = refs();
  if (!timesBox) return;
  if (!Array.isArray(slots) || !slots.length) {
    timesBox.innerHTML = `<div class="muted">No open times. Try another date or service.</div>`;
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "time-grid";
  slots.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = t;
    b.onclick = () => {
      let hidden = document.getElementById("selected-time");
      if (!hidden) {
        hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.id = "selected-time";
        hidden.name = "time";
        (refs().form || document.body).appendChild(hidden);
      }
      hidden.value = t;
      wrap.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
    };
    wrap.appendChild(b);
  });
  timesBox.innerHTML = "";
  timesBox.appendChild(wrap);
}

async function loadAvailability() {
  const { dateEl, timesBox } = refs();
  const { duration } = computeTotals();

  const iso = toIsoDate((dateEl?.value || "").trim());
  if (!iso) {
    renderTimes([]);
    return;
  }
  try {
    timesBox && (timesBox.innerHTML = `<div class="muted">Loading…</div>`);
    const res = await fetch(BOOKING_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "availability", payload: { date: iso, duration } }),
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "Failed");
    renderTimes(j.slots || []);
  } catch (err) {
    console.error(err);
    timesBox && (timesBox.innerHTML = `<div class="muted">Couldn’t load availability. Try again.</div>`);
  }
}

function wire() {
  const { serviceEl, soakEl, dateEl, refreshBtn } = refs();
  serviceEl && serviceEl.addEventListener("change", () => {
    computeTotals();
    loadAvailability();
  });
  soakEl && soakEl.addEventListener("change", () => {
    computeTotals();
    loadAvailability();
  });
  dateEl && dateEl.addEventListener("change", loadAvailability);
  refreshBtn && refreshBtn.addEventListener("click", loadAvailability);
  computeTotals();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wire);
} else {
  wire();
}


