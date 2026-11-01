/* ============================================
   AZAEL BLOG — main.js (v3 con reseñas rediseñadas)
   ============================================ */

const SUPABASE_URL = 'https://bqliduwiarryqcqtignd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbGlkdXdpYXJyeXFjcXRpZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTU4MzgsImV4cCI6MjEwNjM3MTgzOH0.T6GZXQNjzRwhbuYuVx54vsdTNy2CTpEwCjnxED1KGaY';

const supabaseGlobal = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
const db = supabaseGlobal ? supabaseGlobal.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const THEME_KEY = 'azael-theme-v2';
const PREMIUM_FREE_LIMIT = 5;
const READ_HISTORY_KEY = 'azael-read-history';
const RELATO_MAX_LENGTH = 20000;
const RELATO_MIN_LENGTH = 100;
const RELATOS_PAGE_SIZE = 12;

let relatosCurrentPage = 1;
let relatosAllData = null;
let relatosSearchQuery = '';
let historiasCurrentSearch = '';
let historiasCurrentFilter = 'todos';
let historialFilter = 'capitulos';
let historialRawData = [];

const REACCIONES_DISPONIBLES = [
  { emoji: '❤️', label: 'Me encanta' },
  { emoji: '😂', label: 'Me río' },
  { emoji: '😢', label: 'Me entristece' },
  { emoji: '😮', label: 'Me sorprende' },
  { emoji: '🔥', label: 'Increíble' },
];

let SITE_SETTINGS = {
  show_likes: true,
  show_views: true,
  show_relatos_btn: true,
  show_mis_relatos_menu: true,
  show_resena_likes: true,
};

/* ============================================
   UTILIDADES
   ============================================ */

async function cargarSiteSettings() {
  try {
    const { data } = await db.from('site_settings').select('*').eq('id', 1).maybeSingle();
    if (data) {
      SITE_SETTINGS.show_likes = !!data.show_likes;
      SITE_SETTINGS.show_views = !!data.show_views;
      SITE_SETTINGS.show_relatos_btn = data.show_relatos_btn !== false;
      SITE_SETTINGS.show_mis_relatos_menu = data.show_mis_relatos_menu !== false;
      SITE_SETTINGS.show_resena_likes = data.show_resena_likes !== false;
    }
  } catch (e) {
    console.warn('Error cargando site_settings:', e);
  }
}

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

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatearContenidoRelato(texto) {
  if (!texto) return '<p>Sin contenido.</p>';
  const safe = escapeHtml(texto);
  return safe
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

function capitalize(str) {
  return String(str || '').charAt(0).toUpperCase() + String(str || '').slice(1);
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

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const cumple = new Date(fechaNacimiento);
  if (isNaN(cumple.getTime())) return null;
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
  return edad;
}

async function esUsuarioMayorDeEdad() {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return false;
    const { data: profile } = await db.from('profiles').select('birthdate, is_author').eq('id', session.user.id).maybeSingle();
    if (profile?.is_author) return true;
    const edad = calcularEdad(profile?.birthdate);
    return edad !== null && edad >= 18;
  } catch {
    return false;
  }
}

function ic(name, size = 18) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px;display:inline-block;"></i>`;
}

function pagActiva() {
  let p = (location.pathname.split('/').pop() || 'index').toLowerCase();
  if (p === '' || p === '/') p = 'index';
  if (!p.endsWith('.html')) p += '.html';
  return p;
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

function renderAgeGate(cont) {
  cont.innerHTML = `
    <div class="container" style="padding:60px 20px;">
      <div class="age-gate">
        <div class="age-gate-icon">${ic('shield-alert', 48)}</div>
        <h2>Contenido para mayores de 18 años</h2>
        <p>Esta historia o capítulo contiene temas adultos reservados exclusivamente para lectores mayores de edad.</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <a href="index.html" class="btn btn-ghost">${ic('arrow-left', 16)} Volver al inicio</a>
          <button class="btn btn-primary" id="btnAgeGateLogin">${ic('log-in', 16)} Iniciar sesión (+18)</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('btnAgeGateLogin')?.addEventListener('click', () => {
    const modal = document.getElementById('authModal');
    if (modal) modal.hidden = false;
    window.__showLoginView?.();
  });
  if (window.lucide) lucide.createIcons();
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

/* ============================================
   TEMAS Y PREFERENCIAS DE LECTURA
   ============================================ */

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
}

function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
}

const READER_PREFS = { fontFamily: 'serif', fontSize: 18, lineHeight: 1.6, theme: 'neutral' };

function loadReaderPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem('azael-reader-prefs') || '{}');
    const migracion = { 'oled': 'obsidian', 'night': 'midnight', 'sepia': 'parchment' };
    if (saved.theme && migracion[saved.theme]) saved.theme = migracion[saved.theme];
    Object.assign(READER_PREFS, saved);
  } catch {}
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

/* ============================================
   INSIGNIAS / RANGOS
   ============================================ */

function renderUserBadge(p) {
  if (!p) return '';
  const bType = p.badge_type || (p.is_author ? 'owner' : (p.is_verified ? 'verified' : 'none'));

  if (p.is_author || bType === 'owner') {
    return `
      <span class="badge-rank badge-owner verified-admin-badge" title="Dueño / Autor">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="metalPlatinum" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="30%" stop-color="#d1d5db" />
              <stop offset="65%" stop-color="#f87171" />
              <stop offset="100%" stop-color="#6b7280" />
            </linearGradient>
          </defs>
          <path fill="url(#metalPlatinum)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </span>
    `;
  }

  if (bType === 'moderator') {
    return `<span class="badge-rank badge-moderator" title="Moderador"><svg viewBox="0 0 24 24"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 14.5l-4-4 1.41-1.41L11 13.67l6.59-6.59L19 8.5l-8 8z"/></svg></span>`;
  }

  if (bType === 'collaborator') {
    return `<span class="badge-rank badge-collaborator" title="Colaborador"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg></span>`;
  }

  if (bType === 'vip') {
    return `<span class="badge-rank badge-vip" title="VIP"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>`;
  }

  if (bType === 'verified' || p.is_verified) {
    return `<span class="badge-rank badge-verified verified-user-badge" title="Verificado"><svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"/></svg></span>`;
  }

  return '';
}

/* ============================================
   ICONOS SVG
   ============================================ */

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

/* ============================================
   HISTORIAL LOCAL Y VISTAS
   ============================================ */

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
    await db.from('story_views').insert({ story_id: storyId, chapter_id: chapterId, session_id: getSessionId() });
  } catch (e) { console.warn(e); }
}

async function crearNotificacion({ type, storyId, chapterId, postId, commentId, relatoId }) {
  try {
    const { data: author } = await db.from('profiles').select('id').eq('is_author', true).limit(1).maybeSingle();
    if (!author?.id) return;
    const { data: { session } } = await db.auth.getSession();
    if (session?.user?.id === author.id) return;
    await db.from('notifications').insert({
      user_id: author.id, type,
      from_user_id: session?.user?.id || null,
      story_id: storyId || null,
      chapter_id: chapterId || null,
      post_id: postId || null,
      comment_id: commentId || null,
      relato_id: relatoId || null,
    });
  } catch (e) { console.warn(e); }
}

/* ============================================
   NAVEGACIÓN Y HEADER
   ============================================ */

const NAV_ITEMS = [
  { href: 'index.html', label: 'Inicio', icon: 'home' },
  { href: 'historias.html', label: 'Historias', icon: 'book-open' },
  { href: 'generos.html', label: 'Géneros', icon: 'layout-grid' },
  { href: 'relatos.html', label: 'Relatos', icon: 'pen-line' },
  { href: 'resenas.html', label: 'Reseñas', icon: 'book-marked' },
  { href: 'historial.html', label: 'Historial', icon: 'history' },
  { href: 'blog.html', label: 'Blog', icon: 'feather' },
  { href: 'redes.html', label: 'Redes', icon: 'share-2' },
  { href: 'donaciones.html', label: 'Donaciones', icon: 'heart-handshake' },
  { href: 'biografia.html', label: 'Biografía', icon: 'user' },
];

const PAGE_TITLES = {
  'index.html': 'Inicio', 'historias.html': 'Historias', 'generos.html': 'Géneros',
  'relatos.html': 'Relatos', 'relato.html': 'Relato', 'mis-relatos.html': 'Mis relatos',
  'resenas.html': 'Reseñas', 'resena.html': 'Reseña',
  'historial.html': 'Mi Historial',
  'blog.html': 'Blog', 'post.html': 'Entrada', 'redes.html': 'Redes',
  'biografia.html': 'Biografía', 'historia.html': 'Historia', 'capitulo.html': 'Leyendo',
  'donaciones.html': 'Donaciones', 'perfil.html': 'Mi Perfil',
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

  document.getElementById('hamburgerBtn').addEventListener('click', () => document.body.classList.add('drawer-open'));
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
        <div id="drawerSessionLinks" style="margin-top: auto;"></div>
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
  actualizarDrawerSessionLinks();
}

function actualizarDrawerSessionLinks() {
  const mount = document.getElementById('drawerSessionLinks');
  if (!mount) return;
  const path = pagActiva();

  db.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      let links = `
        <div class="drawer-section" style="padding-top: 10px;">Mi Cuenta</div>
        <a href="perfil.html" class="drawer-link ${path === 'perfil.html' ? 'active' : ''}">
          ${ic('user-circle')} <span>Mi Perfil</span>
        </a>
      `;
      if (SITE_SETTINGS.show_mis_relatos_menu) {
        links += `
          <a href="mis-relatos.html" class="drawer-link ${path === 'mis-relatos.html' ? 'active' : ''}">
            ${ic('pen-line')} <span>Mis relatos</span>
          </a>
        `;
      }
      mount.innerHTML = links;
      if (window.lucide) lucide.createIcons();
    } else {
      mount.innerHTML = '';
    }
  });
}

/* ============================================
   MODAL DE AUTENTICACIÓN
   ============================================ */

function inyectarAuthModal() {
  const mount = document.getElementById('auth-mount');
  if (!mount) return;

  mount.innerHTML = `
    <div class="modal-overlay-c" id="authModal" hidden>
      <div class="modal-c" style="padding-bottom: 80px;">
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

        <div id="registerView" style="display: none;">
          <h2 class="modal-title-c">Crear cuenta</h2>
          <p class="modal-sub-c">Únete para leer todos los capítulos y recibir novedades.</p>

          <form id="registerStep1" class="auth-form-c" style="display: flex;">
            <div style="display: flex; gap: 8px;">
              <label style="flex: 1;">Nombre <input type="text" id="regFirstName" required placeholder="Tu nombre" /></label>
              <label style="flex: 1;">Apellido <input type="text" id="regLastName" required placeholder="Tu apellido" /></label>
            </div>
            <div style="display: flex; gap: 8px;">
              <label style="flex: 1;">Fecha de Nacimiento *
                <input type="date" id="regBirthdate" required />
              </label>
              <label style="flex: 1;">Sexo *
                <select id="regGender" required>
                  <option value="">— Selecciona —</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                  <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                </select>
              </label>
            </div>
            <label>Correo <input type="email" id="regEmail" required autocomplete="email" placeholder="tucorreo@ejemplo.com" /></label>
            <label>Contraseña <input type="password" id="regPassword" required minlength="6" autocomplete="new-password" placeholder="Mínimo 6 caracteres" /></label>
            <label>Repetir Contraseña <input type="password" id="regConfirmPassword" required minlength="6" autocomplete="new-password" placeholder="Repite la contraseña" /></label>
            <div class="auth-consent-c">
              <input type="checkbox" id="regConsent" required />
              <label for="regConsent">Acepto recibir novedades de los libros y del blog por correo.</label>
            </div>
            <p class="auth-error-c" id="regErrorStep1" hidden></p>
            <button type="submit" class="btn btn-primary btn-block">Siguiente</button>
          </form>

          <form id="registerStep2" class="auth-form-c" style="display: none;">
            <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
              Elige tu nombre de usuario visible en la comunidad.<br><strong>⚠️ No podrás cambiarlo después.</strong>
            </p>
            <label>Nombre de usuario (@)
              <div style="display: flex; gap: 8px;">
                <input type="text" id="regUsername" required minlength="3" maxlength="20" placeholder="tu_apodo" style="flex: 1; text-transform: lowercase;" />
                <button type="button" id="btnGenerateUsername" class="btn btn-ghost" style="padding: 0 12px; font-size: 18px;" title="Generar otro">🎲</button>
              </div>
            </label>
            <div id="usernameSuggestions" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;"></div>
            <p class="auth-error-c" id="regErrorStep2" hidden></p>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button type="button" id="btnBackStep1" class="btn btn-ghost" style="flex: 1;">Atrás</button>
              <button type="submit" class="btn btn-primary" style="flex: 2;">Crear cuenta</button>
            </div>
          </form>

          <p class="auth-switch-c" id="regSwitchLogin">¿Ya tienes cuenta? <button type="button" id="goLogin">Iniciar sesión</button></p>
        </div>
      </div>
    </div>
  `;

  const authModal = document.getElementById('authModal');
  const loginView = document.getElementById('loginView');
  const registerView = document.getElementById('registerView');
  const loginForm = document.getElementById('loginForm');
  const registerStep1 = document.getElementById('registerStep1');
  const registerStep2 = document.getElementById('registerStep2');
  const loginError = document.getElementById('loginError');
  const regErrorStep1 = document.getElementById('regErrorStep1');
  const regErrorStep2 = document.getElementById('regErrorStep2');

  function showLoginView() {
    loginView.style.display = 'block';
    registerView.style.display = 'none';
  }
  function showRegisterView() {
    loginView.style.display = 'none';
    registerView.style.display = 'block';
    registerStep1.style.display = 'flex';
    registerStep2.style.display = 'none';
    document.getElementById('regSwitchLogin').style.display = 'block';
    registerStep1.reset();
    regErrorStep1.hidden = true;
    regErrorStep2.hidden = true;
  }

  window.__showLoginView = showLoginView;
  window.__showRegisterView = showRegisterView;

  document.getElementById('authClose').addEventListener('click', () => authModal.hidden = true);
  authModal.addEventListener('click', (e) => { if (e.target === authModal) authModal.hidden = true; });
  document.getElementById('goRegister').addEventListener('click', showRegisterView);
  document.getElementById('goLogin').addEventListener('click', showLoginView);

  registerStep1.addEventListener('submit', (e) => {
    e.preventDefault();
    regErrorStep1.hidden = true;
    const p1 = document.getElementById('regPassword').value;
    const p2 = document.getElementById('regConfirmPassword').value;
    const bdate = document.getElementById('regBirthdate').value;
    const gender = document.getElementById('regGender').value;

    if (p1 !== p2) {
      regErrorStep1.textContent = 'Las contraseñas no coinciden.';
      regErrorStep1.hidden = false;
      return;
    }
    if (!bdate) {
      regErrorStep1.textContent = 'Indica tu fecha de nacimiento.';
      regErrorStep1.hidden = false;
      return;
    }
    if (!gender) {
      regErrorStep1.textContent = 'Selecciona tu sexo.';
      regErrorStep1.hidden = false;
      return;
    }

    const firstName = document.getElementById('regFirstName').value.trim().toLowerCase();
    const lastName = document.getElementById('regLastName').value.trim().toLowerCase();
    const baseName = firstName.replace(/[^a-z0-9]/g, '');
    const baseLast = lastName.replace(/[^a-z0-9]/g, '');
    const randomNum = Math.floor(10 + Math.random() * 90);

    const suggestions = [
      `${baseName}${baseLast}`,
      `${baseName}.${baseLast}`,
      `${baseName}_${baseLast}`,
      `${baseName}${randomNum}`,
      `${baseName.charAt(0)}${baseLast}`,
    ];

    const sugContainer = document.getElementById('usernameSuggestions');
    sugContainer.innerHTML = suggestions.map(s =>
      `<button type="button" class="btn btn-ghost" style="padding: 4px 10px; font-size: 12px; border-radius: 100px; text-transform: lowercase;" onclick="document.getElementById('regUsername').value='${s}'">@${s}</button>`
    ).join('');

    document.getElementById('regUsername').value = suggestions[0];
    registerStep1.style.display = 'none';
    registerStep2.style.display = 'flex';
    document.getElementById('regSwitchLogin').style.display = 'none';
  });

  document.getElementById('btnBackStep1').addEventListener('click', () => {
    registerStep2.style.display = 'none';
    registerStep1.style.display = 'flex';
    document.getElementById('regSwitchLogin').style.display = 'block';
    regErrorStep2.hidden = true;
  });

  document.getElementById('btnGenerateUsername').addEventListener('click', () => {
    const firstName = document.getElementById('regFirstName').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomId = Math.floor(1000 + Math.random() * 9000);
    document.getElementById('regUsername').value = `${firstName || 'lector'}_${randomId}`;
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    showLoading();
    try {
      const { error } = await db.auth.signInWithPassword({
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value,
      });
      if (error) throw error;
      showToast('Sesión iniciada', 'ok');
      authModal.hidden = true;
      loginForm.reset();
      cache.clear();
      actualizarDrawerSessionLinks();
      setTimeout(() => location.reload(), 500);
    } catch (err) {
      loginError.textContent = traducirError(err.message);
      loginError.hidden = false;
    } finally {
      hideLoading();
    }
  });

  registerStep2.addEventListener('submit', async (e) => {
    e.preventDefault();
    regErrorStep2.hidden = true;
    showLoading();

    const rawUsername = document.getElementById('regUsername').value.trim().toLowerCase();
    const username = rawUsername.replace(/[^a-z0-9_]/g, '');

    if (username.length < 3) {
      hideLoading();
      regErrorStep2.textContent = 'El @ debe tener al menos 3 caracteres (letras, números, _).';
      regErrorStep2.hidden = false;
      return;
    }

    try {
      const { data: existingUser } = await db.from('profiles').select('id').eq('username', username).maybeSingle();
      if (existingUser) throw new Error('Ese @ ya está en uso. Elige otro.');

      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const firstName = document.getElementById('regFirstName').value.trim();
      const lastName = document.getElementById('regLastName').value.trim();
      const birthdate = document.getElementById('regBirthdate').value;
      const gender = document.getElementById('regGender').value;

      const { data: signUpData, error } = await db.auth.signUp({
        email, password,
        options: { data: { username, first_name: firstName, last_name: lastName, birthdate, gender, newsletter: true } },
      });
      if (error) throw error;

      if (signUpData?.user?.id) {
        await db.from('profiles').update({ username, birthdate, gender }).eq('id', signUpData.user.id);
        try {
          const { data: author } = await db.from('profiles').select('id').eq('is_author', true).limit(1).maybeSingle();
          if (author?.id) {
            await db.from('notifications').insert({ user_id: author.id, type: 'new_user', from_user_id: signUpData.user.id });
          }
        } catch (e) { console.warn(e); }
      }

      showToast('Cuenta creada. ¡Bienvenido!', 'ok');
      authModal.hidden = true;
      document.getElementById('regPassword').value = '';
      document.getElementById('regConfirmPassword').value = '';
      cache.clear();
      actualizarDrawerSessionLinks();
      setTimeout(() => location.reload(), 500);
    } catch (err) {
      regErrorStep2.textContent = traducirError(err.message);
      regErrorStep2.hidden = false;
    } finally {
      hideLoading();
    }
  });

  db.auth.onAuthStateChange((_event, session) => {
    const label = document.getElementById('drawerAuthLabel');
    if (label) label.textContent = session?.user ? 'Cerrar sesión' : 'Iniciar sesión';
    actualizarDrawerSessionLinks();
  });

  if (window.lucide) lucide.createIcons();
}
/* ============================================
   HOME — HERO / NOVEDADES / PRÓXIMAMENTE / RELATOS HOME / BLOG
   ============================================ */

async function cargarHero() {
  const cont = document.getElementById('heroMount');
  if (!cont) return;

  try {
    const esMayor = await esUsuarioMayorDeEdad();
    let q = db.from('stories').select('id, title, synopsis, cover_url, genre, status, is_featured, age_rating')
      .eq('is_published', true)
      .neq('status', 'Borrador')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (!esMayor) q = q.neq('age_rating', '+18 (Adulto)');

    const { data, error } = await withTimeout(q.limit(10), 8000);

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
        <button class="hero-nav hero-nav-prev" id="heroPrev" aria-label="Anterior">${ic('chevron-left', 22)}</button>
        <button class="hero-nav hero-nav-next" id="heroNext" aria-label="Siguiente">${ic('chevron-right', 22)}</button>
        <div class="hero-dots" id="heroDots">
          ${data.map((_, i) => `<button class="hero-dot ${i === 0 ? 'active' : ''}" data-slide="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}
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
  const isComingSoon = s.status === 'Próximamente';

  return `
    <div class="hero-slide">
      <div class="hero-bg">
        ${s.cover_url ? `<img src="${s.cover_url}" alt="" ${isFirst ? '' : 'loading="lazy"'} />` : ''}
      </div>
      <div class="hero-content container">
        <div style="display: flex; gap: 8px; margin-bottom: 16px; align-items: center; flex-wrap: wrap;">
          ${isFeatured ? '<span class="hero-tag" style="margin-bottom:0;">Historia destacada</span>' : '<span class="hero-tag hero-tag-alt" style="margin-bottom:0;">Historia</span>'}
          ${isComingSoon ? '<span class="badge" style="background: var(--accent-color); color: #fff; padding: 5px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; border-radius: 100px;">Próximamente</span>' : ''}
        </div>
        <h1 class="hero-title-c">${escapeHtml(s.title)}</h1>
        ${s.synopsis ? `<p class="hero-synopsis">${escapeHtml(s.synopsis)}</p>` : ''}
        ${!isComingSoon ? `
        <div class="hero-actions-c">
          <a href="historia.html?id=${s.id}" class="btn btn-primary">${ic('book-open')} Empezar a leer</a>
          <a href="historias.html" class="btn btn-ghost">Ver todas</a>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderHeroSlide(s, cont, isFirst) {
  cont.innerHTML = `<section class="hero-cinematic">${renderHeroSlideHTML(s, isFirst)}</section>`;
  if (window.lucide) lucide.createIcons();
}

async function cargarNovedades() {
  const cont = document.getElementById('novedadesMount');
  if (!cont) return;

  try {
    const esMayor = await esUsuarioMayorDeEdad();
    const { data, error } = await withTimeout(
      db.from('chapters').select('id, title, chapter_order, created_at, story_id, publish_at, stories(id, title, cover_url, status, age_rating)')
        .order('created_at', { ascending: false })
        .limit(30),
      8000
    );

    if (error || !data?.length) return;

    const nowTime = Date.now();
    const capítulosVisibles = data.filter(c => {
      if (!c.stories || c.stories.status === 'Borrador') return false;
      if (!esMayor && c.stories.age_rating === '+18 (Adulto)') return false;
      if (c.publish_at) {
        const pubTime = new Date(c.publish_at).getTime();
        if (pubTime > nowTime) return false;
      }
      return true;
    }).slice(0, 10);

    if (!capítulosVisibles.length) { cont.innerHTML = ''; return; }

    cont.innerHTML = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <div><h2 class="section-title">Novedades</h2><p class="section-sub">Últimos capítulos publicados</p></div>
            <a href="historias.html" class="section-link">Ver todo ${ic('arrow-right', 14)}</a>
          </div>
          <div class="horizontal-carousel">
            ${capítulosVisibles.map(c => {
              const story = c.stories || {};
              return `
                <a class="chapter-card" href="capitulo.html?id=${c.id}">
                  <div class="chapter-card-cover">
                    ${story.cover_url ? `<img src="${story.cover_url}" alt="" loading="lazy" />` : escapeHtml((story.title || '?').charAt(0))}
                  </div>
                  <div class="chapter-card-body">
                    <div class="chapter-card-story">${escapeHtml(story.title || 'Historia')}</div>
                    <div class="chapter-card-title">Cap. ${c.chapter_order || '?'} · ${escapeHtml(c.title)}</div>
                    <div class="chapter-card-meta"><span>${tiempoRelativo(c.created_at)}</span></div>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      </section>
    `;
    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.warn('Novedades timeout:', e);
  }
}

async function cargarProximamente() {
  const cont = document.getElementById('proximamenteMount');
  if (!cont) return;

  try {
    const esMayor = await esUsuarioMayorDeEdad();
    let q = db.from('stories')
      .select('id, title, synopsis, cover_url, genre, status, release_date, age_rating')
      .eq('is_published', true)
      .eq('status', 'Próximamente')
      .order('created_at', { ascending: false });

    if (!esMayor) q = q.neq('age_rating', '+18 (Adulto)');

    const { data, error } = await withTimeout(q, 8000);
    if (error || !data?.length) { cont.innerHTML = ''; return; }

    cont.innerHTML = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <div><h2 class="section-title">Próximamente</h2><p class="section-sub">Historias que están por llegar</p></div>
          </div>
          <div class="stories-grid-c">
            ${data.map(s => {
              let fechaTexto = null;
              if (s.release_date) {
                const partes = s.release_date.split('-');
                fechaTexto = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : s.release_date;
              }
              return `
                <a class="story-card-c story-card-coming-soon" href="historia.html?id=${s.id}">
                  <div class="book-cover">
                    ${s.cover_url ? `<img src="${s.cover_url}" alt="${escapeHtml(s.title)}" loading="lazy" />` : escapeHtml(s.title.charAt(0))}
                    <div class="coming-soon-overlay">
                      <span class="coming-soon-badge">Próximamente</span>
                      ${fechaTexto ? `<span class="coming-soon-date">${fechaTexto}</span>` : ''}
                    </div>
                  </div>
                  <h3 class="story-card-c-title">${escapeHtml(s.title)}</h3>
                  <div class="story-card-c-meta">${escapeHtml(s.genre || 'Sin género')}</div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      </section>
    `;
    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.warn('Error cargando próximamente:', e);
  }
}

async function cargarRelatosHome() {
  const cont = document.getElementById('relatosHomeMount');
  if (!cont) return;

  try {
    const { data: relatos, error } = await withTimeout(
      db.from('relatos').select('id, title, content, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      8000
    );

    if (error || !relatos?.length) return;

    const userIds = [...new Set(relatos.map(r => r.user_id))];
    const { data: perfiles } = await withTimeout(db.from('profiles').select('id, username').in('id', userIds), 8000);
    const perfilesMap = Object.fromEntries((perfiles || []).map(p => [p.id, p]));

    cont.innerHTML = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <div><h2 class="section-title">Relatos de la comunidad</h2><p class="section-sub">Historias cortas escritas por lectores</p></div>
            <a href="relatos.html" class="section-link">Ver todos ${ic('arrow-right', 14)}</a>
          </div>
          <div class="relatos-home-carousel">
            ${relatos.map(r => {
              const autor = perfilesMap[r.user_id] || {};
              const nombre = autor.username || 'Lector';
              const excerpt = (r.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 120);
              return `
                <a class="relato-home-card" href="relato.html?id=${r.id}">
                  <div class="relato-home-card-title">${escapeHtml(r.title)}</div>
                  <div class="relato-home-card-author">Por <strong>@${escapeHtml(nombre)}</strong></div>
                  <div class="relato-home-card-excerpt">${escapeHtml(excerpt)}…</div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      </section>
    `;
    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.warn('Error cargando relatos home:', e);
  }
}

async function cargarUltimoBlogHome() {
  const cont = document.getElementById('ultimoBlogMount');
  if (!cont) return;

  try {
    const { data, error } = await withTimeout(
      db.from('blog_posts').select('id, title, content, created_at, cover_url')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
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
  } catch (e) {
    console.warn('Último blog timeout:', e);
  }
}

/* ============================================
   CATÁLOGO DE HISTORIAS
   ============================================ */

async function cargarHistorias({ limite = null, excluirDestacada = false, genero = null, busqueda = null } = {}) {
  const grid = document.getElementById('storiesGrid');
  if (!grid) return;

  try {
    const esMayor = await esUsuarioMayorDeEdad();
    let query = db.from('stories').select('id, title, synopsis, cover_url, genre, status, is_featured, tags, age_rating')
      .eq('is_published', true)
      .neq('status', 'Próximamente')
      .neq('status', 'Borrador')
      .order('created_at', { ascending: false });

    if (!esMayor) query = query.neq('age_rating', '+18 (Adulto)');
    if (excluirDestacada) query = query.eq('is_featured', false);
    if (genero) query = query.ilike('genre', `%${genero}%`);

    if (busqueda) {
      query = query.or(`title.ilike.%${busqueda}%,synopsis.ilike.%${busqueda}%,tags.ilike.%${busqueda}%`);
    }

    if (historiasCurrentFilter === 'emision') query = query.eq('status', 'En emisión');
    if (historiasCurrentFilter === 'finalizado') query = query.eq('status', 'Finalizado');
    if (historiasCurrentFilter === 'pausa') query = query.eq('status', 'En pausa');
    if (historiasCurrentFilter === 'adulto') {
      if (!esMayor) {
        grid.innerHTML = emptyState('lock', 'Contenido restringido', 'Debes iniciar sesión con una cuenta mayor de 18 años para ver este catálogo.');
        if (window.lucide) lucide.createIcons();
        return;
      }
      query = query.eq('age_rating', '+18 (Adulto)');
    }

    if (limite) query = query.limit(limite);

    const { data, error } = await withTimeout(query, 10000);

    if (error || !data?.length) {
      grid.innerHTML = emptyState('search', 'Sin resultados', 'Prueba con otros filtros o términos de búsqueda.');
      if (window.lucide) lucide.createIcons();
      return;
    }

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
      <div class="story-card-c-meta">
        ${escapeHtml(s.genre || 'Sin género')}
        ${s.age_rating === '+18 (Adulto)' ? '<span class="badge" style="background:rgba(229,9,20,0.15);color:var(--accent-color);font-size:9px;padding:2px 6px;margin-left:4px;">+18</span>' : ''}
      </div>
    </a>
  `).join('');
}

const GENEROS = [
  { slug: 'romance', label: 'Romance', icon: 'heart' },
  { slug: 'terror', label: 'Terror', icon: 'skull' },
  { slug: 'comedia', label: 'Comedia', icon: 'smile' },
  { slug: 'misterio', label: 'Misterio', icon: 'search' },
  { slug: 'musica', label: 'Música', icon: 'music' },
  { slug: 'violencia', label: 'Violencia', icon: 'droplet' },
  { slug: 'suspenso', label: 'Suspenso', icon: 'eye' },
  { slug: 'aventura', label: 'Aventura', icon: 'compass' },
  { slug: 'fantasia', label: 'Fantasía', icon: 'sparkles' },
  { slug: 'ciencia', label: 'Ciencia ficción', icon: 'rocket' },
  { slug: 'drama', label: 'Drama', icon: 'theater' },
  { slug: 'poesia', label: 'Poesía', icon: 'feather' },
  { slug: 'espiritual', label: 'Espiritual', icon: 'sparkle' },
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

/* ============================================
   BLOG Y POSTS
   ============================================ */

async function cargarBlog(limite = null) {
  const list = document.getElementById('blogList');
  if (!list) return;

  try {
    let q = db.from('blog_posts').select('id, title, content, created_at, cover_url')
      .eq('published', true)
      .order('created_at', { ascending: false });

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

    if (error || !data) { render404(cont, 'Entrada no encontrada', 'Puede que haya sido eliminada.'); return; }

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
    render404(cont, 'No se pudo cargar', 'Hubo un problema de conexión.');
  }
}

/* ============================================
   COMENTARIOS (reutilizables para post/capítulo/relato)
   ============================================ */

async function cargarComentarios(postId) {
  const list = document.getElementById('commentsList');
  const count = document.getElementById('commentsCount');
  if (!list) return;

  try {
    const [{ data, error }, { data: { session } }] = await Promise.all([
      withTimeout(db.from('comments').select('id, content, created_at, user_id').eq('post_id', postId).order('created_at', { ascending: true }), 8000),
      db.auth.getSession(),
    ]);

    if (error) { list.innerHTML = emptyState('alert-circle', 'Error', 'No se pudieron cargar.'); return; }
    const myId = session?.user?.id || null;
    if (count) count.textContent = data?.length === 1 ? '1 comentario' : `${data?.length || 0} comentarios`;
    if (!data?.length) { list.innerHTML = emptyState('message-circle', 'Sé el primero en comentar', 'Comparte lo que piensas.'); return; }

    const ids = [...new Set(data.map(c => c.user_id))];
    const { data: perfiles } = await withTimeout(db.from('profiles').select('id, username, is_author, is_verified, badge_type').in('id', ids), 8000);
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
  const badgeHtml = renderUserBadge(p);
  const texto = escapeHtml(c.content);
  const esMio = sessionUserId && c.user_id === sessionUserId;
  const autorLink = `<a href="perfil.html?id=${c.user_id}" style="color:inherit;text-decoration:none;">@${autor}</a>`;

  return `
    <div class="comment-c comment-c-new" data-comment-id="${c.id}">
      <div class="comment-head-c comment-head-c-new">
        <div class="comment-author-c">${autorLink} ${badgeHtml}</div>
        <div class="comment-actions-c">
          <span class="comment-date-c">${fecha}</span>
          ${esMio ? `<button class="comment-delete-btn" data-delete-comment="${c.id}" title="Eliminar comentario">${ic('trash-2', 14)}</button>` : ''}
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
    if (body.scrollHeight > 88) {
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
      const tabla = tipo === 'relato' ? 'relato_comments' : 'comments';
      const { error } = await db.from(tabla).delete().eq('id', commentId);
      hideLoading();
      if (error) { showToast('No se pudo eliminar: ' + error.message, 'error'); return; }
      showToast('Comentario eliminado', 'ok');
      if (tipo === 'post') await cargarComentarios(parentId);
      else if (tipo === 'chapter') await cargarComentariosCapitulo(parentId);
      else if (tipo === 'relato') await cargarComentariosRelato(parentId);
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
    const { data: insertedComment, error } = await db.from('comments')
      .insert({ post_id: postId, user_id: session.user.id, content })
      .select()
      .maybeSingle();
    hideLoading();
    if (error) { showToast('No se pudo publicar el comentario', 'error'); return; }
    showToast('Comentario publicado', 'ok');
    document.getElementById('commentText').value = '';
    crearNotificacion({ type: 'comment_post', postId, commentId: insertedComment?.id });
    await cargarComentarios(postId);
  });
}

/* ============================================
   HISTORIA DETALLE
   ============================================ */

async function cargarHistoriaDetalle() {
  const cont = document.getElementById('storyDetail');
  if (!cont) return;

  try {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { render404(cont, 'Historia no encontrada', 'El enlace no incluye un identificador válido.'); return; }

    const [storyRes, chaptersRes, sessionRes] = await withTimeout(
      Promise.all([
        db.from('stories').select('*').eq('id', id).maybeSingle(),
        db.from('chapters').select('id, title, chapter_order, created_at, is_premium, publish_at').eq('story_id', id).order('chapter_order', { ascending: true }),
        db.auth.getSession(),
      ]),
      10000
    );

    const story = storyRes.data;
    if (!story) { render404(cont, 'Historia no encontrada', 'Puede que haya sido eliminada.'); return; }

    if (story.age_rating === '+18 (Adulto)') {
      const esMayor = await esUsuarioMayorDeEdad();
      if (!esMayor) { renderAgeGate(cont); return; }
    }

    const chaptersRaw = chaptersRes.data || [];
    const logged = !!(sessionRes?.data?.session);
    const nowTime = Date.now();
    const chaptersVisibles = chaptersRaw.filter(c => {
      if (!c.publish_at) return true;
      return new Date(c.publish_at).getTime() <= nowTime;
    });

    renderStory({ story, chapters: chaptersVisibles, logged }, cont);
    registrarVista(story.id, null);
  } catch (err) {
    console.error('Error historia:', err);
    render404(cont, 'No se pudo cargar', 'Hubo un problema de conexión.');
  }
}

function renderStory({ story, chapters, logged }, cont) {
  document.title = `${story.title} — Azael Colina`;
  const ht = document.querySelector('.header-title');
  if (ht) ht.textContent = story.title;

  const isComingSoon = story.status === 'Próximamente';

  const chaptersHtml = isComingSoon
    ? `<div class="empty-c" style="margin-top: 20px;"><div class="empty-title">Este libro aún no tiene capítulos</div><div class="empty-sub">¡Pronto estará disponible!</div></div>`
    : (chapters.length ? chapters.map((c, i) => {
        const locked = c.is_premium && !logged;
        const num = c.chapter_order || (i + 1);
        const ultimaLectura = textoUltimaLectura(c.id);

        let metaHtml = ultimaLectura
          ? `<span class="chapter-row-read">${ic('check-circle', 12)} ${ultimaLectura}</span><span>${tiempoRelativo(c.created_at)}</span>`
          : `<span>${tiempoRelativo(c.created_at)}</span>`;

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
      }).join('') : emptyState('book', 'Sin capítulos aún', 'Pronto empezaré a publicar.'));

  const firstChapter = chapters[0];
  const continueBtn = (firstChapter && !isComingSoon)
    ? `<a href="capitulo.html?id=${firstChapter.id}" class="btn btn-primary">${ic('book-open')} Empezar a leer</a>`
    : '';

  const tagsHtml = story.tags
    ? `<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px;">
        ${story.tags.split(',').map(tag => `<span style="font-size: 11.5px; background: var(--bg-surface); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 100px; color: var(--text-secondary);">#${escapeHtml(tag.trim().replace(/\s+/g, ''))}</span>`).join('')}
       </div>`
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
            ${story.age_rating && story.age_rating !== 'Todo público' ? `<span class="badge" style="background: rgba(229,9,20,0.15); color: var(--accent-color); border: 1px solid rgba(229,9,20,0.3);">${escapeHtml(story.age_rating)}</span>` : ''}
            <span class="badge badge-status">${escapeHtml(story.status || 'En curso')}</span>
            ${isComingSoon ? '<span class="badge" style="background: var(--accent-color); color: #fff; border: none;">Próximamente</span>' : ''}
          </div>
          <h1 class="story-h1">${escapeHtml(story.title)}</h1>
          <div class="like-row" id="storyLikeRow" style="margin-top:8px;"></div>
          ${story.synopsis ? `<p class="story-synopsis-c">${escapeHtml(story.synopsis)}</p>` : ''}
          ${tagsHtml}
          <div class="story-stats" style="margin-top: 16px;">
            <div class="story-stats-item"><span class="story-stats-label">Capítulos</span><span class="story-stats-value">${chapters.length}</span></div>
            <div class="story-stats-item"><span class="story-stats-label">Estado</span><span class="story-stats-value">${escapeHtml(story.status || 'En curso')}</span></div>
          </div>
          ${continueBtn ? `<div style="margin-top:20px;">${continueBtn}</div>` : ''}
        </div>
      </header>
    </div>
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div><h2 class="section-title">Capítulos</h2><p class="section-sub">${logged ? 'Acceso completo' : `Los primeros ${PREMIUM_FREE_LIMIT} capítulos son gratis`}</p></div>
        </div>
        <div class="chapter-list">${chaptersHtml}</div>
      </div>
    </section>
  `;

  if (window.lucide) lucide.createIcons();
  cargarLikeBoton('story', story.id);
}

/* ============================================
   CAPÍTULO (con paywall, anti-copia, ajustes, marcar leído)
   ============================================ */

async function cargarCapitulo() {
  const cont = document.getElementById('chapterContent');
  if (!cont) return;
  loadReaderPrefs();

  try {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { render404(cont, 'Capítulo no encontrado', 'Falta el identificador.'); return; }

    const [chapterRes, sessionRes] = await withTimeout(
      Promise.all([
        db.from('chapters').select('id, title, content, author_note, chapter_order, story_id, is_premium, created_at, publish_at').eq('id', id).maybeSingle(),
        db.auth.getSession(),
      ]),
      10000
    );

    const chapter = chapterRes.data;
    if (!chapter) { render404(cont, 'Capítulo no encontrado', 'Puede que haya sido eliminado.'); return; }

    const { data: story } = await db.from('stories').select('id, title, age_rating').eq('id', chapter.story_id).maybeSingle();

    if (story?.age_rating === '+18 (Adulto)') {
      const esMayor = await esUsuarioMayorDeEdad();
      if (!esMayor) { renderAgeGate(cont); return; }
    }

    if (chapter.publish_at && new Date(chapter.publish_at).getTime() > Date.now()) {
      render404(cont, 'Capítulo no disponible', 'Este capítulo aún no ha sido publicado. Vuelve más tarde.');
      return;
    }

    const { data: siblings } = await db.from('chapters').select('id, title, chapter_order').eq('story_id', chapter.story_id).order('chapter_order', { ascending: true });

    const logged = !!(sessionRes?.data?.session);
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

    const idx = (siblings || []).findIndex(c => c.id === chapter.id);
    const prev = idx > 0 ? siblings[idx - 1] : null;
    const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

    cont.innerHTML = `
      <div class="chapter-shell">
        <div class="chapter-head">
          <a href="historia.html?id=${story?.id || ''}" class="chapter-story-link">${ic('arrow-left', 14)} ${escapeHtml(story?.title || '')}</a>
          <h1 class="chapter-title-c">Capítulo ${num} · ${escapeHtml(chapter.title)}</h1>
          <div style="display:flex; gap:10px; align-items:center; margin-top:16px; flex-wrap:wrap;">
            <div class="like-row" id="chapterLikeRow"></div>
            <button class="btn-mark-read" id="btnMarkRead">${ic('check-circle', 16)} <span id="btnMarkReadText">Marcar como leído</span></button>
          </div>
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
    aplicarProteccionCapitulo();

    const actions = document.querySelector('.header-actions');
    if (actions && !document.getElementById('readerSettingsBtn')) {
      const btn = document.createElement('button');
      btn.className = 'icon-action reader-settings-btn-visible';
      btn.id = 'readerSettingsBtn';
      btn.innerHTML = '<strong style="font-family:Georgia,serif;font-size:15px;">Aa</strong>';
      btn.addEventListener('click', abrirReaderSettings);
      actions.insertBefore(btn, actions.firstChild);
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

    const btnMarkRead = document.getElementById('btnMarkRead');
    const btnMarkReadText = document.getElementById('btnMarkReadText');
    const currentUser = sessionRes?.data?.session?.user;

    if (btnMarkRead && currentUser) {
      const { data: readData } = await db.from('chapter_reads').select('id').eq('chapter_id', chapter.id).eq('user_id', currentUser.id).maybeSingle();
      let isRead = !!readData;
      const updateBtn = () => {
        btnMarkRead.classList.toggle('read', isRead);
        btnMarkReadText.textContent = isRead ? 'Leído' : 'Marcar como leído';
      };
      updateBtn();

      btnMarkRead.addEventListener('click', async () => {
        showLoading();
        if (isRead) {
          await db.from('chapter_reads').delete().eq('chapter_id', chapter.id).eq('user_id', currentUser.id);
          isRead = false;
        } else {
          await db.from('chapter_reads').insert({ chapter_id: chapter.id, user_id: currentUser.id });
          isRead = true;
          showToast('¡Guardado en tu progreso!', 'ok');
        }
        hideLoading();
        updateBtn();
      });
    }
  } catch (err) {
    console.error('Error capítulo:', err);
    render404(cont, 'No se pudo cargar', 'Hubo un problema de conexión.');
  }
}

async function cargarComentariosCapitulo(chapterId) {
  const list = document.getElementById('chapterCommentsList');
  const count = document.getElementById('chapterCommentsCount');
  if (!list) return;

  try {
    const [{ data, error }, { data: { session } }] = await Promise.all([
      withTimeout(db.from('comments').select('id, content, created_at, user_id').eq('chapter_id', chapterId).order('created_at', { ascending: true }), 8000),
      db.auth.getSession(),
    ]);

    if (error) { list.innerHTML = emptyState('alert-circle', 'Error', 'No se pudieron cargar.'); return; }
    const myId = session?.user?.id || null;
    if (count) count.textContent = data?.length === 1 ? '1 comentario' : `${data?.length || 0} comentarios`;
    if (!data?.length) { list.innerHTML = emptyState('message-circle', 'Sé el primero en comentar', 'Comparte lo que piensas.'); return; }

    const ids = [...new Set(data.map(c => c.user_id))];
    const { data: perfiles } = await withTimeout(db.from('profiles').select('id, username, is_author, is_verified, badge_type').in('id', ids), 8000);
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
    const { data: insertedComment, error } = await db.from('comments')
      .insert({ chapter_id: chapterId, user_id: session.user.id, content })
      .select()
      .maybeSingle();
    hideLoading();
    if (error) { showToast('No se pudo publicar el comentario', 'error'); return; }
    showToast('Comentario publicado', 'ok');
    document.getElementById('chapterCommentText').value = '';
    const { data: ch } = await db.from('chapters').select('story_id').eq('id', chapterId).maybeSingle();
    crearNotificacion({ type: 'comment_chapter', storyId: ch?.story_id, chapterId, commentId: insertedComment?.id });
    await cargarComentariosCapitulo(chapterId);
  });
}

/* ============================================
   LIKES Y VISTAS
   ============================================ */

async function cargarLikeBoton(tipo, id) {
  const rowId = tipo === 'story' ? 'storyLikeRow' : 'chapterLikeRow';
  const row = document.getElementById(rowId);
  if (!row) return;

  try {
    const { data: { session } } = await db.auth.getSession();
    const userId = session?.user?.id || null;
    let dioLike = false;

    if (userId) {
      let q2 = db.from('likes').select('id');
      if (tipo === 'story') q2 = q2.eq('story_id', id).is('chapter_id', null).eq('user_id', userId);
      else q2 = q2.eq('chapter_id', id).eq('user_id', userId);
      const { data: myLike } = await q2.maybeSingle();
      dioLike = !!myLike;
    }

    let queryCount = db.from('likes').select('id', { count: 'exact', head: true });
    if (tipo === 'story') queryCount = queryCount.eq('story_id', id).is('chapter_id', null);
    else queryCount = queryCount.eq('chapter_id', id);
    const { count } = await queryCount;
    const totalLikes = count || 0;

    let totalVistas = 0;
    if (SITE_SETTINGS.show_views) {
      try {
        const { data: v } = await db.rpc(tipo === 'story' ? 'count_story_views' : 'count_chapter_views', {
          [tipo === 'story' ? 'story_id_param' : 'chapter_id_param']: id,
        });
        totalVistas = v || 0;
      } catch (e) { console.warn(e); }
    }

    const spanLikes = SITE_SETTINGS.show_likes
      ? `<span class="like-count">${totalLikes.toLocaleString('es-ES')}</span>`
      : '';
    const spanVistas = SITE_SETTINGS.show_views
      ? `<span class="views-counter" title="Visualizaciones">${ic('eye', 14)} ${totalVistas.toLocaleString('es-ES')}</span>`
      : '';

    row.innerHTML = `
      <div class="like-row-inner">
        <button class="like-btn ${dioLike ? 'liked' : ''}" data-like-tipo="${tipo}" data-like-id="${id}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${dioLike ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
          </svg>
          ${SITE_SETTINGS.show_likes ? spanLikes : `<span class="like-label">${dioLike ? 'Te gusta' : 'Me gusta'}</span>`}
        </button>
        ${spanVistas}
      </div>
    `;

    row.querySelector('.like-btn')?.addEventListener('click', async () => {
      const { data: { session: s2 } } = await db.auth.getSession();
      if (!s2?.user) {
        showToast('Inicia sesión para dar me gusta', 'info');
        document.getElementById('authModal').hidden = false;
        window.__showLoginView?.();
        return;
      }
      await toggleLike(tipo, id);
    });
  } catch (e) { console.warn(e); }
}

async function toggleLike(tipo, id) {
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) return;
  const userId = session.user.id;

  try {
    let q = db.from('likes').select('id');
    if (tipo === 'story') q = q.eq('story_id', id).is('chapter_id', null).eq('user_id', userId);
    else q = q.eq('chapter_id', id).eq('user_id', userId);

    const { data: existing } = await q.maybeSingle();

    if (existing) {
      await db.from('likes').delete().eq('id', existing.id);
      showToast('Me gusta quitado', 'info');
    } else {
      const insert = { user_id: userId };
      if (tipo === 'story') insert.story_id = id;
      else insert.chapter_id = id;
      await db.from('likes').insert(insert);
      showToast('¡Gracias por el me gusta!', 'ok');
      if (tipo === 'story') crearNotificacion({ type: 'like_story', storyId: id });
      else {
        const { data: ch } = await db.from('chapters').select('story_id').eq('id', id).maybeSingle();
        crearNotificacion({ type: 'like_chapter', storyId: ch?.story_id, chapterId: id });
      }
    }
    await cargarLikeBoton(tipo, id);
  } catch (e) {
    showToast('No se pudo actualizar el me gusta', 'error');
  }
}

/* ============================================
   ANTI-COPIA Y AJUSTES DE LECTURA
   ============================================ */

function aplicarProteccionCapitulo() {
  const body = document.getElementById('chapterBody');
  if (!body) return;
  body.addEventListener('contextmenu', (e) => e.preventDefault());
  body.addEventListener('copy', (e) => {
    e.preventDefault();
    showToast('El contenido está protegido contra copia.', 'info');
  });
  body.addEventListener('cut', (e) => e.preventDefault());
  body.addEventListener('keydown', (e) => {
    const key = (e.key || '').toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    if ((ctrl && ['c', 'x', 'a', 'u', 's'].includes(key)) || key === 'f12') {
      e.preventDefault();
    }
  });
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
            <button data-value="1.4" class="rs-seg-btn">Compacto</button>
            <button data-value="1.6" class="rs-seg-btn">Normal</button>
            <button data-value="1.9" class="rs-seg-btn">Amplio</button>
          </div>
        </div>
        <div class="rs-group">
          <label class="rs-label">Tema de lectura</label>
          <div class="rs-segment" data-pref="theme">
            <button data-value="obsidian" class="rs-seg-btn">Obsidian</button>
            <button data-value="midnight" class="rs-seg-btn">Midnight</button>
            <button data-value="parchment" class="rs-seg-btn">Parchment</button>
            <button data-value="neutral" class="rs-seg-btn">Neutral</button>
          </div>
        </div>
        <button class="btn btn-block" id="rsFullscreen">${ic('book-open', 18)} Modo lectura</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#rsClose').addEventListener('click', () => modal.hidden = true);

    modal.querySelectorAll('.rs-segment').forEach(seg => {
      seg.querySelectorAll('.rs-seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pref = seg.dataset.pref;
          const val = btn.dataset.value;
          READER_PREFS[pref] = (pref === 'lineHeight') ? parseFloat(val) : val;
          saveReaderPrefs();
          applyReaderPrefs();
          actualizarReaderUI();
        });
      });
    });

    modal.querySelector('#rsFontMinus').addEventListener('click', () => {
      READER_PREFS.fontSize = Math.max(14, READER_PREFS.fontSize - 1);
      saveReaderPrefs();
      applyReaderPrefs();
      actualizarReaderUI();
    });

    modal.querySelector('#rsFontPlus').addEventListener('click', () => {
      READER_PREFS.fontSize = Math.min(24, READER_PREFS.fontSize + 1);
      saveReaderPrefs();
      applyReaderPrefs();
      actualizarReaderUI();
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
    seg.querySelectorAll('.rs-seg-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.value === String(READER_PREFS[pref])));
  });
}

function toggleFocusMode() {
  const isActive = document.body.classList.toggle('focus-mode');
  if (isActive) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    crearBotonSalir();
  } else {
    document.getElementById('focusExitBtn')?.remove();
  }
}

function crearBotonSalir() {
  if (document.getElementById('focusExitBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'focusExitBtn';
  btn.className = 'focus-exit-btn visible';
  btn.innerHTML = '✕ Salir';
  btn.addEventListener('click', toggleFocusMode);
  document.body.appendChild(btn);
}

function initFocusModeExit() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) toggleFocusMode();
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
      const el = document.createElement('div');
      el.className = 'resume-toast show';
      el.innerHTML = `<span>Continuar donde lo dejaste</span><button>Ir</button>`;
      document.body.appendChild(el);
      el.querySelector('button').addEventListener('click', () => {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
        el.remove();
      });
      setTimeout(() => el.remove(), 6000);
    }
  } catch {}
}
/* ============================================
   RESEÑAS LITERARIAS — Rediseño completo
   ============================================ */

/**
 * Listado público de reseñas.
 * Muestra tarjetas con avatar de Azael, título, extracto, fecha
 * y contador de likes ❤️ (si el admin lo permite).
 */
async function cargarResenas() {
  const grid = document.getElementById('resenasGrid');
  if (!grid) return;

  try {
    // 1. Reseñas + perfil del autor (Azael)
    const [{ data: resenas, error }, { data: autor }] = await Promise.all([
      withTimeout(
        db.from('resenas')
          .select('id, title, content, created_at, links')
          .order('created_at', { ascending: false }),
        10000
      ),
      withTimeout(
        db.from('profiles')
          .select('id, username, avatar_url, badge_type, is_author, is_verified')
          .eq('is_author', true)
          .limit(1)
          .maybeSingle(),
        8000
      ),
    ]);

    if (error) throw error;

    if (!resenas?.length) {
      grid.innerHTML = emptyState('book-marked', 'Sin reseñas aún', 'Las reseñas que escriba aparecerán aquí.');
      if (window.lucide) lucide.createIcons();
      return;
    }

    // 2. Conteo de likes por reseña
    const resenaIds = resenas.map(r => r.id);
    const { data: likesData } = await withTimeout(
      db.from('resena_likes').select('resena_id').in('resena_id', resenaIds),
      8000
    );
    const likesMap = {};
    (likesData || []).forEach(l => {
      likesMap[l.resena_id] = (likesMap[l.resena_id] || 0) + 1;
    });

    // 3. Render con tarjetas elegantes
    const autorNombre = autor?.username || 'Azael';
    const autorAvatar = autor?.avatar_url;
    const badgeHtml = renderUserBadge(autor);

    grid.innerHTML = resenas.map(r => {
      const excerpt = (r.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 220);
      const fecha = new Date(r.created_at).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      const likesCount = likesMap[r.id] || 0;
      const mostrarLikes = SITE_SETTINGS.show_resena_likes;

      return `
        <a class="resena-card" href="resena.html?id=${r.id}">
          <div class="resena-card-author">
            <div class="resena-card-avatar">
              ${autorAvatar
                ? `<img src="${escapeHtml(autorAvatar)}" alt="${escapeHtml(autorNombre)}" loading="lazy" />`
                : `<span>${escapeHtml(autorNombre.charAt(0).toUpperCase())}</span>`}
            </div>
            <div class="resena-card-author-info">
              <span class="resena-card-author-name">@${escapeHtml(autorNombre)} ${badgeHtml}</span>
              <span class="resena-card-author-date">${fecha}</span>
            </div>
          </div>
          <h3 class="resena-card-title">${escapeHtml(r.title)}</h3>
          <p class="resena-card-excerpt">${escapeHtml(excerpt)}${excerpt.length >= 220 ? '…' : ''}</p>
          <div class="resena-card-footer">
            <span class="resena-card-more">Leer reseña ${ic('arrow-right', 14)}</span>
            ${mostrarLikes ? `<span class="resena-card-likes">${ic('heart', 15)} <span>${likesCount}</span></span>` : ''}
          </div>
        </a>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.error('Error cargando reseñas:', e);
    grid.innerHTML = emptyState('alert-circle', 'No se pudieron cargar', 'Revisa tu conexión.');
    if (window.lucide) lucide.createIcons();
  }
}

/**
 * Detalle de una reseña: fondo gris agradable (resena-reader-wrapper),
 * botones de compartir que registran en resena_shares, y botón de like
 * conectado a resena_likes.
 */
async function cargarResenaDetalle() {
  const cont = document.getElementById('resenaContent');
  if (!cont) return;

  const id = new URLSearchParams(location.search).get('id');
  if (!id) { render404(cont, 'Reseña no encontrada', 'Falta el identificador.'); return; }

  try {
    const [{ data: resena, error }, { data: autor }, { data: { session } }] = await Promise.all([
      withTimeout(db.from('resenas').select('*').eq('id', id).maybeSingle(), 10000),
      withTimeout(
        db.from('profiles')
          .select('id, username, avatar_url, badge_type, is_author, is_verified')
          .eq('is_author', true)
          .limit(1)
          .maybeSingle(),
        8000
      ),
      db.auth.getSession(),
    ]);

    if (error || !resena) {
      render404(cont, 'Reseña no encontrada', 'Puede que haya sido eliminada.');
      return;
    }

    document.title = `${resena.title} — Azael Colina`;
    const ht = document.querySelector('.header-title');
    if (ht) ht.textContent = resena.title;

    const autorNombre = autor?.username || 'Azael';
    const autorAvatar = autor?.avatar_url;
    const badgeHtml = renderUserBadge(autor);
    const fecha = new Date(resena.created_at).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    // Enlaces (formato: "Nombre | URL" por línea)
    const linksHtml = (resena.links || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [name, url] = line.split('|').map(s => s.trim());
        if (!url || !/^https?:\/\//.test(url)) return '';
        return `<a class="resena-link-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${ic('external-link', 14)} ${escapeHtml(name || 'Ver')}</a>`;
      })
      .filter(Boolean)
      .join('');

    // Estado del like
    let yaDioLike = false;
    if (session?.user) {
      const { data: miLike } = await db.from('resena_likes')
        .select('id').eq('resena_id', id).eq('user_id', session.user.id).maybeSingle();
      yaDioLike = !!miLike;
    }

    const { count: likesCount } = await db.from('resena_likes')
      .select('id', { count: 'exact', head: true }).eq('resena_id', id);

    cont.innerHTML = `
      <div class="resena-reader-wrapper">
        <article class="resena-reader-inner">
          <header class="resena-reader-head">
            <div class="resena-reader-meta">
              <div class="resena-card-avatar resena-reader-avatar">
                ${autorAvatar
                  ? `<img src="${escapeHtml(autorAvatar)}" alt="${escapeHtml(autorNombre)}" />`
                  : `<span>${escapeHtml(autorNombre.charAt(0).toUpperCase())}</span>`}
              </div>
              <div class="resena-reader-author">
                <span class="resena-card-author-name">@${escapeHtml(autorNombre)} ${badgeHtml}</span>
                <span class="resena-card-author-date">${fecha}</span>
              </div>
            </div>
            <h1 class="resena-reader-title">${escapeHtml(resena.title)}</h1>
          </header>

          <div class="resena-reader-body">${resena.content || '<p>Sin contenido.</p>'}</div>

          ${linksHtml ? `<div class="resena-links">${linksHtml}</div>` : ''}

          <div class="resena-actions-row">
            ${SITE_SETTINGS.show_resena_likes ? `
              <button class="resena-like-btn ${yaDioLike ? 'liked' : ''}" id="resenaLikeBtn" data-id="${resena.id}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${yaDioLike ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span class="resena-like-count">${likesCount || 0}</span>
              </button>
            ` : ''}

            <div class="resena-share-row">
              <span class="resena-share-label">Compartir</span>
              <button class="share-btn" data-share="twitter" data-id="${resena.id}" data-title="${escapeHtml(resena.title)}">
                ${ic('twitter', 14)} Twitter / X
              </button>
              <button class="share-btn" data-share="whatsapp" data-id="${resena.id}" data-title="${escapeHtml(resena.title)}">
                ${ic('message-circle', 14)} WhatsApp
              </button>
              <button class="share-btn" data-share="copy" data-id="${resena.id}" data-title="${escapeHtml(resena.title)}">
                ${ic('copy', 14)} Copiar enlace
              </button>
            </div>
          </div>
        </article>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Botón de like
    const btnLike = document.getElementById('resenaLikeBtn');
    if (btnLike) {
      btnLike.addEventListener('click', () => toggleLikeResena(resena.id, btnLike));
    }

    // Botones de compartir
    cont.querySelectorAll('[data-share]').forEach(btn => {
      btn.addEventListener('click', () => manejarCompartirResena(btn.dataset.share, resena.id, btn.dataset.title));
    });
  } catch (e) {
    console.error('Error cargando reseña:', e);
    render404(cont, 'No se pudo cargar', 'Hubo un problema de conexión.');
  }
}

/**
 * Toggle del like en una reseña.
 * Si no hay sesión, abre el modal de auth.
 */
async function toggleLikeResena(resenaId, btnEl) {
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) {
    showToast('Inicia sesión para dar me gusta', 'info');
    document.getElementById('authModal').hidden = false;
    window.__showLoginView?.();
    return;
  }

  const userId = session.user.id;

  try {
    const { data: existing } = await db.from('resena_likes')
      .select('id').eq('resena_id', resenaId).eq('user_id', userId).maybeSingle();

    if (existing) {
      await db.from('resena_likes').delete().eq('id', existing.id);
    } else {
      await db.from('resena_likes').insert({ resena_id: resenaId, user_id: userId });
    }

    // Recontar y actualizar visualmente
    const { count } = await db.from('resena_likes')
      .select('id', { count: 'exact', head: true }).eq('resena_id', resenaId);

    const yaDioLike = !existing;
    if (btnEl) {
      btnEl.classList.toggle('liked', yaDioLike);
      const svg = btnEl.querySelector('svg');
      if (svg) svg.setAttribute('fill', yaDioLike ? 'currentColor' : 'none');
      const counter = btnEl.querySelector('.resena-like-count');
      if (counter) counter.textContent = count || 0;
    }

    showToast(yaDioLike ? '¡Gracias por el ❤️!' : 'Me gusta quitado', yaDioLike ? 'ok' : 'info');
  } catch (e) {
    console.error('Error like reseña:', e);
    showToast('No se pudo actualizar el me gusta', 'error');
  }
}

/**
 * Maneja el clic en un botón de compartir: abre ventana o copia,
 * y registra el share en la tabla resena_shares.
 */
async function manejarCompartirResena(tipo, resenaId, titulo) {
  const urlActual = location.href;
  const texto = `"${titulo}" — Reseña en Azael Colina`;

  try {
    if (tipo === 'twitter') {
      const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(urlActual)}`;
      window.open(tw, '_blank', 'noopener,noreferrer,width=600,height=500');
    } else if (tipo === 'whatsapp') {
      const wa = `https://wa.me/?text=${encodeURIComponent(texto + ' ' + urlActual)}`;
      window.open(wa, '_blank', 'noopener,noreferrer');
    } else if (tipo === 'copy') {
      try {
        await navigator.clipboard.writeText(urlActual);
        showToast('Enlace copiado', 'ok');
      } catch {
        showToast('No se pudo copiar automáticamente', 'error');
        return;
      }
    }

    // Registrar el share (no bloqueante)
    const { data: { session } } = await db.auth.getSession();
    await db.from('resena_shares').insert({
      resena_id: resenaId,
      user_id: session?.user?.id || null,
      network: tipo,
    });
  } catch (e) {
    console.warn('Error registrando share:', e);
  }
}

/* ============================================
   RELATOS DE LA COMUNIDAD
   ============================================ */

async function cargarRelatos() {
  const grid = document.getElementById('relatosGrid');
  const count = document.getElementById('relatosCount');
  if (!grid) return;

  const btnWrite = document.getElementById('btnWriteRelato');
  if (btnWrite) btnWrite.style.display = SITE_SETTINGS.show_relatos_btn ? '' : 'none';

  try {
    const { data: relatos, error } = await withTimeout(
      db.from('relatos').select('id, title, content, user_id, created_at')
        .order('created_at', { ascending: false }).limit(200),
      10000
    );
    if (error) throw error;

    if (!relatos?.length) {
      grid.innerHTML = emptyState('pen-line', 'Aún no hay relatos', 'Sé el primero en compartir una historia.');
      if (count) count.textContent = '0 relatos';
      if (window.lucide) lucide.createIcons();
      return;
    }

    const userIds = [...new Set(relatos.map(r => r.user_id))];
    const { data: perfiles } = await withTimeout(
      db.from('profiles').select('id, username, avatar_url, badge_type, is_author, is_verified').in('id', userIds),
      8000
    );
    const perfilesMap = Object.fromEntries((perfiles || []).map(p => [p.id, p]));

    const relatoIds = relatos.map(r => r.id);
    const [{ data: reactions }, { data: comments }] = await Promise.all([
      withTimeout(db.from('relato_reactions').select('relato_id').in('relato_id', relatoIds), 8000),
      withTimeout(db.from('relato_comments').select('relato_id').in('relato_id', relatoIds), 8000),
    ]);

    const reactionsCount = {};
    (reactions || []).forEach(r => { reactionsCount[r.relato_id] = (reactionsCount[r.relato_id] || 0) + 1; });
    const commentsCount = {};
    (comments || []).forEach(c => { commentsCount[c.relato_id] = (commentsCount[c.relato_id] || 0) + 1; });

    relatosAllData = { relatos, perfiles: perfilesMap, reactionsCount, commentsCount };
    relatosCurrentPage = 1;
    aplicarFiltroYRenderRelatos();
  } catch (e) {
    grid.innerHTML = emptyState('alert-circle', 'No se pudieron cargar', 'Revisa tu conexión.');
    if (window.lucide) lucide.createIcons();
  }
}

function aplicarFiltroYRenderRelatos() {
  if (!relatosAllData) return;
  const { relatos, perfiles, reactionsCount, commentsCount } = relatosAllData;
  const query = relatosSearchQuery.toLowerCase().trim();
  let filtrados = relatos;

  if (query) {
    filtrados = relatos.filter(r => {
      const autor = perfiles[r.user_id] || {};
      const nombre = (autor.username || '').toLowerCase();
      return r.title.toLowerCase().includes(query) || nombre.includes(query);
    });
  }

  const totalPages = Math.ceil(filtrados.length / RELATOS_PAGE_SIZE);
  if (relatosCurrentPage > totalPages && totalPages > 0) relatosCurrentPage = totalPages;
  if (relatosCurrentPage < 1) relatosCurrentPage = 1;

  const start = (relatosCurrentPage - 1) * RELATOS_PAGE_SIZE;
  const pageData = filtrados.slice(start, start + RELATOS_PAGE_SIZE);
  const grid = document.getElementById('relatosGrid');
  const count = document.getElementById('relatosCount');

  if (!filtrados.length) {
    grid.innerHTML = emptyState('search', 'Sin resultados', 'Prueba con otro término.');
    if (count) count.textContent = '0 relatos';
    document.getElementById('relatosPagination')?.replaceChildren();
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (count) count.textContent = query ? `${filtrados.length} resultados` : `${filtrados.length} relatos`;
  renderRelatos(pageData, perfiles, grid, count, reactionsCount, commentsCount);
  renderPaginacion(totalPages);
}

function renderRelatos(relatos, perfilesMap, grid, count, reactionsCount = {}, commentsCount = {}) {
  grid.innerHTML = relatos.map(r => {
    const autor = perfilesMap[r.user_id] || {};
    const nombre = autor.username || 'Lector';
    const avatar = autor.avatar_url;
    const excerpt = (r.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 180);
    const fecha = tiempoRelativo(r.created_at);
    const reacciones = reactionsCount[r.id] || 0;
    const comentarios = commentsCount[r.id] || 0;

    return `
      <a class="relato-card" href="relato.html?id=${r.id}">
        <div class="relato-card-title">${escapeHtml(r.title)}</div>
        <div class="relato-card-author" style="display:flex;align-items:center;gap:6px;">
          <div style="width:20px;height:20px;border-radius:50%;overflow:hidden;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">
            ${avatar ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;" />` : escapeHtml(nombre.charAt(0).toUpperCase())}
          </div>
          <span>Por <strong>@${escapeHtml(nombre)}</strong></span>
          ${renderUserBadge(autor)}
        </div>
        <div class="relato-card-excerpt">${escapeHtml(excerpt)}${excerpt.length >= 180 ? '…' : ''}</div>
        <div class="relato-card-more">Leer relato ${ic('arrow-right', 14)}</div>
        <div class="relato-card-meta">
          <span class="relato-card-meta-item">${ic('clock', 13)} ${fecha}</span>
          <span class="relato-card-meta-item">${ic('smile', 13)} ${reacciones}</span>
          <span class="relato-card-meta-item">${ic('message-circle', 13)} ${comentarios}</span>
        </div>
      </a>
    `;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

function renderPaginacion(totalPages) {
  let pag = document.getElementById('relatosPagination');
  if (!pag) {
    pag = document.createElement('div');
    pag.id = 'relatosPagination';
    pag.className = 'relatos-pagination';
    document.getElementById('relatosGrid')?.parentElement?.appendChild(pag);
  }
  if (totalPages <= 1) { pag.innerHTML = ''; return; }

  let pageButtons = '';
  for (let i = 1; i <= totalPages; i++) {
    pageButtons += `<button class="pagination-btn ${i === relatosCurrentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  pag.innerHTML = pageButtons;
  pag.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      relatosCurrentPage = parseInt(btn.dataset.page);
      aplicarFiltroYRenderRelatos();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

async function cargarRelatoDetalle() {
  const cont = document.getElementById('relatoContent');
  if (!cont) return;

  const id = new URLSearchParams(location.search).get('id');
  if (!id) { render404(cont, 'Relato no encontrado', 'Falta el identificador.'); return; }

  try {
    const { data: relato, error } = await withTimeout(
      db.from('relatos').select('*').eq('id', id).maybeSingle(),
      10000
    );
    if (error || !relato) {
      render404(cont, 'Relato no encontrado', 'Fue eliminado o el enlace es incorrecto.');
      return;
    }

    const [{ data: autor }, { data: session }] = await Promise.all([
      withTimeout(db.from('profiles').select('id, username, avatar_url, badge_type, is_author, is_verified').eq('id', relato.user_id).maybeSingle(), 8000),
      db.auth.getSession(),
    ]);

    const sessionUserId = session?.user?.id || null;
    const autorNombre = autor?.username || 'Lector';
    const avatarUrl = autor?.avatar_url;
    const badgeHtml = renderUserBadge(autor);

    cont.innerHTML = `
      <div class="chapter-shell">
        <header class="relato-header">
          <h1 class="relato-title">${escapeHtml(relato.title)}</h1>
          <div class="relato-author-info">
            <a href="perfil.html?id=${relato.user_id}" class="relato-author-avatar" style="text-decoration:none;">
              ${avatarUrl ? `<img src="${avatarUrl}" alt="" />` : escapeHtml(autorNombre.charAt(0).toUpperCase())}
            </a>
            <div style="display:inline-flex;align-items:center;gap:6px;">
              <span>Por <a href="perfil.html?id=${relato.user_id}" class="relato-author-name">@${escapeHtml(autorNombre)}</a></span>
              ${badgeHtml}
            </div>
            <span class="relato-author-date">· ${tiempoRelativo(relato.created_at)}</span>
            ${sessionUserId && sessionUserId !== relato.user_id ? `<button class="report-btn" id="btnReportarRelato">${ic('flag', 14)} Reportar</button>` : ''}
          </div>
        </header>

        <div class="chapter-body reader-body-c">${formatearContenidoRelato(relato.content)}</div>

        <div id="reactionsMount"></div>

        <div class="relato-share-row">
          <span class="relato-share-label">Compartir</span>
          <a class="share-btn" target="_blank" rel="noopener noreferrer" href="https://twitter.com/intent/tweet?text=${encodeURIComponent('"' + relato.title + '" en Azael Colina')}&url=${encodeURIComponent(location.href)}">${ic('twitter', 14)} Twitter / X</a>
          <a class="share-btn" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent(relato.title + ' ' + location.href)}">${ic('message-circle', 14)} WhatsApp</a>
          <button class="share-btn" id="shareRelatoCopy">${ic('copy', 14)} Copiar enlace</button>
        </div>

        <section class="chapter-comments-section">
          <div class="chapter-comments-head">
            <h2 class="chapter-comments-title">Comentarios</h2>
            <p class="chapter-comments-count" id="relatoCommentsCount">0 comentarios</p>
          </div>
          <div id="relatoCommentFormMount"></div>
          <div class="comments-list" id="relatoCommentsList"></div>
        </section>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    aplicarProteccionCapitulo();

    document.getElementById('shareRelatoCopy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(location.href).then(() => showToast('Enlace copiado', 'ok'));
    });
    document.getElementById('btnReportarRelato')?.addEventListener('click', () => abrirModalReportar(relato.id));

    await cargarReaccionesRelato(relato.id);
    await cargarComentariosRelato(relato.id);
    await prepararFormComentarioRelato(relato.id);
  } catch (e) {
    console.error('Error cargando relato:', e);
    render404(cont, 'No se pudo cargar', 'Hubo un problema de conexión.');
  }
}

async function cargarReaccionesRelato(relatoId) {
  const mount = document.getElementById('reactionsMount');
  if (!mount) return;

  try {
    const [{ data: reacciones }, { data: session }] = await Promise.all([
      withTimeout(db.from('relato_reactions').select('emoji, user_id').eq('relato_id', relatoId), 8000),
      db.auth.getSession(),
    ]);

    const sessionUserId = session?.user?.id || null;
    const counts = {};
    let miReaccion = null;

    (reacciones || []).forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      if (sessionUserId && r.user_id === sessionUserId) miReaccion = r.emoji;
    });

    mount.innerHTML = `
      <div class="relato-reactions">
        ${REACCIONES_DISPONIBLES.map(rec => {
          const count = counts[rec.emoji] || 0;
          const active = miReaccion === rec.emoji;
          return `
            <button class="reaction-btn ${active ? 'active' : ''} ${count === 0 ? 'reaction-btn-empty' : ''}" data-emoji="${rec.emoji}">
              <span class="reaction-btn-emoji">${rec.emoji}</span>
              <span class="reaction-btn-count">${count}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    mount.querySelectorAll('.reaction-btn').forEach(btn =>
      btn.addEventListener('click', () => toggleReaccion(relatoId, btn.dataset.emoji))
    );
  } catch (e) { console.warn(e); }
}

async function toggleReaccion(relatoId, emoji) {
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) {
    showToast('Inicia sesión para reaccionar', 'info');
    document.getElementById('authModal').hidden = false;
    window.__showLoginView?.();
    return;
  }
  const userId = session.user.id;

  try {
    const { data: existing } = await db.from('relato_reactions')
      .select('id, emoji').eq('relato_id', relatoId).eq('user_id', userId).maybeSingle();

    if (existing) {
      if (existing.emoji === emoji) await db.from('relato_reactions').delete().eq('id', existing.id);
      else await db.from('relato_reactions').update({ emoji }).eq('id', existing.id);
    } else {
      await db.from('relato_reactions').insert({ relato_id: relatoId, user_id: userId, emoji });
      const { data: relato } = await db.from('relatos').select('user_id').eq('id', relatoId).maybeSingle();
      if (relato?.user_id && relato.user_id !== userId) {
        await db.from('notifications').insert({
          user_id: relato.user_id, type: 'reaction_relato', from_user_id: userId, relato_id: relatoId,
        });
      }
    }
    await cargarReaccionesRelato(relatoId);
  } catch (e) {
    showToast('No se pudo guardar la reacción', 'error');
  }
}

async function cargarComentariosRelato(relatoId) {
  const list = document.getElementById('relatoCommentsList');
  const count = document.getElementById('relatoCommentsCount');
  if (!list) return;

  try {
    const [{ data, error }, { data: { session } }] = await Promise.all([
      withTimeout(db.from('relato_comments').select('id, content, created_at, user_id').eq('relato_id', relatoId).order('created_at', { ascending: true }), 8000),
      db.auth.getSession(),
    ]);

    if (error) { list.innerHTML = emptyState('alert-circle', 'Error', 'No se pudieron cargar.'); return; }
    const myId = session?.user?.id || null;
    if (count) count.textContent = data?.length === 1 ? '1 comentario' : `${data?.length || 0} comentarios`;
    if (!data?.length) { list.innerHTML = emptyState('message-circle', 'Sé el primero en comentar', 'Comparte lo que piensas.'); return; }

    const ids = [...new Set(data.map(c => c.user_id))];
    const { data: perfiles } = await withTimeout(
      db.from('profiles').select('id, username, is_author, is_verified, badge_type').in('id', ids),
      8000
    );
    const map = Object.fromEntries((perfiles || []).map(p => [p.id, p]));

    list.innerHTML = data.map(c => renderComment(c, map, myId)).join('');
    activarVerMas();
    activarBorradoComentarios(relatoId, 'relato');
  } catch (e) {
    list.innerHTML = emptyState('alert-circle', 'Timeout', 'Vuelve a intentar.');
  }
}

async function prepararFormComentarioRelato(relatoId) {
  const mount = document.getElementById('relatoCommentFormMount');
  if (!mount) return;

  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    mount.innerHTML = `
      <div class="comment-login-prompt-c">
        <p>Inicia sesión para comentar.</p>
        <button class="btn btn-primary" id="relatoCommentLoginBtn">Iniciar sesión</button>
      </div>
    `;
    document.getElementById('relatoCommentLoginBtn')?.addEventListener('click', () => {
      document.getElementById('authModal').hidden = false;
      window.__showLoginView?.();
    });
    return;
  }

  mount.innerHTML = `
    <form class="comment-form-c" id="relatoCommentForm">
      <textarea id="relatoCommentText" placeholder="Escribe tu comentario…" required maxlength="2000"></textarea>
      <div class="comment-form-foot">
        <span style="font-size:12px;color:var(--text-tertiary);">Máx. 2000 caracteres</span>
        <button type="submit" class="btn btn-primary">Publicar</button>
      </div>
    </form>
  `;

  document.getElementById('relatoCommentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('relatoCommentText').value.trim();
    if (!content) return;
    showLoading();
    const { error } = await db.from('relato_comments').insert({
      relato_id: relatoId, user_id: session.user.id, content,
    });
    hideLoading();
    if (error) { showToast('No se pudo publicar el comentario', 'error'); return; }
    showToast('Comentario publicado', 'ok');
    document.getElementById('relatoCommentText').value = '';
    await cargarComentariosRelato(relatoId);
  });
}

async function abrirModalReportar(relatoId) {
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) { showToast('Inicia sesión para reportar', 'info'); return; }

  const motivo = prompt('Motivo del reporte (mínimo 10 caracteres):');
  if (!motivo || motivo.trim().length < 10) {
    showToast('El motivo debe tener al menos 10 caracteres.', 'error');
    return;
  }

  showLoading();
  const { error } = await db.from('relato_reports').insert({
    relato_id: relatoId, user_id: session.user.id, reason: motivo.trim(),
  });
  hideLoading();

  if (error) {
    if (error.code === '23505') showToast('Ya has reportado este relato', 'info');
    else showToast('Error al reportar: ' + error.message, 'error');
    return;
  }
  showToast('Reporte enviado. Gracias por colaborar.', 'ok');
}

/* ============================================
   MIS RELATOS
   ============================================ */

async function cargarMisRelatos() {
  const cont = document.getElementById('misRelatosContent');
  if (!cont) return;

  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) {
    cont.innerHTML = `
      <div class="chapter-shell">
        <div class="empty-c">
          <div class="empty-icon">${ic('log-in', 48)}</div>
          <div class="empty-title">Inicia sesión</div>
          <div class="empty-sub">Necesitas una cuenta para publicar relatos.</div>
          <div style="margin-top:20px;">
            <button class="btn btn-primary" id="misRelatosLoginBtn">Iniciar sesión</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('misRelatosLoginBtn')?.addEventListener('click', () => {
      document.getElementById('authModal').hidden = false;
      window.__showLoginView?.();
    });
    if (window.lucide) lucide.createIcons();
    return;
  }

  const userId = session.user.id;
  const urlParams = new URLSearchParams(location.search);
  const editId = urlParams.get('edit');

  if (editId) { await mostrarFormularioEdicion(editId, userId); return; }
  if (urlParams.get('new') === '1') { mostrarFormularioRelato(null, userId); return; }

  await mostrarListaMisRelatos(userId);
}

async function mostrarListaMisRelatos(userId) {
  const cont = document.getElementById('misRelatosContent');
  cont.innerHTML = `
    <div class="chapter-shell">
      <div class="page-head-c" style="border-bottom:none;padding-bottom:8px;">
        <h1 class="page-title-c">Mis relatos</h1>
        <p class="page-sub-c">Gestiona tus historias publicadas</p>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
        <a href="mis-relatos.html?new=1" class="btn btn-primary">${ic('plus', 16)} Escribir nuevo relato</a>
      </div>
      <div class="mis-relatos-list" id="misRelatosList">
        <div class="empty-c"><div class="empty-icon">${ic('loader-2', 48)}</div><div class="empty-title">Cargando…</div></div>
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();

  try {
    const { data: relatos, error } = await withTimeout(
      db.from('relatos').select('id, title, content, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      10000
    );
    if (error) throw error;
    const list = document.getElementById('misRelatosList');

    if (!relatos?.length) {
      list.innerHTML = emptyState('pen-line', 'Sin relatos aún', 'Escribe tu primer relato con el botón de arriba.');
      if (window.lucide) lucide.createIcons();
      return;
    }

    list.innerHTML = relatos.map(r => {
      const excerpt = (r.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 100);
      return `
        <div class="mi-relato-item">
          <div class="mi-relato-body">
            <div class="mi-relato-title">${escapeHtml(r.title)}</div>
            <div class="mi-relato-meta">
              <span>${ic('clock', 12)} ${tiempoRelativo(r.created_at)}</span>
              <span>${escapeHtml(excerpt)}…</span>
            </div>
          </div>
          <div class="mi-relato-actions">
            <a href="relato.html?id=${r.id}" class="mi-relato-action-btn" title="Ver">${ic('eye', 16)}</a>
            <a href="mis-relatos.html?edit=${r.id}" class="mi-relato-action-btn" title="Editar">${ic('edit-2', 16)}</a>
            <button class="mi-relato-action-btn danger" data-delete-relato="${r.id}" title="Eliminar">${ic('trash-2', 16)}</button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();

    document.querySelectorAll('[data-delete-relato]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este relato?')) return;
        showLoading();
        await db.from('relatos').delete().eq('id', btn.dataset.deleteRelato);
        hideLoading();
        showToast('Relato eliminado', 'ok');
        await mostrarListaMisRelatos(userId);
      });
    });
  } catch (e) {
    document.getElementById('misRelatosList').innerHTML = emptyState('alert-circle', 'Error al cargar', 'Intenta de nuevo.');
  }
}

async function mostrarFormularioEdicion(relatoId, userId) {
  showLoading();
  const { data } = await db.from('relatos').select('*').eq('id', relatoId).eq('user_id', userId).maybeSingle();
  hideLoading();
  if (!data) { location.href = 'mis-relatos.html'; return; }
  mostrarFormularioRelato(data, userId);
}

function mostrarFormularioRelato(relatoExistente, userId) {
  const cont = document.getElementById('misRelatosContent');
  const esEdicion = !!relatoExistente;
  const titulo = relatoExistente?.title || '';
  const contenido = relatoExistente?.content || '';

  cont.innerHTML = `
    <div class="chapter-shell relato-form-shell">
      <a href="mis-relatos.html" class="btn-back">${ic('arrow-left', 14)} Volver a mis relatos</a>
      <div class="page-head-c" style="border-bottom:none;padding-bottom:8px;">
        <h1 class="page-title-c">${esEdicion ? 'Editar relato' : 'Nuevo relato'}</h1>
      </div>
      <div class="relato-normas-warning">
        ${ic('alert-triangle', 20)}
        <div><strong>Normas:</strong> Respeto, sin discriminación ni spam. Relatos inapropiados serán eliminados.</div>
      </div>
      <form class="admin-form" id="relatoForm" style="max-width:none;">
        <label class="admin-field">
          <span>Título *</span>
          <input type="text" id="relatoTitle" required maxlength="120" placeholder="Título de tu relato" value="${escapeHtml(titulo)}" />
        </label>
        <label class="admin-field">
          <span>Contenido *</span>
          <textarea id="relatoContentInput" rows="18" required maxlength="${RELATO_MAX_LENGTH}" placeholder="Escribe tu historia aquí…" style="min-height:400px;font-family:var(--font-serif);font-size:15px;line-height:1.7;">${escapeHtml(contenido)}</textarea>
          <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-tertiary);margin-top:4px;">
            <span>Mínimo ${RELATO_MIN_LENGTH} caracteres</span>
            <span id="relatoCharCount">0 / ${RELATO_MAX_LENGTH}</span>
          </div>
        </label>
        <div class="relato-form-consent">
          <input type="checkbox" id="relatoConsent" ${esEdicion ? 'checked' : ''} />
          <label for="relatoConsent">Confirmo que este relato es de mi autoría y cumple las normas.</label>
        </div>
        <div class="admin-form-actions">
          <a href="mis-relatos.html" class="btn btn-ghost">Cancelar</a>
          <button type="submit" class="btn btn-primary">${ic('check', 16)} ${esEdicion ? 'Guardar cambios' : 'Publicar relato'}</button>
        </div>
      </form>
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  const textarea = document.getElementById('relatoContentInput');
  const counter = document.getElementById('relatoCharCount');
  const updateCount = () => { counter.textContent = `${textarea.value.length} / ${RELATO_MAX_LENGTH}`; };
  textarea.addEventListener('input', updateCount);
  updateCount();

  document.getElementById('relatoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = document.getElementById('relatoTitle').value.trim();
    const c = textarea.value.trim();
    const consent = document.getElementById('relatoConsent').checked;

    if (!t) { showToast('El título es obligatorio', 'error'); return; }
    if (c.length < RELATO_MIN_LENGTH) { showToast(`Mínimo ${RELATO_MIN_LENGTH} caracteres`, 'error'); return; }
    if (!consent) { showToast('Acepta las normas para continuar', 'error'); return; }

    showLoading();
    let error;
    if (esEdicion) {
      ({ error } = await db.from('relatos')
        .update({ title: t, content: c, updated_at: new Date().toISOString() })
        .eq('id', relatoExistente.id).eq('user_id', userId));
    } else {
      ({ error } = await db.from('relatos').insert({ user_id: userId, title: t, content: c }));
    }
    hideLoading();

    if (error) { showToast('Error al guardar: ' + error.message, 'error'); return; }
    showToast(esEdicion ? 'Relato actualizado' : 'Relato publicado', 'ok');
    setTimeout(() => { location.href = 'mis-relatos.html'; }, 600);
  });
}

/* ============================================
   HISTORIAL DEL LECTOR
   ============================================ */

async function cargarHistorial() {
  const cont = document.getElementById('historialContent');
  if (!cont) return;

  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) {
    cont.innerHTML = `
      <div class="empty-c">
        <div class="empty-icon">${ic('lock', 48)}</div>
        <div class="empty-title">Inicia sesión</div>
        <div class="empty-sub">Necesitas una cuenta para registrar tu historial de lectura.</div>
        <div style="margin-top:20px;"><button class="btn btn-primary" onclick="document.getElementById('authModal').hidden=false">Iniciar sesión</button></div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const { data, error } = await db.from('chapter_reads')
    .select(`read_at, chapters ( id, title, chapter_order, story_id, stories ( id, title, cover_url ) )`)
    .eq('user_id', session.user.id)
    .order('read_at', { ascending: false });

  if (error || !data?.length) {
    cont.innerHTML = emptyState('history', 'Historial vacío', 'Aún no has leído ningún capítulo.');
    if (window.lucide) lucide.createIcons();
    return;
  }

  historialRawData = data;
  renderHistorial();
}

function renderHistorial() {
  const cont = document.getElementById('historialContent');
  if (!cont) return;

  const ahora = new Date();
  const ayer = new Date(ahora); ayer.setDate(ayer.getDate() - 1);
  const agrupado = {};
  const librosSet = new Set();

  historialRawData.forEach(item => {
    const ch = item.chapters;
    if (!ch) return;
    const story = ch.stories;

    if (historialFilter === 'libros') {
      if (story) librosSet.add(JSON.stringify(story));
      return;
    }

    const fecha = new Date(item.read_at);
    let fechaKey = fecha.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (fecha.toDateString() === ahora.toDateString()) fechaKey = 'Hoy';
    else if (fecha.toDateString() === ayer.toDateString()) fechaKey = 'Ayer';

    if (!agrupado[fechaKey]) agrupado[fechaKey] = [];
    agrupado[fechaKey].push({ ...item, story });
  });

  let html = '';
  if (historialFilter === 'libros') {
    const libros = Array.from(librosSet).map(s => JSON.parse(s));
    html = `<div class="historial-list">
      ${libros.map(s => `
        <a href="historia.html?id=${s.id}" class="historial-item">
          <div class="historial-item-cover">${s.cover_url ? `<img src="${s.cover_url}" />` : escapeHtml(s.title.charAt(0))}</div>
          <div class="historial-item-body">
            <div class="historial-item-title">${escapeHtml(s.title)}</div>
            <div class="historial-item-meta">Libro abierto</div>
          </div>
          <div class="historial-item-icon">${ic('chevron-right', 18)}</div>
        </a>
      `).join('')}
    </div>`;
  } else {
    for (const [fecha, items] of Object.entries(agrupado)) {
      html += `
        <div class="historial-group">
          <div class="historial-date-title">${fecha} (${items.length})</div>
          <div class="historial-list">
            ${items.map(i => `
              <a href="capitulo.html?id=${i.chapters.id}" class="historial-item">
                <div class="historial-item-cover">${i.story?.cover_url ? `<img src="${i.story.cover_url}" />` : escapeHtml((i.story?.title || '?').charAt(0))}</div>
                <div class="historial-item-body">
                  <div class="historial-item-title">Cap. ${i.chapters.chapter_order || '?'} · ${escapeHtml(i.chapters.title)}</div>
                  <div class="historial-item-meta">${escapeHtml(i.story?.title || 'Historia')}</div>
                </div>
                <div class="historial-item-icon">${ic('chevron-right', 18)}</div>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  cont.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

/* ============================================
   PERFIL PÚBLICO Y BIOGRAFÍA
   ============================================ */

async function cargarPerfilPublico() {
  const cont = document.getElementById('perfilContent');
  if (!cont) return;

  const { data: { session } } = await db.auth.getSession();
  const id = new URLSearchParams(location.search).get('id') || session?.user?.id;
  if (!id) { location.href = 'index.html'; return; }

  showLoading();
  const { data: perfil, error } = await db.from('profiles').select('*').eq('id', id).maybeSingle();
  hideLoading();

  if (error || !perfil) {
    cont.innerHTML = emptyState('user-x', 'Perfil no encontrado', 'El usuario no existe.');
    if (window.lucide) lucide.createIcons();
    return;
  }

  const esPropio = session?.user?.id === perfil.id;
  const fechaRegistro = new Date(perfil.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const badgeHtml = renderUserBadge(perfil);

  let fechaNacTexto = 'No especificada';
  if (perfil.birthdate) {
    const fechaObj = new Date(perfil.birthdate + 'T00:00:00');
    const edad = calcularEdad(perfil.birthdate);
    fechaNacTexto = `${fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}${edad !== null ? ` (${edad} años)` : ''}`;
  }

  cont.innerHTML = `
    <section class="page-head-c">
      <div class="container">
        <h1 class="page-title-c">${esPropio ? 'Mi Perfil' : 'Perfil de lector'}</h1>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="perfil-card" style="max-width: 520px; margin: 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center; padding: 40px 24px; border-radius: 18px; background: var(--bg-surface); border: 1px solid var(--border-color);">
          <div class="perfil-avatar-wrap" style="margin-bottom: 20px; position: relative;">
            <div class="perfil-avatar" style="width: 130px; height: 130px; border-radius: 50%; overflow: hidden; border: 3px solid var(--border-color);">
              ${perfil.avatar_url
                ? `<img src="${perfil.avatar_url}" style="width:100%; height:100%; object-fit:cover;" />`
                : `<span style="font-size: 52px; display: flex; align-items: center; justify-content: center; height: 100%;">${escapeHtml((perfil.username || 'U').charAt(0).toUpperCase())}</span>`}
            </div>
            ${esPropio ? `
              <input type="file" id="userAvatarInput" accept="image/*" hidden />
              <button id="userAvatarBtn" style="position: absolute; bottom: 0; right: 0; background: var(--accent-color); color: #fff; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                ${ic('camera', 18)}
              </button>
            ` : ''}
          </div>
          <div class="perfil-body" style="width: 100%;">
            <h2 class="perfil-name" style="font-size: 26px; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              @${escapeHtml(perfil.username || 'usuario')}
              ${badgeHtml}
            </h2>
            <p style="color: var(--text-tertiary); font-size: 13px; margin-bottom: 24px;">Miembro desde ${fechaRegistro}</p>
            <div style="display: flex; flex-direction: column; gap: 12px; text-align: left; background: var(--bg-elevated); padding: 18px; border-radius: 12px;">
              ${esPropio && session.user.email ? `<div><span style="color:var(--text-tertiary); font-size: 12px; display:block;">Correo:</span> <span style="font-size: 14px;">${escapeHtml(session.user.email)}</span></div>` : ''}
              <div><span style="color:var(--text-tertiary); font-size: 12px; display:block;">Fecha de nacimiento:</span> <span style="font-size: 14px;">${fechaNacTexto}</span></div>
              <div><span style="color:var(--text-tertiary); font-size: 12px; display:block;">Sexo:</span> <span style="font-size: 14px;">${escapeHtml(perfil.gender || 'No especificado')}</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  if (window.lucide) lucide.createIcons();

  if (esPropio) {
    document.getElementById('userAvatarBtn')?.addEventListener('click', () => document.getElementById('userAvatarInput').click());
    document.getElementById('userAvatarInput')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { showToast('Máximo 5 MB', 'error'); return; }
      showLoading();
      try {
        const ext = file.name.split('.').pop();
        const filename = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await db.storage.from('media').upload(filename, file);
        if (upErr) throw upErr;
        const { data: pub } = db.storage.from('media').getPublicUrl(filename);
        await db.from('profiles').update({ avatar_url: pub.publicUrl }).eq('id', session.user.id);
        showToast('Foto actualizada', 'ok');
        cargarPerfilPublico();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
      hideLoading();
    });
  }
}

async function cargarBiografia() {
  const cont = document.getElementById('bioCard');
  if (!cont) return;

  try {
    const { data } = await withTimeout(
      db.from('profiles').select('username, bio, avatar_url, birthdate, gender').eq('is_author', true).limit(1).maybeSingle(),
      8000
    );
    if (!data) {
      cont.innerHTML = emptyState('user', 'Sin biografía', 'Pronto escribiré algo sobre mí.');
      return;
    }

    const fechaNac = data.birthdate
      ? new Date(data.birthdate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

    cont.innerHTML = `
      <div class="bio-avatar-c">
        ${data.avatar_url ? `<img src="${data.avatar_url}" alt="${escapeHtml(data.username)}" />` : escapeHtml((data.username || 'A').charAt(0).toUpperCase())}
      </div>
      <div class="bio-body-c">
        <h2 class="bio-name-c">${escapeHtml(data.username || 'Azael')}</h2>
        <p class="bio-handle-c">Autor</p>
        <div class="bio-text-c" style="margin-bottom: 20px;">${escapeHtml(data.bio || 'Biografía pendiente.')}</div>
        <div style="display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary);">
          ${fechaNac ? `<span>Nacimiento: ${fechaNac}</span>` : ''}
          ${data.gender ? `<span>· ${escapeHtml(data.gender)}</span>` : ''}
        </div>
      </div>
    `;
  } catch (e) {
    cont.innerHTML = emptyState('alert-circle', 'Timeout', 'Vuelve a intentar.');
  }
}

/* ============================================
   REDES Y DONACIONES
   ============================================ */

async function cargarRedes() {
  const grid = document.getElementById('socialGrid');
  if (!grid) return;
  try {
    const { data } = await withTimeout(
      db.from('social_links').select('platform, url').order('display_order', { ascending: true }),
      8000
    );
    if (!data?.length) {
      grid.innerHTML = emptyState('share-2', 'Pronto añadiré mis redes', 'Aquí encontrarás todos mis perfiles.');
      return;
    }
    grid.innerHTML = data.map(s => `
      <a class="social-link-c" href="${s.url}" target="_blank" rel="noopener noreferrer">
        <div class="social-link-c-icon">${socialIconSvg(s.platform.toLowerCase(), 20)}</div>
        <div class="social-link-c-body">
          <span class="social-link-c-name">${escapeHtml(capitalize(s.platform))}</span>
        </div>
      </a>
    `).join('');
  } catch {
    grid.innerHTML = emptyState('alert-circle', 'Error', 'No se pudieron cargar.');
  }
}

async function cargarDonaciones() {
  const grid = document.getElementById('donationsGrid');
  if (!grid) return;
  try {
    const { data } = await withTimeout(
      db.from('donations').select('*').order('display_order', { ascending: true }),
      8000
    );
    if (!data?.length) {
      grid.innerHTML = emptyState('heart-handshake', 'Aún no hay métodos de donación', 'Pronto añadiré opciones.');
      return;
    }
    grid.innerHTML = data.map(d => {
      const isBinance = d.platform.toLowerCase() === 'binance';
      const label = d.label || capitalize(d.platform);
      return `
        <a class="social-link-c" href="${isBinance ? 'https://www.binance.com/' : d.url}" target="_blank" rel="noopener noreferrer">
          <div class="social-link-c-icon">${donationIconSvg(d.platform.toLowerCase(), 20)}</div>
          <div class="social-link-c-body">
            <span class="social-link-c-name">${escapeHtml(label)}</span>
            <span class="social-link-c-handle">${escapeHtml(isBinance ? 'ID: ' + d.url : d.url)}</span>
          </div>
        </a>
      `;
    }).join('');
  } catch {
    grid.innerHTML = emptyState('alert-circle', 'Error', 'No se pudieron cargar.');
  }
}

/* ============================================
   ROUTER
   ============================================ */

function dispararContenidoSegunPath() {
  const path = pagActiva();
  const params = new URLSearchParams(location.search);

  if (path === 'index.html' || path === '') {
    cargarHero();
    cargarNovedades();
    cargarRelatosHome();
    cargarUltimoBlogHome();
    cargarHistorias({ excluirDestacada: false });
    cargarProximamente();
  } else if (path === 'historias.html') {
    cargarHistorias({ genero: params.get('genero'), busqueda: params.get('q') });

    const searchInput = document.getElementById('historiasSearchInput');
    if (searchInput) {
      let searchTimer = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          historiasCurrentSearch = e.target.value.trim();
          cargarHistorias({ busqueda: historiasCurrentSearch });
        }, 400);
      });
    }

    document.querySelectorAll('.filtro-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filtro-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        historiasCurrentFilter = btn.dataset.filter;
        cargarHistorias({ busqueda: historiasCurrentSearch });
      });
    });
  } else if (path === 'generos.html') {
    cargarGeneros();
  } else if (path === 'relatos.html') {
    cargarRelatos();
    const searchInput = document.getElementById('relatosSearchInput');
    if (searchInput) {
      let searchTimer = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          relatosSearchQuery = e.target.value;
          relatosCurrentPage = 1;
          aplicarFiltroYRenderRelatos();
        }, 250);
      });
    }
  } else if (path === 'relato.html') {
    cargarRelatoDetalle();
  } else if (path === 'resenas.html') {
    cargarResenas();
  } else if (path === 'resena.html') {
    cargarResenaDetalle();
  } else if (path === 'mis-relatos.html') {
    cargarMisRelatos();
  } else if (path === 'historial.html') {
    cargarHistorial();
    document.querySelectorAll('#filtrosHistorial .filtro-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#filtrosHistorial .filtro-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        historialFilter = btn.dataset.filter;
        renderHistorial();
      });
    });
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
  } else if (path === 'perfil.html') {
    cargarPerfilPublico();
  }
}

/* ============================================
   INICIALIZACIÓN Y PWA
   ============================================ */

initTheme();
loadReaderPrefs();
inyectarHeader();
inyectarDrawer();
inyectarAuthModal();
initFocusModeExit();

if (document.referrer && document.referrer.includes('admin')) cache.clear();

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

(async () => {
  await cargarSiteSettings();
  if (typeof actualizarDrawerSessionLinks === 'function') {
    actualizarDrawerSessionLinks();
  }
  dispararContenidoSegunPath();
  if (window.lucide) lucide.createIcons();
})();

window.addEventListener('load', () => { if (window.lucide) lucide.createIcons(); });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('[PWA] Error SW:', err));
  });
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  mostrarBotonInstalar();
});

function mostrarBotonInstalar() {
  if (document.getElementById('pwa-install-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'pwa-install-btn';
  btn.innerHTML = '📲 Instalar app';
  btn.className = 'pwa-install-btn';
  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.remove();
  });
  document.body.appendChild(btn);
}

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.getElementById('pwa-install-btn')?.remove();
});
