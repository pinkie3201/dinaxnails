const BOOKING_ENDPOINT = "https://script.google.com/macros/s/AKfycbxqLSIrJ4f8ntZOvMB96Ul2R-EBuAGcijC93LVxtLhEgcLOGgmwZ8pzFc2RtAW_ZHkJpQ/exec";

const SERVICES = {
  "acrylic-short":  { name:"Acrylic • Short Full Set", price:45, duration:90 },
  "acrylic-medium": { name:"Acrylic • Medium Full Set", price:50, duration:105 },
  "acrylic-long":   { name:"Acrylic • Long Full Set", price:55, duration:120 },
  "builder-short":  { name:"Builder Gel • Short", price:40, duration:75 },
  "builder-medium": { name:"Builder Gel • Medium", price:45, duration:90 },
  "builder-long":   { name:"Builder Gel • Long", price:50, duration:105 }
};

const SOAK_OFF_PRICE = 10;
const SOAK_OFF_EXTRA_MIN = 15;

const form = document.getElementById("booking-form");
const serviceEl = document.getElementById("service-select");
const soakEl = document.getElementById("soakoff");
const baseEl = document.getElementById("baseprice");
const dateEl = document.getElementById("date");
const slotsEl = document.getElementById("slots");
const refreshBtn = document.getElementById("refresh-slots");
const timeEl = document.getElementById("time");
const statusEl = document.getElementById("form-status");

function getSelectedService() {
  const id = serviceEl.value;
  if (!id || !SERVICES[id]) return null;
  const s = SERVICES[id];
  return {
    ...s,
    soak: soakEl.checked,
    duration: s.duration + (soakEl.checked ? SOAK_OFF_EXTRA_MIN : 0),
    total: s.price + (soakEl.checked ? SOAK_OFF_PRICE : 0)
  };
}

function updateBase() {
  const s = getSelectedService();
  baseEl.value = s ? `$${s.total}` : "";
}

serviceEl?.addEventListener("change", () => { updateBase(); loadSlots(); });
soakEl?.addEventListener("change",  () => { updateBase(); loadSlots(); });
dateEl?.addEventListener("change",  loadSlots);
refreshBtn?.addEventListener("click", loadSlots);

async function loadSlots() {
  slotsEl.innerHTML = `<p class="muted">Loading times…</p>`;
  timeEl.value = "";
  const s = getSelectedService();
  const date = dateEl.value;
  if (!s || !date) { slotsEl.innerHTML = `<p class="muted">Select a service and date.</p>`; return; }
  try {
    const res = await fetch(BOOKING_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "availability", payload: { date, duration: s.duration } })
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error);
    const times = j.slots || [];
    if (!times.length) { slotsEl.innerHTML = `<p class="muted">No times available.</p>`; return; }
    slotsEl.innerHTML = "";
    times.forEach(t => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "slot-btn"; b.textContent = t;
      b.onclick = () => { [...slotsEl.children].forEach(x=>x.classList.remove("selected")); b.classList.add("selected"); timeEl.value = t; };
      slotsEl.appendChild(b);
    });
  } catch {
    slotsEl.innerHTML = `<p class="muted">Couldn’t load availability.</p>`;
  }
}

form?.addEventListener("submit", async e => {
  e.preventDefault(); statusEl.textContent = "Submitting…";
  const s = getSelectedService(); if (!s || !dateEl.value || !timeEl.value) { statusEl.textContent = "Complete all fields."; return; }
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = { ...data, service: s.name, basePrice: s.total, soakOff: s.soak?"Yes":"No", computedDurationMin: s.duration };
  try {
    const r = await fetch(BOOKING_ENDPOINT, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ action:"request", payload }) });
    const j = await r.json();
    statusEl.textContent = j.ok ? "Thanks! Dina will confirm soon." : j.error || "Error.";
    if (j.ok) { form.reset(); baseEl.value=""; slotsEl.innerHTML=""; }
  } catch { statusEl.textContent = "Network error."; }
});

document.getElementById("year").textContent = new Date().getFullYear();
