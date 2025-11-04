// assets/script.js
// Loads gallery from GAS Content.tab (key: gallery). Booking is an iframe; no redirects.

const CONTENT_ENDPOINT = "https://script.google.com/macros/s/AKfycbzu8UUsLL5IwcDNNCG8eJohs2O5H0pdQ1tlQ8fGqswS8SwyTzdBRWieTKnD63jPGJXmZg/exec";

async function postForm(action, payload){
  const body = new URLSearchParams({ action, payload: JSON.stringify(payload||{}) }).toString();
  const res = await fetch(CONTENT_ENDPOINT, {
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8" },
    body
  });
  const t = await res.text();
  try { return JSON.parse(t); } catch(e){ console.error(t); throw e; }
}

async function loadGallery(){
  try{
    const j = await postForm("getContent",{});
    const grid = document.getElementById("gallery-grid");
    if (!grid || !j.ok) return;
    grid.innerHTML = "";
    const urls = String(j.content?.gallery||"").split(",").map(s=>s.trim()).filter(Boolean);
    urls.forEach(u=>{
      const img = document.createElement("img");
      img.alt="nails"; img.loading="lazy"; img.src=u;
      grid.appendChild(img);
    });
  }catch(e){ console.warn("Gallery load failed", e); }
}

document.addEventListener("DOMContentLoaded", loadGallery);

