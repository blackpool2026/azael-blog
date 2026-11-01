/* ============================================
   AZAEL BLOG — admin.js COMPLETO Y CORREGIDO
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
let currentResena = null;
let currentTreeStory = null;
let currentCharacter = null;
let currentCharacterImageUrl = null;

let characterRoleDropdown = null;
let selectedRole = '';

let notifCurrentFilter = 'all';
let reportesCurrentFilter = 'pending';

const PREDEFINED_ROLES = [
  'Protagonista','Coprotagonista','Deuteragonista',
  'Antagonista','Villano','Rival','Traidor',
  'Padre','Madre','Hijo','Hija','Hermano','Hermana',
  'Abuelo','Abuela','Tío','Tía','Primo','Prima',
  'Sobrino','Sobrina','Cuñado','Cuñada','Suegro','Suegra',
  'Padrastro','Madrastra','Hijastro','Hijastra','Familia',
  'Pareja','Esposo','Esposa','Novio','Novia',
  'Prometido','Prometida','Ex-pareja','Amante','Interés amoroso',
  'Amigo','Amiga','Mejor amigo','Mejor amiga',
  'Conocido','Vecino','Compañero','Compañera','Colega',
  'Aliado','Cómplice',
  'Mentor','Mentora','Maestro','Maestra',
  'Alumno','Alumna','Aprendiz','Discípulo','Discípula',
  'Jefe','Jefa','Empleado','Empleada','Subordinado',
  'Socio','Socia','Benefactor','Benefactora',
  'Mascota','Guía','Narrador','Secundario','Extra','Desconocido'
];

const RANKS = [
  { value: 'owner', label: 'Dueño / Creador', icon: 'crown', color: '#e50914' },
  { value: 'moderator', label: 'Moderador', icon: 'shield', color: '#2196f3' },
  { value: 'collaborator', label: 'Colaborador', icon: 'user-check', color: '#4caf50' },
  { value: 'vip', label: 'VIP', icon: 'star', color: '#ffc107' },
  { value: 'verified', label: 'Verificado', icon: 'check-circle', color: '#e50914' },
  { value: 'none', label: 'Lector estándar (Sin rango)', icon: 'user', color: '#6a6a78' }
];

function esRolPersonalizado(role) {
  if (!role) return false;
  return !PREDEFINED_ROLES.includes(role);
}

function ic(name, size = 18) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px;"></i>`;
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
}
function initTheme() { applyTheme(localStorage.getItem(THEME_KEY) || 'dark'); }

function showLoading() {
  let el = document.getElementById('globalLoading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'globalLoading';
    el.className = 'global-loading';
    el.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(el);
  }
  el.hidden = false;
}
function hideLoading() {
  const el = document.getElementById('globalLoading');
  if (el) el.hidden = true;
}

function toast(msg, type = 'info') {
  const mount = document.getElementById('toast-mount');
  if (!mount) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  mount.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

function limpiarCachePublica() {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('azael-cache:')) keys.push(k);
    }
    keys.forEach(k => sessionStorage.removeItem(k));
  } catch {}
}

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function tiempoRelativo(fecha) {
  const d = new Date(fecha);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function calcularEdadAdmin(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  const cumple = new Date(fecha + 'T00:00:00');
  if (isNaN(cumple.getTime())) return null;
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
  return edad;
}

/* ---------- DROPDOWN PERSONALIZADO ---------- */
function crearDropdownPersonalizado(containerId, groups, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  let currentValue = opts.value || '';
  const placeholder = opts.placeholder || '— Selecciona —';
  const onChange = opts.onChange || (() => {});

  container.innerHTML = '';
  const dropdown = document.createElement('div');
  dropdown.className = 'custom-dropdown';

  dropdown.innerHTML = `
    <button type="button" class="custom-dropdown-trigger">
      <div class="custom-dropdown-trigger-content">
        <span class="custom-dropdown-trigger-emoji" hidden></span>
        <span class="custom-dropdown-trigger-text placeholder">${escapeHtml(placeholder)}</span>
      </div>
      <svg class="custom-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
    <div class="custom-dropdown-menu"></div>
  `;

  const trigger = dropdown.querySelector('.custom-dropdown-trigger');
  const triggerEmoji = dropdown.querySelector('.custom-dropdown-trigger-emoji');
  const triggerText = dropdown.querySelector('.custom-dropdown-trigger-text');
  const menu = dropdown.querySelector('.custom-dropdown-menu');

  groups.forEach(group => {
    if (group.label) {
      const groupEl = document.createElement('div');
      groupEl.className = 'custom-dropdown-group';
      groupEl.textContent = group.label;
      menu.appendChild(groupEl);
    }

    group.options.forEach(opt => {
      const optEl = document.createElement('div');
      optEl.className = 'custom-dropdown-option';
      if (opt.value === '__custom__') optEl.classList.add('custom-option');
      optEl.dataset.value = opt.value;

      optEl.innerHTML = `
        ${opt.emoji ? `<span class="custom-dropdown-option-emoji">${opt.emoji}</span>` : ''}
        <span class="custom-dropdown-option-label">${escapeHtml(opt.label)}</span>
      `;

      optEl.addEventListener('click', (e) => {
        e.stopPropagation();
        currentValue = opt.value;
        actualizar();
        dropdown.classList.remove('open');
        onChange(opt.value, opt);
      });

      menu.appendChild(optEl);
    });
  });

  function actualizar() {
    let selectedOpt = null;
    for (const group of groups) {
      const found = group.options.find(o => o.value === currentValue);
      if (found) { selectedOpt = found; break; }
    }

    if (selectedOpt) {
      triggerText.textContent = selectedOpt.label;
      triggerText.classList.remove('placeholder');
      if (selectedOpt.emoji) {
        triggerEmoji.textContent = selectedOpt.emoji;
        triggerEmoji.hidden = false;
      } else {
        triggerEmoji.hidden = true;
      }
    } else {
      triggerText.textContent = placeholder;
      triggerText.classList.add('placeholder');
      triggerEmoji.hidden = true;
    }

    menu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === currentValue);
    });
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.custom-dropdown.open').forEach(d => {
      if (d !== dropdown) d.classList.remove('open');
    });
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });

  container.appendChild(dropdown);
  actualizar();

  dropdown.setValue = (val) => {
    currentValue = val;
    actualizar();
  };
  dropdown.getValue = () => currentValue;

  return dropdown;
}

/* ---------- INPUT MODAL ---------- */
function abrirInputModal({ title, desc, label, placeholder, hint, iconName = 'link', type = 'text', value = '' }) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'custom-input-overlay';
    modal.innerHTML = `
      <div class="custom-input-modal">
        <div class="custom-input-icon">${ic(iconName, 26)}</div>
        <h3 class="custom-input-title">${escapeHtml(title)}</h3>
        ${desc ? `<p class="custom-input-desc">${escapeHtml(desc)}</p>` : ''}
        <div class="custom-input-field">
          <label for="customInputField">${escapeHtml(label)}</label>
          <input type="${type}" id="customInputField" placeholder="${escapeHtml(placeholder || '')}" value="${escapeHtml(value)}" autocomplete="off" />
          ${hint ? `<p class="custom-input-hint">${escapeHtml(hint)}</p>` : ''}
        </div>
        <div class="custom-input-actions">
          <button class="btn btn-ghost" id="customInputCancel">Cancelar</button>
          <button class="btn btn-primary" id="customInputOk">Aceptar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    const input = modal.querySelector('#customInputField');
    const okBtn = modal.querySelector('#customInputOk');
    const cancelBtn = modal.querySelector('#customInputCancel');

    setTimeout(() => input.focus(), 100);

    function close(val) {
      modal.remove();
      resolve(val);
    }

    okBtn.addEventListener('click', () => close(input.value.trim()));
    cancelBtn.addEventListener('click', () => close(null));
    modal.addEventListener('click', (e) => { if (e.target === modal) close(null); });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); close(input.value.trim()); }
      if (e.key === 'Escape') close(null);
    });
  });
}

function salirAlSitio() {
  const ref = document.referrer || '';
  if (ref && !ref.includes('admin.html')) {
    try { window.history.back(); return; } catch {}
  }
  location.href = 'index.html';
}

/* ---------- HEADER ---------- */
function inyectarHeader() {
  const mount = document.getElementById('header-mount');
  if (!mount) return;
  mount.innerHTML = `
    <header class="app-header">
      <div class="app-header-inner">
        <button class="admin-back-link" id="backBtn" title="Volver al sitio">
          ${ic('arrow-left', 16)} <span>Sitio</span>
        </button>
        <h1 class="header-title">Panel</h1>
        <div class="header-actions">
          <button class="icon-action" id="themeToggle" aria-label="Tema">${ic('moon', 18)}</button>
          <button class="icon-action" id="logoutBtn" aria-label="Cerrar sesión">${ic('log-out', 18)}</button>
        </div>
      </div>
    </header>
  `;
  document.getElementById('backBtn').addEventListener('click', salirAlSitio);
  document.getElementById('themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (!confirm('¿Cerrar sesión?')) return;
    await db.auth.signOut();
    location.replace('index.html');
  });
  if (window.lucide) lucide.createIcons();
}

/* ---------- MODAL AUTH ---------- */
function inyectarAuthModal() {
  const mount = document.getElementById('auth-mount');
  if (!mount) return;
  mount.innerHTML = `
    <div class="modal-overlay-c" id="authModal" hidden>
      <div class="modal-c">
        <h2 class="modal-title-c">Acceso al panel</h2>
        <p class="modal-sub-c">Inicia sesión con tu cuenta de autor.</p>
        <form id="loginForm" class="auth-form-c">
          <label>Correo <input type="email" id="loginEmail" required autocomplete="email" /></label>
          <label>Contraseña <input type="password" id="loginPassword" required autocomplete="current-password" /></label>
          <button type="submit" class="btn btn-primary btn-block">Entrar</button>
          <p class="auth-error-c" id="loginError" hidden></p>
        </form>
        <button class="btn btn-ghost btn-block" id="backToSiteBtn" style="margin-top:12px;">Volver al sitio</button>
      </div>
    </div>
  `;
  document.getElementById('backToSiteBtn').addEventListener('click', salirAlSitio);
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('loginError');
    err.hidden = true;
    showLoading();
    const { error } = await db.auth.signInWithPassword({
      email: document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value,
    });
    hideLoading();
    if (error) { err.textContent = traducirError(error.message); err.hidden = false; return; }
    toast('Sesión iniciada', 'ok');
    setTimeout(() => location.reload(), 400);
  });
}

function mostrarModalSinPermisos() {
  let modal = document.getElementById('deniedModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'deniedModal';
    modal.className = 'denied-overlay';
    modal.innerHTML = `
      <div class="denied-modal">
        <div class="denied-icon">${ic('shield-off', 36)}</div>
        <h2 class="denied-title">Acceso restringido</h2>
        <p class="denied-msg">Esta cuenta no tiene permisos de autor para acceder al panel de escritor.</p>
        <div class="denied-actions">
          <button class="btn btn-primary" id="deniedBack">${ic('home', 16)} Volver al sitio</button>
          <button class="btn btn-ghost" id="deniedLogout">${ic('log-out', 16)} Cerrar sesión</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('deniedBack').addEventListener('click', () => { location.href = 'index.html'; });
    document.getElementById('deniedLogout').addEventListener('click', async () => {
      await db.auth.signOut();
      location.href = 'index.html';
    });
    if (window.lucide) lucide.createIcons();
  }
  modal.hidden = false;
  if (window.lucide) lucide.createIcons();
}

function showView(id) {
  document.querySelectorAll('.admin-view').forEach(v => v.hidden = true);
  document.getElementById(id)?.removeAttribute('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (window.lucide) lucide.createIcons();
}

async function verificarAutor() {
  try {
    const { data: { session: s }, error: errSes } = await db.auth.getSession();
    if (errSes) throw errSes;
    session = s;

    if (!session) {
      document.getElementById('authModal').hidden = false;
      return false;
    }

    const { data: profile, error: errProf } = await db
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (errProf) throw errProf;
    currentProfile = profile;

    if (!profile?.is_author) {
      mostrarModalSinPermisos();
      return false;
    }

    return true;
  } catch (e) {
    console.error('[verificarAutor]', e);
    toast('Error al verificar sesión: ' + (e.message || 'desconocido'), 'error');
    return false;
  }
}

/* ---------- DASHBOARD ---------- */
async function cargarDashboard() {
  showLoading();
  const [storiesRes, chaptersRes, postsRes, relatosRes] = await Promise.all([
    db.from('stories').select('*').order('created_at', { ascending: false }),
    db.from('chapters').select('id', { count: 'exact', head: true }),
    db.from('blog_posts').select('id', { count: 'exact', head: true }),
    db.from('relatos').select('id', { count: 'exact', head: true }),
  ]);
  hideLoading();

  document.getElementById('statStories').textContent = storiesRes.data?.length ?? '0';
  document.getElementById('statChapters').textContent = chaptersRes.count ?? '0';
  document.getElementById('statPosts').textContent = postsRes.count ?? '0';
  const statRelatos = document.getElementById('statRelatos');
  if (statRelatos) statRelatos.textContent = relatosRes.count ?? '0';

  const storiesList = document.getElementById('adminStoriesList');
  if (!storiesRes.data?.length) {
    storiesList.innerHTML = emptyState('book', 'Sin historias', 'Crea tu primera historia.');
  } else {
    storiesList.innerHTML = storiesRes.data.map(s => `
      <div class="admin-item">
        <div class="admin-item-cover">
          ${s.cover_url ? `<img src="${s.cover_url}" alt="" />` : escapeHtml(s.title.charAt(0))}
        </div>
        <div class="admin-item-body">
          <div class="admin-item-title">${escapeHtml(s.title)}</div>
          <div class="admin-item-meta">
            ${s.is_featured ? '<span class="admin-badge admin-badge-accent">Destacada</span>' : ''}
            <span>${escapeHtml(s.status || 'En curso')}</span>
            ${s.is_published ? '<span class="admin-badge admin-badge-ok">Publicada</span>' : '<span class="admin-badge">Borrador</span>'}
          </div>
        </div>
        <button class="admin-item-action" data-action="edit-story" data-id="${s.id}">${ic('edit-2', 16)}</button>
      </div>
    `).join('');
  }

  const postsList = document.getElementById('adminPostsList');
  const postsRes2 = await db.from('blog_posts').select('*').order('created_at', { ascending: false });
  if (!postsRes2.data?.length) {
    postsList.innerHTML = emptyState('feather', 'Sin entradas', 'Escribe tu primera entrada.');
  } else {
    postsList.innerHTML = postsRes2.data.map(p => `
      <div class="admin-item">
        <div class="admin-item-body">
          <div class="admin-item-title">${escapeHtml(p.title)}</div>
          <div class="admin-item-meta">
            <span>${new Date(p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
            ${p.published ? '<span class="admin-badge admin-badge-ok">Publicada</span>' : '<span class="admin-badge">Borrador</span>'}
          </div>
        </div>
        <button class="admin-item-action" data-action="edit-post" data-id="${p.id}">${ic('edit-2', 16)}</button>
      </div>
    `).join('');
  }

  document.querySelectorAll('[data-action="edit-story"]').forEach(btn => {
    btn.addEventListener('click', () => abrirStoryForm(btn.dataset.id));
  });
  document.querySelectorAll('[data-action="edit-post"]').forEach(btn => {
    btn.addEventListener('click', () => abrirPostForm(btn.dataset.id));
  });
  cargarResenasAdminList();
  if (window.lucide) lucide.createIcons();
}

/* ============================================
   USUARIOS Y GESTIÓN DE INSIGNIAS / RANGOS
   ============================================ */

function renderAdminUserBadge(u) {
  const bType = u.badge_type || (u.is_author ? 'owner' : (u.is_verified ? 'verified' : 'none'));

  if (u.is_author || bType === 'owner') {
    return `
      <span class="badge-rank badge-owner verified-admin-badge" title="Dueño / Autor">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="metalPlatinumAdm" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="30%" stop-color="#d1d5db" />
              <stop offset="65%" stop-color="#f87171" />
              <stop offset="100%" stop-color="#6b7280" />
            </linearGradient>
          </defs>
          <path fill="url(#metalPlatinumAdm)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </span>
    `;
  }

  if (bType === 'moderator') {
    return `<span class="badge-rank badge-moderator" title="Moderador" style="display:inline-flex;width:16px;height:16px;margin-left:4px;vertical-align:middle;color:#2196f3;"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 14.5l-4-4 1.41-1.41L11 13.67l6.59-6.59L19 8.5l-8 8z"/></svg></span>`;
  }

  if (bType === 'collaborator') {
    return `<span class="badge-rank badge-collaborator" title="Colaborador" style="display:inline-flex;width:16px;height:16px;margin-left:4px;vertical-align:middle;color:#4caf50;"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg></span>`;
  }

  if (bType === 'vip') {
    return `<span class="badge-rank badge-vip" title="VIP" style="display:inline-flex;width:16px;height:16px;margin-left:4px;vertical-align:middle;color:#ffc107;"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>`;
  }

  if (bType === 'verified' || u.is_verified) {
    return `<span class="badge-rank badge-verified verified-user-badge" title="Verificado" style="display:inline-flex;width:16px;height:16px;margin-left:4px;vertical-align:middle;color:var(--accent-color);"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"/></svg></span>`;
  }

  return '';
}

async function cargarUsuarios() {
  const list = document.getElementById('adminUsersList');
  if (!list) return;
  showLoading();

  const { data, error } = await db
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  hideLoading();

  if (error) { list.innerHTML = emptyState('alert-circle', 'Error', error.message); return; }
  if (!data?.length) {
    list.innerHTML = emptyState('users', 'Sin usuarios', 'Aún no se ha registrado nadie.');
    return;
  }

  list.innerHTML = data.map(u => {
    const badgeVisual = renderAdminUserBadge(u);
    const edad = calcularEdadAdmin(u.birthdate);
    const datosExtra = [];
    if (edad !== null) datosExtra.push(`${edad} años`);
    if (u.gender) datosExtra.push(u.gender);

    const botonAccion = !u.is_author ? `
      <button class="btn btn-ghost btn-sm" data-action="manage-rank" data-id="${u.id}" style="padding:6px 12px;font-size:12px;display:flex;align-items:center;gap:6px;">
        ${ic('shield', 14)} Rango
      </button>
    ` : '<span style="font-size:12px;font-weight:700;color:var(--accent-color);">Autor</span>';

    return `
      <div class="admin-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
          <div class="admin-item-cover" style="width: 44px; height: 44px; border-radius: 50%; font-size: 16px; overflow: hidden; flex-shrink:0;">
            ${u.avatar_url
              ? `<img src="${u.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />`
              : escapeHtml((u.username || 'U').charAt(0).toUpperCase())}
          </div>
          <div class="admin-item-body">
            <div class="admin-item-title" style="display:flex; align-items:center; gap:4px;">
              @${escapeHtml(u.username || 'Sin @')}
              ${badgeVisual}
            </div>
            <div class="admin-item-meta">
              <span>Registrado: ${new Date(u.created_at).toLocaleDateString('es-ES')}</span>
              ${datosExtra.length ? `<span>· ${datosExtra.join(' · ')}</span>` : ''}
            </div>
          </div>
          ${botonAccion}
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('[data-action="manage-rank"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const user = data.find(item => item.id === btn.dataset.id);
      if (user) abrirModalAsignarRango(user);
    });
  });

  if (window.lucide) lucide.createIcons();
}

function abrirModalAsignarRango(user) {
  const currentBadge = user.badge_type || (user.is_verified ? 'verified' : 'none');
  const modal = document.createElement('div');
  modal.className = 'custom-input-overlay';
  modal.innerHTML = `
    <div class="custom-input-modal" style="max-width: 440px;">
      <h3 class="custom-input-title" style="margin-bottom:4px;">Asignar Rango</h3>
      <p class="custom-input-desc">Selecciona la insignia para <strong>@${escapeHtml(user.username || 'usuario')}</strong></p>
      
      <div style="display:flex; flex-direction:column; gap:8px; margin: 16px 0 24px;">
        ${RANKS.map(r => `
          <button type="button" class="rank-option ${currentBadge === r.value ? 'selected' : ''}" data-rank="${r.value}">
            <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.06);display:grid;place-items:center;color:${r.color};">
              ${ic(r.icon, 16)}
            </div>
            <span>${r.label}</span>
          </button>
        `).join('')}
      </div>

      <div class="custom-input-actions">
        <button class="btn btn-ghost" id="closeRankModal">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  if (window.lucide) lucide.createIcons();

  modal.querySelector('#closeRankModal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelectorAll('.rank-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const selectedRank = btn.dataset.rank;
      modal.remove();
      showLoading();
      try {
        const payload = {
          badge_type: selectedRank,
          is_verified: selectedRank === 'verified' || selectedRank === 'owner' || selectedRank === 'moderator'
        };
        const { error } = await db.from('profiles').update(payload).eq('id', user.id);
        if (error) throw error;
        toast('Rango actualizado correctamente', 'ok');
        await cargarUsuarios();
      } catch (err) {
        toast('Error al actualizar rango: ' + err.message, 'error');
      }
      hideLoading();
    });
  });
}

/* ============================================
   RESEÑAS ADMIN
   ============================================ */

async function abrirResenaAdminForm(id = null) {
  currentResena = null;
  const form = document.getElementById('resenaForm');
  if (!form) return;
  form.reset();
  document.getElementById('resenaAdminViewTitle').textContent = 'Nueva reseña';
  document.getElementById('resenaDeleteBtn').hidden = true;

  if (id) {
    showLoading();
    const { data } = await db.from('resenas').select('*').eq('id', id).maybeSingle();
    hideLoading();
    if (data) {
      currentResena = data;
      document.getElementById('resenaTitle').value = data.title || '';
      document.getElementById('resenaContent').value = data.content || '';
      document.getElementById('resenaLinks').value = data.links || '';
      document.getElementById('resenaAdminViewTitle').textContent = 'Editar reseña';
      document.getElementById('resenaDeleteBtn').hidden = false;
    }
  }
  showView('viewResenaAdmin');
  setTimeout(() => document.getElementById('resenaTitle')?.focus(), 100);
}

async function cargarResenasAdminList() {
  const list = document.getElementById('adminResenasList');
  if (!list) return;
  showLoading();
  const { data } = await db.from('resenas').select('id, title, created_at').order('created_at', { ascending: false });
  hideLoading();

  if (!data?.length) {
    list.innerHTML = emptyState('book-marked', 'Sin reseñas', 'Escribe tu primera reseña.');
    if (window.lucide) lucide.createIcons();
    return;
  }

  list.innerHTML = data.map(r => `
    <div class="admin-item">
      <div class="admin-item-body">
        <div class="admin-item-title">${escapeHtml(r.title)}</div>
        <div class="admin-item-meta">
          <span>${new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
      <button class="admin-item-action" data-action="edit-resena" data-id="${r.id}">${ic('edit-2', 16)}</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-action="edit-resena"]').forEach(btn => {
    btn.addEventListener('click', () => abrirResenaAdminForm(btn.dataset.id));
  });
  if (window.lucide) lucide.createIcons();
}

document.getElementById('resenaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById('resenaTitle').value.trim(),
    content: document.getElementById('resenaContent').value.trim(),
    links: document.getElementById('resenaLinks').value.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (!payload.title || !payload.content) { toast('Título y contenido son obligatorios', 'error'); return; }

  showLoading();
  let error;
  if (currentResena) {
    ({ error } = await db.from('resenas').update(payload).eq('id', currentResena.id));
  } else {
    ({ error } = await db.from('resenas').insert(payload));
  }
  hideLoading();

  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast(currentResena ? 'Reseña actualizada' : 'Reseña publicada', 'ok');
  limpiarCachePublica();
  setTimeout(() => { showView('viewDashboard'); cargarDashboard(); }, 400);
});

document.getElementById('resenaDeleteBtn')?.addEventListener('click', async () => {
  if (!currentResena) return;
  if (!confirm(`¿Eliminar la reseña "${currentResena.title}"?`)) return;
  showLoading();
  const { error } = await db.from('resenas').delete().eq('id', currentResena.id);
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Reseña eliminada', 'ok');
  limpiarCachePublica();
  showView('viewDashboard');
  cargarDashboard();
});

/* ============================================
   HISTORIAS ADMIN
   ============================================ */

async function abrirStoryForm(id = null) {
  currentStory = null;
  document.getElementById('storyForm').reset();
  document.getElementById('storyCoverBook').innerHTML = '<span id="storyCoverPlaceholder">A</span>';
  document.getElementById('storyCoverBook').dataset.coverUrl = '';
  document.getElementById('chaptersSection').hidden = true;
  document.getElementById('storyDeleteBtn').hidden = true;
  document.getElementById('storyViewTitle').textContent = 'Nueva historia';

  document.getElementById('releaseDateField').style.display = 'none';
  document.getElementById('storyReleaseDate').value = '';
  document.getElementById('storyTags').value = '';
  document.getElementById('storyAgeRating').value = 'Todo público';

  if (id) {
    showLoading();
    const { data } = await db.from('stories').select('*').eq('id', id).maybeSingle();
    hideLoading();
    if (data) {
      currentStory = data;
      document.getElementById('storyTitle').value = data.title || '';
      document.getElementById('storySynopsis').value = data.synopsis || '';
      document.getElementById('storyGenre').value = data.genre || '';
      document.getElementById('storyStatus').value = data.status || 'En emisión';
      document.getElementById('storyDedication').value = data.dedication || '';
      document.getElementById('storyFeatured').checked = !!data.is_featured;
      document.getElementById('storyPublished').checked = data.is_published !== false;
      document.getElementById('storyTags').value = data.tags || '';
      document.getElementById('storyAgeRating').value = data.age_rating || 'Todo público';

      if (data.status === 'Próximamente') {
        document.getElementById('releaseDateField').style.display = 'flex';
        document.getElementById('storyReleaseDate').value = data.release_date || '';
      }

      if (data.cover_url) {
        document.getElementById('storyCoverBook').innerHTML = `<img src="${data.cover_url}" alt="" />`;
        document.getElementById('storyCoverBook').dataset.coverUrl = data.cover_url;
      }
      document.getElementById('storyViewTitle').textContent = 'Editar historia';
      document.getElementById('storyDeleteBtn').hidden = false;
      document.getElementById('chaptersSection').hidden = false;
      cargarCapitulosAdmin(data.id);
    }
  }
  showView('viewStory');
}

document.getElementById('storyStatus').addEventListener('change', (e) => {
  const field = document.getElementById('releaseDateField');
  field.style.display = (e.target.value === 'Próximamente') ? 'flex' : 'none';
});

document.getElementById('storyCoverBtn').addEventListener('click', () => {
  document.getElementById('storyCoverInput').click();
});

document.getElementById('storyCoverInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('La imagen supera 5 MB', 'error'); return; }
  showLoading();
  try {
    const ext = file.name.split('.').pop();
    const filename = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await db.storage.from('media').upload(filename, file);
    if (upErr) throw upErr;
    const { data: pub } = db.storage.from('media').getPublicUrl(filename);
    document.getElementById('storyCoverBook').innerHTML = `<img src="${pub.publicUrl}" alt="" />`;
    document.getElementById('storyCoverBook').dataset.coverUrl = pub.publicUrl;
    toast('Portada subida', 'ok');
  } catch (err) { toast('Error al subir: ' + err.message, 'error'); }
  hideLoading();
});

document.getElementById('storyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    user_id: session.user.id,
    title: document.getElementById('storyTitle').value.trim(),
    synopsis: document.getElementById('storySynopsis').value.trim(),
    genre: document.getElementById('storyGenre').value,
    status: document.getElementById('storyStatus').value,
    release_date: document.getElementById('storyStatus').value === 'Próximamente' ? document.getElementById('storyReleaseDate').value : null,
    dedication: document.getElementById('storyDedication').value.trim(),
    is_featured: document.getElementById('storyFeatured').checked,
    is_published: document.getElementById('storyPublished').checked,
    cover_url: document.getElementById('storyCoverBook').dataset.coverUrl || currentStory?.cover_url || null,
    tags: document.getElementById('storyTags').value.trim(),
    age_rating: document.getElementById('storyAgeRating').value,
  };

  if (payload.is_featured) {
    await db.from('stories').update({ is_featured: false }).neq('id', currentStory?.id || '00000000-0000-0000-0000-000000000000');
  }

  showLoading();
  let error, data;
  if (currentStory) {
    ({ error, data } = await db.from('stories').update(payload).eq('id', currentStory.id).select().maybeSingle());
  } else {
    ({ error, data } = await db.from('stories').insert(payload).select().maybeSingle());
  }
  hideLoading();

  if (error) { toast('Error: ' + error.message, 'error'); return; }
  currentStory = data;
  toast('Historia guardada', 'ok');
  limpiarCachePublica();
  document.getElementById('storyViewTitle').textContent = 'Editar historia';
  document.getElementById('storyDeleteBtn').hidden = false;
  document.getElementById('chaptersSection').hidden = false;
  cargarCapitulosAdmin(data.id);
  cargarDashboard();
});

document.getElementById('storyDeleteBtn').addEventListener('click', async () => {
  if (!currentStory) return;
  if (!confirm(`¿Eliminar "${currentStory.title}"?`)) return;
  showLoading();
  const { error } = await db.from('stories').delete().eq('id', currentStory.id);
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Historia eliminada', 'ok');
  limpiarCachePublica();
  showView('viewDashboard');
  cargarDashboard();
});

/* ============================================
   CAPÍTULOS ADMIN
   ============================================ */

async function cargarCapitulosAdmin(storyId) {
  const list = document.getElementById('chaptersList');
  const { data } = await db.from('chapters')
    .select('id, title, chapter_order, is_premium, created_at, publish_at')
    .eq('story_id', storyId).order('chapter_order', { ascending: true });

  if (!data?.length) {
    list.innerHTML = emptyState('book-open', 'Sin capítulos', 'Añade tu primer capítulo.');
    return;
  }

  list.innerHTML = data.map((c, i) => {
    const isScheduled = c.publish_at && new Date(c.publish_at) > new Date();
    return `
    <div class="admin-chapter-row">
      <div class="admin-chapter-num">${String(c.chapter_order || i + 1).padStart(2, '0')}</div>
      <div class="admin-chapter-body">
        <div class="admin-chapter-title">${escapeHtml(c.title)}</div>
        <div class="admin-chapter-meta">
          ${c.is_premium ? '<span class="admin-badge admin-badge-accent">Premium</span>' : ''}
          ${isScheduled ? `<span class="admin-badge" style="background:rgba(255,152,0,0.15); color:#ff9800;">Programado: ${new Date(c.publish_at).toLocaleString('es-ES')}</span>` : ''}
        </div>
      </div>
      <div class="admin-chapter-actions">
        <button class="admin-item-action" data-action="up" data-id="${c.id}">${ic('arrow-up', 14)}</button>
        <button class="admin-item-action" data-action="down" data-id="${c.id}">${ic('arrow-down', 14)}</button>
        <button class="admin-item-action" data-action="edit-chapter" data-id="${c.id}">${ic('edit-2', 16)}</button>
      </div>
    </div>
  `}).join('');

  document.querySelectorAll('[data-action="edit-chapter"]').forEach(btn => {
    btn.addEventListener('click', () => abrirChapterForm(btn.dataset.id));
  });
  document.querySelectorAll('[data-action="up"], [data-action="down"]').forEach(btn => {
    btn.addEventListener('click', () => moverCapitulo(btn.dataset.id, btn.dataset.action, data));
  });
  if (window.lucide) lucide.createIcons();
}

async function moverCapitulo(id, direction, chapters) {
  const idx = chapters.findIndex(c => c.id === id);
  if (idx === -1) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= chapters.length) return;
  const a = chapters[idx], b = chapters[swapIdx];
  const orderA = a.chapter_order || idx + 1;
  const orderB = b.chapter_order || swapIdx + 1;
  await db.from('chapters').update({ chapter_order: orderB }).eq('id', a.id);
  await db.from('chapters').update({ chapter_order: orderA }).eq('id', b.id);
  cargarCapitulosAdmin(currentStory.id);
}

function abrirChapterForm(id = null) {
  currentChapter = null;
  document.getElementById('chapterForm').reset();
  document.getElementById('chapterEditor').innerHTML = '';
  document.getElementById('chapterDeleteBtn').hidden = true;
  document.getElementById('chapterViewTitle').textContent = 'Nuevo capítulo';
  document.getElementById('chapterOrder').value = 1;
  document.getElementById('chapterPublishAt').value = '';
  actualizarContador('chapterEditor', 'edCounter');

  if (id) {
    showLoading();
    db.from('chapters').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      hideLoading();
      if (!data) return;
      currentChapter = data;
      document.getElementById('chapterTitle').value = data.title || '';
      document.getElementById('chapterEditor').innerHTML = data.content || '';
      document.getElementById('chapterNote').value = data.author_note || '';
      document.getElementById('chapterOrder').value = data.chapter_order || 1;
      document.getElementById('chapterPremium').checked = !!data.is_premium;

      if (data.publish_at) {
        const d = new Date(data.publish_at);
        const localTime = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('chapterPublishAt').value = localTime;
      } else {
        document.getElementById('chapterPublishAt').value = '';
      }

      document.getElementById('chapterViewTitle').textContent = 'Editar capítulo';
      document.getElementById('chapterDeleteBtn').hidden = false;
      actualizarContador('chapterEditor', 'edCounter');
    });
  }
  showView('viewChapter');
  setTimeout(() => document.getElementById('chapterTitle')?.focus(), 100);
}

document.getElementById('chapterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = document.getElementById('chapterEditor').innerHTML;
  const payload = {
    story_id: currentStory.id,
    title: document.getElementById('chapterTitle').value.trim(),
    content,
    author_note: document.getElementById('chapterNote').value.trim(),
    chapter_order: parseInt(document.getElementById('chapterOrder').value, 10) || 1,
    is_premium: document.getElementById('chapterPremium').checked,
    publish_at: document.getElementById('chapterPublishAt').value ? new Date(document.getElementById('chapterPublishAt').value).toISOString() : null,
  };

  showLoading();
  let error;
  if (currentChapter) {
    ({ error } = await db.from('chapters').update(payload).eq('id', currentChapter.id));
  } else {
    ({ error } = await db.from('chapters').insert(payload));
  }
  hideLoading();

  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Capítulo guardado', 'ok');
  limpiarCachePublica();
  localStorage.removeItem(DRAFT_KEY + ':chapter:' + (currentChapter?.id || 'new'));
  setTimeout(() => { showView('viewStory'); cargarCapitulosAdmin(currentStory.id); }, 400);
});

document.getElementById('chapterDeleteBtn').addEventListener('click', async () => {
  if (!currentChapter) return;
  if (!confirm('¿Eliminar este capítulo?')) return;
  showLoading();
  const { error } = await db.from('chapters').delete().eq('id', currentChapter.id);
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Capítulo eliminado', 'ok');
  limpiarCachePublica();
  showView('viewStory');
  cargarCapitulosAdmin(currentStory.id);
});

/* ============================================
   EDITOR DE TEXTO
   ============================================ */

function initEditor(toolbarId, editorId, counterId) {
  const toolbar = document.getElementById(toolbarId);
  const editor = document.getElementById(editorId);
  if (!toolbar || !editor) return;

  toolbar.querySelectorAll('.ed-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      editor.focus();
      try {
        switch (cmd) {
          case 'bold': document.execCommand('bold'); break;
          case 'italic': document.execCommand('italic'); break;
          case 'h2': document.execCommand('formatBlock', false, 'H2'); break;
          case 'h3': document.execCommand('formatBlock', false, 'H3'); break;
          case 'quote': document.execCommand('formatBlock', false, 'BLOCKQUOTE'); break;
          case 'hr': document.execCommand('insertHTML', false, '<p style="text-align:center;margin:2em 0;">* * *</p>'); break;
          case 'image': insertarImagen(editor); break;
          case 'fullscreen': toggleFullscreen(); break;
        }
      } catch (err) { console.warn('cmd err', err); }
      if (counterId) actualizarContador(editorId, counterId);
    });
  });

  const actualizarContadorDebounced = debounce(() => {
    if (counterId) actualizarContador(editorId, counterId);
  }, 100);

  editor.addEventListener('input', () => {
    actualizarContadorDebounced();
    guardarBorrador(editorId);
  });

  editor.addEventListener('keyup', () => actualizarContadorDebounced());

  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      const clean = limpiarHtmlPegado(html);
      document.execCommand('insertHTML', false, clean);
    } else {
      const safe = escapeHtml(text)
        .replace(/\r\n/g, '\n')
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, `<p>${safe}</p>`);
    }

    setTimeout(() => actualizarContadorDebounced(), 50);
    guardarBorrador(editorId);
  });

  setInterval(() => guardarBorrador(editorId), 30000);
}

function limpiarHtmlPegado(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  const ALLOWED = new Set([
    'P', 'BR', 'HR',
    'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'MARK',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'BLOCKQUOTE', 'PRE', 'CODE', 'UL', 'OL', 'LI', 'A', 'IMG'
  ]);

  const REMOVE_WITH_CONTENT = new Set([
    'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM',
    'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'VIDEO', 'AUDIO',
    'CANVAS', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT'
  ]);

  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const tag = node.tagName;
    if (REMOVE_WITH_CONTENT.has(tag)) return null;

    if (!ALLOWED.has(tag)) {
      const fragment = document.createDocumentFragment();
      Array.from(node.childNodes).forEach(child => {
        const cleaned = clean(child);
        if (cleaned) fragment.appendChild(cleaned);
      });
      return fragment;
    }

    const newNode = document.createElement(tag);
    if (tag === 'A' && node.hasAttribute('href')) {
      const href = node.getAttribute('href');
      if (!/^\s*javascript:/i.test(href)) newNode.setAttribute('href', href);
    }
    if (tag === 'IMG' && node.hasAttribute('src')) {
      newNode.setAttribute('src', node.getAttribute('src'));
    }

    Array.from(node.childNodes).forEach(child => {
      const cleaned = clean(child);
      if (cleaned) newNode.appendChild(cleaned);
    });

    return newNode;
  }

  const result = document.createDocumentFragment();
  Array.from(body.childNodes).forEach(child => {
    const cleaned = clean(child);
    if (cleaned) result.appendChild(cleaned);
  });

  const temp = document.createElement('div');
  temp.appendChild(result);
  return temp.innerHTML;
}

async function insertarImagen(editor) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('La imagen supera 5 MB', 'error'); return; }
    showLoading();
    try {
      const ext = file.name.split('.').pop();
      const filename = `inline/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await db.storage.from('media').upload(filename, file);
      if (error) throw error;
      const { data: pub } = db.storage.from('media').getPublicUrl(filename);
      document.execCommand('insertImage', false, pub.publicUrl);
      toast('Imagen insertada', 'ok');
    } catch (err) { toast('Error al subir: ' + err.message, 'error'); }
    hideLoading();
  };
  input.click();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}

function contarPalabras(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function actualizarContador(editorId, counterId) {
  const el = document.getElementById(editorId);
  const counter = document.getElementById(counterId);
  if (!el || !counter) return;
  const words = contarPalabras(el.innerHTML);
  counter.textContent = words === 1 ? '1 palabra' : `${words} palabras`;
}

function guardarBorrador(editorId) {
  const el = document.getElementById(editorId);
  if (!el) return;
  const key = DRAFT_KEY + ':chapter:' + (currentChapter?.id || 'new');
  try {
    localStorage.setItem(key, JSON.stringify({
      title: document.getElementById('chapterTitle')?.value || '',
      content: el.innerHTML,
      savedAt: Date.now(),
    }));
  } catch {}
}

/* ============================================
   RELATOS DE LA COMUNIDAD ADMIN
   ============================================ */

async function abrirRelatoAdminForm(id = null) {
  currentRelatoAdmin = null;
  document.getElementById('relatoAdminForm').reset();
  document.getElementById('relatoAdminDeleteBtn').hidden = true;
  document.getElementById('relatoAdminViewTitle').textContent = 'Nuevo relato';
  document.getElementById('relatoAdminCharCount').textContent = '0 / 20000';

  if (id) {
    showLoading();
    const { data } = await db.from('relatos').select('*').eq('id', id).maybeSingle();
    hideLoading();
    if (data) {
      currentRelatoAdmin = data;
      document.getElementById('relatoAdminTitle').value = data.title || '';
      document.getElementById('relatoAdminContent').value = data.content || '';
      document.getElementById('relatoAdminDeleteBtn').hidden = false;
      document.getElementById('relatoAdminViewTitle').textContent = 'Editar relato';
      document.getElementById('relatoAdminCharCount').textContent = `${(data.content || '').length} / 20000`;
    }
  }
  showView('viewRelatoAdmin');
  setTimeout(() => document.getElementById('relatoAdminTitle')?.focus(), 100);
}

document.getElementById('relatoAdminContent')?.addEventListener('input', (e) => {
  const counter = document.getElementById('relatoAdminCharCount');
  if (counter) counter.textContent = `${e.target.value.length} / 20000`;
});

document.getElementById('relatoAdminForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('relatoAdminTitle').value.trim();
  const content = document.getElementById('relatoAdminContent').value.trim();
  if (!title || title.length < 3) { toast('El título es demasiado corto', 'error'); return; }
  if (content.length < 100) { toast('Mínimo 100 caracteres', 'error'); return; }

  const payload = { user_id: session.user.id, title, content, updated_at: new Date().toISOString() };
  showLoading();
  let error;
  if (currentRelatoAdmin) {
    ({ error } = await db.from('relatos').update(payload).eq('id', currentRelatoAdmin.id));
  } else {
    ({ error } = await db.from('relatos').insert(payload));
  }
  hideLoading();

  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast(currentRelatoAdmin ? 'Relato actualizado' : 'Relato publicado', 'ok');
  limpiarCachePublica();
  setTimeout(() => { showView('viewDashboard'); cargarDashboard(); }, 400);
});

document.getElementById('relatoAdminDeleteBtn')?.addEventListener('click', async () => {
  if (!currentRelatoAdmin) return;
  if (!confirm(`¿Eliminar "${currentRelatoAdmin.title}"?`)) return;
  showLoading();
  const { error } = await db.from('relatos').delete().eq('id', currentRelatoAdmin.id);
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Relato eliminado', 'ok');
  limpiarCachePublica();
  showView('viewDashboard');
  cargarDashboard();
});

/* ============================================
   POSTS / BLOG ADMIN
   ============================================ */

async function abrirPostForm(id = null) {
  currentPost = null;
  document.getElementById('postForm').reset();
  document.getElementById('postEditor').innerHTML = '';
  document.getElementById('postDeleteBtn').hidden = true;
  document.getElementById('postViewTitle').textContent = 'Nueva entrada';
  actualizarContador('postEditor', 'postCounter');

  if (id) {
    showLoading();
    const { data } = await db.from('blog_posts').select('*').eq('id', id).maybeSingle();
    hideLoading();
    if (data) {
      currentPost = data;
      document.getElementById('postTitle').value = data.title || '';
      document.getElementById('postEditor').innerHTML = data.content || '';
      document.getElementById('postPublished').checked = data.published !== false;
      document.getElementById('postViewTitle').textContent = 'Editar entrada';
      document.getElementById('postDeleteBtn').hidden = false;
      actualizarContador('postEditor', 'postCounter');
    }
  }
  showView('viewPost');
}

document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postEditor').innerHTML;
  if (!title) { toast('Falta el título', 'error'); return; }
  const payload = {
    user_id: session.user.id,
    title, content,
    published: document.getElementById('postPublished').checked,
  };

  showLoading();
  let error;
  if (currentPost) {
    ({ error } = await db.from('blog_posts').update(payload).eq('id', currentPost.id));
  } else {
    ({ error } = await db.from('blog_posts').insert(payload));
  }
  hideLoading();

  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast(currentPost ? 'Entrada actualizada' : 'Entrada publicada', 'ok');
  limpiarCachePublica();
  setTimeout(() => { showView('viewDashboard'); cargarDashboard(); }, 400);
});

document.getElementById('postDeleteBtn').addEventListener('click', async () => {
  if (!currentPost) return;
  if (!confirm('¿Eliminar esta entrada?')) return;
  showLoading();
  const { error } = await db.from('blog_posts').delete().eq('id', currentPost.id);
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Entrada eliminada', 'ok');
  limpiarCachePublica();
  showView('viewDashboard');
  cargarDashboard();
});

/* ============================================
   REDES SOCIALES ADMIN
   ============================================ */

const NET_ICONS = {
  instagram: 'instagram', twitter: 'twitter', tiktok: 'music', youtube: 'youtube',
  facebook: 'facebook', whatsapp: 'message-circle', telegram: 'send', discord: 'message-square',
};

async function abrirRedesView() {
  showView('viewRedes');
  await cargarRedesAdmin();
}

async function cargarRedesAdmin() {
  const list = document.getElementById('redesList');
  showLoading();
  const { data, error } = await db.from('social_links').select('*').order('display_order', { ascending: true });
  hideLoading();

  if (error) { list.innerHTML = emptyState('alert-circle', 'Error', error.message); return; }
  if (!data?.length) {
    list.innerHTML = emptyState('share-2', 'Sin redes', 'Añade tus redes desde abajo.');
    return;
  }

  list.innerHTML = data.map(s => `
    <div class="admin-net-item">
      <div class="admin-net-item-icon">${ic(NET_ICONS[s.platform] || 'link', 20)}</div>
      <div class="admin-net-item-body">
        <div class="admin-net-item-platform">${escapeHtml(s.platform)}</div>
        <div class="admin-net-item-url">${escapeHtml(s.url)}</div>
      </div>
      <button class="admin-item-action" data-net-del="${s.id}" title="Eliminar">${ic('trash-2', 16)}</button>
    </div>
  `).join('');

  document.querySelectorAll('[data-net-del]').forEach(btn => {
    btn.addEventListener('click', () => eliminarRed(btn.dataset.netDel));
  });
  if (window.lucide) lucide.createIcons();
}

async function eliminarRed(id) {
  if (!confirm('¿Eliminar esta red social?')) return;
  showLoading();
  await db.from('social_links').delete().eq('id', id);
  hideLoading();
  toast('Red eliminada', 'ok');
  limpiarCachePublica();
  cargarRedesAdmin();
}

document.querySelectorAll('#redesAddPanel .admin-net-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const platform = btn.dataset.platform;
    const url = await abrirInputModal({
      title: `Añadir ${platform}`,
      label: 'Enlace del perfil',
      placeholder: `https://${platform}.com/tuusuario`,
      hint: 'Debe empezar con https://'
    });
    if (!url || !/^https?:\/\//.test(url)) return;

    showLoading();
    const { data: maxRow } = await db.from('social_links').select('display_order').eq('user_id', session.user.id).order('display_order', { ascending: false }).limit(1).maybeSingle();
    const nextOrder = (maxRow?.display_order || 0) + 1;
    await db.from('social_links').insert({ user_id: session.user.id, platform, url, display_order: nextOrder });
    hideLoading();
    toast('Red añadida', 'ok');
    limpiarCachePublica();
    cargarRedesAdmin();
  });
});

/* ============================================
   DONACIONES ADMIN
   ============================================ */

const DONATION_ICONS = { paypal: 'wallet', binance: 'bitcoin' };

async function abrirDonacionesView() {
  showView('viewDonaciones');
  await cargarDonacionesAdmin();
}

async function cargarDonacionesAdmin() {
  const list = document.getElementById('donationsListAdmin');
  showLoading();
  const { data, error } = await db.from('donations').select('*').order('display_order', { ascending: true });
  hideLoading();

  if (error) { list.innerHTML = emptyState('alert-circle', 'Error', error.message); return; }
  if (!data?.length) {
    list.innerHTML = emptyState('heart-handshake', 'Sin métodos', 'Añade uno desde abajo.');
    return;
  }

  list.innerHTML = data.map(d => `
    <div class="admin-net-item">
      <div class="admin-net-item-icon">${ic(DONATION_ICONS[d.platform] || 'link', 20)}</div>
      <div class="admin-net-item-body">
        <div class="admin-net-item-platform">${escapeHtml(d.label || d.platform)}</div>
        <div class="admin-net-item-url">${escapeHtml(d.platform === 'binance' ? 'ID: ' + d.url : d.url)}</div>
      </div>
      <button class="admin-item-action" data-don-del="${d.id}" title="Eliminar">${ic('trash-2', 16)}</button>
    </div>
  `).join('');

  document.querySelectorAll('[data-don-del]').forEach(btn => {
    btn.addEventListener('click', () => eliminarDonacion(btn.dataset.donDel));
  });
  if (window.lucide) lucide.createIcons();
}

async function eliminarDonacion(id) {
  if (!confirm('¿Eliminar este método de donación?')) return;
  showLoading();
  await db.from('donations').delete().eq('id', id);
  hideLoading();
  toast('Método eliminado', 'ok');
  limpiarCachePublica();
  cargarDonacionesAdmin();
}

document.querySelectorAll('#donationsAddPanel .admin-net-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const platform = btn.dataset.platform;
    const isBinance = platform === 'binance';
    const label = await abrirInputModal({
      title: `Añadir ${isBinance ? 'Binance' : 'PayPal'}`,
      label: 'Nombre visible',
      value: isBinance ? 'Binance' : 'PayPal'
    });
    if (!label) return;

    const url = await abrirInputModal({
      title: `Datos de ${isBinance ? 'Binance' : 'PayPal'}`,
      label: isBinance ? 'ID de Binance' : 'Enlace de PayPal',
      placeholder: isBinance ? '12345678' : 'https://paypal.me/tuusuario'
    });
    if (!url) return;

    showLoading();
    const { data: maxRow } = await db.from('donations').select('display_order').eq('user_id', session.user.id).order('display_order', { ascending: false }).limit(1).maybeSingle();
    const nextOrder = (maxRow?.display_order || 0) + 1;
    await db.from('donations').insert({ user_id: session.user.id, platform, url: url.trim(), label, display_order: nextOrder });
    hideLoading();
    toast('Método añadido', 'ok');
    limpiarCachePublica();
    cargarDonacionesAdmin();
  });
});

/* ============================================
   ESTADÍSTICAS
   ============================================ */

async function abrirStatsView() {
  showView('viewStats');
  await cargarEstadisticas();
}

async function cargarEstadisticas() {
  const list = document.getElementById('statsList');
  showLoading();

  try {
    const { data: stories } = await db.from('stories').select('id, title, cover_url, genre, status').order('created_at', { ascending: false });
    if (!stories?.length) {
      hideLoading();
      list.innerHTML = emptyState('book', 'Sin historias', 'Publica una historia para ver estadísticas.');
      return;
    }

    const { data: views } = await db.from('story_views').select('story_id');
    const { data: likes } = await db.from('likes').select('story_id').is('chapter_id', null);
    const { data: commentsRaw } = await db.from('comments').select('chapter_id').not('chapter_id', 'is', null);
    const { data: chapters } = await db.from('chapters').select('id, story_id');

    const chapterToStory = {};
    (chapters || []).forEach(c => { chapterToStory[c.id] = c.story_id; });

    const viewsByStory = {};
    (views || []).forEach(v => { viewsByStory[v.story_id] = (viewsByStory[v.story_id] || 0) + 1; });

    const likesByStory = {};
    (likes || []).forEach(l => { if (l.story_id) likesByStory[l.story_id] = (likesByStory[l.story_id] || 0) + 1; });

    const commentsByStory = {};
    (commentsRaw || []).forEach(c => {
      const sid = chapterToStory[c.chapter_id];
      if (sid) commentsByStory[sid] = (commentsByStory[sid] || 0) + 1;
    });

    const stats = stories.map(s => ({
      id: s.id,
      title: s.title,
      cover_url: s.cover_url,
      genre: s.genre,
      status: s.status,
      views: viewsByStory[s.id] || 0,
      likes: likesByStory[s.id] || 0,
      comments: commentsByStory[s.id] || 0,
    })).sort((a, b) => b.views - a.views);

    const totalViews = stats.reduce((sum, s) => sum + s.views, 0);
    const totalLikes = stats.reduce((sum, s) => sum + s.likes, 0);
    const totalComments = stats.reduce((sum, s) => sum + s.comments, 0);
    const maxViews = stats[0]?.views || 0;

    document.getElementById('statsTotalViews').textContent = totalViews.toLocaleString('es-ES');
    document.getElementById('statsTotalLikes').textContent = totalLikes.toLocaleString('es-ES');
    document.getElementById('statsTotalComments').textContent = totalComments.toLocaleString('es-ES');

    list.innerHTML = stats.map(s => {
      const percent = maxViews > 0 ? Math.round((s.views / maxViews) * 100) : 0;
      return `
        <button class="stats-card" data-story-id="${s.id}">
          <div class="stats-card-cover">
            ${s.cover_url ? `<img src="${s.cover_url}" />` : `<span>${escapeHtml(s.title.charAt(0))}</span>`}
          </div>
          <div class="stats-card-body">
            <div class="stats-card-title">${escapeHtml(s.title)}</div>
            <div class="stats-card-meta"><span>${escapeHtml(s.genre || 'Sin género')}</span> · <span>${escapeHtml(s.status || 'En curso')}</span></div>
            <div class="stats-card-bar"><div class="stats-card-bar-fill" style="width: ${percent}%;"></div></div>
            <div class="stats-card-numbers">
              <span class="stats-card-number">${s.views} vistas</span>
              <span class="stats-card-number">${s.likes} likes</span>
              <span class="stats-card-number">${s.comments} comentarios</span>
            </div>
          </div>
          <div class="stats-card-arrow">${ic('chevron-right', 20)}</div>
        </button>
      `;
    }).join('');

    document.querySelectorAll('.stats-card').forEach(card => {
      card.addEventListener('click', () => abrirStoryStats(card.dataset.storyId));
    });
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    list.innerHTML = emptyState('alert-circle', 'Error', err.message);
  }
  hideLoading();
}

async function abrirStoryStats(storyId) {
  showView('viewStoryStats');
  showLoading();
  try {
    const { data: story } = await db.from('stories').select('*').eq('id', storyId).maybeSingle();
    const { count: totalViews } = await db.from('story_views').select('id', { count: 'exact', head: true }).eq('story_id', storyId);
    const { count: bookLikes } = await db.from('likes').select('id', { count: 'exact', head: true }).eq('story_id', storyId).is('chapter_id', null);
    const { data: chapters } = await db.from('chapters').select('id, title, chapter_order').eq('story_id', storyId).order('chapter_order', { ascending: true });

    document.getElementById('storyStatsHeader').innerHTML = `
      <div class="story-stats-header">
        <div class="story-stats-cover">${story.cover_url ? `<img src="${story.cover_url}" />` : `<span>${escapeHtml(story.title.charAt(0))}</span>`}</div>
        <div class="story-stats-info">
          <h2 class="story-stats-title">${escapeHtml(story.title)}</h2>
          <p class="story-stats-synopsis">${escapeHtml(story.synopsis || '')}</p>
        </div>
      </div>
    `;

    document.getElementById('storyStatsTotals').innerHTML = `
      <div class="stats-total-card"><div class="stats-total-label">Vistas</div><div class="stats-total-value">${totalViews || 0}</div></div>
      <div class="stats-total-card"><div class="stats-total-label">Likes</div><div class="stats-total-value">${bookLikes || 0}</div></div>
      <div class="stats-total-card"><div class="stats-total-label">Capítulos</div><div class="stats-total-value">${chapters?.length || 0}</div></div>
    `;

    document.getElementById('storyStatsChapters').innerHTML = (chapters || []).map(c => `
      <div class="stats-chapter-item">
        <div class="stats-chapter-num">${String(c.chapter_order).padStart(2, '0')}</div>
        <div class="stats-chapter-body"><div class="stats-chapter-title">${escapeHtml(c.title)}</div></div>
      </div>
    `).join('');
  } catch (e) { console.warn(e); }
  hideLoading();
}

/* ============================================
   NOTIFICACIONES & REPORTES
   ============================================ */

async function abrirNotificacionesView() {
  showView('viewNotificaciones');
  await cargarNotificaciones();
}

async function cargarNotificaciones() {
  const list = document.getElementById('notifList');
  showLoading();
  const { data, error } = await db.from('notifications')
    .select(`id, type, is_read, created_at, from_user_id, story_id, chapter_id, post_id, relato_id, stories(title), chapters(title), blog_posts(title)`)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false }).limit(100);
  hideLoading();

  if (error || !data?.length) {
    list.innerHTML = emptyState('bell', 'Sin notificaciones', 'No tienes actividad pendiente.');
    return;
  }

  const userIds = [...new Set(data.map(n => n.from_user_id).filter(Boolean))];
  const { data: profiles } = await db.from('profiles').select('id, username, avatar_url').in('id', userIds);
  const profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  list.innerHTML = data.map(n => {
    const fromName = profilesMap[n.from_user_id]?.username || 'Un lector';
    return `
      <div class="notif-item ${n.is_read ? 'read' : 'unread'}">
        <div class="notif-body">
          <div class="notif-text"><strong>@${escapeHtml(fromName)}</strong> realizó una acción (${escapeHtml(n.type)})</div>
          <div class="notif-meta"><span>${tiempoRelativo(n.created_at)}</span></div>
        </div>
      </div>
    `;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

async function actualizarBadgeNotificaciones() {
  try {
    const { count } = await db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_read', false);
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.hidden = !count || count <= 0;
    }
  } catch (e) { console.warn(e); }
}

async function abrirReportesView() {
  showView('viewReportes');
  await cargarReportes();
}

async function cargarReportes() {
  const list = document.getElementById('reportesList');
  showLoading();
  const { data } = await db.from('relato_reports').select('*, relatos(title)').order('created_at', { ascending: false });
  hideLoading();

  if (!data?.length) {
    list.innerHTML = emptyState('flag', 'Sin reportes', 'No hay reportes de la comunidad.');
    return;
  }

  list.innerHTML = data.map(r => `
    <div class="admin-report-item">
      <div class="admin-report-head">
        <div class="admin-report-title">${escapeHtml(r.relatos?.title || 'Relato eliminado')}</div>
        <span class="admin-report-badge ${r.status}">${r.status}</span>
      </div>
      <div class="admin-report-reason"><strong>Motivo:</strong> ${escapeHtml(r.reason)}</div>
      <div class="admin-report-actions">
        <button class="btn btn-primary btn-sm" onclick="db.from('relato_reports').update({status:'resolved'}).eq('id','${r.id}').then(()=>cargarReportes())">Resolver</button>
        <button class="btn btn-danger btn-sm" onclick="if(confirm('¿Eliminar relato?')) db.from('relatos').delete().eq('id','${r.relato_id}').then(()=>cargarReportes())">Eliminar relato</button>
      </div>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

async function actualizarBadgeReportes() {
  try {
    const { count } = await db.from('relato_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    const badge = document.getElementById('reportesBadge');
    if (badge) {
      badge.textContent = String(count || 0);
      badge.hidden = !count || count <= 0;
    }
  } catch (e) { console.warn(e); }
}

/* ============================================
   MODERACIÓN DE RELATOS
   ============================================ */

async function abrirRelatosAdminView() {
  showView('viewRelatosAdmin');
  await cargarRelatosAdmin();
}

async function cargarRelatosAdmin() {
  const list = document.getElementById('relatosAdminList');
  showLoading();
  const { data } = await db.from('relatos').select('*, profiles(username)').order('created_at', { ascending: false });
  hideLoading();

  if (!data?.length) {
    list.innerHTML = emptyState('pen-line', 'Sin relatos', 'Aún no hay relatos publicados.');
    return;
  }

  list.innerHTML = data.map(r => `
    <div class="admin-report-item">
      <div class="admin-report-title">${escapeHtml(r.title)}</div>
      <div class="admin-report-meta">Por @${escapeHtml(r.profiles?.username || 'Lector')}</div>
      <div class="admin-report-actions">
        <a class="btn btn-ghost btn-sm" href="relato.html?id=${r.id}" target="_blank">Ver</a>
        <button class="btn btn-danger btn-sm" onclick="if(confirm('¿Eliminar?')) db.from('relatos').delete().eq('id','${r.id}').then(()=>cargarRelatosAdmin())">Eliminar</button>
      </div>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

/* ============================================
   AJUSTES DEL SITIO ADMIN
   ============================================ */

async function abrirAjustesView() {
  showView('viewAjustes');
  showLoading();
  const { data } = await db.from('site_settings').select('*').eq('id', 1).maybeSingle();
  hideLoading();
  if (data) {
    document.getElementById('toggleShowLikes').checked = !!data.show_likes;
    document.getElementById('toggleShowViews').checked = !!data.show_views;
    document.getElementById('toggleShowRelatosBtn').checked = data.show_relatos_btn !== false;
    document.getElementById('toggleShowMisRelatosMenu').checked = data.show_mis_relatos_menu !== false;
  }
}

document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
  showLoading();
  await db.from('site_settings').update({
    show_likes: document.getElementById('toggleShowLikes').checked,
    show_views: document.getElementById('toggleShowViews').checked,
    show_relatos_btn: document.getElementById('toggleShowRelatosBtn').checked,
    show_mis_relatos_menu: document.getElementById('toggleShowMisRelatosMenu').checked,
    updated_at: new Date().toISOString()
  }).eq('id', 1);
  hideLoading();
  toast('Ajustes guardados', 'ok');
  limpiarCachePublica();
});

/* ============================================
   ÁRBOLES Y PERSONAJES
   ============================================ */

async function abrirArbolesEstante() {
  showView('viewArbolesEstante');
  showLoading();
  const { data: stories } = await db.from('stories').select('*').order('created_at', { ascending: false });
  hideLoading();

  document.getElementById('treesShelf').innerHTML = (stories || []).map(s => `
    <button class="tree-shelf-card" onclick="abrirArbolLibro('${s.id}')">
      <div class="tree-shelf-cover">${s.cover_url ? `<img src="${s.cover_url}" />` : `<span>${escapeHtml(s.title.charAt(0))}</span>`}</div>
      <div class="tree-shelf-info"><div class="tree-shelf-title">${escapeHtml(s.title)}</div></div>
    </button>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

async function abrirArbolLibro(storyId) {
  showLoading();
  const { data: story } = await db.from('stories').select('*').eq('id', storyId).maybeSingle();
  hideLoading();
  if (!story) return;
  currentTreeStory = story;

  document.getElementById('arbolBookHeader').innerHTML = `
    <div class="arbol-book-header">
      <div class="arbol-book-cover">${story.cover_url ? `<img src="${story.cover_url}" />` : `<span>${escapeHtml(story.title.charAt(0))}</span>`}</div>
      <div class="arbol-book-info"><h1 class="story-h1">${escapeHtml(story.title)}</h1></div>
    </div>
  `;
  showView('viewArbol');
  await cargarPersonajesAdmin(story.id);
}

async function cargarPersonajesAdmin(storyId) {
  showLoading();
  const { data } = await db.from('character_nodes').select('*').eq('story_id', storyId).order('created_at', { ascending: true });
  hideLoading();

  document.getElementById('charactersAdminList').innerHTML = (data || []).map(c => `
    <div class="character-admin-card">
      <div class="character-admin-avatar">${c.image_url ? `<img src="${c.image_url}" />` : c.emoji || '👤'}</div>
      <div class="character-admin-body">
        <div class="character-admin-name">${escapeHtml(c.name)} ${c.alias ? `("${escapeHtml(c.alias)}")` : ''}</div>
        <div class="character-admin-role">${escapeHtml(c.role || '')}</div>
      </div>
      <button class="admin-item-action" onclick="abrirCharacterForm('${c.id}')">${ic('edit-2', 16)}</button>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

function abrirCharacterForm(id = null) {
  currentCharacter = null;
  currentCharacterImageUrl = null;
  document.getElementById('characterForm').reset();
  document.getElementById('characterDeleteBtn').hidden = !id;
  document.getElementById('characterFormTitle').textContent = id ? 'Editar personaje' : 'Nuevo personaje';

  if (id) {
    showLoading();
    db.from('character_nodes').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      hideLoading();
      if (!data) return;
      currentCharacter = data;
      currentCharacterImageUrl = data.image_url;
      document.getElementById('characterName').value = data.name || '';
      document.getElementById('characterAlias').value = data.alias || '';
      document.getElementById('characterAge').value = data.age || '';
      document.getElementById('characterEmoji').value = data.emoji || '👤';
      document.getElementById('characterDescription').value = data.description || '';
      actualizarAvatarPreview(data.emoji || '👤', data.image_url);
    });
  } else {
    actualizarAvatarPreview('👤', null);
  }
  showView('viewCharacterForm');
}

function actualizarAvatarPreview(emoji, imageUrl) {
  const p = document.getElementById('characterAvatarPreview');
  p.innerHTML = imageUrl ? `<img src="${imageUrl}" />` : `<span>${emoji}</span>`;
}

document.getElementById('characterForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    story_id: currentTreeStory.id,
    user_id: session.user.id,
    name: document.getElementById('characterName').value.trim(),
    alias: document.getElementById('characterAlias').value.trim(),
    age: document.getElementById('characterAge').value.trim(),
    emoji: document.getElementById('characterEmoji').value.trim() || '👤',
    description: document.getElementById('characterDescription').value.trim(),
    image_url: currentCharacterImageUrl || null,
  };

  showLoading();
  if (currentCharacter) {
    await db.from('character_nodes').update(payload).eq('id', currentCharacter.id);
  } else {
    payload.x = 300; payload.y = 200;
    await db.from('character_nodes').insert(payload);
  }
  hideLoading();
  toast('Personaje guardado', 'ok');
  showView('viewArbol');
  cargarPersonajesAdmin(currentTreeStory.id);
});

document.getElementById('characterDeleteBtn')?.addEventListener('click', async () => {
  if (!currentCharacter || !confirm('¿Eliminar personaje?')) return;
  showLoading();
  await db.from('character_nodes').delete().eq('id', currentCharacter.id);
  hideLoading();
  toast('Personaje eliminado', 'ok');
  showView('viewArbol');
  cargarPersonajesAdmin(currentTreeStory.id);
});

/* ============================================
   BIOGRAFÍA ADMIN
   ============================================ */

async function abrirBioView() {
  showView('viewBio');
  showLoading();
  const { data } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  hideLoading();
  if (data) {
    document.getElementById('bioUsername').value = data.username || '';
    document.getElementById('bioText').value = data.bio || '';
    document.getElementById('bioBirthdate').value = data.birthdate || '';
    document.getElementById('bioGender').value = data.gender || '';
    document.getElementById('bioAvatarPreview').innerHTML = data.avatar_url ? `<img src="${data.avatar_url}" />` : 'A';
  }
}

document.getElementById('bioSaveBtn')?.addEventListener('click', async () => {
  showLoading();
  await db.from('profiles').update({
    username: document.getElementById('bioUsername').value.trim(),
    bio: document.getElementById('bioText').value.trim(),
    birthdate: document.getElementById('bioBirthdate').value || null,
    gender: document.getElementById('bioGender').value || null
  }).eq('id', session.user.id);
  hideLoading();
  toast('Biografía guardada', 'ok');
  limpiarCachePublica();
});

/* ============================================
   LISTENERS Y ROUTING ADMIN
   ============================================ */

document.getElementById('btnNewStory').addEventListener('click', () => abrirStoryForm(null));
document.getElementById('btnNewPost').addEventListener('click', () => abrirPostForm(null));
document.getElementById('btnNewRelatoAdmin')?.addEventListener('click', () => abrirRelatoAdminForm(null));
document.getElementById('btnNewResena')?.addEventListener('click', () => abrirResenaAdminForm(null));
document.getElementById('btnUsuarios')?.addEventListener('click', () => { showView('viewUsuarios'); cargarUsuarios(); });
document.getElementById('btnNotificaciones')?.addEventListener('click', () => abrirNotificacionesView());
document.getElementById('btnReportes')?.addEventListener('click', () => abrirReportesView());
document.getElementById('btnRelatosAdmin')?.addEventListener('click', () => abrirRelatosAdminView());
document.getElementById('btnRedes').addEventListener('click', () => abrirRedesView());
document.getElementById('btnBio').addEventListener('click', () => abrirBioView());
document.getElementById('btnDonaciones').addEventListener('click', () => abrirDonacionesView());
document.getElementById('btnStats').addEventListener('click', () => abrirStatsView());
document.getElementById('btnAjustes')?.addEventListener('click', () => abrirAjustesView());
document.getElementById('btnArboles')?.addEventListener('click', () => abrirArbolesEstante());
document.getElementById('btnNewChapter')?.addEventListener('click', () => abrirChapterForm(null));
document.getElementById('btnNewCharacter')?.addEventListener('click', () => abrirCharacterForm(null));

// Botones atrás
document.querySelectorAll('.btn-back').forEach(btn => {
  btn.addEventListener('click', () => {
    showView('viewDashboard');
    cargarDashboard();
  });
});

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function traducirError(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  return msg || 'Error inesperado';
}

function emptyState(iconName, title, sub) {
  return `
    <div class="empty-c">
      <div class="empty-icon">${ic(iconName, 48)}</div>
      <div class="empty-title">${escapeHtml(title)}</div>
      <div class="empty-sub">${escapeHtml(sub || '')}</div>
    </div>
  `;
}

/* ============================================
   INICIALIZACIÓN PANEL
   ============================================ */

(async () => {
  initTheme();
  inyectarHeader();
  inyectarAuthModal();
  initEditor('editorToolbar', 'chapterEditor', 'edCounter');
  initEditor('postToolbar', 'postEditor', 'postCounter');

  const ok = await verificarAutor();
  if (ok) {
    await cargarDashboard();
    actualizarBadgeNotificaciones();
    actualizarBadgeReportes();
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (window.lucide) lucide.createIcons();
})();
