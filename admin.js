/* Sravan Studio Admin. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY below. Never use a service_role/secret key here. */
const SUPABASE_URL = 'https://rzvkoancndbgjqptxxxv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iq4Bl1c729mHPTjGMBuOWQ_Xv858HbO';
const ADMIN_EMAIL = 'gaddamsravankumar21@gmail.com';

const $ = (id) => document.getElementById(id);
let db = null;
let currentUser = null;
let enquiriesCache = [];
let reelsCache = [];
let servicesCache = [];

function showMessage(text, isError = false) {
  const el = $('globalMessage');
  el.textContent = text;
  el.classList.add('show');
  el.classList.toggle('toast-error', isError);
  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => el.classList.remove('show'), 5000);
}
function formMessage(id, text, isError = false) {
  const el = $(id); if (!el) return;
  el.textContent = text; el.classList.toggle('toast-error', isError);
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {dateStyle:'medium', timeStyle:'short'}).format(new Date(value));
}
function isConfigured() {
  return SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('_HERE') && SUPABASE_PUBLISHABLE_KEY && !SUPABASE_PUBLISHABLE_KEY.includes('_HERE');
}
function setSignedIn(user) {
  currentUser = user;
  $('loginView').classList.toggle('hidden', !!user);
  $('appView').classList.toggle('hidden', !user);
}
async function verifyAdmin(user) {
  if (!user || (user.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    await db.auth.signOut();
    setSignedIn(null);
    formMessage('loginMessage', 'This account is not authorized for the admin panel.', true);
    return false;
  }
  return true;
}
async function signIn(event) {
  event.preventDefault();
  if (!db) return formMessage('loginMessage', 'Add your Supabase URL and publishable key in admin.js first.', true);
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const button = $('loginForm').querySelector('button[type=submit]');
  button.disabled = true; button.textContent = 'Signing in…'; formMessage('loginMessage', '');
  try {
    const {data, error} = await db.auth.signInWithPassword({email, password});
    if (error) throw error;
    if (!(await verifyAdmin(data.user))) return;
    setSignedIn(data.user); showMessage('Signed in successfully.'); await loadAll();
  } catch (err) { formMessage('loginMessage', err.message || 'Sign in failed.', true); }
  finally { button.disabled = false; button.innerHTML = 'Sign in <span>↗</span>'; }
}
function goToPage(page) {
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('hidden', el.id !== `page-${page}`));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const titles = {dashboard:'Overview', enquiries:'Enquiries', reels:'Reels', services:'Services'};
  $('pageTitle').textContent = titles[page] || 'Overview';
  if (page === 'enquiries') renderEnquiries();
  if (page === 'reels') renderReels();
  if (page === 'services') renderServices();
}
async function loadAll() {
  if (!db || !currentUser) return;
  await Promise.all([loadEnquiries(), loadReels(), loadServices()]);
  renderDashboard();
}
async function loadEnquiries() {
  const {data, error} = await db.from('enquiries').select('*').order('created_at', {ascending:false}).limit(500);
  if (error) { showMessage(`Could not load enquiries: ${error.message}`, true); return; }
  enquiriesCache = data || []; renderEnquiries(); renderDashboard();
}
async function loadReels() {
  const {data, error} = await db.from('reels').select('*').order('display_order', {ascending:true}).order('created_at', {ascending:false});
  if (error) { showMessage(`Could not load reels: ${error.message}`, true); return; }
  reelsCache = data || []; renderReels(); renderDashboard();
}
async function loadServices() {
  const {data, error} = await db.from('services').select('*').order('name', {ascending:true});
  if (error) { showMessage(`Could not load services: ${error.message}`, true); return; }
  servicesCache = data || []; renderServices(); renderDashboard();
}
function statusClass(status) { return String(status || 'New').toLowerCase(); }
function enquiryRows(items, limit = null) {
  const rows = limit ? items.slice(0, limit) : items;
  if (!rows.length) return '<div class="empty-state">No enquiries yet. New client messages will appear here.</div>';
  return `<table><thead><tr><th>Client</th><th>Service & message</th><th>Received</th><th>Status</th><th>Reply</th></tr></thead><tbody>${rows.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong><span class="subtext">${escapeHtml(item.email)}</span></td><td><strong>${escapeHtml(item.service)}</strong><span class="subtext">${escapeHtml(item.message)}</span>${item.budget ? `<span class="subtext">Budget: ${escapeHtml(item.budget)}</span>` : ''}</td><td>${escapeHtml(formatDate(item.created_at))}</td><td><select class="status-select" data-status-id="${item.id}" aria-label="Update status for ${escapeHtml(item.name)}">${['New','Contacted','Completed'].map(s=>`<option ${item.status===s?'selected':''}>${s}</option>`).join('')}</select></td><td><a class="small-btn" href="mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent('Re: Your video editing enquiry')}">Email ↗</a></td></tr>`).join('')}</tbody></table>`;
}
function renderEnquiries() {
  const html = enquiryRows(enquiriesCache);
  $('enquiryTable').innerHTML = html;
  $('recentEnquiries').innerHTML = enquiryRows(enquiriesCache, 5);
  document.querySelectorAll('[data-status-id]').forEach(select => select.addEventListener('change', async e => {
    const id = Number(e.currentTarget.dataset.statusId), status = e.currentTarget.value;
    const {error} = await db.from('enquiries').update({status}).eq('id', id);
    if (error) { showMessage(`Status update failed: ${error.message}`, true); await loadEnquiries(); return; }
    const item = enquiriesCache.find(x => x.id === id); if (item) item.status = status;
    renderEnquiries(); renderDashboard(); showMessage('Enquiry status updated.');
  }));
}
function renderDashboard() {
  $('statTotal').textContent = enquiriesCache.length;
  $('statNew').textContent = enquiriesCache.filter(x => (x.status || 'New') === 'New').length;
  $('statReels').textContent = reelsCache.filter(x => x.is_published).length;
  $('statServices').textContent = servicesCache.filter(x => x.is_active).length;
  $('newBadge').textContent = enquiriesCache.filter(x => (x.status || 'New') === 'New').length;
}
function renderReels() {
  if (!reelsCache.length) { $('reelGrid').innerHTML = '<div class="panel empty-state">No reels added yet. Select “Add reel” to get started.</div>'; return; }
  $('reelGrid').innerHTML = reelsCache.map(r => `<article class="reel-item"><div class="reel-preview">${r.thumbnail_url ? `<img src="${escapeHtml(r.thumbnail_url)}" alt="${escapeHtml(r.title)} thumbnail" loading="lazy">` : `<video src="${escapeHtml(r.video_url)}" muted playsinline preload="metadata"></video>`}<span class="play-icon">▶</span></div><div class="reel-info"><h3>${escapeHtml(r.title)}</h3><p>${escapeHtml(r.category || 'Uncategorized')} · Order ${Number(r.display_order)||0}</p><div class="reel-actions"><span class="status-pill ${r.is_published?'completed':'new'}">${r.is_published?'Published':'Hidden'}</span><div><button class="small-btn" data-toggle-reel="${r.id}">${r.is_published?'Hide':'Publish'}</button> <button class="small-btn danger" data-delete-reel="${r.id}">Delete</button></div></div></div></article>`).join('');
  document.querySelectorAll('[data-toggle-reel]').forEach(btn => btn.addEventListener('click', async () => {
    const reel = reelsCache.find(r => r.id === Number(btn.dataset.toggleReel)); if (!reel) return;
    const {error} = await db.from('reels').update({is_published:!reel.is_published}).eq('id', reel.id);
    if (error) return showMessage(`Could not update reel: ${error.message}`, true);
    showMessage('Reel visibility updated.'); await loadReels();
  }));
  document.querySelectorAll('[data-delete-reel]').forEach(btn => btn.addEventListener('click', async () => {
    const reel = reelsCache.find(r => r.id === Number(btn.dataset.deleteReel)); if (!reel || !confirm(`Delete “${reel.title}”? This removes its database record, not the original video file.`)) return;
    const {error} = await db.from('reels').delete().eq('id', reel.id);
    if (error) return showMessage(`Could not delete reel: ${error.message}`, true);
    showMessage('Reel deleted.'); await loadReels();
  }));
}
async function addReel(event) {
  event.preventDefault();
  const row = {title:$('reelTitle').value.trim(),category:$('reelCategory').value.trim()||null,video_url:$('reelUrl').value.trim(),thumbnail_url:$('reelThumb').value.trim()||null,display_order:Number($('reelOrder').value)||0,is_published:$('reelPublished').checked};
  const {error} = await db.from('reels').insert(row);
  if (error) return formMessage('reelFormMessage', `Could not save: ${error.message}`, true);
  $('reelForm').reset(); $('reelOrder').value='0'; $('reelPublished').checked=true; $('reelForm').classList.add('hidden'); formMessage('reelFormMessage',''); showMessage('Reel added.'); await loadReels();
}
function renderServices() {
  if (!servicesCache.length) { $('serviceList').innerHTML = '<div class="panel empty-state">No services yet. Add the editing services you offer.</div>'; return; }
  $('serviceList').innerHTML = servicesCache.map(s => `<article class="service-item"><div class="service-symbol">✳</div><div class="service-copy"><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.description || 'No description added.')} · <span class="${s.is_active?'':'toast-error'}">${s.is_active?'Active':'Hidden'}</span></p></div><div class="service-actions"><button class="small-btn" data-toggle-service="${s.id}">${s.is_active?'Hide':'Activate'}</button><button class="small-btn danger" data-delete-service="${s.id}">×</button></div></article>`).join('');
  document.querySelectorAll('[data-toggle-service]').forEach(btn => btn.addEventListener('click', async () => {
    const service = servicesCache.find(s => s.id === Number(btn.dataset.toggleService)); if (!service) return;
    const {error} = await db.from('services').update({is_active:!service.is_active}).eq('id',service.id);
    if (error) return showMessage(`Could not update service: ${error.message}`, true);
    showMessage('Service updated.'); await loadServices();
  }));
  document.querySelectorAll('[data-delete-service]').forEach(btn => btn.addEventListener('click', async () => {
    const service = servicesCache.find(s => s.id === Number(btn.dataset.deleteService)); if (!service || !confirm(`Delete service “${service.name}”?`)) return;
    const {error} = await db.from('services').delete().eq('id',service.id);
    if (error) return showMessage(`Could not delete service: ${error.message}`, true);
    showMessage('Service deleted.'); await loadServices();
  }));
}
async function addService(event) {
  event.preventDefault();
  const row = {name:$('serviceName').value.trim(),description:$('serviceDescription').value.trim()||null,is_active:true};
  const {error} = await db.from('services').insert(row);
  if (error) return formMessage('serviceFormMessage', `Could not save: ${error.message}`, true);
  $('serviceForm').reset(); $('serviceForm').classList.add('hidden'); formMessage('serviceFormMessage',''); showMessage('Service added.'); await loadServices();
}
function bindUI() {
  $('loginForm').addEventListener('submit', signIn);
  $('logoutBtn').addEventListener('click', async () => { if (db) await db.auth.signOut(); setSignedIn(null); $('loginPassword').value=''; formMessage('loginMessage','You have been signed out.'); });
  document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => goToPage(btn.dataset.page)));
  document.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', () => goToPage(btn.dataset.goto)));
  $('refreshEnquiries').addEventListener('click', loadEnquiries);
  $('showReelForm').addEventListener('click', () => $('reelForm').classList.remove('hidden'));
  $('hideReelForm').addEventListener('click', () => $('reelForm').classList.add('hidden'));
  $('reelForm').addEventListener('submit', addReel);
  $('showServiceForm').addEventListener('click', () => $('serviceForm').classList.remove('hidden'));
  $('hideServiceForm').addEventListener('click', () => $('serviceForm').classList.add('hidden'));
  $('serviceForm').addEventListener('submit', addService);
}
async function init() {
  bindUI();
  if (!isConfigured()) {
    formMessage('loginMessage', 'Setup required: paste your Supabase Project URL and Publishable Key into admin.js, then commit the file.', true);
    return;
  }
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}} = await db.auth.getSession();
  if (session?.user && await verifyAdmin(session.user)) { setSignedIn(session.user); await loadAll(); }
  db.auth.onAuthStateChange(async (_event, sessionNow) => {
    if (sessionNow?.user) {
      if (await verifyAdmin(sessionNow.user)) { setSignedIn(sessionNow.user); await loadAll(); }
    } else setSignedIn(null);
  });
}
init();
