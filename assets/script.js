/* DinaX frontend:
 * - Inject Square widget (stays on-page)
 * - Load gallery from Content sheet (GAS). No prices; no soak-off UI.
 */
const CONTENT_ENDPOINT = "https://script.google.com/macros/s/AKfycbzu8UUsLL5IwcDNNCG8eJohs2O5H0pdQ1tlQ8fGqswS8SwyTzdBRWieTKnD63jPGJXmZg/exec";

/* Mount Square widget inside #square-embed */
(function mountSquare(){
  const mount = document.getElementById("square-embed");
  if (!mount) return;
  const s = document.createElement("script");
  // Embedded buyer widget keeps users on the page
  s.src = "https://square.site/appointments/buyer/widget/ug2127wkzdnz0l/L4VY7H4KTMKFD.js";
  s.async = true;
  mount.appendChild(s);
})();

/* Minimal POST helper */
async function postForm(action, payload){
  const body = new URLSearchParams({ action, payload: JSON.stringify(payload||{}) }).toString();
  const res = await fetch(CONTENT_ENDPOINT, {
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8" },
    body
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e){ console.error(text); throw e; }
}

/* Load gallery only */
async function loadGallery(){
  try{
    const j = await postForm("getContent",{});
    if (!j.ok) return;
    const grid = document.getElementById("gallery-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const urls = String(j.content?.gallery||"").split(",").map(s=>s.trim()).filter(Boolean);
    urls.forEach(u=>{
      const img = document.createElement("img");
      img.alt = "nails";
      img.loading = "lazy";
      img.src = u;
      grid.appendChild(img);
    });
  }catch(e){
    console.warn("Gallery load failed", e);
  }
}
document.addEventListener("DOMContentLoaded", loadGallery);

