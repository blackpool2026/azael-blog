/* ============================================
   AZAEL BLOG — main.js COMPLETO
   ============================================ */

const SUPABASE_URL = 'https://bqliduwiarryqcqtignd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbGlkdXdpYXJyeXFjcXRpZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTU4MzgsImV4cCI6MjEwNjM3MTgzOH0.T6GZXQNjzRwhbuYuVx54vsdTNy2CTpEwCjnxED1KGaY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const THEME_KEY = 'azael-theme-v2';
const PREMIUM_FREE_LIMIT = 5;

/* ---------- PREFERENCIAS DE LECTURA ---------- */
const READER_PREFS = {
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.8,
  theme: 'oled',
};

function loadReaderPrefs() {
  try {
    Object.assign(READER_PREFS, JSON.parse(localStorage.getItem('azael-reader-prefs') || '{}'));
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

/* ---------- HELPERS BÁSICOS ---------- */
function ic(name, size = 18) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px;display:inline-block;"></i>`;
}
const icon = ic; // alias

function pagActiva() {
  return (location.pathname.split('/').pop() || 'index.html').toLowerCase();
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  return msg;
}

/* ---------- TEMA ---------- */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
}
function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
}

/* ---------- NAV ---------- */
const NAV_ITEMS = [
  { href: 'index.html',     label: 'Inicio',    icon: 'home' },
  { href: 'historias.html', label: 'Historias', icon: 'book-open' },
  { href: 'generos.html',   label: 'Géneros',   icon: 'layout-grid' },
  { href: 'blog.html',      label: 'Blog',      icon: 'feather' },
  { href: 'redes.html',     label: 'Redes',     icon: 'share-2' },
];

const PAGE_TITLES = {
  'index.html': 'Inicio',
  'historias.html': 'Historias',
  'generos.html': 'Géneros',
  'blog.html': 'Blog',
  'post.html': 'Entrada',
  'redes.html': 'Redes',
  'biografia.html': 'Biografía',
  'historia.html': 'Historia',
  'capitulo.html': 'Leyendo',
};

/* ---------- HEADER ---------- */
function inyectarHeader() {
  const mount = document.getElementById('header-mount');
  if (!mount) return;

  const path = pagActiva();
  const title = PAGE_TITLES[path] || 'Azael Blog';

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

/* ---------- DRAWER ---------- */
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
            <span class="drawer-brand-name">Azael Blog</span>
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

  document.getElementById('drawerClose').addEventListener('click', () => {
    document.body.classList.remove('drawer-open');
  });
  document.getElementById('drawerBackdrop').addEventListener('click', () => {
    document.body.classList.remove('drawer-open');
  });
  document.querySelectorAll('.drawer-link').forEach(l => {
    l.addEventListener('click', () => document.body.classList.remove('drawer-open'));
  });
  document.getElementById('drawerAuthBtn').addEventListener('click', () => {
    const label = document.getElementById('drawerAuthLabel');
    if (label && label.textContent === 'Cerrar sesión') {
      db.auth.signOut().then(() => location.reload());
    } else {
      document.body.classList.remove('drawer-open');
      const modal = document.getElementById('authModal');
      if (modal) modal.hidden = false;
    }
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
        <button class="modal-close-c" id="authClose" aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2 class="modal-title-c">Bienvenido</h2>
        <p class="modal-sub-c">Accede para leer todos los capítulos y comentar.</p>
        <div class="modal-tabs-c">
          <button class="modal-tab-c active" data-tab="login">Iniciar sesión</button>
          <button class="modal-tab-c" data-tab="register">Crear cuenta</button>
        </div>
        <form id="loginForm" class="auth-form-c">
          <label>Correo <input type="email" id="loginEmail" required autocomplete="email" placeholder="tucorreo@ejemplo.com" /></label>
          <label>Contraseña <input type="password" id="loginPassword" required autocomplete="current-password" placeholder="••••••••" /></label>
          <button type="submit" class="btn btn-primary btn-block">Entrar</button>
          <p class="auth-error-c" id="loginError" hidden></p>
        </form>
        <form id="registerForm" class="auth-form-c" hidden>
          <label>Nombre de usuario <input type="text" id="registerUsername" required minlength="3" maxlength="20" placeholder="Cómo te llamas" /></label>
          <label>Correo <input type="email" id="registerEmail" required autocomplete="email" placeholder="tucorreo@ejemplo.com" /></label>
          <label>Contraseña <input type="password" id="registerPassword" required minlength="6" autocomplete="new-password" placeholder="Mínimo 6 caracteres" /></label>
          <div class="auth-consent-c">
            <input type="checkbox" id="registerConsent" required />
            <label for="registerConsent">Acepto recibir novedades de los libros y del blog por correo. Podrás darte de baja cuando quieras.</label>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Crear cuenta</button>
          <p class="auth-error-c" id="registerError" hidden></p>
        </form>
      </div>
    </div>
  `;

  const authModal = document.getElementById('authModal');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');

  document.getElementById('authClose').addEventListener('click', () => { authModal.hidden = true; });
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) authModal.hidden = true;
  });

  document.querySelectorAll('.modal-tab-c').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab-c').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      loginForm.hidden = !isLogin;
      registerForm.hidden = isLogin;
      loginError.hidden = true;
      registerError.hidden = true;
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const { error } = await db.auth.signInWithPassword({
      email: document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value,
    });
    if (error) {
      loginError.textContent = traducirError(error.message);
      loginError.hidden = false;
      return;
    }
    authModal.hidden = true;
    loginForm.reset();
    location.reload();
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.hidden = true;
    const { error } = await db.auth.signUp({
      email: document.getElementById('registerEmail').value.trim(),
      password: document.getElementById('registerPassword').value,
      options: { data: {
        username: document.getElementById('registerUsername').value.trim(),
        newsletter: true,
      }},
    });
    if (error) {
      registerError.textContent = traducirError(error.message);
      registerError.hidden = false;
      return;
    }
    authModal.hidden = true;
    registerForm.reset();
    location.reload();
  });

  db.auth.onAuthStateChange((_event, session) => {
    const label = document.getElementById('drawerAuthLabel');
    if (label) label.textContent = session?.user ? 'Cerrar sesión' : 'Iniciar sesión';
  });
}

/* ---------- HERO ---------- */
async function cargarHero() {
  const cont = document.getElementById('heroMount');
  if (!cont) return;

  const { data, error } = await db
    .from('stories')
    .select('id, title, synopsis, cover_url, genre, status')
    .eq('is_published', true)
    .eq('is_featured', true)
    .maybeSingle();

  if (error || !data) {
    cont.innerHTML = `
      <section class="hero-simple container">
        <p class="hero-eyebrow">Un rincón para leer</p>
        <h1 class="hero-title-c">Historias que se quedan.</h1>
        <p style="color:var(--text-secondary);font-size:16px;max-width:560px;">Relatos, capítulos nuevos y un espacio tranquilo para perderse entre líneas.</p>
      </section>
    `;
    return;
  }

  cont.innerHTML = `
    <section class="hero-cinematic">
      <div class="hero-bg">
        ${data.cover_url ? `<img src="${data.cover_url}" alt="" />` : ''}
      </div>
      <div class="hero-content container">
        <span class="hero-tag">Historia destacada</span>
        <h1 class="hero-title-c">${escapeHtml(data.title)}</h1>
        ${data.synopsis ? `<p class="hero-synopsis">${escapeHtml(data.synopsis)}</p>` : ''}
        <div class="hero-actions-c">
          <a href="historia.html?id=${data.id}" class="btn btn-primary">${ic('book-open')} Empezar a leer</a>
          <a href="historias.html" class="btn btn-ghost">Ver todas</a>
        </div>
      </div>
    </section>
  `;
  if (window.lucide) lucide.createIcons();
}

/* ---------- NOVEDADES ---------- */
async function cargarNovedades() {
  const cont = document.getElementById('novedadesMount');
  if (!cont) return;

  const { data, error } = await db
    .from('chapters')
    .select('id, title, chapter_order, created_at, reading_time, story_id, stories(id, title, cover_url)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data?.length) return;

  cont.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2 class="section-title">Novedades</h2>
            <p class="section-sub">Últimos capítulos publicados</p>
          </div>
          <a href="historias.html" class="section-link">Ver todo ${ic('arrow-right', 14)}</a>
        </div>
        <div class="horizontal-carousel">
          ${data.map(c => {
            const story = c.stories || {};
            return `
              <a class="chapter-card" href="capitulo.html?id=${c.id}">
                <div class="chapter-card-cover">
                  ${story.cover_url
                    ? `<img src="${story.cover_url}" alt="" loading="lazy" />`
                    : escapeHtml((story.title || '?').charAt(0))}
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
}

/* ---------- HISTORIAS ---------- */
async function cargarHistorias({ limite = null, excluirDestacada = false, genero = null, busqueda = null } = {}) {
  const grid = document.getElementById('storiesGrid');
  if (!grid) return;

  let query = db.from('stories')
    .select('id, title, cover_url, genre, status, is_featured')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (excluirDestacada) query = query.eq('is_featured', false);
  if (genero) query = query.ilike('genre', `%${genero}%`);
  if (busqueda) query = query.ilike('title', `%${busqueda}%`);
  if (limite) query = query.limit(limite);

  const { data, error } = await query;

  if (error || !data?.length) {
    grid.innerHTML = emptyState('book-open', 'Sin historias todavía', 'Cuando publique la primera, aparecerá aquí.');
    return;
  }

  grid.innerHTML = data.map(s => `
    <a class="story-card-c" href="historia.html?id=${s.id}">
      <div class="book-cover">
        ${s.cover_url
          ? `<img src="${s.cover_url}" alt="${escapeHtml(s.title)}" loading="lazy" />`
          : escapeHtml(s.title.charAt(0))}
      </div>
      <h3 class="story-card-c-title">${escapeHtml(s.title)}</h3>
      <div class="story-card-c-meta">${escapeHtml(s.genre || 'Sin género')}</div>
    </a>
  `).join('');
}

/* ---------- GÉNEROS ---------- */
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

/* ---------- BLOG ---------- */
async function cargarBlog(limite = null) {
  const list = document.getElementById('blogList');
  if (!list) return;

  let q = db.from('blog_posts')
    .select('id, title, content, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false });
  if (limite) q = q.limit(limite);

  const { data, error } = await q;

  if (error || !data?.length) {
    list.innerHTML = emptyState('feather', 'Blog vacío', 'Las entradas que escriba aparecerán aquí.');
    return;
  }

  list.innerHTML = data.map(p => {
    const excerpt = (p.content || '').replace(/<[^>]+>/g, '').slice(0, 180);
    const fecha = new Date(p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    return `
      <a class="blog-item-c" href="post.html?id=${p.id}">
        <div class="blog-item-c-date">${fecha}</div>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(excerpt)}${excerpt.length >= 180 ? '…' : ''}</p>
      </a>
    `;
  }).join('');
}

/* ---------- POST ---------- */
async function cargarPost() {
  const cont = document.getElementById('postContent');
  if (!cont) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    cont.innerHTML = `<div class="container">${emptyState('file-question', 'Entrada no encontrada', 'El enlace no es válido.')}</div>`;
    return;
  }
  const { data, error } = await db.from('blog_posts')
    .select('id, title, content, cover_url, created_at')
    .eq('id', id).eq('published', true).maybeSingle();
  if (error || !data) {
    cont.innerHTML = `<div class="container">${emptyState('file-question', 'Entrada no encontrada', 'Puede que haya sido eliminada.')}</div>`;
    return;
  }
  document.title = `${data.title} — Azael Blog`;
  const ht = document.querySelector('.header-title');
  if (ht) ht.textContent = data.title;
  const fecha = new Date(data.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  cont.innerHTML = `
    <div class="container">
      <h1 class="reader-title-c">${escapeHtml(data.title)}</h1>
      <p class="reader-meta-c">${fecha}</p>
      ${data.cover_url ? `<img src="${data.cover_url}" style="max-width:100%;border-radius:14px;margin-bottom:28px;" />` : ''}
      <div class="reader-body-c">${data.content || ''}</div>
    </div>
  `;
  document.getElementById('commentsSection')?.removeAttribute('hidden');
  await cargarComentarios(id);
  await prepararFormComentario(id);
}

async function cargarComentarios(postId) {
  const list = document.getElementById('commentsList');
  const count = document.getElementById('commentsCount');
  if (!list) return;
  const { data, error } = await db.from('comments')
    .select('id, content, created_at, user_id')
    .eq('post_id', postId).order('created_at', { ascending: true });
  if (error) { list.innerHTML = emptyState('alert-circle', 'Error', 'No se pudieron cargar.'); return; }
  if (count) count.textContent = data?.length === 1 ? '1 comentario' : `${data?.length || 0} comentarios`;
  if (!data?.length) { list.innerHTML = emptyState('message-circle', 'Sé el primero en comentar', 'Comparte lo que piensas.'); return; }
  const ids = [...new Set(data.map(c => c.user_id))];
  const { data: perfiles } = await db.from('profiles').select('id, username, is_author').in('id', ids);
  const map = Object.fromEntries((perfiles || []).map(p => [p.id, p]));
  list.innerHTML = data.map(c => {
    const p = map[c.user_id] || {};
    const fecha = new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
      <div class="comment-c">
        <div class="comment-head-c">
          <div class="comment-author-c">${escapeHtml(p.username || 'Lector')}${p.is_author ? '<span class="comment-badge-c">Autor</span>' : ''}</div>
          <span class="comment-date-c">${fecha}</span>
        </div>
        <div class="comment-body-c">${escapeHtml(c.content)}</div>
      </div>
    `;
  }).join('');
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
    const { error } = await db.from('comments').insert({ post_id: postId, user_id: session.user.id, content });
    if (error) { alert('No se pudo publicar'); return; }
    document.getElementById('commentText').value = '';
    await cargarComentarios(postId);
  });
}

/* ---------- REDES ---------- */
const SOCIAL_ICONS = {
  instagram: 'instagram', twitter: 'twitter', x: 'twitter', tiktok: 'music',
  youtube: 'youtube', facebook: 'facebook', discord: 'message-circle',
  whatsapp: 'message-circle', telegram: 'send',
};

async function cargarRedes() {
  const grid = document.getElementById('socialGrid');
  if (!grid) return;
  const { data, error } = await db.from('social_links')
    .select('platform, url, display_order').order('display_order', { ascending: true });
  if (error || !data?.length) {
    grid.innerHTML = emptyState('share-2', 'Pronto añadiré mis redes', 'Aquí encontrarás todos mis perfiles.');
    return;
  }
  grid.innerHTML = data.map(s => {
    const iconName = SOCIAL_ICONS[s.platform.toLowerCase()] || 'link';
    const handle = (s.url || '').replace(/^https?:\/\/(www\.)?/, '').split('/').slice(0, 2).join('/');
    return `
      <a class="social-link-c" href="${s.url}" target="_blank" rel="noopener noreferrer">
        <div class="social-link-c-icon">${ic(iconName, 18)}</div>
        <div class="social-link-c-body">
          <span class="social-link-c-name">${escapeHtml(capitalize(s.platform))}</span>
          <span class="social-link-c-handle">${escapeHtml(handle)}</span>
        </div>
      </a>
    `;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

/* ---------- BIOGRAFÍA ---------- */
async function cargarBiografia() {
  const cont = document.getElementById('bioCard');
  if (!cont) return;
  const { data, error } = await db.from('profiles')
    .select('username, bio, avatar_url')
    .eq('is_author', true).limit(1).maybeSingle();
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
}

/* ---------- HISTORIA DETALLE ---------- */
async function cargarHistoriaDetalle() {
  const cont = document.getElementById('storyDetail');
  if (!cont) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { cont.innerHTML = emptyState('file-question', 'Historia no encontrada', ''); return; }

  const { data: story, error } = await db.from('stories').select('*')
    .eq('id', id).eq('is_published', true).maybeSingle();
  if (error || !story) { cont.innerHTML = emptyState('file-question', 'Historia no encontrada', ''); return; }

  document.title = `${story.title} — Azael Blog`;
  const ht = document.querySelector('.header-title');
  if (ht) ht.textContent = story.title;

  const { data: chapters } = await db.from('chapters')
    .select('id, title, chapter_order, created_at, is_premium, reading_time')
    .eq('story_id', id).order('chapter_order', { ascending: true });

  const { data: { session } } = await db.auth.getSession();
  const logged = !!session;

  const { data: characters } = await db.from('characters')
    .select('id, name, role, description, avatar_url')
    .eq('story_id', id).order('display_order', { ascending: true });

  const chaptersHtml = (chapters || []).length
    ? chapters.map((c, i) => {
        const locked = c.is_premium && !logged;
        const num = c.chapter_order || (i + 1);
        return `
          <a class="chapter-row" href="capitulo.html?id=${c.id}${locked ? '&locked=1' : ''}">
            <div class="chapter-row-num">${String(num).padStart(2, '0')}</div>
            <div class="chapter-row-body">
              <div class="chapter-row-title">${escapeHtml(c.title)}</div>
              <div class="chapter-row-meta">
                <span>${tiempoRelativo(c.created_at)}</span>
                ${c.reading_time ? `<span>${c.reading_time} min</span>` : ''}
                ${c.is_premium ? '<span style="color:var(--accent-color);font-weight:600;">Premium</span>' : ''}
              </div>
            </div>
            ${locked ? `<div class="chapter-row-lock">${ic('lock', 20)}</div>` : ''}
          </a>
        `;
      }).join('')
    : emptyState('book', 'Sin capítulos aún', 'Pronto empezaré a publicar.');

  const charsHtml = (characters || []).length ? `
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2 class="section-title">Personajes</h2>
            <p class="section-sub">Quiénes protagonizan esta historia</p>
          </div>
        </div>
        <div class="characters-grid">
          ${characters.map(c => `
            <div class="character-card">
              <div class="character-avatar">
                ${c.avatar_url ? `<img src="${c.avatar_url}" />` : escapeHtml(c.name.charAt(0))}
              </div>
              <div class="character-name">${escapeHtml(c.name)}</div>
              ${c.role ? `<div class="character-role">${escapeHtml(c.role)}</div>` : ''}
              ${c.description ? `<div class="character-desc">${escapeHtml(c.description)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  ` : '';

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
          ${story.synopsis ? `<p class="story-synopsis-c">${escapeHtml(story.synopsis)}</p>` : ''}
          <div class="story-stats">
            <div class="story-stats-item">
              <span class="story-stats-label">Capítulos</span>
              <span class="story-stats-value">${(chapters || []).length}</span>
            </div>
            <div class="story-stats-item">
              <span class="story-stats-label">Estado</span>
              <span class="story-stats-value">${escapeHtml(story.status || 'En curso')}</span>
            </div>
          </div>
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
    ${charsHtml}
  `;
  if (window.lucide) lucide.createIcons();
}

/* ---------- CAPÍTULO ---------- */
async function cargarCapitulo() {
  const cont = document.getElementById('chapterContent');
  if (!cont) return;
  loadReaderPrefs();

  const id = new URLSearchParams(location.search).get('id');
  if (!id) { cont.innerHTML = emptyState('file-question', 'Capítulo no encontrado', ''); return; }

  const { data: chapter, error } = await db.from('chapters')
    .select('id, title, content, author_note, chapter_order, story_id, is_premium, reading_time, created_at')
    .eq('id', id).maybeSingle();
  if (error || !chapter) { cont.innerHTML = emptyState('file-question', 'Capítulo no encontrado', ''); return; }

  const { data: story } = await db.from('stories').select('id, title').eq('id', chapter.story_id).maybeSingle();
  const { data: { session } } = await db.auth.getSession();
  const logged = !!session;

  const num = chapter.chapter_order || 0;
  const beyondFree = num > PREMIUM_FREE_LIMIT;
  const requiresAuth = chapter.is_premium || beyondFree;
  const blocked = requiresAuth && !logged;

  document.title = `${chapter.title} — ${story?.title || 'Azael Blog'}`;
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
          <p>Crea una cuenta gratis para seguir leyendo. Recibirás avisos cuando publique nuevos capítulos.</p>
          <div class="paywall-actions">
            <button class="btn btn-primary" id="paywallLogin">${ic('log-in', 16)} Iniciar sesión</button>
            <button class="btn btn-ghost" id="paywallRegister">Crear cuenta gratis</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('paywallLogin')?.addEventListener('click', () => {
      document.getElementById('authModal').hidden = false;
    });
    document.getElementById('paywallRegister')?.addEventListener('click', () => {
      document.getElementById('authModal').hidden = false;
      document.querySelector('.modal-tab-c[data-tab="register"]')?.click();
    });
    if (window.lucide) lucide.createIcons();
    return;
  }

  const { data: siblings } = await db.from('chapters')
    .select('id, title, chapter_order').eq('story_id', chapter.story_id)
    .order('chapter_order', { ascending: true });

  const idx = (siblings || []).findIndex(c => c.id === chapter.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx < (siblings?.length || 0) - 1 ? siblings[idx + 1] : null;

  const wordCount = (chapter.content || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const readingTime = chapter.reading_time || Math.max(1, Math.round(wordCount / 200));

  cont.innerHTML = `
    <div class="chapter-shell">
      <div class="chapter-head">
        <a href="historia.html?id=${story?.id || ''}" class="chapter-story-link">${ic('arrow-left', 14)} ${escapeHtml(story?.title || '')}</a>
        <h1 class="chapter-title-c">Capítulo ${num} · ${escapeHtml(chapter.title)}</h1>
        <div class="chapter-meta-c">
          <span>${ic('clock', 14)} ${readingTime} min</span>
          <span>${ic('type', 14)} ${wordCount.toLocaleString('es-ES')} palabras</span>
          <span>${ic('calendar', 14)} ${new Date(chapter.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
      <div class="chapter-body" id="chapterBody">${chapter.content || '<p>Sin contenido.</p>'}</div>
      ${chapter.author_note ? `<div class="chapter-note"><span class="chapter-note-label">Nota del autor</span>${escapeHtml(chapter.author_note)}</div>` : ''}
      <nav class="chapter-nav">
        ${prev ? `<a class="chapter-nav-btn prev" href="capitulo.html?id=${prev.id}"><span class="chapter-nav-label">${ic('arrow-left', 12)} Anterior</span><span class="chapter-nav-title">${escapeHtml(prev.title)}</span></a>` : `<div class="chapter-nav-btn prev disabled"></div>`}
        <a class="chapter-nav-btn" href="historia.html?id=${story?.id || ''}" style="align-items:center;text-align:center;"><span class="chapter-nav-label">${ic('list', 12)} Índice</span><span class="chapter-nav-title">Ver capítulos</span></a>
        ${next ? `<a class="chapter-nav-btn next" href="capitulo.html?id=${next.id}"><span class="chapter-nav-label">Siguiente ${ic('arrow-right', 12)}</span><span class="chapter-nav-title">${escapeHtml(next.title)}</span></a>` : `<div class="chapter-nav-btn next disabled"></div>`}
      </nav>
    </div>
  `;

  applyReaderPrefs();
  if (window.lucide) lucide.createIcons();

  // Botón ajustes de lectura
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

  // Barra de progreso
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
}

/* ---------- AJUSTES DE LECTURA ---------- */
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
            <button data-value="night" class="rs-seg-btn">Noche</button>
            <button data-value="sepia" class="rs-seg-btn">Sepia</button>
          </div>
        </div>
        <button class="btn btn-ghost btn-block" id="rsFullscreen" style="margin-top:8px;">
          ${ic('maximize-2')} Pantalla completa
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#rsClose').addEventListener('click', () => { modal.hidden = true; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

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
      saveReaderPrefs(); applyReaderPrefs(); actualizarReaderUI();
    });
    modal.querySelector('#rsFontPlus').addEventListener('click', () => {
      READER_PREFS.fontSize = Math.min(24, READER_PREFS.fontSize + 1);
      saveReaderPrefs(); applyReaderPrefs(); actualizarReaderUI();
    });

    modal.querySelector('#rsFullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
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

/* ---------- POSICIÓN DE LECTURA ---------- */
function saveReadingPosition(chapterId, storyId) {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  try {
    localStorage.setItem('azael-last-read', JSON.stringify({
      chapterId, storyId,
      percent: Math.min(100, Math.max(0, percent)),
      timestamp: Date.now(),
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

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const path = pagActiva();
const params = new URLSearchParams(location.search);

if (path === 'index.html' || path === '') {
  cargarHero();
  cargarNovedades();
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
} else if (path === 'biografia.html') {
  cargarBiografia();
} else if (path === 'historia.html') {
  cargarHistoriaDetalle();
} else if (path === 'capitulo.html') {
  cargarCapitulo();
}

// Crear iconos Lucide cuando esté listo
if (window.lucide) lucide.createIcons();
window.addEventListener('load', () => { if (window.lucide) lucide.createIcons(); });