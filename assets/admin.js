// IMPORTANT: put the SAME Web App URL here as in script.js
const BOOKING ENDPOINT = "https://script.google.com/macros/s/AKfycbzu8UUsLL5IwcDNNCG8eJohs2O5H0pdQ1tlQ8fGqswS8SwyTzdBRWieTKnD63jPGJXmZg/exec"; // <-- replace once

const listEl   = document.getElementById('list');
const statusEl = document.getElementById('admin-status');
const loadBtn  = document.getElementById('load');
const tokenInput = document.getElementById('token');

// Site editor refs
const heroTitleEl = document.getElementById('heroTitle');
const heroSubEl   = document.getElementById('heroSub');
const galleryEl   = document.getElementById('gallery');
const loadContentBtn = document.getElementById('load-content');
const saveContentBtn = document.getElementById('save-content');

loadBtn.addEventListener('click', loadPending);
loadContentBtn.addEventListener('click', loadContent);
saveContentBtn.addEventListener('click', saveContent);

async function loadPending(){
  statusEl.textContent = 'Loading…';
  listEl.innerHTML = '';
  const token = tokenInput.value.trim();
  if(!token) { statusEl.textContent = 'Enter your admin token.'; return; }
  try{
    const url = `${ENDPOINT}?token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    const json = await res.json();
    if(!json.ok) throw new Error(json.error||'Error');
    statusEl.textContent = `${json.items.length} pending request(s).`;
    json.items.forEach((r) => {
      const ig = r.igHandle ? `@${String(r.igHandle).replace(/^@/,'')}` : '';
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h4>${r.name||'Unknown'} — ${r.service||''}</h4>
        <p class="muted">${r.date||''} ${r.time||''} • ${r.basePrice ? ('$'+r.basePrice) : ''} • SoakOff: ${r.soakOff||'No'}</p>
        <p>${r.phone||''} • ${ig}</p>
        <p>${(r.notes||'').replace(/\n/g,'<br>')}</p>
        <div class="form" style="padding:12px;margin-top:10px;">
          <label>Admin Notes<textarea rows="2" class="admin-notes"></textarea></label>
          <div style="margin-top:8px; display:flex; gap:8px;">
            <button class="btn approve">Approve</button>
            <button class="btn decline">Decline</button>
          </div>
        </div>
      `;
      card.querySelector('.approve').addEventListener('click', ()=>act('approve', r, card));
      card.querySelector('.decline').addEventListener('click', ()=>act('decline', r, card));
      listEl.appendChild(card);
    });
  }catch(err){
    statusEl.textContent = 'Error: '+err.message;
  }
}

async function act(action, record, card){
  const token = tokenInput.value.trim();
  const notes = card.querySelector('.admin-notes').value;
  try{
    const res2 = await fetch(ENDPOINT, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action, token, payload: { rowIndex: record.rowIndex, adminNotes: notes } })
    });
    const j2 = await res2.json();
    if(!j2.ok) throw new Error(j2.error||'Action failed');
    card.style.opacity = .5;
    statusEl.textContent = `${action} OK`;
  }catch(err){
    statusEl.textContent = 'Error: '+err.message;
  }
}

/* -------- Site Editor -------- */
async function loadContent(){
  try{
    const res = await fetch(ENDPOINT, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'getContent' })
    });
    const j = await res.json();
    if(!j.ok) throw new Error(j.error||'Cannot load content');
    const c = j.content || {};
    heroTitleEl.value = c.heroTitle || '';
    heroSubEl.value   = c.heroSub   || '';
    galleryEl.value   = c.gallery   || '';
    statusEl.textContent = 'Content loaded.';
  }catch(e){
    statusEl.textContent = 'Error: '+e.message;
  }
}

async function saveContent(){
  const token = tokenInput.value.trim();
  if(!token) { statusEl.textContent = 'Enter your admin token.'; return; }
  const map = {
    heroTitle: heroTitleEl.value.trim(),
    heroSub:   heroSubEl.value.trim(),
    gallery:   galleryEl.value.trim()
  };
  try{
    const res = await fetch(ENDPOINT, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'saveContent', token, payload:{ map } })
    });
    const j = await res.json();
    if(!j.ok) throw new Error(j.error||'Save failed');
    statusEl.textContent = 'Content saved.';
  }catch(e){
    statusEl.textContent = 'Error: '+e.message;
  }
}

