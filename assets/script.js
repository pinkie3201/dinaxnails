// LIVE Apps Script endpoint + token
const BOOKING_ENDPOINT = "https://script.google.com/macros/s/AKfycbxqLSIrJ4f8ntZOvMB96Ul2R-EBuAGcijC93LVxtLhEgcLOGgmwZ8pzFc2RtAW_ZHkJpQ/exec";
const ADMIN_TOKEN      = "dinax-9327"; // must match Apps Script

// Service catalog: base price + base duration (minutes)
const SERVICES = {
  "acrylic-short":  { name:"Acrylic • Short Full Set",   price:45, duration:90 },
  "acrylic-medium": { name:"Acrylic • Medium Full Set",  price:50, duration:105 },
  "acrylic-long":   { name:"Acrylic • Long Full Set",    price:55, duration:120 },
  "builder-short":  { name:"Builder Gel • Short",        price:40, duration:75 },
  "builder-medium": { name:"Builder Gel • Medium",       price:45, duration:90 },
  "builder-long":   { name:"Builder Gel • Long",         price:50, duration:105 },
};

const SOAK_OFF_EXTRA_MIN = 15;
const SOAK_OFF_PRICE     = 10;

const form       = document.getElementById('booking-form');
const statusEl   = document.getElementById('form-status');
const yearEl     = document.getElementById('year');
const serviceEl  = document.getElementById('service-select');
const soakEl     = document.getElementById('soakoff');
const dateEl     = document.getElementById('date');
const baseEl     = document.getElementById('baseprice');
const totalEl    = document.getElementById('totalprice');
const slotsEl    = document.getElementById('slots');
const timeEl     = document.getElementById('time');
const refreshBtn = document.getElementById('refresh-slots');

if (yearEl) yearEl.textContent = new Date().getFullYear();

function getSelectedService(){
  const id = serviceEl.value;
  if(!id || !SERVICES[id]) return null;
  const svc = SERVICES[id];
  const soakExtra = soakEl.checked ? SOAK_OFF_EXTRA_MIN : 0;
  return {
    id,
    name: svc.name,
    price: svc.price,
    duration: svc.duration + soakExtra,
    soak: soakEl.checked
  };
}

function updatePrices(){
  const svc = getSelectedService();
  if (!svc){
    baseEl.value = '';
    totalEl.value = '';
    return;
  }
  const base  = svc.price;
  const total = svc.soak ? base + SOAK_OFF_PRICE : base;
  baseEl.value  = `$${base}`;
  totalEl.value = `$${total}`;
}

serviceEl?.addEventListener('change', ()=>{ updatePrices(); loadSlots(); });
soakEl?.addEventListener('change', ()=>{ updatePrices(); loadSlots(); });
dateEl?.addEventListener('change', loadSlots);
refreshBtn?.addEventListener('click', loadSlots);

async function loadSlots(){
  slotsEl.innerHTML = `<p class="muted">Loading times…</p>`;
  timeEl.value = '';

  const svc = getSelectedService();
  const date = dateEl.value;
  if(!svc || !date){
    slotsEl.innerHTML = `<p class="muted">Select a service and date to see times.</p>`;
    return;
  }
  try{
    const res = await fetch(BOOKING_ENDPOINT, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        action:'availability',
        payload:{ date, duration: svc.duration }
      })
    });
    const json = await res.json();
    if(!json.ok) throw new Error(json.error||'Error');

    const list = json.slots || [];
    if(list.length === 0){
      slotsEl.innerHTML = `<p class="muted">No times available for this date. Try another day.</p>`;
      return;
    }
    slotsEl.innerHTML = '';
    list.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot-btn';
      b.textContent = t;
      b.addEventListener('click', ()=>{
        [...slotsEl.querySelectorAll('.slot-btn')].forEach(x=>x.classList.remove('selected'));
        b.classList.add('selected');
        timeEl.value = t;
      });
      slotsEl.appendChild(b);
    });
  }catch(err){
    slotsEl.innerHTML = `<p class="muted">Couldn’t load availability. Try again.</p>`;
  }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = "";

  const svc = getSelectedService();
  if(!svc){ statusEl.textContent = "Select a service."; return; }
  if(!dateEl.value){ statusEl.textContent = "Pick a date."; return; }
  if(!timeEl.value){ statusEl.textContent = "Pick a time."; return; }

  const base  = svc.price;
  const total = svc.soak ? base + SOAK_OFF_PRICE : base;

  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    ...data,
    service: svc.name,
    date: dateEl.value,
    time: timeEl.value,
    basePrice: base,
    totalPrice: total,             // <-- send total including soak-off
    soakOff: svc.soak ? "Yes" : "No",
    computedDurationMin: svc.duration
  };

  statusEl.textContent = "Submitting…";
  try {
    const res = await fetch(BOOKING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request', payload })
    });
    const json = await res.json();
    if (json.ok) {
      statusEl.textContent = "Thanks! Dina will confirm your time by DM/text.";
      form.reset();
      baseEl.value=''; totalEl.value=''; timeEl.value=''; slotsEl.innerHTML='';
    } else {
      statusEl.textContent = json.error || "Something went wrong. Please try again.";
    }
  } catch (err) {
    statusEl.textContent = "Network error. Try again in a moment.";
  }
});
