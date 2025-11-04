/* Admin editor for Content sheet (prices + gallery) + Drive uploads */
const ENDPOINT = "https://script.google.com/macros/s/AKfycbzu8UUsLL5IwcDNNCG8eJohs2O5H0pdQ1tlQ8fGqswS8SwyTzdBRWieTKnD63jPGJXmZg/exec";
const ADMIN_TOKEN = "dinax-9327"; // must match GAS

const $ = sel => document.querySelector(sel);

async function postForm(action, payload, withToken=false){
  const body = new URLSearchParams({
    action,
    payload: JSON.stringify(payload||{}),
    ...(withToken?{token:ADMIN_TOKEN}:{})
  }).toString();
  const res = await fetch(ENDPOINT, {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
    body
  });
  const t = await res.text();
  try { return JSON.parse(t); } catch(e){ console.error(t); throw e; }
}

async function loadContent(){
  const j = await postForm('getContent',{});
  if (!j.ok) return;
  $('#priceHtml').value = j.content?.priceHtml || `<h4>Prices</h4>
<ul>
  <li>Acrylic • Short — $45</li>
  <li>Acrylic • Medium — $50</li>
  <li>Acrylic • Long — $55</li>
  <li>Builder Gel • Short — $40</li>
  <li>Builder Gel • Medium — $45</li>
  <li>Builder Gel • Long — $50</li>
</ul>`;
  const urls = String(j.content?.gallery||'').split(',').map(s=>s.trim()).filter(Boolean);
  $('#galleryList').value = urls.join('\n');
  renderPreview(urls);
}

function renderPreview(urls){
  const wrap = $('#preview'); wrap.innerHTML='';
  urls.forEach(u=>{
    const img = document.createElement('img');
    img.alt='nails'; img.loading='lazy'; img.src=u;
    wrap.appendChild(img);
  });
}

async function savePrices(){
  const map = { priceHtml: $('#priceHtml').value };
  const j = await postForm('saveContent', { map }, true);
  alert(j.ok ? 'Saved!' : ('Failed: ' + j.error));
}

async function saveGallery(){
  const lines = $('#galleryList').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const map = { gallery: lines.join(', ') };
  const j = await postForm('saveContent', { map }, true);
  if (j.ok) renderPreview(lines);
  alert(j.ok ? 'Saved!' : ('Failed: ' + j.error));
}

async function uploadImages(){
  const input = $('#uploader');
  if (!input.files || !input.files.length) return alert('Pick images first.');
  const fd = new FormData();
  fd.append('action', 'uploadImages');
  fd.append('token', ADMIN_TOKEN);
  Array.from(input.files).forEach((f,i)=> fd.append('file'+i, f, f.name));
  const res = await fetch(ENDPOINT, { method:'POST', body: fd });
  const t = await res.text();
  let j; try { j = JSON.parse(t); } catch(e){ console.error(t); return alert('Upload failed.'); }
  if (!j.ok) return alert('Upload failed: ' + j.error);
  const existing = $('#galleryList').value.trim();
  const merged = (existing ? existing + '\n' : '') + j.urls.join('\n');
  $('#galleryList').value = merged;
  renderPreview(merged.split('\n').map(s=>s.trim()).filter(Boolean));
  alert('Uploaded!');
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadContent().catch(console.error);
  $('#savePrices').addEventListener('click', ()=>savePrices().catch(console.error));
  $('#saveGallery').addEventListener('click', ()=>saveGallery().catch(console.error));
  $('#uploadBtn').addEventListener('click', ()=>uploadImages().catch(console.error));
});

