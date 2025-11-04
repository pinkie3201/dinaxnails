/* File: assets/script.js
 * Purpose: Keep your page intact; inject Square widget; load priceHtml + gallery from Content sheet.
 */
const CONTENT_ENDPOINT = "https://script.google.com/macros/s/AKfycbzu8UUsLL5IwcDNNCG8eJohs2O5H0pdQ1tlQ8fGqswS8SwyTzdBRWieTKnD63jPGJXmZg/exec";

/* --- Mount Square widget inside #square-embed --- */
(function injectSquare(){
  const mount = document.getElementById("square-embed");
  if (!mount) return; // block not present
  const s = document.createElement("script");
  s.src = "https://square.site/appointments/buyer/widget/ug2127wkzdnz0l/L4VY7H4KTMKFD.js";
  s.async = true;
  mount.appendChild(s);
})();

/* --- Simple POST helper to GAS --- */
async function postForm(action, payload){
  const body = new URLSearchParams({
    action,
    payload: JSON.stringify(payload || {})
  }).toString();
  const res = await fetch(CONTENT_ENDPOINT, {
    method: "POST",
    headers: {"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
    body
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { console.error(text); throw e; }
}

/* --- Load priceHtml + gallery from Content sheet --- */
async function loadContent(){
  try{
    const j = await postForm("getContent",{});
    if (!j.ok) return;

    // Prices (raw HTML allowed)
    const priceBox = document.getElementById("price-list");
    if (priceBox){
      priceBox.innerHTML = j.content?.priceHtml || "<p class='muted'>Prices coming soon.</p>";
    }

    // Gallery (append images if provided)
    const grid = document.getElementById("gallery-grid");
    if (grid){
      const urls = String(j.content?.gallery || "")
        .split(",").map(s=>s.trim()).filter(Boolean);
      if (urls.length){
        // optional: clear existing images -> uncomment next line
        // grid.innerHTML = "";
        urls.forEach(u=>{
          const img = document.createElement("img");
          img.className = "gallery-img";
          img.alt = "nails";
          img.loading = "lazy";
          img.src = u;
          grid.appendChild(img);
        });
      }
    }
  }catch(err){
    console.warn("Content load failed:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadContent);

