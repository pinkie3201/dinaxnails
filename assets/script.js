// LIVE Apps Script endpoint (your latest)
const BOOKING_ENDPOINT = "https://script.google.com/macros/s/AKfycbx1EmMSYXygT8HLcNJGU4TW8jiLMhHl7MRvVdSPUjGH6PUQNYBzt_CJq2-DiPNtQsCCpw/exec";

// Base prices + base durations (min)
const SERVICES = {
  "acrylic-short":  { name:"Acrylic • Short Full Set",  price:45, duration:90 },
  "acrylic-medium": { name:"Acrylic • Medium Full Set", price:50, duration:105 },
  "acrylic-long":   { name:"Acrylic • Long Full Set",   price:55, duration:120 },
  "builder-short":  { name:"Builder Gel • Short",       price:40, duration:75 },
  "builder-medium": { name:"Builder Gel • Medium",      price:45, duration:90 },
  "builder-long":   { name:"Builder Gel • Long",        price:50, duration:105 },
};

const SOAK_OFF_PRICE = 10;
const SOAK_OFF_EXTRA_MIN = 15;

const form      = document.getElementById("booking-form");
const serviceEl = document.getElementById("service-select");
const soakEl    = document.getElementById("soakoff");
const baseEl    = document.getElementById("baseprice");
const dateEl    = document.getElementById("date");
const slotsEl   = document.getElementById("slots");
const timeEl    = document.getElementById("time");
const refreshBtn= document.getElementById("refresh-slots");
const statusEl  = document.getElementById("form-status");
document.getElementById("year")?.appendChild(document.createTextNode(new Date().getFullYear()));

function selectedService(){
  const id = serviceEl.value;
  if(!id || !SERVICES[id]) return null;
  const s = SERVICES[id];
  const soak = !!soakEl.checked;
  return {
    id, name: s.name,
    basePrice: s.price,
    soak,
    duration: s.duration + (soak ? SOAK_OFF_EXTRA_MIN : 0),
    total: s.price + (soak ? SOAK_OFF_PRICE : 0),
  };
}
function updatePrice(){
  const s = selectedService();
  baseEl.value = s ? `$${s.total}` : "";
}

serviceEl?.addEventListener("change", ()=>{ updatePrice(); loadSlots(); });
soakEl?.addEventListener("change", ()=>{ updatePrice(); loadSlots(); });
dateEl?.addEventListener("change", loadSlots);
refreshBtn?.addEventListener("click", loadSlots);

async function loadSlots(){
  slotsEl.innerHTML = `<p class="muted tiny">Loading times…</p>`;
  timeEl.value = "";
  const s = selectedService();
  const date = dateEl.value;
  if(!s || !date){
    slotsEl.innerHTML = `<p class="muted tiny">Select a service and date to see times.</p>`;
    return;
  }
  try{
    const res = await fetch(BOOKING_ENDPOINT, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action:"availability", payload:{ date, duration: s.duration }})
    });
    const j = await res.json();
    if(!j.ok) throw new Error(j.error||"Error");
    const list = j.slots || [];
    if(!list.length){ slotsEl.innerHTML = `<p class="muted tiny">No times available for this date.</p>`; return; }
    slotsEl.innerHTML = "";
    list.forEach(t=>{
      const b = document.createElement("button");
      b.type="button"; b.className="slot-btn"; b.textContent=t;
      b.onclick=()=>{ [...slotsEl.querySelectorAll(".slot-btn")].forEach(x=>x.classList.remove("selected")); b.classList.add("selected"); timeEl.value=t; };
      slotsEl.appendChild(b);
    });
  }catch(err){
    console.error(err);
    slotsEl.innerHTML = `<p class="muted tiny">Couldn’t load availability. Try again.</p>`;
  }
}

form?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const s = selectedService();
  if(!s){ statusEl.textContent="Select a service."; return; }
  if(!dateEl.value){ statusEl.textContent="Pick a date."; return; }
  if(!timeEl.value){ statusEl.textContent="Pick a time."; return; }
  statusEl.textContent = "Submitting…";

  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    ...data,
    service: s.name,
    date: dateEl.value,
    time: timeEl.value,
    basePrice: s.total,          // client-facing total
    totalPrice: s.total,         // stored to sheet
    soakOff: s.soak ? "Yes" : "No",
    computedDurationMin: s.duration
  };

  try{
    const res = await fetch(BOOKING_ENDPOINT, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action:"request", payload })
    });
    const j = await res.json();
    statusEl.textContent = j.ok ? "Thanks! Dina will confirm your time." : (j.error || "Something went wrong.");
    if(j.ok){ form.reset(); baseEl.value=""; slotsEl.innerHTML=""; }
  }catch{
    statusEl.textContent = "Network error. Try again.";
  }
});
