/* ============================================
   AZAEL BLOG — main.js COMPLETO
   ============================================ */

const SUPABASE_URL = 'https://bqliduwiarryqcqtignd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbGlkdXdpYXJyeXFjcXRpZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTU4MzgsImV4cCI6MjEwNjM3MTgzOH0.T6GZXQNjzRwhbuYuVx54vsdTNy2CTpEwCjnxED1KGaY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const THEME_KEY = 'azael-theme-v2';
const PREMIUM_FREE_LIMIT = 5;
const READ_HISTORY_KEY = 'azael-read-history';

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

const cache = {
  get(k) {
    try {
      const item = sessionStorage.getItem('azael-cache:' + k);
      if (!item) return null;
      const { data, ts } = JSON.parse(item);
      if (Date.now() - ts > 30 * 1000) return null;
      return data;
    } catch { return null; }
  },
  set(k, d) {
    try { sessionStorage.setItem('azael-cache:' + k, JSON.stringify({ data: d, ts: Date.now() })); } catch {}
  },
  clear() {
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('azael-cache:')) keys.push(key);
      }
      keys.forEach(k => sessionStorage.removeItem(k));
    } catch {}
  },
};

function ensureLoadingOverlay() {
  if (document.getElementById('globalLoading')) return;
  const el = document.createElement('div');
  el.id = 'globalLoading';
  el.className = 'global-loading';
  el.hidden = true;
  el.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(el);
}
function showLoading() {
  ensureLoadingOverlay();
  document.getElementById('globalLoading').hidden = false;
}
function hideLoading() {
  const el = document.getElementById('globalLoading');
  if (el) el.hidden = true;
}

function showToast(msg, type = 'info', duration = 2500) {
  let mount = document.getElementById('toast-mount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'toast-mount';
    document.body.appendChild(mount);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  mount.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

function render404(cont, titulo = 'Contenido no encontrado', msg = 'El enlace que buscas no existe o fue eliminado.') {
  cont.innerHTML = `
    <div class="container" style="padding:80px 20px;text-align:center;">
      <div class="empty-icon" style="margin:0 auto 20px;">${ic('file-question', 64)}</div>
      <h1 style="font-family:var(--font-serif);font-size:32px;margin-bottom:12px;">${escapeHtml(titulo)}</h1>
      <p style="color:var(--text-secondary);max-width:400px;margin:0 auto 24px;">${escapeHtml(msg)}</p>
      <a href="index.html" class="btn btn-primary">${ic('home', 16)} Ir al inicio</a>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

const READER_PREFS = { fontFamily: 'serif', fontSize: 18, lineHeight: 1.8, theme: 'oled' };

function loadReaderPrefs() {
  try { Object.assign(READER_PREFS, JSON.parse(localStorage.getItem('azael-reader-prefs') || '{}')); } catch {}
}
function saveReaderPrefs() {
  localStorage.setItem('azael-reader-prefs', JSON.stringify(READER_PREFS));
}
function applyReaderPrefs() {
  document.querySelectorAll('.chapter-body, .reader-body-c').forEach(el => {
    el.style.fontSize = READER_PREFS.fontSize + 'px';
    el.style.lineHeight = READER_PREFS.lineHeight;
    if (READER_PREFS.fontFamily === 'serif') el.style.fontFamily = 'var(--font-serif)';
    else if (READER_PREFS.fontFamily === 'sans') el.style.fontFamily = 'var(--font-sans)';
    else if (READER_PREFS.fontFamily === 'mono') el.style.fontFamily = 'monospace';
  });
  document.body.dataset.readerTheme = READER_PREFS.theme;
}

function ic(name, size = 18) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px;display:inline-block;"></i>`;
}
const icon = ic;

function pagActiva() {
  let p = (location.pathname.split('/').pop() || 'index').toLowerCase();
  if (p === '' || p === '/') p = 'index';
  if (!p.endsWith('.html')) p += '.html';
  return p;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function capitalize(str) { return String(str || '').charAt(0).toUpperCase() + String(str || '').slice(1); }

function tiempoRelativo(fecha) {
  const d = new Date(fecha);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getReadHistory() {
  try { return JSON.parse(localStorage.getItem(READ_HISTORY_KEY) || '{}'); } catch { return {}; }
}

function marcarComoLeido(chapterId) {
  try {
    const h = getReadHistory();
    h[chapterId] = Date.now();
    const keys = Object.keys(h);
    if (keys.length > 100) {
      const sorted = keys.sort((a, b) => h[a] - h[b]);
      sorted.slice(0, keys.length - 100).forEach(k => delete h[k]);
    }
    localStorage.setItem(READ_HISTORY_KEY, JSON.stringify(h));
  } catch {}
}

function textoUltimaLectura(chapterId) {
  const h = getReadHistory();
  const ts = h[chapterId];
  if (!ts) return null;
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'Leído ahora';
  if (diff < 3600) return `Leído hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Leído hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `Leído hace ${Math.floor(diff / 86400)} d`;
  return `Leído el ${new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
}

/* ---------- REGISTRAR VISTA ---------- */
function getSessionId() {
  try {
    let id = localStorage.getItem('azael-session-id');
    if (!id) {
      id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('azael-session-id', id);
    }
    return id;
  } catch {
    return 'sess_anon_' + Math.random().toString(36).slice(2, 10);
  }
}

async function registrarVista(storyId, chapterId = null) {
  try {
    const key = `azael-viewed:${chapterId || storyId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    await db.from('story_views').insert({
      story_id: storyId,
      chapter_id: chapterId,
      session_id: getSessionId(),
    });
  } catch (e) {
    console.warn('No se pudo registrar la vista:', e);
  }
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

function traducirError(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered')) return 'Ese correo ya está registrado.';
  if (m.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('email')) return 'Correo electrónico inválido.';
  if (m.includes('timeout')) return 'La conexión tardó demasiado. Revisa tu internet.';
  return msg || 'Ocurrió un error';
}

function socialIconSvg(platform, size = 20) {
  const icons = {
    instagram: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
    facebook: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
    youtube: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>`,
    tiktok: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`,
    twitter: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>`,
    whatsapp: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
    telegram: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    discord: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    link: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  };
  return icons[platform] || icons.link;
}

function donationIconSvg(platform, size = 20) {
  const icons = {
    paypal: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21h5a5 5 0 0 0 0-10H7l-2 10z"/><path d="M10 3h5a5 5 0 0 1 0 10h-3"/><path d="M12 7h5a5 5 0 0 1 0 10h-2"/></svg>`,
    binance: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L5 9l7 7 7-7-7-7z"/><path d="M5 15l7 7 7-7"/></svg>`,
  };
  return icons[platform] || socialIconSvg('link', size);
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
}
function initTheme() { applyTheme(localStorage.getItem(THEME_KEY) || 'dark'); }

const NAV_ITEMS = [
  { href: 'index.html',       label: 'Inicio',      icon: 'home' },
  { href: 'historias.html',   label: 'Historias',   icon: 'book-open' },
  { href: 'generos.html',     label: 'Géneros',     icon: 'layout-grid' },
  { href: 'blog.html',        label: 'Blog',        icon: 'feather' },
  { href: 'redes.html',       label: 'Redes',       icon: 'share-2' },
  { href: 'donaciones.html',  label: 'Donaciones',  icon: 'heart-handshake' },
];

const PAGE_TITLES = {
  'index.html': 'Inicio', 'historias.html': 'Historias', 'generos.html': 'Géneros',
  'blog.html': 'Blog', 'post.html': 'Entrada', 'redes.html': 'Redes',
  'biografia.html': 'Biografía', 'historia.html': 'Historia', 'capitulo.html': 'Leyendo',
  'donaciones.html': 'Donaciones',
};

function inyectarHeader() {
  const mount = document.getElementById('header-mount');
  if (!mount) return;
  const path = pagActiva();
  const title = PAGE_TITLES[path] || 'Azael Colina';

  mount.innerHTML = `
    <header class="app-header">
      <div class="app-header-inner">
        <button class="hamburger" id="hamburgerBtn" aria-label="Menú">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <h1 class="header-title">${title}</h1>
        <nav class="desktop-nav">
          ${NAV_ITEMS.map(i => `<a href="${i.href}" class="${path === i.href ? 'active' : ''}">${i.label}</a>`).join('')}
        </nav>
        <div class="header-actions">
          <button class="icon-action" id="themeToggle" aria-label="Cambiar tema">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
        </div>
      </div>
    </header>
  `;

  document.getElementById('hamburgerBtn').addEventListener('click', () => {
    document.body.classList.add('drawer-open');
  });
  document.getElementById('themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
}

function inyectarDrawer() {
  if (document.getElementById('drawer')) return;
  const path = pagActiva();
  const drawer = document.createElement('div');
  drawer.innerHTML = `
    <div class="drawer-backdrop" id="drawerBackdrop"></div>
    <aside class="drawer" id="drawer">
      <div class="drawer-header">
        <a href="index.html" class="drawer-brand">
          <span class="drawer-brand-mark">A</span>
          <span class="drawer-brand-text">
            <span class="drawer-brand-name">Azael Colina</span>
            <span class="drawer-brand-sub">Un rincón para leer</span>
          </span>
        </a>
        <button class="drawer-close" id="drawerClose" aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <nav class="drawer-nav">
        <div class="drawer-section">Menú</div>
        ${NAV_ITEMS.map(i => `
          <a href="${i.href}" class="drawer-link ${path === i.href ? 'active' : ''}">
            ${ic(i.icon)} <span>${i.label}</span>
          </a>
        `).join('')}
        <div class="drawer-section">Sobre mí</div>
        <a href="biografia.html" class="drawer-link ${path === 'biografia.html' ? 'active' : ''}">
          ${ic('user')} <span>Biografía</span>
        </a>
      </nav>
      <div class="drawer-footer">
        <button class="drawer-user-btn" id="drawerAuthBtn">
          ${ic('log-in')} <span id="drawerAuthLabel">Iniciar sesión</span>
        </button>
      </div>
    </aside>
  `;
  document.body.appendChild(drawer);

  document.getElementById('drawerClose').addEventListener('click', () => document.body.classList.remove('drawer-open'));
  document.getElementById('drawerBackdrop').addEventListener('click', () => document.body.classList.remove('drawer-open'));
  document.querySelectorAll('.drawer-link').forEach(l => l.addEventListener('click', () => document.body.classList.remove('drawer-open')));
  document.getElementById('drawerAuthBtn').addEventListener('click', () => {
    const label = document.getElementById('drawerAuthLabel');
    if (label && label.textContent === 'Cerrar sesión') {
      db.auth.signOut().then(() => location.reload());
    } else {
      document.body.classList.remove('drawer-open');
      const modal = document.getElementById('authModal');
      if (modal) modal.hidden = false;
      if (window.__showLoginView) window.__showLoginView();
    }
  });
  if (window.lucide) lucide.createIcons();
}

function inyectarAuthModal() {
  const mount = document.getElementById('auth-mount');
  if (!mount) return;

  mount.innerHTML = `
    <div class="modal-overlay-c" id="authModal" hidden>
      <div class="modal-c">
        <button class="modal-close-c" id="authClose" aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div id="loginView">
          <h2 class="modal-title-c">Iniciar sesión</h2>
          <p class="modal-sub-c">Accede con tu cuenta para seguir leyendo y comentar.</p>
          <form id="loginForm" class="auth-form-c">
            <label>Correo <input type="email" id="loginEmail" required autocomplete="email" placeholder="tucorreo@ejemplo.com" /></label>
            <label>Contraseña <input type="password" id="loginPassword" required autocomplete="current-password" placeholder="••••••••" /></label>
            <button type="submit" class="btn btn-primary btn-block">Entrar</button>
            <p class="auth-error-c" id="loginError" hidden></p>
          </form>
          <p class="auth-switch-c">¿No tienes cuenta? <button type="button" id="goRegister">Crear cuenta</button></p>
        </div>

        <div id="registerView" hidden>
          <h2 class="modal-title-c">Crear cuenta</h2>
          <p class="modal-sub-c">Únete para leer todos los capítulos y recibir novedades.</p>
          <form id="registerForm" class="auth-form-c">
            <label>Nombre de usuario <input type="text" id="registerUsername" required minlength="3" maxlength="20" placeholder="Cómo te llamas" /></label>
            <label>Correo <input type="email" id="registerEmail" required autocomplete="email" placeholder="tucorreo@ejemplo.com" /></label>
            <label>Contraseña <input type="password" id="registerPassword" required minlength="6" autocomplete="new-password" placeholder="Mínimo 6 caracteres" /></label>
            <div class="auth-consent-c">
              <input type="checkbox" id="registerConsent" required />
              <label for="registerConsent">Acepto recibir novedades de los libros y del blog por correo.</label>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Crear cuenta</button>
            <p class="auth-error-c" id="registerError" hidden></p>
          </form>
          <p class="auth-switch-c">¿Ya tienes cuenta? <button type="button" id="goLogin">Iniciar sesión</button></p>
        </div>
      </div>
    </div>
  `;

  const authModal = document.getElementById('authModal');
  const loginView = document.getElementById('loginView');
  const registerView = document.getElementById('registerView');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');

  function showLoginView() { loginView.hidden = false; registerView.hidden = true; }
  function showRegisterView() { loginView.hidden = true; registerView.hidden = false; }

  window.__showLoginView = showLoginView;
  window.__showRegisterView = showRegisterView;

  document.getElementById('authClose').addEventListener('click', () => authModal.hidden = true);
  authModal.addEventListener('click', (e) => { if (e.target === authModal) authModal.hidden = true; });
  document.getElementById('goRegister').addEventListener('click', showRegisterView);
  document.getElementById('goLogin').addEventListener('click', showLoginView);

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    showLoading();
    const { error } = await db.auth.signInWithPassword({
      email: document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value,
    });
    hideLoading();
    if (error) { loginError.textContent = traducirError(error.message); loginError.hidden = false; return; }
    showToast('Sesión iniciada', 'ok');
    authModal.hidden = true;
    loginForm.reset();
    cache.clear();
    setTimeout(() => location.reload(), 500);
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.hidden = true;
    showLoading();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const { error } = await db.auth.signUp({
      email, password,
      options: { data: { username, newsletter: true } },
    });
    hideLoading();
    if (error) { registerError.textContent = traducirError(error.message); registerError.hidden = false; return; }
    showToast('Cuenta creada. ¡Bienvenido!', 'ok');
    authModal.hidden = true;
    registerForm.reset();
    cache.clear();
    setTimeout(() => location.reload(), 500);
  });

  db.auth.onAuthStateChange((_event, session) => {
    const label = document.getElementById('drawerAuthLabel');
    if (label) label.textContent = session?.user ? 'Cerrar sesión' : 'Iniciar sesión';
  });

  if (window.lucide) lucide.createIcons();
}

async function cargarHero() {
  const cont = document.getElementById('heroMount');
  if (!cont) return;
  try {
    const { data, error } = await withTimeout(
      db.from('stories').select('id, title, synopsis, cover_url, genre, status, is_featured')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10),
      8000
    );
    if (error || !data?.length) {
      cont.innerHTML = `
        <section class="hero-simple container">
          <p class="hero-eyebrow">Un rincón para leer</p>
          <h1 class="hero-title-c">Historias que se quedan.</h1>
          <p style="color:var(--text-secondary);font-size:16px;max-width:560px;">Relatos, capítulos nuevos y un espacio tranquilo para perderse entre líneas.</p>
        </section>
      `;
      return;
    }

    if (data.length === 1) {
      renderHeroSlide(data[0], cont, true);
      return;
    }

    cont.innerHTML = `
      <section class="hero-cinematic hero-carousel">
        <div class="hero-carousel-track" id="heroTrack">
          ${data.map((s, i) => renderHeroSlideHTML(s, i === 0)).join('')}
        </div>
        <button class="hero-nav hero-nav-prev" id="heroPrev" aria-label="Anterior">
          ${ic('chevron-left', 22)}
        </button>
        <button class="hero-nav hero-nav-next" id="heroNext" aria-label="Siguiente">
          ${ic('chevron-right', 22)}
        </button>
        <div class="hero-dots" id="heroDots">
          ${data.map((_, i) => `<button class="hero-dot ${i === 0 ? 'active' : ''}" data-slide="${i}" aria-label="Ir a la slide ${i + 1}"></button>`).join('')}
        </div>
      </section>
    `;

    if (window.lucide) lucide.createIcons();

    let currentSlide = 0;
    const track = document.getElementById('heroTrack');
    const slides = track.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');

    function goToSlide(idx) {
      if (idx < 0) idx = slides.length - 1;
      if (idx >= slides.length) idx = 0;
      currentSlide = idx;
      track.style.transform = `translateX(-${idx * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    }

    document.getElementById('heroPrev').addEventListener('click', () => goToSlide(currentSlide - 1));
    document.getElementById('heroNext').addEventListener('click', () => goToSlide(currentSlide + 1));
    dots.forEach(d => d.addEventListener('click', () => goToSlide(parseInt(d.dataset.slide))));

    let autoTimer = setInterval(() => goToSlide(currentSlide + 1), 7000);
    track.addEventListener('touchstart', () => clearInterval(autoTimer));
    track.addEventListener('mouseenter', () => clearInterval(autoTimer));

  } catch (e) { 
    console.warn('Hero error:', e);
  }
}

function renderHeroSlideHTML(s, isFirst = false) {
  const isFeatured = !!s.is_featured;
  return `
    <div class="hero-slide">
      <div class="hero-bg">
        ${s.cover_url ? `<img src="${s.cover_url}" alt="" ${isFirst ? '' : 'loading="lazy"'} />` : ''}
      </div>
      <div class="hero-content container">
        ${isFeatured ? '<span class="hero-tag">Historia destacada</span>' : '<span class="hero-tag hero-tag-alt">Historia</span>'}
        <h1 class="hero-title-c">${escapeHtml(s.title)}</h1>
        ${s.synopsis ? `<p class="hero-synopsis">${escapeHtml(s.synopsis)}</p>` : ''}
        <div class="hero-actions-c">
          <a href="historia.html?id=${s.id}" class="btn btn-primary">${ic('book-open')} Empezar a leer</a>
          <a href="historias.html" class="btn btn-ghost">Ver todas</a>
        </div>
      </div>
    </div>
  `;
}

function renderHeroSlide(s, cont, isFirst) {
  cont.innerHTML = `
    <section class="hero-cinematic">
      ${renderHeroSlideHTML(s, isFirst)}
    </section>
  `;
  if (window.lucide) lucide.createIcons();
}

async function cargarNovedades() {
  const cont = document.getElementById('novedadesMount');
  if (!cont) return;
  try {
    const { data, error } = await withTimeout(
      db.from('chapters').select('id, title, chapter_order, created_at, reading_time, story_id, stories(id, title, cover_url)')
        .order('created_at', { ascending: false }).limit(10),
      8000
    );
    if (error || !data?.length) return;
    cont.innerHTML = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <div><h2 class="section-title">Novedades</h2><p class="section-sub">Últimos capítulos publicados</p></div>
            <a href="historias.html" class="section-link">Ver todo ${ic('arrow-right', 14)}</a>
          </div>
          <div class="horizontal-carousel">
            ${data.map(c => {
              const story = c.stories || {};
              return `
                <a class="chapter-card" href="capitulo.html?id=${c.id}">
                  <div class="chapter-card-cover">
                    ${story.cover_url ? `<img src="${story.cover_url}" alt="" loading="lazy" />` : escapeHtml((story.title || '?').charAt(0))}
                  </div>
                  <div class="chapter-card-body">
                    <div class="chapter-card-story">${escapeHtml(story.title || 'Historia')}</div>
                    <div class="chapter-card-title">Cap. ${c.chapter_order || '?'} · ${escapeHtml(c.title)}</div>
                    <div class="chapter-card-meta">
                      ${c.reading_time ? `<span>${c.reading_time} min</span>` : ''}
                      <span>${tiempoRelativo(c.created_at)}</span>
                    </div>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      </section>
    `;
    if (window.lucide) lucide.createIcons();
  } catch (e) { console.warn('Novedades timeout:', e); }
}

async function cargarUltimoBlogHome() {
  const cont = document.getElementById('ultimoBlogMount');
  if (!cont) return;
  try {
    const { data, error } = await withTimeout(
      db.from('blog_posts').select('id, title, content, created_at, cover_url')
        .eq('published', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      8000
    );
    if (error || !data) return;
    const excerpt = (data.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 180);
    const fecha = new Date(data.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const hasCover = !!data.cover_url;

    cont.innerHTML = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <div><h2 class="section-title">Del blog</h2><p class="section-sub">Lo último que escribí</p></div>
            <a href="blog.html" class="section-link">Ver todo ${ic('arrow-right', 14)}</a>
          </div>
          <a class="blog-preview-c${hasCover ? ' has-cover' : ''}" href="post.html?id=${data.id}">
            <div class="blog-preview-c-body">
              <div class="blog-preview-c-date">${fecha}</div>
              <h3 class="blog-preview-c-title">${escapeHtml(data.title)}</h3>
              <p class="blog-preview-c-excerpt">${escapeHtml(excerpt)}${excerpt.length >= 180 ? '…' : ''}</p>
              <span class="blog-preview-c-more">Leer más ${ic('arrow-right', 14)}</span>
            </div>
            ${hasCover ? `<div class="blog-preview-c-cover"><img src="${data.cover_url}" alt="" loading="lazy" onerror="this.closest('.blog-preview-c').classList.remove('has-cover'); this.closest('.blog-preview-c-cover').remove();" /></div>` : ''}
          </a>
        </div>
      </section>
    `;
    if (window.lucide) lucide.createIcons();
  } catch (e) { console.warn('Último blog timeout:', e); }
}

async function cargarHistorias({ limite = null, excluirDestacada = false, genero = null, busqueda = null } = {}) {
  const grid = document.getElementById('storiesGrid');
  if (!grid) return;
  const cacheKey = `stories:${limite || 'all'}:${excluirDestacada}:${genero || ''}:${busqueda || ''}`;
  const cached = cache.get(cacheKey);
  if (cached) { renderStories(cached, grid); return; }
  try {
    let query = db.from('stories').select('id, title, cover_url, genre, status, is_featured')
      .eq('is_published', true).order('created_at', { ascending: false });
    if (excluirDestacada) query = query.eq('is_featured', false);
    if (genero) query = query.ilike('genre', `%${genero}%`);
    if (busqueda) query = query.ilike('title', `%${busqueda}%`);
    if (limite) query = query.limit(limite);
    const { data, error } = await withTimeout(query, 10000);
    if (error || !data?.length) {
      grid.innerHTML = emptyState('book-open', 'Sin historias todavía', 'Cuando publique la primera, aparecerá aquí.');
      return;
    }
    cache.set(cacheKey, data);
    renderStories(data, grid);
  } catch (e) {
    grid.innerHTML = emptyState('alert-circle', 'No se pudieron cargar', 'Revisa tu conexión e intenta de nuevo.');
    if (window.lucide) lucide.createIcons();
  }
}

function renderStories(data, grid) {
  grid.innerHTML = data.map(s => `
    <a class="story-card-c" href="historia.html?id=${s.id}">
      <div class="book-cover">
        ${s.cover_url ? `<img src="${s.cover_url}" alt="${escapeHtml(s.title)}" loading="lazy" />` : escapeHtml(s.title.charAt(0))}
      </div>
      <h3 class="story-card-c-title">${escapeHtml(s.title)}</h3>
      <div class="story-card-c-meta">${escapeHtml(s.genre || 'Sin género')}</div>
    </a>
  `).join('');
}

const GENEROS = [
  { slug: 'romance',   label: 'Romance',         icon: 'heart' },
  { slug: 'terror',    label: 'Terror',          icon: 'skull' },
  { slug: 'comedia',   label: 'Comedia',         icon: 'smile' },
  { slug: 'misterio',  label: 'Misterio',        icon: 'search' },
  { slug: 'musica',    label: 'Música',          icon: 'music' },
  { slug: 'violencia', label: 'Violencia',       icon: 'droplet' },
  { slug: 'suspenso',  label: 'Suspenso',        icon: 'eye' },
  { slug: 'aventura',  label: 'Aventura',        icon: 'compass' },
  { slug: 'fantasia',  label: 'Fantasía',        icon: 'sparkles' },
  { slug: 'ciencia',   label: 'Ciencia ficción', icon: 'rocket' },
  { slug: 'drama',     label: 'Drama',           icon: 'theater' },
  { slug: 'poesia',    label: 'Poesía',          icon: 'feather' },
];

function cargarGeneros() {
  const grid = document.getElementById('genresGrid');
  if (!grid) return;
  grid.innerHTML = GENEROS.map(g => `
    <a class="genre-card-c" href="historias.html?genero=${encodeURIComponent(g.label)}">
      <div class="genre-card-c-icon">${ic(g.icon, 40)}</div>
      <div class="genre-card-c-name">${escapeHtml(g.label)}</div>
    </a>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

async function cargarBlog(limite = null) {
  const list = document.getElementById('blogList');
  if (!list) return;
  try {
    let q = db.from('blog_posts').select('id, title, content, created_at, cover_url')
      .eq('published', true).order('created_at', { ascending: false });
    if (limite) q = q.limit(limite);
    const { data, error } = await withTimeout(q, 10000);
    if (error || !data?.length) {
      list.innerHTML = emptyState('feather', 'Blog vacío', 'Las entradas que escriba aparecerán aquí.');
      return;
    }
    list.innerHTML = data.map(p => {
      const excerpt = (p.content || '').replace(/<[^>]+>/g, '').slice(0, 180);
      const fecha = new Date(p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      return `
        <a class="blog-item-c ${p.cover_url ? 'has-cover' : ''}" href="post.html?id=${p.id}">
          <div class="blog-item-c-date">${fecha}</div>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(excerpt)}${excerpt.length >= 180 ? '…' : ''}</p>
          ${p.cover_url ? `<img class="blog-item-c-cover" src="${p.cover_url}" alt="" loading="lazy" onerror="this.remove(); this.parentElement.classList.remove('has-cover');" />` : ''}
        </a>
      `;
    }).join('');
  } catch (e) {
    list.innerHTML = emptyState('alert-circle', 'No se pudieron cargar', 'Revisa tu conexión.');
    if (window.lucide) lucide.createIcons();
  }
}

async function cargarPost() {
  const cont = document.getElementById('postContent');
  if (!cont) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { render404(cont, 'Entrada no encontrada', 'El enlace no incluye un identificador válido.'); return; }
  try {
    const { data, error } = await withTimeout(
      db.from('blog_posts').select('id, title, content, cover_url, created_at').eq('id', id).maybeSingle(),
      8000
    );
    if (error || !data) {
      render404(cont, 'Entrada no encontrada', 'Puede que haya sido eliminada o el enlace sea incorrecto.');
      return;
    }
    document.title = `${data.title} — Azael Colina`;
    const ht = document.querySelector('.header-title');
    if (ht) ht.textContent = data.title;
    const fecha = new Date(data.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    cont.innerHTML = `
      <div class="container">
        <h1 class="reader-title-c">${escapeHtml(data.title)}</h1>
        <p class="reader-meta-c">${fecha}</p>
        ${data.cover_url ? `<img src="${data.cover_url}" style="max-width:100%;border-radius:14px;margin-bottom:28px;" onerror="this.remove();" />` : ''}
        <div class="reader-body-c">${data.content || ''}</div>
      </div>
    `;
    applyReaderPrefs();
    document.getElementById('commentsSection')?.removeAttribute('hidden');
    await cargarComentarios(id);
    await prepararFormComentario(id);
  } catch (e) {
    render404(cont, 'No se pudo cargar', 'Hubo un problema de conexión. Intenta de nuevo.');
  }
}

async function cargarComentarios(postId) {
  const list = document.getElementById('commentsList');
  const count = document.getElementById('commentsCount');
  if (!list) return;
  try {
    const [{ data, error }, { data: { session } }] = await Promise.all([
      withTimeout(
        db.from('comments').select('id, content, created_at, user_id')
          .eq('post_id', postId).order('created_at', { ascending: true }),
        8000
      ),
      db.auth.getSession(),
    ]);
    if (error) { list.innerHTML = emptyState('alert-circle', 'Error', 'No se pudieron cargar.'); return; }
    const myId = session?.user?.id || null;
    if (count) count.textContent = data?.length === 1 ? '1 comentario' : `${data?.length || 0} comentarios`;
    if (!data?.length) { list.innerHTML = emptyState('message-circle', 'Sé el primero en comentar', 'Comparte lo que piensas.'); return; }

    const ids = [...new Set(data.map(c => c.user_id))];
    const { data: perfiles } = await withTimeout(
      db.from('profiles').select('id, username, is_author').in('id', ids),
      8000
    );
    const map = Object.fromEntries((perfiles || []).map(p => [p.id, p]));
    list.innerHTML = data.map(c => renderComment(c, map, myId)).join('');
    activarVerMas();
    activarBorradoComentarios(postId, 'post');
  } catch (e) {
    list.innerHTML = emptyState('alert-circle', 'Timeout', 'Vuelve a intentar.');
  }
}

function renderComment(c, perfilesMap, sessionUserId = null) {
  const p = perfilesMap[c.user_id] || {};
  const fecha = tiempoRelativo(c.created_at);
  const autor = escapeHtml(p.username || 'Lector');
  const badge = p.is_author ? '<span class="comment-badge-c">Autor</span>' : '';
  const texto = escapeHtml(c.content);
  const esMio = sessionUserId && c.user_id === sessionUserId;

  return `
    <div class="comment-c comment-c-new" data-comment-id="${c.id}">
      <div class="comment-head-c comment-head-c-new">
        <div class="comment-author-c">
          ${autor} ${badge}
        </div>
        <div class="comment-actions-c">
          <span class="comment-date-c">${fecha}</span>
          ${esMio ? `
            <button class="comment-delete-btn" data-delete-comment="${c.id}" title="Eliminar comentario" aria-label="Eliminar comentario">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          ` : ''}
        </div>
      </div>
      <div class="comment-body-wrap">
        <div class="comment-body-c comment-body-clamped">${texto}</div>
        <button class="comment-vermas" hidden>Ver más</button>
      </div>
    </div>
  `;
}

function activarVerMas() {
  document.querySelectorAll('.comment-body-wrap').forEach(wrap => {
    const body = wrap.querySelector('.comment-body-c');
    const btn = wrap.querySelector('.comment-vermas');
    if (!body || !btn) return;
    const h = body.scrollHeight;
    if (h > 88) {
      btn.hidden = false;
      btn.addEventListener('click', () => {
        body.classList.remove('comment-body-clamped');
        btn.remove();
      });
    }
  });
}

function activarBorradoComentarios(parentId, tipo) {
  document.querySelectorAll('[data-delete-comment]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const commentId = btn.dataset.deleteComment;
      if (!confirm('¿Eliminar este comentario?')) return;

      showLoading();
      const { error } = await db.from('comments').delete().eq('id', commentId);
      hideLoading();

      if (error) {
        showToast('No se pudo eliminar: ' + error.message, 'error');
        return;
      }
      showToast('Comentario eliminado', 'ok');

      if (tipo === 'post') await cargarComentarios(parentId);
      else await cargarComentariosCapitulo(parentId);
    });
  });
}

async function prepararFormComentario(postId) {
  const mount = document.getElementById('commentFormMount');
  if (!mount) return;
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    mount.innerHTML = `
      <div class="comment-login-prompt-c">
        <p>Inicia sesión para comentar.</p>
        <button class="btn btn-primary" id="commentLoginBtn">Iniciar sesión</button>
      </div>
    `;
    document.getElementById('commentLoginBtn')?.addEventListener('click', () => {
      document.getElementById('authModal').hidden = false;
      window.__showLoginView?.();
    });
    return;
  }
  mount.innerHTML = `
    <form class="comment-form-c" id="commentForm">
      <textarea id="commentText" placeholder="Escribe tu comentario…" required maxlength="2000"></textarea>
      <div class="comment-form-foot">
        <span style="font-size:12px;color:var(--text-tertiary);">Máx. 2000 caracteres</span>
        <button type="submit" class="btn btn-primary">Publicar</button>
      </div>
    </form>
  `;
  document.getElementById('commentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('commentText').value.trim();
    if (!content) return;
    showLoading();
    const { error } = await db.from('comments').insert({ post_id: postId, user_id: session.user.id, content });
    hideLoading();
    if (error) { showToast('No se pudo publicar el comentario', 'error'); return; }
    showToast('Comentario publicado', 'ok');
    document.getElementById('commentText').value = '';
    await cargarComentarios(postId);
  });
}

async function cargarComentariosCapitulo(chapterId) {
  const list = document.getElementById('chapterCommentsList');
  const count = document.getElementById('chapterCommentsCount');
  if (!list) return;
  try {
    const [{ data, error }, { data: { session } }] = await Promise.all([
      withTimeout(
        db.from('comments').select('id, content, created_at, user_id')
          .eq('chapter_id', chapterId).order('created_at', { ascending: true }),
        8000
      ),
      db.auth.getSession(),
    ]);
    if (error) { list.innerHTML = emptyState('alert-circle', 'Error', 'No se pudieron cargar.'); return; }
    const myId = session?.user?.id || null;
    if (count) count.textContent = data?.length === 1 ? '1 comentario' : `${data?.length || 0} comentarios`;
    if (!data?.length) { list.innerHTML = emptyState('message-circle', 'Sé el primero en comentar', 'Comparte lo que piensas.'); return; }

    const ids = [...new Set(data.map(c => c.user_id))];
    const { data: perfiles } = await withTimeout(
      db.from('profiles').select('id, username, is_author').in('id', ids),
      8000
    );
    const map = Object.fromEntries((perfiles || []).map(p => [p.id, p]));
    list.innerHTML = data.map(c => renderComment(c, map, myId)).join('');
    activarVerMas();
    activarBorradoComentarios(chapterId, 'chapter');
  } catch (e) {
    list.innerHTML = emptyState('alert-circle', 'Timeout', 'Vuelve a intentar.');
  }
}

async function prepararFormComentarioCapitulo(chapterId) {
  const mount = document.getElementById('chapterCommentFormMount');
  if (!mount) return;
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    mount.innerHTML = `
      <div class="comment-login-prompt-c">
        <p>Inicia sesión para comentar.</p>
        <button class="btn btn-primary" id="chapterCommentLoginBtn">Iniciar sesión</button>
      </div>
    `;
    document.getElementById('chapterCommentLoginBtn')?.addEventListener('click', () => {
      document.getElementById('authModal').hidden = false;
      window.__showLoginView?.();
    });
    return;
  }
  mount.innerHTML = `
    <form class="comment-form-c" id="chapterCommentForm">
      <textarea id="chapterCommentText" placeholder="Escribe tu comentario…" required maxlength="2000"></textarea>
      <div class="comment-form-foot">
        <span style="font-size:12px;color:var(--text-tertiary);">Máx. 2000 caracteres</span>
        <button type="submit" class="btn btn-primary">Publicar</button>
      </div>
    </form>
  `;
  document.getElementById('chapterCommentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('chapterCommentText').value.trim();
    if (!content) return;
    showLoading();
    const { error } = await db.from('comments').insert({ chapter_id: chapterId, user_id: session.user.id, content });
    hideLoading();
    if (error) { showToast('No se pudo publicar el comentario', 'error'); return; }
    showToast('Comentario publicado', 'ok');
    document.getElementById('chapterCommentText').value = '';
    await cargarComentariosCapitulo(chapterId);
  });
}

/* ---------- LIKES ---------- */
async function cargarLikeBoton(tipo, id) {
  const rowId = tipo === 'story' ? 'storyLikeRow' : 'chapterLikeRow';
  const row = document.getElementById(rowId);
  if (!row) return;

  try {
    const { data: { session } } = await db.auth.getSession();
    const userId = session?.user?.id || null;

    let query = db.from('likes').select('id', { count: 'exact', head: true });
    if (tipo === 'story') {
      query = query.eq('story_id', id).is('chapter_id', null);
    } else {
      query = query.eq('chapter_id', id);
    }

    const { count: totalLikes } = await query;

    let dioLike = false;
    if (userId) {
      let q2 = db.from('likes').select('id');
      if (tipo === 'story') {
        q2 = q2.eq('story_id', id).is('chapter_id', null).eq('user_id', userId);
      } else {
        q2 = q2.eq('chapter_id', id).eq('user_id', userId);
      }
      const { data: myLike } = await q2.maybeSingle();
      dioLike = !!myLike;
    }

    row.innerHTML = `
      <button class="like-btn ${dioLike ? 'liked' : ''}" data-like-tipo="${tipo}" data-like-id="${id}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${dioLike ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
        <span class="like-count">${(totalLikes || 0).toLocaleString('es-ES')}</span>
      </button>
    `;

    row.querySelector('.like-btn')?.addEventListener('click', async () => {
      const { data: { session: s2 } } = await db.auth.getSession();
      if (!s2?.user) {
        showToast('Inicia sesión para dar like', 'info');
        document.getElementById('authModal').hidden = false;
        window.__showLoginView?.();
        return;
      }
      await toggleLike(tipo, id);
    });
  } catch (e) {
    console.warn('Error cargando likes:', e);
  }
}

async function toggleLike(tipo, id) {
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) return;

  const userId = session.user.id;

  try {
    let q = db.from('likes').select('id');
    if (tipo === 'story') {
      q = q.eq('story_id', id).is('chapter_id', null).eq('user_id', userId);
    } else {
      q = q.eq('chapter_id', id).eq('user_id', userId);
    }

    const { data: existing } = await q.maybeSingle();

    if (existing) {
      const { error } = await db.from('likes').delete().eq('id', existing.id);
      if (error) throw error;
      showToast('Like quitado', 'info');
    } else {
      const insert = { user_id: userId };
      if (tipo === 'story') insert.story_id = id;
      else insert.chapter_id = id;
      const { error } = await db.from('likes').insert(insert);
      if (error) throw error;
      showToast('¡Gracias por el like!', 'ok');
    }

    await cargarLikeBoton(tipo, id);
  } catch (e) {
    console.error('Error toggle like:', e);
    showToast('No se pudo actualizar el like', 'error');
  }
}

async function cargarRedes() {
  const grid = document.getElementById('socialGrid');
  if (!grid) return;
  try {
    const { data, error } = await withTimeout(
      db.from('social_links').select('platform, url, display_order').order('display_order', { ascending: true }),
      8000
    );
    if (error || !data?.length) {
      grid.innerHTML = emptyState('share-2', 'Pronto añadiré mis redes', 'Aquí encontrarás todos mis perfiles.');
      return;
    }
    grid.innerHTML = data.map(s => {
      const platform = s.platform.toLowerCase();
      const handle = (s.url || '').replace(/^https?:\/\/(www\.)?/, '').split('/').slice(0, 2).join('/');
      return `
        <a class="social-link-c" href="${s.url}" target="_blank" rel="noopener noreferrer">
          <div class="social-link-c-icon">${socialIconSvg(platform, 20)}</div>
          <div class="social-link-c-body">
            <span class="social-link-c-name">${escapeHtml(capitalize(s.platform))}</span>
            <span class="social-link-c-handle">${escapeHtml(handle)}</span>
          </div>
        </a>
      `;
    }).join('');
  } catch (e) {
    grid.innerHTML = emptyState('alert-circle', 'Timeout', 'Vuelve a intentar.');
  }
}

async function cargarDonaciones() {
  const grid = document.getElementById('donationsGrid');
  if (!grid) return;
  try {
    const { data, error } = await withTimeout(
      db.from('donations')
        .select('id, platform, url, label, display_order')
        .order('display_order', { ascending: true }),
      8000
    );
    if (error || !data?.length) {
      grid.innerHTML = emptyState('heart-handshake', 'Aún no hay formas de donar', 'Pronto añadiré opciones. ¡Gracias por tu interés!');
      return;
    }
    grid.innerHTML = data.map(d => {
      const isBinance = d.platform.toLowerCase() === 'binance';
      const label = d.label || capitalize(d.platform);
      const displayValue = isBinance ? `ID: ${d.url}` : d.url;
      const href = isBinance ? 'https://www.binance.com/' : d.url;
      return `
        <a class="social-link-c" href="${href}" target="_blank" rel="noopener noreferrer">
          <div class="social-link-c-icon">${donationIconSvg(d.platform.toLowerCase(), 20)}</div>
          <div class="social-link-c-body">
            <span class="social-link-c-name">${escapeHtml(label)}</span>
            <span class="social-link-c-handle">${escapeHtml(displayValue)}</span>
          </div>
        </a>
      `;
    }).join('');
  } catch (e) {
    grid.innerHTML = emptyState('alert-circle', 'Timeout', 'Vuelve a intentar.');
  }
}

async function cargarBiografia() {
  const cont = document.getElementById('bioCard');
  if (!cont) return;
  try {
    const { data, error } = await withTimeout(
      db.from('profiles').select('username, bio, avatar_url').eq('is_author', true).limit(1).maybeSingle(),
      8000
    );
    if (error || !data) {
      cont.innerHTML = emptyState('user', 'Sin biografía', 'Pronto escribiré algo sobre mí.');
      return;
    }
    cont.innerHTML = `
      <div class="bio-avatar-c">
        ${data.avatar_url
          ? `<img src="${data.avatar_url}" alt="${escapeHtml(data.username)}" />`
          : escapeHtml((data.username || 'A').charAt(0).toUpperCase())}
      </div>
      <div class="bio-body-c">
        <h2 class="bio-name-c">${escapeHtml(data.username || 'Azael')}</h2>
        <p class="bio-handle-c">Autor</p>
        <div class="bio-text-c">${escapeHtml(data.bio || 'Biografía pendiente.')}</div>
      </div>
    `;
  } catch (e) {
    cont.innerHTML = emptyState('alert-circle', 'Timeout', 'Vuelve a intentar.');
  }
}

async function cargarHistoriaDetalle() {
  const cont = document.getElementById('storyDetail');
  if (!cont) return;
  try {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { render404(cont, 'Historia no encontrada', 'El enlace no incluye un identificador válido.'); return; }

    const cached = cache.get('story:' + id);
    if (cached) renderStory(cached, cont);

    const [storyRes, chaptersRes, sessionRes] = await withTimeout(
      Promise.all([
        db.from('stories').select('*').eq('id', id).maybeSingle(),
        db.from('chapters').select('id, title, chapter_order, created_at, is_premium, reading_time').eq('story_id', id).order('chapter_order', { ascending: true }),
        db.auth.getSession(),
      ]),
      10000
    );

    const story = storyRes.data;
    const chapters = chaptersRes.data || [];
    const logged = !!(sessionRes?.data?.session);

    if (!story) {
      if (!cached) render404(cont, 'Historia no encontrada', 'Puede que haya sido eliminada o el enlace sea incorrecto.');
      return;
    }

    db.from('characters').select('id, name, role, description, avatar_url').eq('story_id', id).order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data?.length) {
          const mount = document.getElementById('charsMount');
          if (mount) {
            mount.innerHTML = renderCharacters(data);
            if (window.lucide) lucide.createIcons();
          }
        }
      }).catch(() => {});

    cache.set('story:' + id, { story, chapters, logged });
    renderStory({ story, chapters, logged }, cont);
    registrarVista(story.id, null);
  } catch (err) {
    console.error('Error historia:', err);
    if (!cont.innerHTML.includes('story-header')) {
      render404(cont, 'No se pudo cargar', 'Hubo un problema de conexión. Intenta de nuevo.');
    }
  }
}

function renderStory({ story, chapters, logged }, cont) {
  document.title = `${story.title} — Azael Colina`;
  const ht = document.querySelector('.header-title');
  if (ht) ht.textContent = story.title;

  const chaptersHtml = chapters.length
    ? chapters.map((c, i) => {
        const locked = c.is_premium && !logged;
        const num = c.chapter_order || (i + 1);
        const ultimaLectura = textoUltimaLectura(c.id);

        let metaHtml;
        if (ultimaLectura) {
          metaHtml = `
            <span class="chapter-row-read">${ic('check-circle', 12)} ${ultimaLectura}</span>
            <span>${tiempoRelativo(c.created_at)}</span>
          `;
        } else {
          metaHtml = `
            <span>${tiempoRelativo(c.created_at)}</span>
            ${c.reading_time ? `<span>${c.reading_time} min</span>` : ''}
          `;
        }

        return `
          <a class="chapter-row" href="capitulo.html?id=${c.id}${locked ? '&locked=1' : ''}">
            <div class="chapter-row-num">${String(num).padStart(2, '0')}</div>
            <div class="chapter-row-body">
              <div class="chapter-row-title">${escapeHtml(c.title)}</div>
              <div class="chapter-row-meta">
                ${metaHtml}
                ${c.is_premium ? '<span style="color:var(--accent-color);font-weight:600;">Premium</span>' : ''}
              </div>
            </div>
            ${locked ? `<div class="chapter-row-lock">${ic('lock', 20)}</div>` : ''}
          </a>
        `;
      }).join('')
    : emptyState('book', 'Sin capítulos aún', 'Pronto empezaré a publicar.');

  const firstChapter = chapters[0];
  const continueBtn = firstChapter
    ? `<a href="capitulo.html?id=${firstChapter.id}" class="btn btn-primary">${ic('book-open')} Empezar a leer</a>`
    : '';

  cont.innerHTML = `
    <div class="container">
      <header class="story-header">
        <div class="story-header-cover">
          <div class="book-cover book-cover-lg">
            ${story.cover_url ? `<img src="${story.cover_url}" />` : escapeHtml(story.title.charAt(0))}
          </div>
        </div>
        <div class="story-header-info">
          <div class="story-badges">
            ${story.genre ? `<span class="badge badge-genre">${escapeHtml(story.genre)}</span>` : ''}
            <span class="badge badge-status">${escapeHtml(story.status || 'En curso')}</span>
          </div>
          <h1 class="story-h1">${escapeHtml(story.title)}</h1>
          <div class="like-row" id="storyLikeRow" style="margin-top:8px;"></div>
          ${story.synopsis ? `<p class="story-synopsis-c">${escapeHtml(story.synopsis)}</p>` : ''}
          <div class="story-stats">
            <div class="story-stats-item">
              <span class="story-stats-label">Capítulos</span>
              <span class="story-stats-value">${chapters.length}</span>
            </div>
            <div class="story-stats-item">
              <span class="story-stats-label">Estado</span>
              <span class="story-stats-value">${escapeHtml(story.status || 'En curso')}</span>
            </div>
          </div>
          ${continueBtn ? `<div style="margin-top:20px;">${continueBtn}</div>` : ''}
        </div>
      </header>
    </div>
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2 class="section-title">Capítulos</h2>
            <p class="section-sub">${logged ? 'Acceso completo' : `Los primeros ${PREMIUM_FREE_LIMIT} capítulos son gratis`}</p>
          </div>
        </div>
        <div class="chapter-list">${chaptersHtml}</div>
      </div>
    </section>
    <div id="charsMount"></div>
  `;
  if (window.lucide) lucide.createIcons();
  cargarLikeBoton('story', story.id);
}

function renderCharacters(chars) {
  return `
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div><h2 class="section-title">Personajes</h2><p class="section-sub">Quiénes protagonizan esta historia</p></div>
        </div>
        <div class="characters-grid">
          ${chars.map(c => `
            <div class="character-card">
              <div class="character-avatar">${c.avatar_url ? `<img src="${c.avatar_url}" />` : escapeHtml(c.name.charAt(0))}</div>
              <div class="character-name">${escapeHtml(c.name)}</div>
              ${c.role ? `<div class="character-role">${escapeHtml(c.role)}</div>` : ''}
              ${c.description ? `<div class="character-desc">${escapeHtml(c.description)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

async function cargarCapitulo() {
  const cont = document.getElementById('chapterContent');
  if (!cont) return;
  loadReaderPrefs();
  try {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { render404(cont, 'Capítulo no encontrado', 'El enlace no incluye un identificador válido.'); return; }

    const [chapterRes, sessionRes] = await withTimeout(
      Promise.all([
        db.from('chapters').select('id, title, content, author_note, chapter_order, story_id, is_premium, reading_time, created_at').eq('id', id).maybeSingle(),
        db.auth.getSession(),
      ]),
      10000
    );

    const chapter = chapterRes.data;
    const logged = !!(sessionRes?.data?.session);

    if (!chapter) { render404(cont, 'Capítulo no encontrado', 'Puede que haya sido eliminado.'); return; }

    const [storyRes, siblingsRes] = await withTimeout(
      Promise.all([
        db.from('stories').select('id, title').eq('id', chapter.story_id).maybeSingle(),
        db.from('chapters').select('id, title, chapter_order').eq('story_id', chapter.story_id).order('chapter_order', { ascending: true }),
      ]),
      10000
    );

    const story = storyRes.data;
    const siblings = siblingsRes.data || [];
    const num = chapter.chapter_order || 0;
    const beyondFree = num > PREMIUM_FREE_LIMIT;
    const requiresAuth = chapter.is_premium || beyondFree;
    const blocked = requiresAuth && !logged;

    document.title = `${chapter.title} — ${story?.title || 'Azael Colina'}`;
    const ht = document.querySelector('.header-title');
    if (ht) ht.textContent = chapter.title;

    if (blocked) {
      cont.innerHTML = `
        <div class="chapter-shell">
          <div class="chapter-head">
            <a href="historia.html?id=${story?.id || ''}" class="chapter-story-link">${ic('arrow-left', 14)} ${escapeHtml(story?.title || '')}</a>
            <h1 class="chapter-title-c">Capítulo ${num} · ${escapeHtml(chapter.title)}</h1>
          </div>
          <div class="paywall">
            <div class="paywall-icon">${ic('lock', 56)}</div>
            <h3>Este capítulo es para lectores registrados</h3>
            <p>Crea una cuenta gratis para seguir leyendo.</p>
            <div class="paywall-actions">
              <button class="btn btn-primary" id="paywallLogin">${ic('log-in', 16)} Iniciar sesión</button>
              <button class="btn btn-ghost" id="paywallRegister">Crear cuenta gratis</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('paywallLogin')?.addEventListener('click', () => {
        document.getElementById('authModal').hidden = false;
        window.__showLoginView?.();
      });
      document.getElementById('paywallRegister')?.addEventListener('click', () => {
        document.getElementById('authModal').hidden = false;
        window.__showRegisterView?.();
      });
      if (window.lucide) lucide.createIcons();
      return;
    }

    marcarComoLeido(chapter.id);
    registrarVista(chapter.story_id, chapter.id);

    const idx = siblings.findIndex(c => c.id === chapter.id);
    const prev = idx > 0 ? siblings[idx - 1] : null;
    const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

    cont.innerHTML = `
      <div class="chapter-shell">
        <div class="chapter-head">
          <a href="historia.html?id=${story?.id || ''}" class="chapter-story-link">${ic('arrow-left', 14)} ${escapeHtml(story?.title || '')}</a>
          <h1 class="chapter-title-c">Capítulo ${num} · ${escapeHtml(chapter.title)}</h1>
          <div class="chapter-meta-c">
            ${chapter.reading_time ? `<span>${ic('clock', 14)} ${chapter.reading_time} min</span>` : ''}
          </div>
          <div class="like-row" id="chapterLikeRow" style="margin-top:16px;"></div>
        </div>
        <div class="chapter-body" id="chapterBody">${chapter.content || '<p>Sin contenido.</p>'}</div>
        ${chapter.author_note ? `<div class="chapter-note"><span class="chapter-note-label">Nota del autor</span>${escapeHtml(chapter.author_note)}</div>` : ''}
        <nav class="chapter-nav">
          ${prev ? `<a class="chapter-nav-btn prev" href="capitulo.html?id=${prev.id}"><span class="chapter-nav-label">${ic('arrow-left', 12)} Anterior</span><span class="chapter-nav-title">${escapeHtml(prev.title)}</span></a>` : `<div class="chapter-nav-btn prev disabled"></div>`}
          <a class="chapter-nav-btn" href="historia.html?id=${story?.id || ''}" style="align-items:center;text-align:center;"><span class="chapter-nav-label">${ic('list', 12)} Índice</span><span class="chapter-nav-title">Ver capítulos</span></a>
          ${next ? `<a class="chapter-nav-btn next" href="capitulo.html?id=${next.id}"><span class="chapter-nav-label">Siguiente ${ic('arrow-right', 12)}</span><span class="chapter-nav-title">${escapeHtml(next.title)}</span></a>` : `<div class="chapter-nav-btn next disabled"></div>`}
        </nav>

        <section class="chapter-comments-section">
          <div class="chapter-comments-head">
            <h2 class="chapter-comments-title">Comentarios</h2>
            <p class="chapter-comments-count" id="chapterCommentsCount">0 comentarios</p>
          </div>
          <div id="chapterCommentFormMount"></div>
          <div class="comments-list" id="chapterCommentsList"></div>
        </section>
      </div>
    `;

    applyReaderPrefs();
    if (window.lucide) lucide.createIcons();

    const actions = document.querySelector('.header-actions');
    if (actions && !document.getElementById('readerSettingsBtn')) {
      const btn = document.createElement('button');
      btn.className = 'icon-action';
      btn.id = 'readerSettingsBtn';
      btn.setAttribute('aria-label', 'Ajustes de lectura');
      btn.innerHTML = ic('type', 18);
      btn.addEventListener('click', abrirReaderSettings);
      actions.insertBefore(btn, actions.firstChild);
      if (window.lucide) lucide.createIcons();
    }

    const progress = document.getElementById('readerProgress');
    if (progress) {
      const update = () => {
        const top = window.scrollY;
        const h = document.documentElement.scrollHeight - window.innerHeight;
        const pct = h > 0 ? (top / h) * 100 : 0;
        progress.style.width = Math.min(100, Math.max(0, pct)) + '%';
        saveReadingPosition(chapter.id, chapter.story_id);
      };
      window.addEventListener('scroll', update, { passive: true });
      update();
    }
    setTimeout(() => restaurarPosicionLectura(chapter.id), 800);

    await cargarComentariosCapitulo(chapter.id);
    await prepararFormComentarioCapitulo(chapter.id);
    cargarLikeBoton('chapter', chapter.id);

  } catch (err) {
    console.error('Error capítulo:', err);
    render404(cont, 'No se pudo cargar', 'Hubo un problema de conexión. Intenta de nuevo.');
  }
}

function abrirReaderSettings() {
  let modal = document.getElementById('readerSettingsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'readerSettingsModal';
    modal.className = 'modal-overlay-c';
    modal.innerHTML = `
      <div class="modal-c">
        <button class="modal-close-c" id="rsClose">${ic('x')}</button>
        <h2 class="modal-title-c">Ajustes de lectura</h2>
        <p class="modal-sub-c">Personaliza cómo lees</p>
        <div class="rs-group">
          <label class="rs-label">Tipografía</label>
          <div class="rs-segment" data-pref="fontFamily">
            <button data-value="serif" class="rs-seg-btn">Serif</button>
            <button data-value="sans" class="rs-seg-btn">Sans</button>
            <button data-value="mono" class="rs-seg-btn">Mono</button>
          </div>
        </div>
        <div class="rs-group">
          <label class="rs-label">Tamaño de letra</label>
          <div class="rs-stepper">
            <button id="rsFontMinus">−</button>
            <span id="rsFontValue">18px</span>
            <button id="rsFontPlus">+</button>
          </div>
        </div>
        <div class="rs-group">
          <label class="rs-label">Interlineado</label>
          <div class="rs-segment" data-pref="lineHeight">
            <button data-value="1.5" class="rs-seg-btn">Compacto</button>
            <button data-value="1.8" class="rs-seg-btn">Normal</button>
            <button data-value="2" class="rs-seg-btn">Amplio</button>
          </div>
        </div>
        <div class="rs-group">
          <label class="rs-label">Tema de lectura</label>
          <div class="rs-segment" data-pref="theme">
            <button data-value="oled" class="rs-seg-btn">OLED</button>
            <button data-value="night" class="rs-seg-btn">Night</button>
            <button data-value="sepia" class="rs-seg-btn">Sepia</button>
          </div>
        </div>
        <button class="btn btn-block" id="rsFullscreen">${ic('book-open', 18)} Modo lectura</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#rsClose').addEventListener('click', () => modal.hidden = true);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

    modal.querySelectorAll('.rs-segment').forEach(seg => {
      seg.querySelectorAll('.rs-seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pref = seg.dataset.pref;
          const val = btn.dataset.value;
          READER_PREFS[pref] = (pref === 'lineHeight') ? parseFloat(val) : val;
          saveReaderPrefs(); applyReaderPrefs(); actualizarReaderUI();
        });
      });
    });
    modal.querySelector('#rsFontMinus').addEventListener('click', () => {
      READER_PREFS.fontSize = Math.max(14, READER_PREFS.fontSize - 1);
      saveReaderPrefs(); applyReaderPrefs(); actualizarReaderUI();
    });
    modal.querySelector('#rsFontPlus').addEventListener('click', () => {
      READER_PREFS.fontSize = Math.min(24, READER_PREFS.fontSize + 1);
      saveReaderPrefs(); applyReaderPrefs(); actualizarReaderUI();
    });
    modal.querySelector('#rsFullscreen').addEventListener('click', () => {
      modal.hidden = true;
      toggleFocusMode();
    });
  }
  modal.hidden = false;
  actualizarReaderUI();
  if (window.lucide) lucide.createIcons();
}

function actualizarReaderUI() {
  const modal = document.getElementById('readerSettingsModal');
  if (!modal) return;
  document.getElementById('rsFontValue').textContent = READER_PREFS.fontSize + 'px';
  modal.querySelectorAll('.rs-segment').forEach(seg => {
    const pref = seg.dataset.pref;
    seg.querySelectorAll('.rs-seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === String(READER_PREFS[pref]));
    });
  });
}

function toggleFocusMode() {
  const isActive = document.body.classList.contains('focus-mode');
  if (isActive) {
    document.body.classList.remove('focus-mode');
    document.body.classList.remove('focus-exit-ready');
    if (document.fullscreenElement) document.exitFullscreen?.();
  } else {
    document.body.classList.add('focus-mode');
    document.documentElement.requestFullscreen?.().catch(() => {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      document.body.classList.add('focus-exit-ready');
    }, 300);
  }
}

function initFocusModeExit() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) {
      toggleFocusMode();
    }
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.classList.contains('focus-mode')) {
      document.body.classList.remove('focus-mode');
      document.body.classList.remove('focus-exit-ready');
    }
  });
  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('focus-mode')) return;
    const rect = {
      right: window.innerWidth - 20,
      bottom: window.innerHeight - 20
    };
    const size = 90;
    if (e.clientX > rect.right - size && e.clientY > rect.bottom - size) {
      toggleFocusMode();
    }
  });
}

function saveReadingPosition(chapterId, storyId) {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  try {
    localStorage.setItem('azael-last-read', JSON.stringify({
      chapterId, storyId, percent: Math.min(100, Math.max(0, percent)), timestamp: Date.now(),
    }));
  } catch {}
}

function restaurarPosicionLectura(chapterId) {
  try {
    const saved = JSON.parse(localStorage.getItem('azael-last-read') || '{}');
    if (saved.chapterId === chapterId && saved.percent > 5 && saved.percent < 95) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const targetY = (saved.percent / 100) * docHeight;
      showResumeToast(targetY);
    }
  } catch {}
}

function showResumeToast(targetY) {
  const el = document.createElement('div');
  el.className = 'resume-toast';
  el.innerHTML = `<span>Continuar desde donde dejaste</span><button>Ir</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  el.querySelector('button').addEventListener('click', () => {
    window.scrollTo({ top: targetY, behavior: 'smooth' });
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  });
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 6000);
}

/* ---------- INIT ---------- */
initTheme();
loadReaderPrefs();
inyectarHeader();
inyectarDrawer();
inyectarAuthModal();
initFocusModeExit();

if (document.referrer && document.referrer.includes('admin')) {
  cache.clear();
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const path = pagActiva();
const params = new URLSearchParams(location.search);

if (path === 'index.html' || path === '') {
  cargarHero();
  cargarNovedades();
  cargarUltimoBlogHome();
  cargarHistorias({ limite: 12, excluirDestacada: true });
} else if (path === 'historias.html') {
  cargarHistorias({ genero: params.get('genero'), busqueda: params.get('q') });
} else if (path === 'generos.html') {
  cargarGeneros();
} else if (path === 'blog.html') {
  cargarBlog();
} else if (path === 'post.html') {
  cargarPost();
} else if (path === 'redes.html') {
  cargarRedes();
} else if (path === 'donaciones.html') {
  cargarDonaciones();
} else if (path === 'biografia.html') {
  cargarBiografia();
} else if (path === 'historia.html') {
  cargarHistoriaDetalle();
} else if (path === 'capitulo.html') {
  cargarCapitulo();
}

if (window.lucide) lucide.createIcons();
window.addEventListener('load', () => { if (window.lucide) lucide.createIcons(); });

/* ============================================
   PWA — Service Worker + Botón Instalar
   ============================================ */

// 1. Registrar el Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[PWA] Service Worker registrado:', reg.scope))
      .catch((err) => console.warn('[PWA] Error al registrar SW:', err));
  });
}

// 2. Capturar el evento de instalación de Chrome
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  mostrarBotonInstalar();
});

// 3. Mostrar botón "Instalar app"
function mostrarBotonInstalar() {
  if (document.getElementById('pwa-install-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'pwa-install-btn';
  btn.innerHTML = '📲 Instalar app';
  btn.className = 'pwa-install-btn';
  btn.setAttribute('aria-label', 'Instalar aplicación');

  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Resultado:', outcome);
    deferredPrompt = null;
    btn.remove();
  });

  document.body.appendChild(btn);
}

// 4. Ocultar el botón si ya está instalada
window.addEventListener('appinstalled', () => {
  console.log('[PWA] App instalada');
  deferredPrompt = null;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.remove();
});
