// assets/script.js  (booking)
// NOTE: only header changed to 'text/plain'. Everything else same.

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

function getSelectedServiceKey(serviceEl) {
  if (!serviceEl) return null;
  const opt = serviceEl.options[serviceEl.selectedIndex];
  return opt && opt.value ? opt.value : null;
}

function toIsoDate(input) {
  if (!input) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
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
  if (!el) return;
  if (amount == null) {
    el.value = "";
    el.placeholder = "Total";
  } else {
    el.value = `$${amount}`;
  }
}

function computeTotals() {
  const { serviceEl, soakEl, basePriceEl } = refs();
  const key = getSelectedServiceKey(serviceEl);

  if (!key) {
    setBasePriceDisplay(basePriceEl, null);
    return { price: 0, duration: 60, soak: !!(soakEl && soakEl.checked) };
  }

  let price = PRICE_MAP[key];
  let duration = DURATION_MAP[key];

  if (soakEl?.checked) {
    price += SOAK_OFF_PRICE;
    duration += SOAK_OFF_EXTRA_MIN;
  }
  setBasePriceDisplay(basePriceEl, price);
  return { price, duration, soak: !!(soakEl && soakEl.checked), key };
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
        refs().form.appendChild(hidden);
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
  if (!iso) { renderTimes([]); return; }

  try {
    timesBox.innerHTML = `<div class="muted">Loading…</div>`;
    const res = await fetch(BOOKING_ENDPOINT, {
      method: "POST",
      // text/plain avoids CORS preflight on GAS
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "availability", payload: { date: iso, duration } }),
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "Failed");
    renderTimes(j.slots || []);
  } catch (err) {
    console.error(err);
    timesBox.innerHTML = `<div class="muted">Couldn’t load availability. Try again.</div>`;
  }
}

async function submitRequest() {
  const { form, nameEl, phoneEl, igEl, serviceEl, dateEl, notesEl, basePriceEl } = refs();
  const { price, duration, soak, key } = computeTotals();
  const timeEl = document.getElementById("selected-time");

  if (!nameEl.value.trim()) return alert("Enter your name.");
  if (!phoneEl.value.trim()) return alert("Enter your phone.");
  if (!key) return alert("Select a service.");
  const dateIso = toIsoDate(dateEl.value);
  if (!dateIso) return alert("Pick a date.");
  if (!timeEl || !timeEl.value) return alert("Pick a time.");

  try {
    const payload = {
      name: nameEl.value.trim(),
      phone: phoneEl.value.trim(),
      igHandle: igEl.value.trim(),
      service: serviceEl.options[serviceEl.selectedIndex].text,
      notes: notesEl.value.trim(),
      date: dateIso,
      time: timeEl.value,
      basePrice: price,
      soakOff: soak,
      computedDurationMin: duration,
      totalPrice: price
    };

    const res = await fetch(BOOKING_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // <- CORS-safe
      body: JSON.stringify({ action: "request", payload }),
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "Request failed");
    form.reset();
    setBasePriceDisplay(basePriceEl, null);
    $("#times").innerHTML = `<div class="muted">Thanks! Dina will review and confirm.</div>`;
    alert("Request sent! Dina will confirm by message.");
  } catch (e) {
    alert("Could not submit. Please try again.");
    console.error(e);
  }
}

async function loadContent() {
  try{
    const res = await fetch(BOOKING_ENDPOINT, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'}, // <- CORS-safe
      body: JSON.stringify({ action:'getContent' })
    });
    const j = await res.json();
    if(!j.ok) return;

    const c = j.content || {};
    if (c.heroTitle)  document.querySelector('[data-key="heroTitle"]').textContent = c.heroTitle;
    if (c.heroSub)    document.querySelector('[data-key="heroSub"]').textContent   = c.heroSub;

    if (c.gallery) {
      const urls = c.gallery.split(',').map(s => s.trim()).filter(Boolean);
      const grid = document.getElementById('gallery-grid');
      if (urls.length && grid) {
        grid.innerHTML = '';
        urls.forEach(u=>{
          const img = document.createElement('img');
          img.className='gallery-img';
          img.alt='nails';
          img.src=u;
          grid.appendChild(img);
        });
      }
    }
  }catch(e){ console.warn('content load skipped', e); }
}

function wire() {
  const { serviceEl, soakEl, dateEl, refreshBtn, requestBtn, basePriceEl } = refs();
  basePriceEl.placeholder = "Total";
  basePriceEl.readOnly = true;

  serviceEl.addEventListener("change", () => { computeTotals(); loadAvailability(); });
  soakEl.addEventListener("change", () => { computeTotals(); loadAvailability(); });
  dateEl.addEventListener("change", loadAvailability);
  refreshBtn.addEventListener("click", loadAvailability);
  requestBtn.addEventListener("click", submitRequest);

  computeTotals();
  loadContent();
}

document.addEventListener("DOMContentLoaded", wire);
