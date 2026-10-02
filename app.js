/* ============================================
   AZAEL BLOG — lógica compartida
   ============================================ */

const SUPABASE_URL = 'https://bqliduwiarryqcqtignd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbGlkdXdpYXJyeXFjcXRpZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTU4MzgsImV4cCI6MjEwNjM3MTgzOH0.T6GZXQNjzRwhbuYuVx54vsdTNy2CTpEwCjnxED1KGaY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const THEME_KEY = 'azael-theme';
const SIDEBAR_KEY = 'azael-sidebar-collapsed';

/* ---------- TEMA ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return applyTheme(saved);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

/* ---------- ÍCONOS SVG ---------- */
const ICONS = {
  home: '<path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/>',
  book: '<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M18 7h2v13H7"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  skull: '<path d="M12 2a8 8 0 0 0-8 8v6a2 2 0 0 0 2 2h2v3h8v-3h2a2 2 0 0 0 2-2v-6a8 8 0 0 0-8-8z"/><circle cx="9.5" cy="12" r=".8" fill="currentColor"/><circle cx="14.5" cy="12" r=".8" fill="currentColor"/>',
  laugh: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  search2: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  blood: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>',
  mask: '<path d="M2 8c0-2 2-4 5-4s5 2 5 4v6c0 3-2 6-5 6s-5-3-5-6V8z"/><path d="M12 8c0-2 2-4 5-4s5 2 5 4v6c0 3-2 6-5 6s-5-3-5-6V8z"/>',
  feather: '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>',
};

/* ---------- GÉNEROS ---------- */
const GENEROS = [
  { slug: 'romance',   label: 'Romance',         icon: 'heart' },
  { slug: 'terror',    label: 'Terror',          icon: 'skull' },
  { slug: 'comedia',   label: 'Comedia',         icon: 'laugh' },
  { slug: 'misterio',  label: 'Misterio',        icon: 'search2' },
  { slug: 'musica',    label: 'Música',          icon: 'music' },
  { slug: 'violencia', label: 'Violencia',       icon: 'blood' },
  { slug: 'suspenso',  label: 'Suspenso',        icon: 'eye' },
  { slug: 'aventura',  label: 'Aventura',        icon: 'compass' },
  { slug: 'fantasia',  label: 'Fantasía',        icon: 'star' },
  { slug: 'ciencia',   label: 'Ciencia ficción', icon: 'rocket' },
  { slug: 'drama',     label: 'Drama',           icon: 'mask' },
  { slug: 'poesia',    label: 'Poesía',          icon: 'feather' },
];

/* ---------- SIDEBAR ---------- */
function inyectarSidebar() {
  const mount = document.getElementById('sidebar-mount');
  if (!mount) return;

  const path = pagActiva();
  const collapsed = localStorage.getItem(SIDEBAR_KEY) === '1';
  if (collapsed) document.body.classList.add('sidebar-collapsed');

  const navItems = [
    { href: 'index.html',     label: 'Inicio',     icon: 'home' },
    { href: 'historias.html', label: 'Historias',  icon: 'book' },
    { href: 'generos.html',   label: 'Géneros',    icon: 'grid' },
    { href: 'blog.html',      label: 'Blog',       icon: 'edit' },
    { href: 'redes.html',     label: 'Redes',      icon: 'share' },
  ];

  mount.innerHTML = `
    <div class="sidebar-top">
      <a href="index.html" class="sidebar-brand">
        <span class="sidebar-brand-mark">A</span>
        <span class="sidebar-brand-text">Azael Blog</span>
      </a>
      <button class="sidebar-collapse-btn" id="sidebarCollapseBtn" aria-label="Colapsar menú">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.chevronLeft}</svg>
      </button>
    </div>

    <nav class="sidebar-nav">
      <div class="sidebar-section-title">Menú</div>
      ${navItems.map(item => `
        <a href="${item.href}" class="sidebar-link ${path === item.href ? 'active' : ''}">
          <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">${ICONS[item.icon]}</svg>
          <span class="sidebar-link-label">${item.label}</span>
        </a>
      `).join('')}

      <div class="sidebar-section-title">Sobre mí</div>
      <a href="biografia.html" class="sidebar-link ${path === 'biografia.html' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">${ICONS.user}</svg>
        <span class="sidebar-link-label">Biografía</span>
      </a>
    </nav>

    <div class="sidebar-footer">
      <button class="sidebar-link" id="authBtnSide">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">${ICONS.user}</svg>
        <span class="sidebar-link-label" id="authBtnSideLabel">Iniciar sesión</span>
      </button>
    </div>
  `;

  document.getElementById('sidebarCollapseBtn').addEventListener('click', () => {
    const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem(SIDEBAR_KEY, isCollapsed ? '1' : '0');
  });

  document.querySelectorAll('.sidebar-link').forEach((l) => {
    l.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 960px)').matches) {
        document.body.classList.remove('sidebar-open');
      }
    });
  });
}

/* ---------- BACKDROP MÓVIL ---------- */
function inyectarBackdrop() {
  const bd = document.createElement('div');
  bd.className = 'sidebar-backdrop';
  bd.id = 'sidebarBackdrop';
  bd.addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
  });
  document.body.appendChild(bd);
}

/* ---------- TOPBAR ---------- */
function inyectarTopbar() {
  const mount = document.getElementById('topbar-mount');
  if (!mount) return;

  mount.innerHTML = `
    <header class="topbar">
      <div class="topbar-inner">
        <button class="topbar-hamburger" id="menuToggle" aria-label="Menú">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.menu}</svg>
        </button>

        <div class="topbar-search">
          <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">${ICONS.search}</svg>
          <input type="search" placeholder="Buscar historias…" id="searchInput" />
        </div>

        <div class="topbar-actions">
          <button class="icon-btn" id="themeToggle" aria-label="Cambiar tema">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.moon}</svg>
          </button>
          <div class="topbar-avatar" id="topbarAvatar" title="Cuenta">A</div>
        </div>
      </div>
    </header>
  `;

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
  });

  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  document.getElementById('topbarAvatar').addEventListener('click', () => {
    const modal = document.getElementById('authModal');
    if (modal) modal.hidden = false;
  });

  const search = document.getElementById('searchInput');
  if (search) {
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && search.value.trim()) {
        location.href = `historias.html?q=${encodeURIComponent(search.value.trim())}`;
      }
    });
  }
}

/* ---------- MODAL AUTH ---------- */
function inyectarAuthModal() {
  const mount = document.getElementById('auth-mount');
  if (!mount) return;

  mount.innerHTML = `
    <div class="modal-overlay" id="authModal" hidden>
      <div class="modal">
        <button class="modal-close" id="authClose" aria-label="Cerrar">×</button>

        <div class="modal-tabs">
          <button class="modal-tab active" data-tab="login">Iniciar sesión</button>
          <button class="modal-tab" data-tab="register">Crear cuenta</button>
        </div>

        <form id="loginForm" class="auth-form">
          <label>Correo
            <input type="email" id="loginEmail" required autocomplete="email" />
          </label>
          <label>Contraseña
            <input type="password" id="loginPassword" required autocomplete="current-password" />
          </label>
          <button type="submit" class="btn btn-primary btn-block">Entrar</button>
          <p class="auth-error" id="loginError" hidden></p>
        </form>

        <form id="registerForm" class="auth-form" hidden>
          <label>Nombre de usuario
            <input type="text" id="registerUsername" required minlength="3" maxlength="20" />
          </label>
          <label>Correo
            <input type="email" id="registerEmail" required autocomplete="email" />
          </label>
          <label>Contraseña
            <input type="password" id="registerPassword" required minlength="6" autocomplete="new-password" />
          </label>

          <div class="auth-consent">
            <input type="checkbox" id="registerConsent" required />
            <label for="registerConsent">
              Acepto recibir novedades de los libros y del blog por correo. Podrás darte de baja cuando quieras.
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-block">Crear cuenta</button>
          <p class="auth-error" id="registerError" hidden></p>
        </form>
      </div>
    </div>
  `;

  const authModal = document.getElementById('authModal');
  const authClose = document.getElementById('authClose');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');

  authClose.addEventListener('click', () => { authModal.hidden = true; });
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) authModal.hidden = true;
  });

  document.querySelectorAll('.modal-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach((t) => t.classList.remove('active'));
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
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      loginError.textContent = traducirError(error.message);
      loginError.hidden = false;
      return;
    }
    authModal.hidden = true;
    loginForm.reset();
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.hidden = true;
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    const { error } = await db.auth.signUp({
      email,
      password,
      options: { data: { username, newsletter: true } },
    });

    if (error) {
      registerError.textContent = traducirError(error.message);
      registerError.hidden = false;
      return;
    }
    authModal.hidden = true;
    registerForm.reset();
  });

  db.auth.onAuthStateChange((_event, session) => {
    const authBtnSideLabel = document.getElementById('authBtnSideLabel');
    const avatar = document.getElementById('topbarAvatar');
    const authBtnSide = document.getElementById('authBtnSide');

    if (session?.user) {
      const email = session.user.email || '';
      const initial = (email[0] || 'A').toUpperCase();
      if (authBtnSideLabel) authBtnSideLabel.textContent = 'Cerrar sesión';
      if (avatar) avatar.textContent = initial;
      if (authBtnSide) {
        authBtnSide.onclick = async () => {
          await db.auth.signOut();
          location.reload();
        };
      }
    } else {
      if (authBtnSideLabel) authBtnSideLabel.textContent = 'Iniciar sesión';
      if (avatar) avatar.textContent = 'A';
      if (authBtnSide) {
        authBtnSide.onclick = () => { authModal.hidden = false; };
      }
    }
  });
}

/* ---------- DESTACADA ---------- */
async function cargarDestacada() {
  const cont = document.getElementById('featuredStory');
  if (!cont) return;

  const { data, error } = await db
    .from('stories')
    .select('id, title, synopsis, cover_url, genre, status')
    .eq('is_published', true)
    .eq('is_featured', true)
    .maybeSingle();

  if (error || !data) {
    document.getElementById('destacada-section')?.setAttribute('hidden', '');
    return;
  }

  document.getElementById('destacada-section')?.removeAttribute('hidden');

  cont.innerHTML = `
    <a class="featured-story" href="historia.html?id=${data.id}">
      <div class="featured-cover-wrap">
        <div class="book-3d">
          ${data.cover_url
            ? `<img src="${data.cover_url}" alt="${escapeHtml(data.title)}" loading="lazy" />`
            : escapeHtml(data.title.charAt(0))}
        </div>
      </div>
      <div class="featured-info">
        <span class="featured-badge">Destacada</span>
        <h2 class="featured-title">${escapeHtml(data.title)}</h2>
        ${data.synopsis ? `<p class="featured-synopsis">${escapeHtml(data.synopsis)}</p>` : ''}
        <div class="featured-meta">
          ${data.genre ? `<span>${escapeHtml(data.genre)}</span>` : ''}
          ${data.genre ? '<span>·</span>' : ''}
          <span>${escapeHtml(data.status || 'En curso')}</span>
        </div>
        <span class="featured-cta">Leer ahora →</span>
      </div>
    </a>
  `;
}

/* ---------- ÚLTIMO BLOG ---------- */
async function cargarUltimoBlog() {
  const cont = document.getElementById('ultimoBlog');
  if (!cont) return;

  const { data, error } = await db
    .from('blog_posts')
    .select('id, title, content, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    document.getElementById('ultimo-blog-section')?.setAttribute('hidden', '');
    return;
  }

  document.getElementById('ultimo-blog-section')?.removeAttribute('hidden');

  const excerpt = (data.content || '').replace(/<[^>]+>/g, '').slice(0, 180);
  const fecha = new Date(data.created_at).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  cont.innerHTML = `
    <a class="blog-preview" href="post.html?id=${data.id}">
      <time>${fecha}</time>
      <h3>${escapeHtml(data.title)}</h3>
      <p>${escapeHtml(excerpt)}${excerpt.length >= 180 ? '…' : ''}</p>
    </a>
  `;
}

/* ---------- HISTORIAS ---------- */
async function cargarHistorias({ limite = null, excluirDestacada = false, genero = null, busqueda = null } = {}) {
  const grid = document.getElementById('storiesGrid');
  if (!grid) return;

  let query = db
    .from('stories')
    .select('id, title, cover_url, genre, status, is_featured')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (excluirDestacada) query = query.eq('is_featured', false);
  if (genero) query = query.ilike('genre', `%${genero}%`);
  if (busqueda) query = query.ilike('title', `%${busqueda}%`);
  if (limite) query = query.limit(limite);

  const { data, error } = await query;

  if (error || !data?.length) {
    grid.innerHTML = `<div class="empty-state">Aún no hay historias publicadas.</div>`;
    return;
  }

  grid.innerHTML = data.map((s) => `
    <a class="story-card" href="historia.html?id=${s.id}">
      <div class="book-3d-wrap">
        <div class="book-3d">
          ${s.cover_url
            ? `<img src="${s.cover_url}" alt="${escapeHtml(s.title)}" loading="lazy" />`
            : escapeHtml(s.title.charAt(0))}
        </div>
      </div>
      <div class="story-info">
        <h3 class="story-title">${escapeHtml(s.title)}</h3>
        <div class="story-meta">${s.genre ? escapeHtml(s.genre) : ''}</div>
      </div>
    </a>
  `).join('');
}

/* ---------- GÉNEROS ---------- */
function cargarGeneros() {
  const grid = document.getElementById('genresGrid');
  if (!grid) return;

  grid.innerHTML = GENEROS.map((g) => `
    <a class="genre-card" href="historias.html?genero=${encodeURIComponent(g.label)}">
      <div class="genre-icon">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">${ICONS[g.icon]}</svg>
      </div>
      <div class="genre-name">${escapeHtml(g.label)}</div>
    </a>
  `).join('');
}

/* ---------- BLOG ---------- */
async function cargarBlog(limite = null) {
  const list = document.getElementById('blogList');
  if (!list) return;

  let query = db
    .from('blog_posts')
    .select('id, title, content, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (limite) query = query.limit(limite);

  const { data, error } = await query;

  if (error || !data?.length) {
    list.innerHTML = `<div class="empty-state">Aún no hay entradas en el blog.</div>`;
    return;
  }

  list.innerHTML = data.map((p) => {
    const excerpt = (p.content || '').replace(/<[^>]+>/g, '').slice(0, 160);
    const fecha = new Date(p.created_at).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return `
      <a class="blog-item" href="post.html?id=${p.id}">
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(excerpt)}${excerpt.length >= 160 ? '…' : ''}</p>
        <time>${fecha}</time>
      </a>
    `;
  }).join('');
}

/* ---------- POST + COMENTARIOS ---------- */
async function cargarPost() {
  const cont = document.getElementById('postContent');
  if (!cont) return;

  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    cont.innerHTML = `<div class="container"><p class="empty-state">Entrada no encontrada.</p></div>`;
    return;
  }

  const { data, error } = await db
    .from('blog_posts')
    .select('id, title, content, cover_url, created_at')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();

  if (error || !data) {
    cont.innerHTML = `<div class="container"><p class="empty-state">Entrada no encontrada.</p></div>`;
    return;
  }

  document.title = `${data.title} — Azael Blog`;

  const fecha = new Date(data.created_at).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  cont.innerHTML = `
    <div class="container">
      <h1 class="reader-title">${escapeHtml(data.title)}</h1>
      <p class="reader-meta">${fecha}</p>
      ${data.cover_url ? `<img src="${data.cover_url}" alt="" style="max-width:100%;border-radius:14px;margin-bottom:28px;" />` : ''}
      <div class="reader-body">${data.content || ''}</div>
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

  const { data, error } = await db
    .from('comments')
    .select('id, content, created_at, user_id, is_author_reply')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    list.innerHTML = `<div class="empty-state">No se pudieron cargar los comentarios.</div>`;
    return;
  }

  if (count) {
    count.textContent = data?.length === 1 ? '1 comentario' : `${data?.length || 0} comentarios`;
  }

  if (!data?.length) {
    list.innerHTML = `<div class="empty-state">Sé el primero en comentar.</div>`;
    return;
  }

  const ids = [...new Set(data.map(c => c.user_id))];
  const { data: perfiles } = await db
    .from('profiles')
    .select('id, username, is_author')
    .in('id', ids);

  const perfilesMap = Object.fromEntries((perfiles || []).map(p => [p.id, p]));

  list.innerHTML = data.map((c) => {
    const perfil = perfilesMap[c.user_id] || {};
    const nombre = perfil.username || 'Lector';
    const fecha = new Date(c.created_at).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    return `
      <div class="comment">
        <div class="comment-head">
          <div class="comment-author">
            ${escapeHtml(nombre)}
            ${perfil.is_author ? '<span class="comment-author-badge">Autor</span>' : ''}
          </div>
          <span class="comment-date">${fecha}</span>
        </div>
        <div class="comment-body">${escapeHtml(c.content)}</div>
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
      <div class="comment-login-prompt">
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
    <form class="comment-form" id="commentForm">
      <textarea id="commentText" placeholder="Escribe tu comentario…" required maxlength="2000"></textarea>
      <div class="comment-form-foot">
        <span style="font-size:12px;color:var(--muted);">Máx. 2000 caracteres</span>
        <button type="submit" class="btn btn-primary">Publicar</button>
      </div>
    </form>
  `;

  document.getElementById('commentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('commentText').value.trim();
    if (!content) return;

    const { error } = await db.from('comments').insert({
      post_id: postId,
      user_id: session.user.id,
      content,
    });

    if (error) {
      alert('No se pudo publicar el comentario.');
      return;
    }

    document.getElementById('commentText').value = '';
    await cargarComentarios(postId);
  });
}

/* ---------- REDES ---------- */
async function cargarRedes() {
  const grid = document.getElementById('socialGrid');
  if (!grid) return;

  const { data, error } = await db
    .from('social_links')
    .select('platform, url, display_order')
    .order('display_order', { ascending: true });

  if (error || !data?.length) {
    grid.innerHTML = `<div class="empty-state">Pronto añadiré mis redes.</div>`;
    return;
  }

  grid.innerHTML = data.map((s) => `
    <a class="social-link" href="${s.url}" target="_blank" rel="noopener noreferrer">
      ${escapeHtml(capitalize(s.platform))}
    </a>
  `).join('');
}

/* ---------- BIOGRAFÍA ---------- */
async function cargarBiografia() {
  const cont = document.getElementById('bioCard');
  if (!cont) return;

  const { data, error } = await db
    .from('profiles')
    .select('username, bio, avatar_url, is_author')
    .eq('is_author', true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    cont.innerHTML = `<div class="empty-state">Aún no hay biografía.</div>`;
    return;
  }

  cont.innerHTML = `
    <div class="bio-avatar">
      ${data.avatar_url
        ? `<img src="${data.avatar_url}" alt="${escapeHtml(data.username)}" />`
        : escapeHtml((data.username || 'A').charAt(0).toUpperCase())}
    </div>
    <div class="bio-body">
      <h2 class="bio-name">${escapeHtml(data.username || 'Azael')}</h2>
      <p class="bio-handle">Autor</p>
      <div class="bio-text">${escapeHtml(data.bio || 'Biografía pendiente.')}</div>
    </div>
  `;
}

/* ---------- HELPERS ---------- */
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
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function traducirError(msg) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered')) return 'Ese correo ya está registrado.';
  if (m.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('email')) return 'Correo electrónico inválido.';
  return msg;
}

/* ---------- INIT ---------- */
initTheme();
inyectarSidebar();
inyectarBackdrop();
inyectarTopbar();
inyectarAuthModal();

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const path = pagActiva();
const params = new URLSearchParams(location.search);

if (path === 'index.html' || path === '') {
  cargarDestacada();
  cargarUltimoBlog();
  cargarHistorias({ limite: 8, excluirDestacada: true });
} else if (path === 'historias.html') {
  cargarHistorias({
    genero: params.get('genero'),
    busqueda: params.get('q'),
  });
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
}