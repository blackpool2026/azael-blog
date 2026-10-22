/* ============================================
   AZAEL BLOG — admin.js COMPLETO
   ============================================ */

const SUPABASE_URL = 'https://bqliduwiarryqcqtignd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbGlkdXdpYXJyeXFjcXRpZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTU4MzgsImV4cCI6MjEwNjM3MTgzOH0.T6GZXQNjzRwhbuYuVx54vsdTNy2CTpEwCjnxED1KGaY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const THEME_KEY = 'azael-theme-v2';
const DRAFT_KEY = 'azael-draft';

let session = null;
let currentStory = null;
let currentChapter = null;
let currentPost = null;
let currentProfile = null;
let currentRelatoAdmin = null; 
let currentTreeStory = null;
let currentCharacter = null;
let currentCharacterImageUrl = null;
let characterRoleDropdown = null;
let selectedRole = '';
let reportesCurrentFilter = 'pending';

const PREDEFINED_ROLES = [
  'Protagonista','Coprotagonista','Deuteragonista','Antagonista','Villano','Rival','Traidor',
  'Padre','Madre','Hijo','Hija','Hermano','Hermana','Abuelo','Abuela','Tío','Tía','Primo','Prima',
  'Sobrino','Sobrina','Cuñado','Cuñada','Suegro','Suegra','Padrastro','Madrastra','Hijastro','Hijastra','Familia',
  'Pareja','Esposo','Esposa','Novio','Novia','Prometido','Prometida','Ex-pareja','Amante','Interés amoroso',
  'Amigo','Amiga','Mejor amigo','Mejor amiga','Conocido','Vecino','Compañero','Compañera','Colega','Aliado','Cómplice',
  'Mentor','Mentora','Maestro','Maestra','Alumno','Alumna','Aprendiz','Discípulo','Discípula',
  'Jefe','Jefa','Empleado','Empleada','Subordinado','Socio','Socia','Benefactor','Benefactora',
  'Mascota','Guía','Narrador','Secundario','Extra','Desconocido'
];

function esRolPersonalizado(role) { return role && !PREDEFINED_ROLES.includes(role); }
function ic(name, size = 18) { return `<i data-lucide="${name}" style="width:${size}px;height:${size}px;"></i>`; }
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); localStorage.setItem(THEME_KEY, t); }
function initTheme() { applyTheme(localStorage.getItem(THEME_KEY) || 'dark'); }

function showLoading() {
  let el = document.getElementById('globalLoading');
  if (!el) { el = document.createElement('div'); el.id = 'globalLoading'; el.className = 'global-loading'; el.innerHTML = '<div class="spinner"></div>'; document.body.appendChild(el); }
  el.hidden = false;
}
function hideLoading() { const el = document.getElementById('globalLoading'); if (el) el.hidden = true; }

function toast(msg, type = 'info') {
  const mount = document.getElementById('toast-mount');
  if (!mount) return;
  const el = document.createElement('div'); el.className = `toast toast-${type}`; el.textContent = msg;
  mount.appendChild(el); requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2500);
}

function limpiarCachePublica() {
  try { const keys = []; for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); if (k && k.startsWith('azael-cache:')) keys.push(k); } keys.forEach(k => sessionStorage.removeItem(k)); } catch {}
}

function debounce(fn, delay) { let timer = null; return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); }; }

function tiempoRelativo(fecha) {
  const d = new Date(fecha); const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'ahora'; if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`; if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`; return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function crearDropdownPersonalizado(containerId, groups, opts = {}) {
  const container = document.getElementById(containerId); if (!container) return null;
  let currentValue = opts.value || ''; const placeholder = opts.placeholder || '— Selecciona —'; const onChange = opts.onChange || (() => {});
  container.innerHTML = '';
  const dropdown = document.createElement('div'); dropdown.className = 'custom-dropdown';
  dropdown.innerHTML = `<button type="button" class="custom-dropdown-trigger"><div class="custom-dropdown-trigger-content"><span class="custom-dropdown-trigger-emoji" hidden></span><span class="custom-dropdown-trigger-text placeholder">${escapeHtml(placeholder)}</span></div><svg class="custom-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button><div class="custom-dropdown-menu"></div>`;
  const trigger = dropdown.querySelector('.custom-dropdown-trigger'); const triggerEmoji = dropdown.querySelector('.custom-dropdown-trigger-emoji'); const triggerText = dropdown.querySelector('.custom-dropdown-trigger-text'); const menu = dropdown.querySelector('.custom-dropdown-menu');
  groups.forEach(group => {
    if (group.label) { const groupEl = document.createElement('div'); groupEl.className = 'custom-dropdown-group'; groupEl.textContent = group.label; menu.appendChild(groupEl); }
    group.options.forEach(opt => {
      const optEl = document.createElement('div'); optEl.className = 'custom-dropdown-option'; if (opt.value === '__custom__') optEl.classList.add('custom-option'); optEl.dataset.value = opt.value;
      optEl.innerHTML = `${opt.emoji ? `<span class="custom-dropdown-option-emoji">${opt.emoji}</span>` : ''}<span class="custom-dropdown-option-label">${escapeHtml(opt.label)}</span>`;
      optEl.addEventListener('click', (e) => { e.stopPropagation(); currentValue = opt.value; actualizar(); dropdown.classList.remove('open'); onChange(opt.value, opt); });
      menu.appendChild(optEl);
    });
  });
  function actualizar() {
    let selectedOpt = null; for (const group of groups) { const found = group.options.find(o => o.value === currentValue); if (found) { selectedOpt = found; break; } }
    if (selectedOpt) { triggerText.textContent = selectedOpt.label; triggerText.classList.remove('placeholder'); if (selectedOpt.emoji) { triggerEmoji.textContent = selectedOpt.emoji; triggerEmoji.hidden = false; } else { triggerEmoji.hidden = true; } } 
    else { triggerText.textContent = placeholder; triggerText.classList.add('placeholder'); triggerEmoji.hidden = true; }
    menu.querySelectorAll('.custom-dropdown-option').forEach(opt => { opt.classList.toggle('selected', opt.dataset.value === currentValue); });
  }
  trigger.addEventListener('click', (e) => { e.stopPropagation(); document.querySelectorAll('.custom-dropdown.open').forEach(d => { if (d !== dropdown) d.classList.remove('open'); }); dropdown.classList.toggle('open'); });
  document.addEventListener('click', () => { dropdown.classList.remove('open'); });
  container.appendChild(dropdown); actualizar();
  dropdown.setValue = (val) => { currentValue = val; actualizar(); }; dropdown.getValue = () => currentValue; return dropdown;
}

function abrirInputModal({ title, desc, label, placeholder, hint, iconName = 'link', type = 'text', value = '' }) {
  return new Promise((resolve) => {
    const modal = document.createElement('div'); modal.className = 'custom-input-overlay';
    modal.innerHTML = `<div class="custom-input-modal"><div class="custom-input-icon">${ic(iconName, 26)}</div><h3 class="custom-input-title">${escapeHtml(title)}</h3>${desc ? `<p class="custom-input-desc">${escapeHtml(desc)}</p>` : ''}<div class="custom-input-field"><label for="customInputField">${escapeHtml(label)}</label><input type="${type}" id="customInputField" placeholder="${escapeHtml(placeholder || '')}" value="${escapeHtml(value)}" autocomplete="off" />${hint ? `<p class="custom-input-hint">${escapeHtml(hint)}</p>` : ''}</div><div class="custom-input-actions"><button class="btn btn-ghost" id="customInputCancel">Cancelar</button><button class="btn btn-primary" id="customInputOk">Aceptar</button></div></div>`;
    document.body.appendChild(modal); if (window.lucide) lucide.createIcons(); const input = modal.querySelector('#customInputField'); const okBtn = modal.querySelector('#customInputOk'); const cancelBtn = modal.querySelector('#customInputCancel');
    setTimeout(() => input.focus(), 100);
    function close(value) { modal.remove(); resolve(value); }
    okBtn.addEventListener('click', () => close(input.value.trim())); cancelBtn.addEventListener('click', () => close(null)); modal.addEventListener('click', (e) => { if (e.target === modal) close(null); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); close(input.value.trim()); } if (e.key === 'Escape') close(null); });
  });
}

function salirAlSitio() { const ref = document.referrer || ''; if (ref && !ref.includes('admin.html')) { try { window.history.back(); return; } catch {} } location.href = 'index.html'; }

function inyectarHeader() {
  const mount = document.getElementById('header-mount'); if (!mount) return;
  mount.innerHTML = `<header class="app-header"><div class="app-header-inner"><button class="admin-back-link" id="backBtn" title="Volver al sitio">${ic('arrow-left', 16)} <span>Sitio</span></button><h1 class="header-title">Panel</h1><div class="header-actions"><button class="icon-action" id="themeToggle" aria-label="Tema">${ic('moon', 18)}</button><button class="icon-action" id="logoutBtn" aria-label="Cerrar sesión">${ic('log-out', 18)}</button></div></div></header>`;
  document.getElementById('backBtn').addEventListener('click', salirAlSitio);
  document.getElementById('themeToggle').addEventListener('click', () => { const cur = document.documentElement.getAttribute('data-theme'); applyTheme(cur === 'dark' ? 'light' : 'dark'); });
  document.getElementById('logoutBtn').addEventListener('click', async () => { if (!confirm('¿Cerrar sesión?')) return; await db.auth.signOut(); location.replace('index.html'); });
  if (window.lucide) lucide.createIcons();
}

function inyectarAuthModal() {
  const mount = document.getElementById('auth-mount'); if (!mount) return;
  mount.innerHTML = `<div class="modal-overlay-c" id="authModal" hidden><div class="modal-c"><h2 class="modal-title-c">Acceso al panel</h2><p class="modal-sub-c">Inicia sesión con tu cuenta de autor.</p><form id="loginForm" class="auth-form-c"><label>Correo <input type="email" id="loginEmail" required autocomplete="email" /></label><label>Contraseña <input type="password" id="loginPassword" required autocomplete="current-password" /></label><button type="submit" class="btn btn-primary btn-block">Entrar</button><p class="auth-error-c" id="loginError" hidden></p></form><button class="btn btn-ghost btn-block" id="backToSiteBtn" style="margin-top:12px;">Volver al sitio</button></div></div>`;
  document.getElementById('backToSiteBtn').addEventListener('click', salirAlSitio);
  document.getElementById('loginForm').addEventListener('submit', async (e) => { e.preventDefault(); const err = document.getElementById('loginError'); err.hidden = true; showLoading(); const { error } = await db.auth.signInWithPassword({ email: document.getElementById('loginEmail').value.trim(), password: document.getElementById('loginPassword').value }); hideLoading(); if (error) { err.textContent = traducirError(error.message); err.hidden = false; return; } toast('Sesión iniciada', 'ok'); setTimeout(() => location.reload(), 400); });
}

function mostrarModalSinPermisos() {
  let modal = document.getElementById('deniedModal');
  if (!modal) {
    modal = document.createElement('div'); modal.id = 'deniedModal'; modal.className = 'denied-overlay';
    modal.innerHTML = `<div class="denied-modal"><div class="denied-icon">${ic('shield-off', 36)}</div><h2 class="denied-title">Acceso restringido</h2><p class="denied-msg">Esta cuenta no tiene permisos de autor para acceder al panel de escritor.</p><div class="denied-actions"><button class="btn btn-primary" id="deniedBack">${ic('home', 16)} Volver al sitio</button><button class="btn btn-ghost" id="deniedLogout">${ic('log-out', 16)} Cerrar sesión</button></div></div>`;
    document.body.appendChild(modal);
    document.getElementById('deniedBack').addEventListener('click', () => { location.href = 'index.html'; });
    document.getElementById('deniedLogout').addEventListener('click', async () => { await db.auth.signOut(); location.href = 'index.html'; });
    if (window.lucide) lucide.createIcons();
  }
  modal.hidden = false; if (window.lucide) lucide.createIcons();
}

function showView(id) { document.querySelectorAll('.admin-view').forEach(v => v.hidden = true); document.getElementById(id)?.removeAttribute('hidden'); window.scrollTo({ top: 0, behavior: 'instant' }); if (window.lucide) lucide.createIcons(); }

async function verificarAutor() {
  const { data: { session: s } } = await db.auth.getSession(); session = s;
  if (!session) { document.getElementById('authModal').hidden = false; return false; }
  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle(); currentProfile = profile;
  if (!profile?.is_author) { mostrarModalSinPermisos(); return false; }
  return true;
}

async function cargarDashboard() {
  showLoading();
  const [storiesRes, chaptersRes, postsRes, relatosRes] = await Promise.all([db.from('stories').select('*').order('created_at', { ascending: false }), db.from('chapters').select('id', { count: 'exact', head: true }), db.from('blog_posts').select('id', { count: 'exact', head: true }), db.from('relatos').select('id', { count: 'exact', head: true })]);
  hideLoading();
  document.getElementById('statStories').textContent = storiesRes.data?.length ?? '0'; document.getElementById('statChapters').textContent = chaptersRes.count ?? '0'; document.getElementById('statPosts').textContent = postsRes.count ?? '0'; document.getElementById('statRelatos').textContent = relatosRes.count ?? '0';
  const storiesList = document.getElementById('adminStoriesList');
  if (!storiesRes.data?.length) { storiesList.innerHTML = emptyState('book', 'Sin historias', 'Crea tu primera historia.'); } 
  else { storiesList.innerHTML = storiesRes.data.map(s => `<div class="admin-item"><div class="admin-item-cover">${s.cover_url ? `<img src="${s.cover_url}" alt="" />` : escapeHtml(s.title.charAt(0))}</div><div class="admin-item-body"><div class="admin-item-title">${escapeHtml(s.title)}</div><div class="admin-item-meta">${s.is_featured ? '<span class="admin-badge admin-badge-accent">Destacada</span>' : ''}<span>${escapeHtml(s.status || 'En curso')}</span>${s.is_published ? '<span class="admin-badge admin-badge-ok">Publicada</span>' : '<span class="admin-badge">Borrador</span>'}</div></div><button class="admin-item-action" data-action="edit-story" data-id="${s.id}">${ic('edit-2', 16)}</button></div>`).join(''); }
  const postsList = document.getElementById('adminPostsList'); const postsRes2 = await db.from('blog_posts').select('*').order('created_at', { ascending: false });
  if (!postsRes2.data?.length) { postsList.innerHTML = emptyState('feather', 'Sin entradas', 'Escribe tu primera entrada.'); } 
  else { postsList.innerHTML = postsRes2.data.map(p => `<div class="admin-item"><div class="admin-item-body"><div class="admin-item-title">${escapeHtml(p.title)}</div><div class="admin-item-meta"><span>${new Date(p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>${p.published ? '<span class="admin-badge admin-badge-ok">Publicada</span>' : '<span class="admin-badge">Borrador</span>'}</div></div><button class="admin-item-action" data-action="edit-post" data-id="${p.id}">${ic('edit-2', 16)}</button></div>`).join(''); }
  document.querySelectorAll('[data-action="edit-story"]').forEach(btn => { btn.addEventListener('click', () => abrirStoryForm(btn.dataset.id)); });
  document.querySelectorAll('[data-action="edit-post"]').forEach(btn => { btn.addEventListener('click', () => abrirPostForm(btn.dataset.id)); });
  if (window.lucide) lucide.createIcons();
}

async function cargarUsuarios() {
  const list = document.getElementById('adminUsersList'); if (!list) return;
  showLoading();
  const { data, error } = await db.from('profiles').select('*').eq('is_author', false).order('created_at', { ascending: false });
  hideLoading();
  if (error) { list.innerHTML = emptyState('alert-circle', 'Error', error.message); return; }
  if (!data?.length) { list.innerHTML = emptyState('users', 'Sin usuarios', 'Aún no se ha registrado nadie.'); return; }
  list.innerHTML = data.map(u => `<div class="admin-item" style="flex-direction: column; align-items: flex-start; gap: 8px;"><div style="display: flex; align-items: center; gap: 12px; width: 100%;"><div class="admin-item-cover" style="width: 40px; height: 40px; border-radius: 50%; font-size: 16px; overflow: hidden;">${u.avatar_url ? `<img src="${u.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />` : escapeHtml((u.username || 'U').charAt(0).toUpperCase())}</div><div class="admin-item-body"><div class="admin-item-title">@${escapeHtml(u.username || 'Sin @')}</div><div class="admin-item-meta"><span>Registrado: ${new Date(u.created_at).toLocaleDateString('es-ES')}</span>${u.gender ? `<span>· ${escapeHtml(u.gender)}</span>` : ''}</div></div></div></div>`).join('');
  if (window.lucide) lucide.createIcons();
}

// -- STORY FORM --
async function abrirStoryForm(id = null) {
  currentStory = null; document.getElementById('storyForm').reset(); document.getElementById('storyCoverBook').innerHTML = '<span id="storyCoverPlaceholder">A</span>'; document.getElementById('storyCoverBook').dataset.coverUrl = ''; document.getElementById('chaptersSection').hidden = true; document.getElementById('storyDeleteBtn').hidden = true; document.getElementById('storyViewTitle').textContent = 'Nueva historia';
  if (id) {
    showLoading(); const { data } = await db.from('stories').select('*').eq('id', id).maybeSingle(); hideLoading();
    if (data) {
      currentStory = data; document.getElementById('storyTitle').value = data.title || ''; document.getElementById('storySynopsis').value = data.synopsis || ''; document.getElementById('storyGenre').value = data.genre || ''; document.getElementById('storyStatus').value = data.status || 'En emisión'; document.getElementById('storyDedication').value = data.dedication || ''; document.getElementById('storyFeatured').checked = !!data.is_featured; document.getElementById('storyPublished').checked = data.is_published !== false;
      if (data.cover_url) { document.getElementById('storyCoverBook').innerHTML = `<img src="${data.cover_url}" alt="" />`; document.getElementById('storyCoverBook').dataset.coverUrl = data.cover_url; }
      document.getElementById('storyViewTitle').textContent = 'Editar historia'; document.getElementById('storyDeleteBtn').hidden = false; document.getElementById('chaptersSection').hidden = false; cargarCapitulosAdmin(data.id);
    }
  }
  showView('viewStory');
}

document.getElementById('storyCoverBtn')?.addEventListener('click', () => document.getElementById('storyCoverInput').click());
document.getElementById('storyCoverInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { toast('La imagen supera 5 MB', 'error'); return; }
  showLoading();
  try { const ext = file.name.split('.').pop(); const filename = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`; const { error: upErr } = await db.storage.from('media').upload(filename, file); if (upErr) throw upErr; const { data: pub } = db.storage.from('media').getPublicUrl(filename); document.getElementById('storyCoverBook').innerHTML = `<img src="${pub.publicUrl}" alt="" />`; document.getElementById('storyCoverBook').dataset.coverUrl = pub.publicUrl; toast('Portada subida', 'ok'); } catch (err) { toast('Error al subir: ' + err.message, 'error'); }
  hideLoading();
});

document.getElementById('storyForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = { user_id: session.user.id, title: document.getElementById('storyTitle').value.trim(), synopsis: document.getElementById('storySynopsis').value.trim(), genre: document.getElementById('storyGenre').value, status: document.getElementById('storyStatus').value, dedication: document.getElementById('storyDedication').value.trim(), is_featured: document.getElementById('storyFeatured').checked, is_published: document.getElementById('storyPublished').checked, cover_url: document.getElementById('storyCoverBook').dataset.coverUrl || currentStory?.cover_url || null };
  if (payload.is_featured) { await db.from('stories').update({ is_featured: false }).neq('id', currentStory?.id || '00000000-0000-0000-0000-000000000000'); }
  showLoading(); let error, data;
  if (currentStory) { ({ error, data } = await db.from('stories').update(payload).eq('id', currentStory.id).select().maybeSingle()); } else { ({ error, data } = await db.from('stories').insert(payload).select().maybeSingle()); }
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  currentStory = data; toast('Historia guardada', 'ok'); limpiarCachePublica(); document.getElementById('storyViewTitle').textContent = 'Editar historia'; document.getElementById('storyDeleteBtn').hidden = false; document.getElementById('chaptersSection').hidden = false; cargarCapitulosAdmin(data.id); cargarDashboard();
});

document.getElementById('storyDeleteBtn')?.addEventListener('click', async () => {
  if (!currentStory) return; if (!confirm(`¿Eliminar "${currentStory.title}"?`)) return;
  showLoading(); const { error } = await db.from('stories').delete().eq('id', currentStory.id); hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Historia eliminada', 'ok'); limpiarCachePublica(); showView('viewDashboard'); cargarDashboard();
});

async function cargarCapitulosAdmin(storyId) {
  const list = document.getElementById('chaptersList');
  const { data } = await db.from('chapters').select('id, title, chapter_order, is_premium, created_at').eq('story_id', storyId).order('chapter_order', { ascending: true });
  if (!data?.length) { list.innerHTML = emptyState('book-open', 'Sin capítulos', 'Añade tu primer capítulo.'); return; }
  list.innerHTML = data.map((c, i) => `<div class="admin-chapter-row"><div class="admin-chapter-num">${String(c.chapter_order || i + 1).padStart(2, '0')}</div><div class="admin-chapter-body"><div class="admin-chapter-title">${escapeHtml(c.title)}</div><div class="admin-chapter-meta">${c.is_premium ? '<span class="admin-badge admin-badge-accent">Premium</span>' : ''}</div></div><div class="admin-chapter-actions"><button class="admin-item-action" data-action="up" data-id="${c.id}">${ic('arrow-up', 14)}</button><button class="admin-item-action" data-action="down" data-id="${c.id}">${ic('arrow-down', 14)}</button><button class="admin-item-action" data-action="edit-chapter" data-id="${c.id}">${ic('edit-2', 16)}</button></div></div>`).join('');
  document.querySelectorAll('[data-action="edit-chapter"]').forEach(btn => { btn.addEventListener('click', () => abrirChapterForm(btn.dataset.id)); });
  document.querySelectorAll('[data-action="up"], [data-action="down"]').forEach(btn => { btn.addEventListener('click', () => moverCapitulo(btn.dataset.id, btn.dataset.action, data)); });
  if (window.lucide) lucide.createIcons();
}

async function moverCapitulo(id, direction, chapters) {
  const idx = chapters.findIndex(c => c.id === id); if (idx === -1) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1; if (swapIdx < 0 || swapIdx >= chapters.length) return;
  const a = chapters[idx], b = chapters[swapIdx]; const orderA = a.chapter_order || idx + 1; const orderB = b.chapter_order || swapIdx + 1;
  await db.from('chapters').update({ chapter_order: orderB }).eq('id', a.id); await db.from('chapters').update({ chapter_order: orderA }).eq('id', b.id); cargarCapitulosAdmin(currentStory.id);
}

function abrirChapterForm(id = null) {
  currentChapter = null; document.getElementById('chapterForm').reset(); document.getElementById('chapterEditor').innerHTML = ''; document.getElementById('chapterDeleteBtn').hidden = true; document.getElementById('chapterViewTitle').textContent = 'Nuevo capítulo'; document.getElementById('chapterOrder').value = 1; actualizarContador('chapterEditor', 'edCounter');
  if (id) {
    showLoading();
    db.from('chapters').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      hideLoading(); if (!data) return;
      currentChapter = data; document.getElementById('chapterTitle').value = data.title || ''; document.getElementById('chapterEditor').innerHTML = data.content || ''; document.getElementById('chapterNote').value = data.author_note || ''; document.getElementById('chapterOrder').value = data.chapter_order || 1; document.getElementById('chapterPremium').checked = !!data.is_premium; document.getElementById('chapterViewTitle').textContent = 'Editar capítulo'; document.getElementById('chapterDeleteBtn').hidden = false; actualizarContador('chapterEditor', 'edCounter');
    });
  }
  showView('viewChapter'); setTimeout(() => document.getElementById('chapterTitle')?.focus(), 100);
}

document.getElementById('chapterForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = { story_id: currentStory.id, title: document.getElementById('chapterTitle').value.trim(), content: document.getElementById('chapterEditor').innerHTML, author_note: document.getElementById('chapterNote').value.trim(), chapter_order: parseInt(document.getElementById('chapterOrder').value, 10) || 1, is_premium: document.getElementById('chapterPremium').checked };
  showLoading(); let error;
  if (currentChapter) { ({ error } = await db.from('chapters').update(payload).eq('id', currentChapter.id)); } else { ({ error } = await db.from('chapters').insert(payload)); }
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Capítulo guardado', 'ok'); limpiarCachePublica(); localStorage.removeItem(DRAFT_KEY + ':chapter:' + (currentChapter?.id || 'new'));
  setTimeout(() => { showView('viewStory'); cargarCapitulosAdmin(currentStory.id); }, 400);
});

document.getElementById('chapterDeleteBtn')?.addEventListener('click', async () => {
  if (!currentChapter) return; if (!confirm('¿Eliminar este capítulo?')) return;
  showLoading(); const { error } = await db.from('chapters').delete().eq('id', currentChapter.id); hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Capítulo eliminado', 'ok'); limpiarCachePublica(); showView('viewStory'); cargarCapitulosAdmin(currentStory.id);
});

// -- EDITOR --
function initEditor(toolbarId, editorId, counterId) {
  const toolbar = document.getElementById(toolbarId); const editor = document.getElementById(editorId); if (!toolbar || !editor) return;
  toolbar.querySelectorAll('.ed-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); const cmd = btn.dataset.cmd; editor.focus();
      try { switch (cmd) { case 'bold': document.execCommand('bold'); break; case 'italic': document.execCommand('italic'); break; case 'h2': document.execCommand('formatBlock', false, 'H2'); break; case 'h3': document.execCommand('formatBlock', false, 'H3'); break; case 'quote': document.execCommand('formatBlock', false, 'BLOCKQUOTE'); break; case 'hr': document.execCommand('insertHTML', false, '<hr>'); break; case 'image': insertarImagen(editor); break; case 'fullscreen': toggleFullscreen(); break; } } catch (err) { console.warn(err); }
      if (counterId) actualizarContador(editorId, counterId);
    });
  });
  const actualizarContadorDebounced = debounce(() => { if (counterId) actualizarContador(editorId, counterId); }, 100);
  editor.addEventListener('input', () => { actualizarContadorDebounced(); guardarBorrador(editorId); });
  editor.addEventListener('keyup', () => { actualizarContadorDebounced(); });
  editor.addEventListener('paste', (e) => { e.preventDefault(); const html = e.clipboardData.getData('text/html'); const text = e.clipboardData.getData('text/plain'); if (html) document.execCommand('insertHTML', false, limpiarHtmlPegado(html)); else document.execCommand('insertHTML', false, `<p>${escapeHtml(text).replace(/\r\n/g, '\n').replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`); setTimeout(() => actualizarContadorDebounced(), 50); guardarBorrador(editorId); });
  editor.addEventListener('cut', () => { setTimeout(() => actualizarContadorDebounced(), 50); });
  setInterval(() => guardarBorrador(editorId), 30000);
}

function limpiarHtmlPegado(html) {
  const parser = new DOMParser(); const doc = parser.parseFromString(html, 'text/html'); const body = doc.body;
  const ALLOWED = new Set(['P', 'BR', 'HR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'MARK', 'SUP', 'SUB', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'CODE', 'UL', 'OL', 'LI', 'A', 'IMG']);
  const REMOVE_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'VIDEO', 'AUDIO', 'CANVAS', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT']);
  const ATTRS_BY_TAG = { A: new Set(['href', 'title']), IMG: new Set(['src', 'alt', 'title']) };
  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const tag = node.tagName; if (REMOVE_WITH_CONTENT.has(tag)) return null;
    if (!ALLOWED.has(tag)) { const fragment = document.createDocumentFragment(); Array.from(node.childNodes).forEach(child => { const cleaned = clean(child); if (cleaned) fragment.appendChild(cleaned); }); return fragment; }
    const newNode = document.createElement(tag); const allowedAttrs = ATTRS_BY_TAG[tag];
    if (allowedAttrs) allowedAttrs.forEach(attr => { if (node.hasAttribute(attr)) { const val = node.getAttribute(attr); if (tag === 'A' && attr === 'href' && /^\s*javascript:/i.test(val)) return; newNode.setAttribute(attr, val); } });
    Array.from(node.childNodes).forEach(child => { const cleaned = clean(child); if (cleaned) newNode.appendChild(cleaned); });
    if (tag === 'DIV' || tag === 'SPAN') { if (tag === 'DIV' && !node.getAttribute('class') && !node.getAttribute('style')) { const hasBlockChildren = newNode.querySelector('p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li, div'); if (!hasBlockChildren) { if (newNode.textContent.trim() || newNode.querySelector('img, br')) { const p = document.createElement('P'); p.innerHTML = newNode.innerHTML; return p; } return null; } return newNode; } if (tag === 'SPAN') { const fragment = document.createDocumentFragment(); Array.from(newNode.childNodes).forEach(child => fragment.appendChild(child)); return fragment; } return newNode; }
    if ((tag === 'P' || /^H[1-6]$/.test(tag)) && !newNode.textContent.trim() && !newNode.querySelector('img,br')) return null; return newNode;
  }
  const result = document.createDocumentFragment(); Array.from(body.childNodes).forEach(child => { const cleaned = clean(child); if (cleaned) result.appendChild(cleaned); });
  const temp = document.createElement('div'); temp.appendChild(result); let htmlFinal = temp.innerHTML; htmlFinal = htmlFinal.replace(/<br\s*\/?>\s*<\/br>/gi, '<br>'); htmlFinal = htmlFinal.replace(/(<br\s*\/?>\s*){2,}/gi, '</p><p>'); return htmlFinal;
}

async function insertarImagen(editor) { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = async () => { const file = input.files[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { toast('La imagen supera 5 MB', 'error'); return; } showLoading(); try { const ext = file.name.split('.').pop(); const filename = `inline/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`; const { error } = await db.storage.from('media').upload(filename, file); if (error) throw error; const { data: pub } = db.storage.from('media').getPublicUrl(filename); document.execCommand('insertImage', false, pub.publicUrl); toast('Imagen insertada', 'ok'); } catch (err) { toast('Error al subir: ' + err.message, 'error'); } hideLoading(); }; input.click(); }
function toggleFullscreen() { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }
function contarPalabras(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim().split(/\s+/).filter(Boolean).length; }
function actualizarContador(editorId, counterId) { const el = document.getElementById(editorId); const counter = document.getElementById(counterId); if (!el || !counter) return; const words = contarPalabras(el.innerHTML); counter.textContent = words === 1 ? '1 palabra' : `${words} palabras`; }
function guardarBorrador(editorId) { const el = document.getElementById(editorId); if (!el) return; const key = DRAFT_KEY + ':chapter:' + (currentChapter?.id || 'new'); try { localStorage.setItem(key, JSON.stringify({ title: document.getElementById('chapterTitle')?.value || '', content: el.innerHTML, savedAt: Date.now() })); } catch {} }

// -- RELATO ADMIN --
async function abrirRelatoAdminForm(id = null) {
  currentRelatoAdmin = null; document.getElementById('relatoAdminForm').reset(); document.getElementById('relatoAdminDeleteBtn').hidden = true; document.getElementById('relatoAdminViewTitle').textContent = 'Nuevo relato'; document.getElementById('relatoAdminCharCount').textContent = '0 / 20000';
  if (id) {
    showLoading(); const { data } = await db.from('relatos').select('*').eq('id', id).maybeSingle(); hideLoading();
    if (data) { currentRelatoAdmin = data; document.getElementById('relatoAdminTitle').value = data.title || ''; document.getElementById('relatoAdminContent').value = data.content || ''; document.getElementById('relatoAdminDeleteBtn').hidden = false; document.getElementById('relatoAdminViewTitle').textContent = 'Editar relato'; document.getElementById('relatoAdminCharCount').textContent = `${(data.content || '').length} / 20000`; }
  }
  showView('viewRelatoAdmin'); setTimeout(() => document.getElementById('relatoAdminTitle')?.focus(), 100);
}

document.getElementById('relatoAdminContent')?.addEventListener('input', (e) => { const counter = document.getElementById('relatoAdminCharCount'); if (counter) counter.textContent = `${e.target.value.length} / 20000`; });

document.getElementById('relatoAdminForm')?.addEventListener('submit', async (e) => {
  e.preventDefault(); const title = document.getElementById('relatoAdminTitle').value.trim(); const content = document.getElementById('relatoAdminContent').value.trim();
  if (!title || title.length < 3) { toast('El título es demasiado corto', 'error'); return; } if (content.length < 100) { toast('El contenido debe tener al menos 100 caracteres', 'error'); return; }
  const payload = { user_id: session.user.id, title, content, updated_at: new Date().toISOString() };
  showLoading(); let error;
  if (currentRelatoAdmin) { ({ error } = await db.from('relatos').update(payload).eq('id', currentRelatoAdmin.id)); } else { ({ error } = await db.from('relatos').insert(payload)); }
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast(currentRelatoAdmin ? 'Relato actualizado' : 'Relato publicado', 'ok'); limpiarCachePublica(); setTimeout(() => { showView('viewDashboard'); cargarDashboard(); }, 400);
});

document.getElementById('relatoAdminDeleteBtn')?.addEventListener('click', async () => {
  if (!currentRelatoAdmin) return; if (!confirm(`¿Eliminar "${currentRelatoAdmin.title}"?`)) return;
  showLoading(); const { error } = await db.from('relatos').delete().eq('id', currentRelatoAdmin.id); hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Relato eliminado', 'ok'); limpiarCachePublica(); showView('viewDashboard'); cargarDashboard();
});

// -- POST FORM --
async function abrirPostForm(id = null) {
  currentPost = null; document.getElementById('postForm').reset(); document.getElementById('postEditor').innerHTML = ''; document.getElementById('postDeleteBtn').hidden = true; document.getElementById('postViewTitle').textContent = 'Nueva entrada'; actualizarContador('postEditor', 'postCounter');
  if (id) {
    showLoading(); const { data } = await db.from('blog_posts').select('*').eq('id', id).maybeSingle(); hideLoading();
    if (data) { currentPost = data; document.getElementById('postTitle').value = data.title || ''; document.getElementById('postEditor').innerHTML = data.content || ''; document.getElementById('postPublished').checked = data.published !== false; document.getElementById('postViewTitle').textContent = 'Editar entrada'; document.getElementById('postDeleteBtn').hidden = false; actualizarContador('postEditor', 'postCounter'); }
  }
  showView('viewPost');
}

document.getElementById('postForm')?.addEventListener('submit', async (e) => {
  e.preventDefault(); const title = document.getElementById('postTitle').value.trim(); const content = document.getElementById('postEditor').innerHTML; if (!title) { toast('Falta el título', 'error'); return; }
  const payload = { user_id: session.user.id, title, content, published: document.getElementById('postPublished').checked };
  showLoading(); let error;
  if (currentPost) { ({ error } = await db.from('blog_posts').update(payload).eq('id', currentPost.id)); } else { ({ error } = await db.from('blog_posts').insert(payload)); }
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast(currentPost ? 'Entrada actualizada' : 'Entrada publicada', 'ok'); limpiarCachePublica(); setTimeout(() => { showView('viewDashboard'); cargarDashboard(); }, 400);
});

document.getElementById('postDeleteBtn')?.addEventListener('click', async () => {
  if (!currentPost) return; if (!confirm('¿Eliminar esta entrada?')) return;
  showLoading(); const { error } = await db.from('blog_posts').delete().eq('id', currentPost.id); hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Entrada eliminada', 'ok'); limpiarCachePublica(); showView('viewDashboard'); cargarDashboard();
});

// -- REDES / DONACIONES / ESTADÍSTICAS / NOTIFICACIONES / REPORTES / MODERAR / AJUSTES --
const NET_ICONS = { instagram: 'instagram', twitter: 'twitter', tiktok: 'music', youtube: 'youtube', facebook: 'facebook', whatsapp: 'message-circle', telegram: 'send', discord: 'message-square' };
async function abrirRedesView() { showView('viewRedes'); await cargarRedesAdmin(); }
async function cargarRedesAdmin() { const list = document.getElementById('redesList'); showLoading(); const { data, error } = await db.from('social_links').select('id, platform, url, display_order').order('display_order', { ascending: true }); hideLoading(); if (error) { list.innerHTML = emptyState('alert-circle', 'Error', error.message); return; } if (!data?.length) { list.innerHTML = emptyState('share-2', 'Sin redes', 'Añade tus redes desde abajo.'); return; } list.innerHTML = data.map(s => `<div class="admin-net-item"><div class="admin-net-item-icon">${ic(NET_ICONS[s.platform] || 'link', 20)}</div><div class="admin-net-item-body"><div class="admin-net-item-platform">${escapeHtml(s.platform)}</div><div class="admin-net-item-url">${escapeHtml(s.url)}</div></div><button class="admin-item-action" data-net-del="${s.id}" title="Eliminar">${ic('trash-2', 16)}</button></div>`).join(''); document.querySelectorAll('[data-net-del]').forEach(btn => { btn.addEventListener('click', () => eliminarRed(btn.dataset.netDel)); }); if (window.lucide) lucide.createIcons(); }
async function eliminarRed(id) { if (!confirm('¿Eliminar esta red social?')) return; showLoading(); const { error } = await db.from('social_links').delete().eq('id', id); hideLoading(); if (error) { toast('Error: ' + error.message, 'error'); return; } toast('Red eliminada', 'ok'); limpiarCachePublica(); cargarRedesAdmin(); }
document.querySelectorAll('#redesAddPanel .admin-net-btn').forEach(btn => { btn.addEventListener('click', async () => { const platform = btn.dataset.platform; const labels = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', tiktok: 'TikTok', twitter: 'Twitter / X', whatsapp: 'WhatsApp', telegram: 'Telegram' }; const platformName = labels[platform] || platform; const url = await abrirInputModal({ title: `Añadir ${platformName}`, desc: `Pega el enlace de tu perfil de ${platformName}.`, label: 'Enlace del perfil', placeholder: `https://${platform}.com/tuusuario`, hint: 'Debe empezar con https://', iconName: platform === 'instagram' ? 'instagram' : platform === 'facebook' ? 'facebook' : platform === 'youtube' ? 'youtube' : 'link' }); if (!url) return; if (!/^https?:\/\//.test(url)) { toast('El enlace debe empezar con https://', 'error'); return; } agregarRed(platform, url); }); });
async function agregarRed(platform, url) { showLoading(); const { data: maxRow } = await db.from('social_links').select('display_order').eq('user_id', session.user.id).order('display_order', { ascending: false }).limit(1).maybeSingle(); const nextOrder = (maxRow?.display_order || 0) + 1; const { error } = await db.from('social_links').insert({ user_id: session.user.id, platform, url, display_order: nextOrder }); hideLoading(); if (error) { toast('Error: ' + error.message, 'error'); return; } toast('Red añadida', 'ok'); limpiarCachePublica(); cargarRedesAdmin(); }

const DONATION_ICONS = { paypal: 'wallet', binance: 'bitcoin' };
async function abrirDonacionesView() { showView('viewDonaciones'); await cargarDonacionesAdmin(); }
async function cargarDonacionesAdmin() { const list = document.getElementById('donationsListAdmin'); showLoading(); const { data, error } = await db.from('donations').select('id, platform, url, label, display_order').order('display_order', { ascending: true }); hideLoading(); if (error) { list.innerHTML = emptyState('alert-circle', 'Error', error.message); return; } if (!data?.length) { list.innerHTML = emptyState('heart-handshake', 'Sin métodos', 'Añade uno desde abajo.'); return; } list.innerHTML = data.map(d => `<div class="admin-net-item"><div class="admin-net-item-icon">${ic(DONATION_ICONS[d.platform] || 'link', 20)}</div><div class="admin-net-item-body"><div class="admin-net-item-platform">${escapeHtml(d.label || d.platform)}</div><div class="admin-net-item-url">${escapeHtml(d.platform === 'binance' ? 'ID: ' + d.url : d.url)}</div></div><button class="admin-item-action" data-don-del="${d.id}" title="Eliminar">${ic('trash-2', 16)}</button></div>`).join(''); document.querySelectorAll('[data-don-del]').forEach(btn => { btn.addEventListener('click', () => eliminarDonacion(btn.dataset.donDel)); }); if (window.lucide) lucide.createIcons(); }
async function eliminarDonacion(id) { if (!confirm('¿Eliminar este método de donación?')) return; showLoading(); const { error } = await db.from('donations').delete().eq('id', id); hideLoading(); if (error) { toast('Error: ' + error.message, 'error'); return; } toast('Método eliminado', 'ok'); limpiarCachePublica(); cargarDonacionesAdmin(); }
document.querySelectorAll('#donationsAddPanel .admin-net-btn').forEach(btn => { btn.addEventListener('click', async () => { const platform = btn.dataset.platform; const isBinance = platform === 'binance'; const platformName = isBinance ? 'Binance' : 'PayPal'; const label = await abrirInputModal({ title: `Añadir ${platformName}`, desc: 'Nombre que verán tus lectores.', label: 'Nombre visible', placeholder: platformName, iconName: isBinance ? 'bitcoin' : 'wallet', value: platformName }); if (label === null) return; const url = await abrirInputModal({ title: `Datos de ${platformName}`, desc: isBinance ? 'Pega tu número de Binance (ID).' : 'Pega el enlace de tu cuenta de PayPal.', label: isBinance ? 'ID de Binance' : 'Enlace de PayPal', placeholder: isBinance ? 'Ej: 1257168234' : 'https://paypal.me/tuusuario', hint: isBinance ? 'Solo números' : 'Debe empezar con https://', iconName: isBinance ? 'bitcoin' : 'wallet' }); if (!url) return; if (isBinance) { if (!/^\d+$/.test(url.replace(/\s/g, ''))) { toast('El ID de Binance debe ser solo números', 'error'); return; } agregarDonacion('binance', url.trim(), label || 'Binance'); } else { if (!/^https?:\/\//.test(url)) { toast('El enlace de PayPal debe empezar con https://', 'error'); return; } agregarDonacion('paypal', url, label || 'PayPal'); } }); });
async function agregarDonacion(platform, url, label) { showLoading(); const { data: maxRow } = await db.from('donations').select('display_order').eq('user_id', session.user.id).order('display_order', { ascending: false }).limit(1).maybeSingle(); const nextOrder = (maxRow?.display_order || 0) + 1; const { error } = await db.from('donations').insert({ user_id: session.user.id, platform, url, label: label || platform, display_order: nextOrder }); hideLoading(); if (error) { toast('Error: ' + error.message, 'error'); return; } toast('Método añadido', 'ok'); limpiarCachePublica(); cargarDonacionesAdmin(); }

// ESTADÍSTICAS
async function abrirStatsView() { showView('viewStats'); await cargarEstadisticas(); }
async function cargarEstadisticas() { const list = document.getElementById('statsList'); showLoading(); try { const { data: stories, error: storiesError } = await db.from('stories').select('id, title, cover_url, genre, status').order('created_at', { ascending: false }); if (storiesError) throw storiesError; if (!stories?.length) { hideLoading(); list.innerHTML = emptyState('book', 'Sin historias', 'Publica una historia para ver estadísticas.'); return; } const { data: views } = await db.from('story_views').select('story_id'); const { data: likes } = await db.from('likes').select('story_id').is('chapter_id', null); const { data: commentsRaw } = await db.from('comments').select('chapter_id').not('chapter_id', 'is', null); const { data: chapters } = await db.from('chapters').select('id, story_id'); const chapterToStory = {}; (chapters || []).forEach(c => { chapterToStory[c.id] = c.story_id; }); const viewsByStory = {}; (views || []).forEach(v => { viewsByStory[v.story_id] = (viewsByStory[v.story_id] || 0) + 1; }); const likesByStory = {}; (likes || []).forEach(l => { if (l.story_id) likesByStory[l.story_id] = (likesByStory[l.story_id] || 0) + 1; }); const commentsByStory = {}; (commentsRaw || []).forEach(c => { const sid = chapterToStory[c.chapter_id]; if (sid) commentsByStory[sid] = (commentsByStory[sid] || 0) + 1; }); const stats = stories.map(s => ({ id: s.id, title: s.title, cover_url: s.cover_url, genre: s.genre, views: viewsByStory[s.id] || 0, likes: likesByStory[s.id] || 0, comments: commentsByStory[s.id] || 0 })); stats.sort((a, b) => b.views - a.views); const totalViews = stats.reduce((sum, s) => sum + s.views, 0); const totalLikes = stats.reduce((sum, s) => sum + s.likes, 0); const totalComments = stats.reduce((sum, s) => sum + s.comments, 0); const maxViews = stats[0]?.views || 0; document.getElementById('statsTotalViews').textContent = totalViews.toLocaleString('es-ES'); document.getElementById('statsTotalLikes').textContent = totalLikes.toLocaleString('es-ES'); document.getElementById('statsTotalComments').textContent = totalComments.toLocaleString('es-ES'); list.innerHTML = stats.map(s => { const percent = maxViews > 0 ? Math.round((s.views / maxViews) * 100) : 0; return `<button class="stats-card" data-story-id="${s.id}"><div class="stats-card-cover">${s.cover_url ? `<img src="${s.cover_url}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<span>${escapeHtml(s.title.charAt(0))}</span>';" />` : `<span>${escapeHtml(s.title.charAt(0))}</span>`}</div><div class="stats-card-body"><div class="stats-card-title">${escapeHtml(s.title)}</div><div class="stats-card-meta"><span>${escapeHtml(s.genre || 'Sin género')}</span><span>·</span><span>${escapeHtml(s.status || 'En curso')}</span></div><div class="stats-card-bar"><div class="stats-card-bar-fill" style="width: ${percent}%;"></div></div><div class="stats-card-numbers"><span class="stats-card-number">${s.views.toLocaleString('es-ES')} vistas</span><span class="stats-card-number">${s.likes.toLocaleString('es-ES')} likes</span><span class="stats-card-number">${s.comments.toLocaleString('es-ES')} comentarios</span></div><div class="stats-card-percent">${percent}% de la más vista</div></div><div class="stats-card-arrow">${ic('chevron-right', 20)}</div></button>`; }).join(''); document.querySelectorAll('.stats-card').forEach(card => { card.addEventListener('click', () => abrirStoryStats(card.dataset.storyId)); }); if (window.lucide) lucide.createIcons(); } catch (err) { console.error('Error cargando stats:', err); list.innerHTML = emptyState('alert-circle', 'Error', err.message); } hideLoading(); }
async function abrirStoryStats(storyId) { showView('viewStoryStats'); await cargarStoryStats(storyId); }
async function cargarStoryStats(storyId) { const header = document.getElementById('storyStatsHeader'); const totals = document.getElementById('storyStatsTotals'); const chaptersList = document.getElementById('storyStatsChapters'); showLoading(); try { const { data: story, error: storyError } = await db.from('stories').select('id, title, cover_url, genre, status, synopsis').eq('id', storyId).maybeSingle(); if (storyError || !story) throw new Error('Historia no encontrada'); const { count: totalViews } = await db.from('story_views').select('id', { count: 'exact', head: true }).eq('story_id', storyId); const { count: bookLikes } = await db.from('likes').select('id', { count: 'exact', head: true }).eq('story_id', storyId).is('chapter_id', null); const { data: chapters } = await db.from('chapters').select('id, title, chapter_order').eq('story_id', storyId).order('chapter_order', { ascending: true }); const chapterIds = (chapters || []).map(c => c.id).filter(Boolean); const { data: chapterViews } = await db.from('story_views').select('chapter_id').eq('story_id', storyId).not('chapter_id', 'is', null); const viewsByChapter = {}; (chapterViews || []).forEach(v => { viewsByChapter[v.chapter_id] = (viewsByChapter[v.chapter_id] || 0) + 1; }); const { data: chapterLikes } = await db.from('likes').select('chapter_id').in('chapter_id', chapterIds.length ? chapterIds : ['00000000-0000-0000-0000-000000000000']); const likesByChapter = {}; (chapterLikes || []).forEach(l => { if (l.chapter_id) likesByChapter[l.chapter_id] = (likesByChapter[l.chapter_id] || 0) + 1; }); const { data: chapterComments } = await db.from('comments').select('chapter_id').in('chapter_id', chapterIds.length ? chapterIds : ['00000000-0000-0000-0000-000000000000']); const commentsByChapter = {}; (chapterComments || []).forEach(c => { if (c.chapter_id) commentsByChapter[c.chapter_id] = (commentsByChapter[c.chapter_id] || 0) + 1; }); const totalComments = Object.values(commentsByChapter).reduce((a, b) => a + b, 0); header.innerHTML = `<div class="story-stats-header"><div class="story-stats-cover">${story.cover_url ? `<img src="${story.cover_url}" alt="" onerror="this.parentElement.innerHTML='<span>${escapeHtml(story.title.charAt(0))}</span>';" />` : `<span>${escapeHtml(story.title.charAt(0))}</span>`}</div><div class="story-stats-info"><div class="story-stats-badges">${story.genre ? `<span class="badge badge-genre">${escapeHtml(story.genre)}</span>` : ''}<span class="badge badge-status">${escapeHtml(story.status || 'En curso')}</span></div><h2 class="story-stats-title">${escapeHtml(story.title)}</h2>${story.synopsis ? `<p class="story-stats-synopsis">${escapeHtml(story.synopsis)}</p>` : ''}</div></div>`; totals.innerHTML = `<div class="stats-total-card"><div class="stats-total-label">Vistas</div><div class="stats-total-value">${(totalViews || 0).toLocaleString('es-ES')}</div></div><div class="stats-total-card"><div class="stats-total-label">Likes del libro</div><div class="stats-total-value">${(bookLikes || 0).toLocaleString('es-ES')}</div></div><div class="stats-total-card"><div class="stats-total-label">Comentarios</div><div class="stats-total-value">${totalComments.toLocaleString('es-ES')}</div></div><div class="stats-total-card"><div class="stats-total-label">Capítulos</div><div class="stats-total-value">${(chapters || []).length}</div></div>`; if (!chapters?.length) { chaptersList.innerHTML = emptyState('book-open', 'Sin capítulos', 'Esta historia aún no tiene capítulos.'); hideLoading(); return; } const maxChapterViews = Math.max(...chapters.map(c => viewsByChapter[c.id] || 0), 1); chaptersList.innerHTML = chapters.map((c, i) => { const views = viewsByChapter[c.id] || 0; const likes = likesByChapter[c.id] || 0; const comments = commentsByChapter[c.id] || 0; const percent = Math.round((views / maxChapterViews) * 100); const num = c.chapter_order || (i + 1); return `<div class="stats-chapter-item"><div class="stats-chapter-num">${String(num).padStart(2, '0')}</div><div class="stats-chapter-body"><div class="stats-chapter-title">${escapeHtml(c.title)}</div><div class="stats-chapter-bar"><div class="stats-chapter-bar-fill" style="width: ${percent}%;"></div></div><div class="stats-chapter-metrics"><span class="stats-metric"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${views.toLocaleString('es-ES')}</span><span class="stats-metric"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>${likes.toLocaleString('es-ES')}</span><span class="stats-metric"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${comments.toLocaleString('es-ES')}</span></div></div></div>`; }).join(''); if (window.lucide) lucide.createIcons(); } catch (err) { console.error('Error cargando story stats:', err); header.innerHTML = emptyState('alert-circle', 'Error', err.message); } hideLoading(); }

// NOTIFICACIONES
let notifCurrentFilter = 'all';
async function abrirNotificacionesView() { showView('viewNotificaciones'); await cargarNotificaciones(); }
async function cargarNotificaciones() { const list = document.getElementById('notifList'); showLoading(); try { const { data, error } = await db.from('notifications').select(`id, type, is_read, created_at, from_user_id, story_id, chapter_id, post_id, relato_id, stories(title), chapters(title, stories(title)), blog_posts(title)`).eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(200); hideLoading(); if (error) { list.innerHTML = emptyState('alert-circle', 'Error', error.message); return; } if (!data?.length) { list.innerHTML = emptyState('bell', 'Sin notificaciones', 'Aquí verás la actividad de tus lectores.'); return; } const fromIds = [...new Set(data.map(n => n.from_user_id).filter(Boolean))]; let profilesMap = {}; if (fromIds.length) { const { data: profiles } = await db.from('profiles').select('id, username, avatar_url').in('id', fromIds); profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, p])); } const relatoIds = [...new Set(data.map(n => n.relato_id).filter(Boolean))]; let relatosMap = {}; if (relatoIds.length) { const { data: relatos } = await db.from('relatos').select('id, title').in('id', relatoIds); relatosMap = Object.fromEntries((relatos || []).map(r => [r.id, r])); } let filtradas = data; if (notifCurrentFilter === 'comment') { filtradas = data.filter(n => n.type.startsWith('comment')); } else if (notifCurrentFilter === 'like') { filtradas = data.filter(n => n.type.startsWith('like')); } else if (notifCurrentFilter === 'reaction') { filtradas = data.filter(n => n.type.startsWith('reaction')); } else if (notifCurrentFilter === 'user') { filtradas = data.filter(n => n.type === 'new_user'); } if (!filtradas.length) { list.innerHTML = emptyState('filter', 'Sin notificaciones', 'No hay notificaciones de este tipo.'); return; } list.innerHTML = filtradas.map(n => { const from = profilesMap[n.from_user_id]; const fromName = from?.username || 'Un lector'; const fromAvatar = from?.avatar_url || null; const fecha = tiempoRelativo(n.created_at); const info = formatearNotificacion(n, fromName, relatosMap); return `<div class="notif-item ${n.is_read ? 'read' : 'unread'}" data-notif-id="${n.id}"><div class="notif-avatar ${info.colorClass}">${fromAvatar ? `<img src="${fromAvatar}" alt="" />` : `<span>${escapeHtml(fromName.charAt(0).toUpperCase())}</span>`}<div class="notif-icon-badge">${ic(info.iconName, 12)}</div></div><div class="notif-body"><div class="notif-text">${info.texto}</div><div class="notif-meta"><span>${fecha}</span>${!n.is_read ? '<span class="notif-dot"></span>' : ''}</div></div><button class="notif-delete" data-notif-delete="${n.id}" title="Eliminar">${ic('x', 14)}</button></div>`; }).join(''); document.querySelectorAll('[data-notif-delete]').forEach(btn => { btn.addEventListener('click', async (e) => { e.stopPropagation(); await eliminarNotificacion(btn.dataset.notifDelete); }); }); document.querySelectorAll('.notif-item').forEach(el => { el.addEventListener('click', async () => { const id = el.dataset.notifId; await marcarNotificacionLeida(id); const notif = data.find(n => n.id === id); if (notif) { if (notif.type === 'new_follower' && notif.from_user_id) { location.href = `perfil.html?id=${notif.from_user_id}`; } else if (notif.type === 'comment_chapter' && notif.story_id) { location.href = `historia.html?id=${notif.story_id}`; } else if (notif.type === 'comment_post' && notif.post_id) { location.href = `post.html?id=${notif.post_id}`; } else if (notif.type === 'comment_relato' && notif.relato_id) { location.href = `relato.html?id=${notif.relato_id}`; } else if (notif.type === 'reaction_relato' && notif.relato_id) { location.href = `relato.html?id=${notif.relato_id}`; } else if (notif.type.startsWith('like') && notif.story_id) { location.href = `historia.html?id=${notif.story_id}`; } } }); }); if (window.lucide) lucide.createIcons(); } catch (err) { console.error('Error cargando notificaciones:', err); hideLoading(); list.innerHTML = emptyState('alert-circle', 'Error', err.message); } }
function formatearNotificacion(n, fromName, relatosMap = {}) { const N = `<strong>${escapeHtml(fromName)}</strong>`; switch (n.type) { case 'comment_chapter': return { texto: `${N} comentó en el capítulo <strong>${escapeHtml(n.chapters?.title || '?')}</strong> de <em>${escapeHtml(n.chapters?.stories?.title || '?')}</em>`, iconName: 'message-circle', colorClass: 'notif-blue' }; case 'comment_post': return { texto: `${N} comentó en la entrada <strong>${escapeHtml(n.blog_posts?.title || '?')}</strong>`, iconName: 'message-circle', colorClass: 'notif-blue' }; case 'comment_relato': return { texto: `${N} comentó en el relato <strong>${escapeHtml(relatosMap[n.relato_id]?.title || '?')}</strong>`, iconName: 'message-circle', colorClass: 'notif-blue' }; case 'reaction_relato': return { texto: `${N} reaccionó al relato <strong>${escapeHtml(relatosMap[n.relato_id]?.title || '?')}</strong>`, iconName: 'smile', colorClass: 'notif-green' }; case 'like_story': return { texto: `${N} le dio me gusta a <strong>${escapeHtml(n.stories?.title || '?')}</strong>`, iconName: 'heart', colorClass: 'notif-red' }; case 'like_chapter': return { texto: `${N} le dio me gusta al capítulo <strong>${escapeHtml(n.chapters?.title || '?')}</strong>`, iconName: 'heart', colorClass: 'notif-red' }; case 'new_user': return { texto: `Se registró un nuevo lector: <strong>${escapeHtml(fromName)}</strong>`, iconName: 'user-plus', colorClass: 'notif-green' }; case 'new_follower': return { texto: `${N} empezó a seguirte`, iconName: 'user-plus', colorClass: 'notif-green' }; default: return { texto: `Nueva notificación`, iconName: 'bell', colorClass: 'notif-gray' }; } }
async function marcarNotificacionLeida(id) { try { await db.from('notifications').update({ is_read: true }).eq('id', id); actualizarBadgeNotificaciones(); } catch (e) { console.warn(e); } }
async function eliminarNotificacion(id) { try { await db.from('notifications').delete().eq('id', id); toast('Notificación eliminada', 'ok'); await cargarNotificaciones(); actualizarBadgeNotificaciones(); } catch (e) { toast('Error: ' + e.message, 'error'); } }
async function actualizarBadgeNotificaciones() { try { const { count } = await db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_read', false); const badge = document.getElementById('notifBadge'); if (!badge) return; if (count && count > 0) { badge.textContent = count > 99 ? '99+' : String(count); badge.hidden = false; } else { badge.hidden = true; } } catch (e) { console.warn(e); } }
async function marcarTodasLeidas() { try { showLoading(); await db.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false); hideLoading(); toast('Todas marcadas como leídas', 'ok'); await cargarNotificaciones(); actualizarBadgeNotificaciones(); } catch (e) { hideLoading(); toast('Error: ' + e.message, 'error'); } }

// REPORTES
async function abrirReportesView() { showView('viewReportes'); await cargarReportes(); }
async function cargarReportes() { const list = document.getElementById('reportesList'); const countEl = document.getElementById('reportesCount'); if (!list) return; showLoading(); try { let query = db.from('relato_reports').select(`id, reason, status, created_at, user_id, relato_id, relatos(title, content, user_id)`).order('created_at', { ascending: false }); if (reportesCurrentFilter !== 'all') { query = query.eq('status', reportesCurrentFilter); } const { data, error } = await query; hideLoading(); if (error) { list.innerHTML = emptyState('alert-circle', 'Error', error.message); if (countEl) countEl.textContent = '—'; return; } if (!data?.length) { list.innerHTML = emptyState('flag', 'Sin reportes', 'No hay reportes en esta categoría.'); if (countEl) countEl.textContent = '0 reportes'; return; } const userIds = [...new Set(data.map(r => r.user_id))]; const { data: perfiles } = await db.from('profiles').select('id, username').in('id', userIds); const perfilesMap = Object.fromEntries((perfiles || []).map(p => [p.id, p])); if (countEl) { countEl.textContent = data.length === 1 ? '1 reporte' : `${data.length} reportes`; } list.innerHTML = data.map(r => { const autor = perfilesMap[r.user_id] || {}; const nombre = autor.username || 'Lector'; const relato = r.relatos || {}; const preview = (relato.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 140); const badgeClass = r.status === 'pending' ? 'pending' : r.status === 'resolved' ? 'resolved' : 'dismissed'; const badgeText = r.status === 'pending' ? 'Pendiente' : r.status === 'resolved' ? 'Resuelto' : 'Descartado'; return `<div class="admin-report-item" data-report-id="${r.id}"><div class="admin-report-head"><div class="admin-report-title"><a href="relato.html?id=${r.relato_id}" target="_blank">${escapeHtml(relato.title || 'Relato eliminado')}</a></div><span class="admin-report-badge ${badgeClass}">${badgeText}</span></div><div class="admin-report-meta"><span>Reportado por <strong>${escapeHtml(nombre)}</strong></span><span>·</span><span>${tiempoRelativo(r.created_at)}</span></div>${preview ? `<div class="admin-report-preview">${escapeHtml(preview)}…</div>` : ''}<div class="admin-report-reason"><strong>Motivo:</strong> ${escapeHtml(r.reason)}</div><div class="admin-report-actions">${r.status === 'pending' ? `<button class="btn btn-primary btn-sm" data-action="resolve" data-id="${r.id}">${ic('check', 14)} Marcar resuelto</button><button class="btn btn-ghost btn-sm" data-action="dismiss" data-id="${r.id}">${ic('x', 14)} Descartar</button>` : `<button class="btn btn-ghost btn-sm" data-action="reopen" data-id="${r.id}">${ic('rotate-ccw', 14)} Reabrir</button>`}<button class="btn btn-danger btn-sm" data-action="delete-relato" data-id="${r.id}" data-relato-id="${r.relato_id}">${ic('trash-2', 14)} Eliminar relato</button></div></div>`; }).join(''); if (window.lucide) lucide.createIcons(); list.querySelectorAll('[data-action]').forEach(btn => { btn.addEventListener('click', () => { const action = btn.dataset.action; const id = btn.dataset.id; if (action === 'resolve') actualizarEstadoReporte(id, 'resolved'); else if (action === 'dismiss') actualizarEstadoReporte(id, 'dismissed'); else if (action === 'reopen') actualizarEstadoReporte(id, 'pending'); else if (action === 'delete-relato') eliminarRelatoDesdeReporte(btn.dataset.relatoId, id); }); }); } catch (err) { console.error('Error reportes:', err); hideLoading(); list.innerHTML = emptyState('alert-circle', 'Error', err.message); } }
async function actualizarEstadoReporte(id, status) { showLoading(); const { error } = await db.from('relato_reports').update({ status }).eq('id', id); hideLoading(); if (error) { toast('Error: ' + error.message, 'error'); return; } toast('Reporte actualizado', 'ok'); await cargarReportes(); actualizarBadgeReportes(); }
async function eliminarRelatoDesdeReporte(relatoId, reporteId) { if (!confirm('¿Eliminar este relato? Se borrarán también sus comentarios y reacciones.')) return; showLoading(); const { error } = await db.from('relatos').delete().eq('id', relatoId); hideLoading(); if (error) { toast('Error: ' + error.message, 'error'); return; } await db.from('relato_reports').update({ status: 'resolved' }).eq('id', reporteId); toast('Relato eliminado y reporte resuelto', 'ok'); limpiarCachePublica(); await cargarReportes(); actualizarBadgeReportes(); }
async function actualizarBadgeReportes() { try { const { count } = await db.from('relato_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'); const badge = document.getElementById('reportesBadge'); if (!badge) return; if (count && count > 0) { badge.textContent = count > 99 ? '99+' : String(count); badge.hidden = false; } else { badge.hidden = true; } } catch (e) { console.warn(e); } }

async function abrirRelatosAdminView() { showView('viewRelatosAdmin'); await cargarRelatosAdmin(); }
async function cargarRelatosAdmin() { const list = document.getElementById('relatosAdminList'); const countEl = document.getElementById('relatosAdminCount'); if (!list) return; showLoading(); try { const { data, error } = await db.from('relatos').select('id, title, content, user_id, created_at').order('created_at', { ascending: false }).limit(100); hideLoading(); if (error) { list.innerHTML = emptyState('alert-circle', 'Error', error.message); return; } if (!data?.length) { list.innerHTML = emptyState('pen-line', 'Sin relatos', 'Aún no hay relatos publicados.'); if (countEl) countEl.textContent = '0 relatos'; return; } const userIds = [...new Set(data.map(r => r.user_id))]; const { data: perfiles } = await db.from('profiles').select('id, username').in('id', userIds); const perfilesMap = Object.fromEntries((perfiles || []).map(p => [p.id, p])); if (countEl) { countEl.textContent = data.length === 1 ? '1 relato' : `${data.length} relatos`; } list.innerHTML = data.map(r => { const autor = perfilesMap[r.user_id] || {}; const nombre = autor.username || 'Lector'; const preview = (r.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 160); return `<div class="admin-report-item"><div class="admin-report-head"><div class="admin-report-title"><a href="relato.html?id=${r.id}" target="_blank">${escapeHtml(r.title)}</a></div></div><div class="admin-report-meta"><span>Por <strong>@${escapeHtml(nombre)}</strong></span><span>·</span><span>${tiempoRelativo(r.created_at)}</span></div><div class="admin-report-preview">${escapeHtml(preview)}…</div><div class="admin-report-actions"><a class="btn btn-ghost btn-sm" href="relato.html?id=${r.id}" target="_blank">${ic('eye', 14)} Ver</a><button class="btn btn-ghost btn-sm" data-action="edit-relato-admin" data-id="${r.id}">${ic('edit-2', 14)} Editar</button><button class="btn btn-danger btn-sm" data-delete-relato-admin="${r.id}">${ic('trash-2', 14)} Eliminar</button></div></div>`; }).join(''); if (window.lucide) lucide.createIcons(); list.querySelectorAll('[data-action="edit-relato-admin"]').forEach(btn => { btn.addEventListener('click', () => abrirRelatoAdminForm(btn.dataset.id)); }); list.querySelectorAll('[data-delete-relato-admin]').forEach(btn => { btn.addEventListener('click', async () => { if (!confirm('¿Eliminar este relato? Se borrarán también sus comentarios y reacciones.')) return; showLoading(); const { error } = await db.from('relatos').delete().eq('id', btn.dataset.deleteRelatoAdmin); hideLoading(); if (error) { toast('Error: ' + error.message, 'error'); return; } toast('Relato eliminado', 'ok'); limpiarCachePublica(); await cargarRelatosAdmin(); }); }); } catch (err) { console.error('Error relatos admin:', err); hideLoading(); list.innerHTML = emptyState('alert-circle', 'Error', err.message); } }

async function abrirAjustesView() { showView('viewAjustes'); await cargarAjustes(); }
async function cargarAjustes() { showLoading(); const { data, error } = await db.from('site_settings').select('show_likes, show_views, show_relatos_btn, show_mis_relatos_menu').eq('id', 1).maybeSingle(); hideLoading(); if (error || !data) { toast('No se pudieron cargar los ajustes', 'error'); return; } document.getElementById('toggleShowLikes').checked = !!data.show_likes; document.getElementById('toggleShowViews').checked = !!data.show_views; document.getElementById('toggleShowRelatosBtn').checked = data.show_relatos_btn !== false; document.getElementById('toggleShowMisRelatosMenu').checked = data.show_mis_relatos_menu !== false; }
document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => { const show_likes = document.getElementById('toggleShowLikes').checked; const show_views = document.getElementById('toggleShowViews').checked; const show_relatos_btn = document.getElementById('toggleShowRelatosBtn').checked; const show_mis_relatos_menu = document.getElementById('toggleShowMisRelatosMenu').checked; showLoading(); const { error } = await db.from('site_settings').update({ show_likes, show_views, show_relatos_btn, show_mis_relatos_menu, updated_at: new Date().toISOString() }).eq('id', 1); hideLoading(); if (error) { toast('Error: ' + error.message, 'error'); return; } toast('Ajustes guardados', 'ok'); limpiarCachePublica(); });

async function abrirBioView() { showView('viewBio'); await cargarBioAdmin(); }
async function cargarBioAdmin() { showLoading(); const { data, error } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle(); hideLoading(); if (error || !data) { toast('No se pudo cargar el perfil', 'error'); return; } currentProfile = data; document.getElementById('bioUsername').value = data.username || ''; document.getElementById('bioText').value = data.bio || ''; document.getElementById('bioBirthdate').value = data.birthdate || ''; document.getElementById('bioGender').value = data.gender || ''; const preview = document.getElementById('bioAvatarPreview'); preview.innerHTML = data.avatar_url ? `<img src="${data.avatar_url}" alt="" />` : escapeHtml((data.username || 'A').charAt(0).toUpperCase()); }
document.getElementById('bioAvatarBtn')?.addEventListener('click', () => document.getElementById('bioAvatarInput').click());
document.getElementById('bioAvatarInput')?.addEventListener('change', async (e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { toast('La imagen supera 5 MB', 'error'); return; } showLoading(); try { const ext = file.name.split('.').pop(); const filename = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`; const { error: upErr } = await db.storage.from('media').upload(filename, file); if (upErr) throw upErr; const { data: pub } = db.storage.from('media').getPublicUrl(filename); const { error } = await db.from('profiles').update({ avatar_url: pub.publicUrl }).eq('id', session.user.id); if (error) throw error; document.getElementById('bioAvatarPreview').innerHTML = `<img src="${pub.publicUrl}" alt="" />`; toast('Foto actualizada', 'ok'); limpiarCachePublica(); } catch (err) { toast('Error: ' + err.message, 'error'); } hideLoading(); });
document.getElementById('bioSaveBtn')?.addEventListener('click', async () => { const username = document.getElementById('bioUsername').value.trim(); const bio = document.getElementById('bioText').value.trim(); const birthdate = document.getElementById('bioBirthdate').value || null; const gender = document.getElementById('bioGender').value || null; if (!username) { toast('Falta el nombre', 'error'); return; } showLoading(); const { error } = await db.from('profiles').update({ username, bio, birthdate, gender }).eq('id', session.user.id); hideLoading(); if (error) { toast('Error: ' + error.message, 'error'); return; } toast('Biografía guardada', 'ok'); limpiarCachePublica(); });

// ÁRBOLES
async function abrirArbolesEstante() { showView('viewArbolesEstante'); await cargarEstante(); }
async function cargarEstante() { const shelf = document.getElementById('treesShelf'); showLoading(); const { data: stories, error } = await db.from('stories').select('id, title, cover_url, genre, status, synopsis').order('created_at', { ascending: false }); hideLoading(); if (error || !stories?.length) { shelf.innerHTML = emptyState('book', 'Sin historias', 'Crea una historia para empezar.'); return; } const { data: nodes } = await db.from('character_nodes').select('story_id'); const countByStory = {}; (nodes || []).forEach(n => { countByStory[n.story_id] = (countByStory[n.story_id] || 0) + 1; }); shelf.innerHTML = stories.map(s => { const count = countByStory[s.id] || 0; return `<button class="tree-shelf-card" data-story-id="${s.id}"><div class="tree-shelf-cover">${s.cover_url ? `<img src="${s.cover_url}" alt="" loading="lazy" />` : `<span>${escapeHtml(s.title.charAt(0))}</span>`}</div><div class="tree-shelf-info"><div class="tree-shelf-title">${escapeHtml(s.title)}</div><div class="tree-shelf-meta">${s.genre ? `<span>${escapeHtml(s.genre)}</span>` : ''}<span>·</span><span>${count} ${count === 1 ? 'personaje' : 'personajes'}</span></div></div></button>`; }).join(''); document.querySelectorAll('.tree-shelf-card').forEach(card => card.addEventListener('click', () => abrirArbolLibro(card.dataset.storyId))); if (window.lucide) lucide.createIcons(); }
async function abrirArbolLibro(storyId) { showLoading(); const { data: story } = await db.from('stories').select('id, title, cover_url, genre, status, synopsis').eq('id', storyId).maybeSingle(); hideLoading(); if (!story) { toast('Historia no encontrada', 'error'); return; } currentTreeStory = story; const header = document.getElementById('arbolBookHeader'); header.innerHTML = `<div class="arbol-book-header"><div class="arbol-book-cover">${story.cover_url ? `<img src="${story.cover_url}" alt="" />` : `<span>${escapeHtml(story.title.charAt(0))}</span>`}</div><div class="arbol-book-info"><div class="story-badges">${story.genre ? `<span class="badge badge-genre">${escapeHtml(story.genre)}</span>` : ''}<span class="badge badge-status">${escapeHtml(story.status || 'En curso')}</span></div><h1 class="story-h1" style="margin-top:8px;">${escapeHtml(story.title)}</h1>${story.synopsis ? `<p class="story-synopsis-c" style="margin-top:8px;">${escapeHtml(story.synopsis)}</p>` : ''}</div></div>`; showView('viewArbol'); await cargarPersonajesAdmin(story.id); }
async function cargarPersonajesAdmin(storyId) { const list = document.getElementById('charactersAdminList'); showLoading(); const { data, error } = await db.from('character_nodes').select('*').eq('story_id', storyId).order('created_at', { ascending: true }); hideLoading(); if (error) { list.innerHTML = emptyState('alert-circle', 'Error', error.message); return; } if (!data?.length) { list.innerHTML = emptyState('users', 'Sin personajes', 'Añade el primer personaje de esta historia.'); return; } list.innerHTML = data.map(c => `<div class="character-admin-card"><div class="character-admin-avatar">${c.image_url ? `<img src="${c.image_url}" alt="" onerror="this.parentElement.innerHTML='<span>${escapeHtml(c.emoji || '👤')}</span>';" />` : `<span>${escapeHtml(c.emoji || '👤')}</span>`}</div><div class="character-admin-body"><div class="character-admin-name">${escapeHtml(c.name)} ${c.alias ? `<span class="character-admin-alias">"${escapeHtml(c.alias)}"</span>` : ''}</div><div class="character-admin-meta">${c.role ? `<span class="character-admin-role">${escapeHtml(c.role)}</span>` : ''}${c.age ? `<span>· ${escapeHtml(c.age)} años</span>` : ''}</div>${c.description ? `<div class="character-admin-desc">${escapeHtml(c.description)}</div>` : ''}</div><button class="admin-item-action" data-char-edit="${c.id}" title="Editar">${ic('edit-2', 16)}</button></div>`).join(''); document.querySelectorAll('[data-char-edit]').forEach(btn => btn.addEventListener('click', () => abrirCharacterForm(btn.dataset.charEdit))); if (window.lucide) lucide.createIcons(); }

// ASIGNACIÓN DE BOTONES
document.getElementById('btnNewStory')?.addEventListener('click', () => abrirStoryForm(null));
document.getElementById('btnNewPost')?.addEventListener('click', () => abrirPostForm(null));
document.getElementById('btnNewRelatoAdmin')?.addEventListener('click', () => abrirRelatoAdminForm(null));
document.getElementById('btnUsuarios')?.addEventListener('click', () => { showView('viewUsuarios'); cargarUsuarios(); });
document.getElementById('btnNotificaciones')?.addEventListener('click', () => abrirNotificacionesView());
document.getElementById('btnReportes')?.addEventListener('click', () => abrirReportesView());
document.getElementById('btnRelatosAdmin')?.addEventListener('click', () => abrirRelatosAdminView());
document.getElementById('btnRedes')?.addEventListener('click', () => abrirRedesView());
document.getElementById('btnBio')?.addEventListener('click', () => abrirBioView());
document.getElementById('btnDonaciones')?.addEventListener('click', () => abrirDonacionesView());
document.getElementById('btnStats')?.addEventListener('click', () => abrirStatsView());
document.getElementById('btnAjustes')?.addEventListener('click', () => abrirAjustesView());
document.getElementById('btnArboles')?.addEventListener('click', () => abrirArbolesEstante());

document.getElementById('backFromUsuarios')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromStory')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromChapter')?.addEventListener('click', () => { showView('viewStory'); cargarCapitulosAdmin(currentStory.id); });
document.getElementById('backFromPost')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromRelatoAdmin')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromRedes')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromBio')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromDonaciones')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromStats')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromStoryStats')?.addEventListener('click', () => { showView('viewStats'); });
document.getElementById('backFromNotificaciones')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromReportes')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromRelatosAdmin')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromAjustes')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromArboles')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromArbol')?.addEventListener('click', () => { showView('viewArbolesEstante'); cargarEstante(); });
document.getElementById('backFromCharacterForm')?.addEventListener('click', () => { showView('viewArbol'); if (currentTreeStory) cargarPersonajesAdmin(currentTreeStory.id); });
document.getElementById('btnMarkAllRead')?.addEventListener('click', () => marcarTodasLeidas());
document.querySelectorAll('.notif-filter').forEach(btn => { btn.addEventListener('click', () => { notifCurrentFilter = btn.dataset.filter; document.querySelectorAll('.notif-filter').forEach(b => b.classList.toggle('active', b === btn)); cargarNotificaciones(); }); });
document.querySelectorAll('.reportes-filter').forEach(btn => { btn.addEventListener('click', () => { reportesCurrentFilter = btn.dataset.filter; document.querySelectorAll('.reportes-filter').forEach(b => b.classList.toggle('active', b === btn)); cargarReportes(); }); });
document.getElementById('btnNewChapter')?.addEventListener('click', () => { if (!currentStory) return; db.from('chapters').select('chapter_order').eq('story_id', currentStory.id).order('chapter_order', { ascending: false }).limit(1).then(({ data }) => { const next = (data?.[0]?.chapter_order || 0) + 1; abrirChapterForm(null); setTimeout(() => { document.getElementById('chapterOrder').value = next; }, 100); }); });
document.getElementById('btnNewCharacter')?.addEventListener('click', () => abrirCharacterForm(null));

function escapeHtml(str) { return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function traducirError(msg) { const m = (msg || '').toLowerCase(); if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.'; return msg || 'Error inesperado'; }
function emptyState(iconName, title, sub) { return `<div class="empty-c"><div class="empty-icon">${ic(iconName, 48)}</div><div class="empty-title">${escapeHtml(title)}</div><div class="empty-sub">${escapeHtml(sub || '')}</div></div>`; }

(async () => {
  initTheme();
  const headerMount = document.getElementById('header-mount'); const pageMain = document.querySelector('.page-main');
  if (headerMount) headerMount.style.visibility = 'hidden'; if (pageMain) pageMain.style.visibility = 'hidden';
  inyectarHeader(); inyectarAuthModal();
  initEditor('editorToolbar', 'chapterEditor', 'edCounter'); initEditor('postToolbar', 'postEditor', 'postCounter');
  initCanvasListeners();

  const ok = await verificarAutor();
  if (ok) {
    if (headerMount) headerMount.style.visibility = 'visible'; if (pageMain) pageMain.style.visibility = 'visible';
    await cargarDashboard(); await actualizarBadgeNotificaciones(); await actualizarBadgeReportes();
  }
  const yearEl = document.getElementById('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (window.lucide) lucide.createIcons();
})();
