// ✅ Your live Apps Script URL + token already filled in:
const BOOKING_ENDPOINT = "https://script.google.com/macros/s/AKfycbx1EmMSYXygT8HLcNJGU4TW8jiLMhHl7MRvVdSPUjGH6PUQNYBzt_CJq2-DiPNtQsCCpw/exec";
const ADMIN_TOKEN      = "dinax-9327"; // must match Apps Script

const form = document.getElementById('booking-form');
const statusEl = document.getElementById('form-status');
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = "Submitting…";
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const res = await fetch(BOOKING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request', payload: data })
    });
    const json = await res.json();
    if (json.ok) {
      statusEl.textContent = "Thanks! Dina will confirm your time by DM/text.";
      form.reset();
    } else {
      statusEl.textContent = json.error || "Something went wrong. Please try again.";
    }
  } catch (err) {
    statusEl.textContent = "Network error. Try again in a moment.";
  }
});
