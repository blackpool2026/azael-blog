/* ============================================
   AZAEL BLOG — admin.js COMPLETO
   Con roles, canvas drag&drop, conectores y paste limpio
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

// Árbol de personajes
let currentTreeStory = null;
let currentCharacter = null;
let currentCharacterImageUrl = null;

// Lista de roles predefinidos
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

    function close(value) {
      modal.remove();
      resolve(value);
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

/* ---------- MODAL SIN PERMISOS ---------- */
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
    document.getElementById('deniedBack').addEventListener('click', () => {
      location.href = 'index.html';
    });
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
  const { data: { session: s } } = await db.auth.getSession();
  session = s;

  if (!session) {
    document.getElementById('authModal').hidden = false;
    return false;
  }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  currentProfile = profile;

  if (!profile?.is_author) {
    mostrarModalSinPermisos();
    return false;
  }

  return true;
}

/* ---------- DASHBOARD ---------- */
async function cargarDashboard() {
  showLoading();
  const [storiesRes, chaptersRes, postsRes] = await Promise.all([
    db.from('stories').select('*').order('created_at', { ascending: false }),
    db.from('chapters').select('id', { count: 'exact', head: true }),
    db.from('blog_posts').select('id', { count: 'exact', head: true }),
  ]);
  hideLoading();

  document.getElementById('statStories').textContent = storiesRes.data?.length ?? '0';
  document.getElementById('statChapters').textContent = chaptersRes.count ?? '0';
  document.getElementById('statPosts').textContent = postsRes.count ?? '0';

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
  if (window.lucide) lucide.createIcons();
}

/* ---------- STORY FORM ---------- */
async function abrirStoryForm(id = null) {
  currentStory = null;
  document.getElementById('storyForm').reset();
  document.getElementById('storyCoverBook').innerHTML = '<span id="storyCoverPlaceholder">A</span>';
  document.getElementById('storyCoverBook').dataset.coverUrl = '';
  document.getElementById('chaptersSection').hidden = true;
  document.getElementById('storyDeleteBtn').hidden = true;
  document.getElementById('storyViewTitle').textContent = 'Nueva historia';

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
    dedication: document.getElementById('storyDedication').value.trim(),
    is_featured: document.getElementById('storyFeatured').checked,
    is_published: document.getElementById('storyPublished').checked,
    cover_url: document.getElementById('storyCoverBook').dataset.coverUrl || currentStory?.cover_url || null,
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

/* ---------- CAPÍTULOS ---------- */
async function cargarCapitulosAdmin(storyId) {
  const list = document.getElementById('chaptersList');
  const { data } = await db.from('chapters')
    .select('id, title, chapter_order, is_premium, created_at')
    .eq('story_id', storyId).order('chapter_order', { ascending: true });
  if (!data?.length) {
    list.innerHTML = emptyState('book-open', 'Sin capítulos', 'Añade tu primer capítulo.');
    return;
  }
  list.innerHTML = data.map((c, i) => `
    <div class="admin-chapter-row">
      <div class="admin-chapter-num">${String(c.chapter_order || i + 1).padStart(2, '0')}</div>
      <div class="admin-chapter-body">
        <div class="admin-chapter-title">${escapeHtml(c.title)}</div>
        <div class="admin-chapter-meta">
          ${c.is_premium ? '<span class="admin-badge admin-badge-accent">Premium</span>' : ''}
        </div>
      </div>
      <div class="admin-chapter-actions">
        <button class="admin-item-action" data-action="up" data-id="${c.id}">${ic('arrow-up', 14)}</button>
        <button class="admin-item-action" data-action="down" data-id="${c.id}">${ic('arrow-down', 14)}</button>
        <button class="admin-item-action" data-action="edit-chapter" data-id="${c.id}">${ic('edit-2', 16)}</button>
      </div>
    </div>
  `).join('');
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

/* ---------- EDITOR ---------- */
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
          case 'hr': document.execCommand('insertHTML', false, '<hr>'); break;
          case 'image': insertarImagen(editor); break;
          case 'fullscreen': toggleFullscreen(); break;
        }
      } catch (err) { console.warn('cmd err', err); }
      if (counterId) actualizarContador(editorId, counterId);
    });
  });

  // 🎯 Pegar con estructura limpia
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

    if (counterId) actualizarContador(editorId, counterId);
    guardarBorrador(editorId);
  });

  editor.addEventListener('input', () => {
    if (counterId) actualizarContador(editorId, counterId);
    guardarBorrador(editorId);
  });
  setInterval(() => guardarBorrador(editorId), 30000);
}

/* ---------- LIMPIAR HTML PEGADO ---------- */
function limpiarHtmlPegado(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  const ALLOWED = new Set([
    'P', 'BR', 'HR',
    'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'MARK', 'SUP', 'SUB',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'BLOCKQUOTE', 'PRE', 'CODE',
    'UL', 'OL', 'LI',
    'A', 'IMG',
    'DIV', 'SPAN',
  ]);

  const REMOVE_WITH_CONTENT = new Set([
    'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM',
    'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'VIDEO', 'AUDIO',
    'CANVAS', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT',
  ]);

  const ATTRS_BY_TAG = {
    A: new Set(['href', 'title']),
    IMG: new Set(['src', 'alt', 'title']),
  };

  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const tag = node.tagName;

    if (REMOVE_WITH_CONTENT.has(tag)) {
      return null;
    }

    if (!ALLOWED.has(tag)) {
      const fragment = document.createDocumentFragment();
      Array.from(node.childNodes).forEach(child => {
        const cleaned = clean(child);
        if (cleaned) fragment.appendChild(cleaned);
      });
      return fragment;
    }

    const newNode = document.createElement(tag);

    const allowedAttrs = ATTRS_BY_TAG[tag];
    if (allowedAttrs) {
      allowedAttrs.forEach(attr => {
        if (node.hasAttribute(attr)) {
          const val = node.getAttribute(attr);
          if (tag === 'A' && attr === 'href') {
            if (/^\s*javascript:/i.test(val)) return;
          }
          newNode.setAttribute(attr, val);
        }
      });
    }

    Array.from(node.childNodes).forEach(child => {
      const cleaned = clean(child);
      if (cleaned) newNode.appendChild(cleaned);
    });

    if (tag === 'DIV' && !node.getAttribute('class')) {
      if (newNode.children.length === 0 && newNode.textContent.trim()) {
        const p = document.createElement('P');
        p.innerHTML = newNode.innerHTML;
        return p;
      }
      if (newNode.children.length > 0) {
        return newNode;
      }
      return null;
    }

    if (tag === 'SPAN') {
      const fragment = document.createDocumentFragment();
      Array.from(newNode.childNodes).forEach(child => fragment.appendChild(child));
      return fragment;
    }

    if ((tag === 'P' || /^H[1-6]$/.test(tag)) && !newNode.textContent.trim() && !newNode.querySelector('img,br')) {
      return null;
    }

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

/* ---------- POST FORM ---------- */
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

/* ---------- REDES ---------- */
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
  const { data, error } = await db.from('social_links')
    .select('id, platform, url, display_order')
    .order('display_order', { ascending: true });
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
  const { error } = await db.from('social_links').delete().eq('id', id);
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Red eliminada', 'ok');
  limpiarCachePublica();
  cargarRedesAdmin();
}

document.querySelectorAll('#redesAddPanel .admin-net-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const platform = btn.dataset.platform;
    const labels = {
      instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube',
      tiktok: 'TikTok', twitter: 'Twitter / X', whatsapp: 'WhatsApp', telegram: 'Telegram'
    };
    const platformName = labels[platform] || platform;

    const url = await abrirInputModal({
      title: `Añadir ${platformName}`,
      desc: `Pega el enlace de tu perfil de ${platformName}.`,
      label: 'Enlace del perfil',
      placeholder: `https://${platform}.com/tuusuario`,
      hint: 'Debe empezar con https://',
      iconName: platform === 'instagram' ? 'instagram' : platform === 'facebook' ? 'facebook' : platform === 'youtube' ? 'youtube' : 'link',
    });

    if (!url) return;
    if (!/^https?:\/\//.test(url)) {
      toast('El enlace debe empezar con https://', 'error');
      return;
    }
    agregarRed(platform, url);
  });
});

async function agregarRed(platform, url) {
  showLoading();
  const { data: maxRow } = await db.from('social_links')
    .select('display_order').eq('user_id', session.user.id)
    .order('display_order', { ascending: false }).limit(1).maybeSingle();
  const nextOrder = (maxRow?.display_order || 0) + 1;
  const { error } = await db.from('social_links').insert({
    user_id: session.user.id,
    platform,
    url,
    display_order: nextOrder,
  });
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Red añadida', 'ok');
  limpiarCachePublica();
  cargarRedesAdmin();
}

/* ---------- DONACIONES ADMIN ---------- */
const DONATION_ICONS = {
  paypal: 'wallet',
  binance: 'bitcoin',
};

async function abrirDonacionesView() {
  showView('viewDonaciones');
  await cargarDonacionesAdmin();
}

async function cargarDonacionesAdmin() {
  const list = document.getElementById('donationsListAdmin');
  showLoading();
  const { data, error } = await db.from('donations')
    .select('id, platform, url, label, display_order')
    .order('display_order', { ascending: true });
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
  const { error } = await db.from('donations').delete().eq('id', id);
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Método eliminado', 'ok');
  limpiarCachePublica();
  cargarDonacionesAdmin();
}

document.querySelectorAll('#donationsAddPanel .admin-net-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const platform = btn.dataset.platform;
    const isBinance = platform === 'binance';
    const platformName = isBinance ? 'Binance' : 'PayPal';

    const label = await abrirInputModal({
      title: `Añadir ${platformName}`,
      desc: 'Nombre que verán tus lectores.',
      label: 'Nombre visible',
      placeholder: platformName,
      iconName: isBinance ? 'bitcoin' : 'wallet',
      value: platformName,
    });
    if (label === null) return;

    const url = await abrirInputModal({
      title: `Datos de ${platformName}`,
      desc: isBinance ? 'Pega tu número de Binance (ID).' : 'Pega el enlace de tu cuenta de PayPal.',
      label: isBinance ? 'ID de Binance' : 'Enlace de PayPal',
      placeholder: isBinance ? 'Ej: 1257168234' : 'https://paypal.me/tuusuario',
      hint: isBinance ? 'Solo números' : 'Debe empezar con https://',
      iconName: isBinance ? 'bitcoin' : 'wallet',
    });
    if (!url) return;

    if (isBinance) {
      if (!/^\d+$/.test(url.replace(/\s/g, ''))) {
        toast('El ID de Binance debe ser solo números', 'error');
        return;
      }
      agregarDonacion('binance', url.trim(), label || 'Binance');
    } else {
      if (!/^https?:\/\//.test(url)) {
        toast('El enlace de PayPal debe empezar con https://', 'error');
        return;
      }
      agregarDonacion('paypal', url, label || 'PayPal');
    }
  });
});

async function agregarDonacion(platform, url, label) {
  showLoading();
  const { data: maxRow } = await db.from('donations')
    .select('display_order').eq('user_id', session.user.id)
    .order('display_order', { ascending: false }).limit(1).maybeSingle();
  const nextOrder = (maxRow?.display_order || 0) + 1;

  const { error } = await db.from('donations').insert({
    user_id: session.user.id,
    platform,
    url,
    label: label || platform,
    display_order: nextOrder,
  });
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Método añadido', 'ok');
  limpiarCachePublica();
  cargarDonacionesAdmin();
}

/* ---------- ESTADÍSTICAS ---------- */
async function abrirStatsView() {
  showView('viewStats');
  await cargarEstadisticas();
}

async function cargarEstadisticas() {
  const list = document.getElementById('statsList');
  showLoading();

  try {
    const { data: stories, error: storiesError } = await db
      .from('stories')
      .select('id, title, cover_url, genre, status')
      .order('created_at', { ascending: false });

    if (storiesError) throw storiesError;

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
    (views || []).forEach(v => {
      viewsByStory[v.story_id] = (viewsByStory[v.story_id] || 0) + 1;
    });

    const likesByStory = {};
    (likes || []).forEach(l => {
      if (l.story_id) likesByStory[l.story_id] = (likesByStory[l.story_id] || 0) + 1;
    });

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
      views: viewsByStory[s.id] || 0,
      likes: likesByStory[s.id] || 0,
      comments: commentsByStory[s.id] || 0,
    }));

    stats.sort((a, b) => b.views - a.views);

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
            ${s.cover_url
              ? `<img src="${s.cover_url}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<span>${escapeHtml(s.title.charAt(0))}</span>';" />`
              : `<span>${escapeHtml(s.title.charAt(0))}</span>`}
          </div>
          <div class="stats-card-body">
            <div class="stats-card-title">${escapeHtml(s.title)}</div>
            <div class="stats-card-meta">
              <span>${escapeHtml(s.genre || 'Sin género')}</span>
              <span>·</span>
              <span>${escapeHtml(s.status || 'En curso')}</span>
            </div>
            <div class="stats-card-bar">
              <div class="stats-card-bar-fill" style="width: ${percent}%;"></div>
            </div>
            <div class="stats-card-numbers">
              <span class="stats-card-number">${s.views.toLocaleString('es-ES')} vistas</span>
              <span class="stats-card-number">${s.likes.toLocaleString('es-ES')} likes</span>
              <span class="stats-card-number">${s.comments.toLocaleString('es-ES')} comentarios</span>
            </div>
            <div class="stats-card-percent">${percent}% de la más vista</div>
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
    console.error('Error cargando stats:', err);
    list.innerHTML = emptyState('alert-circle', 'Error', err.message);
  }

  hideLoading();
}

async function abrirStoryStats(storyId) {
  showView('viewStoryStats');
  await cargarStoryStats(storyId);
}

async function cargarStoryStats(storyId) {
  const header = document.getElementById('storyStatsHeader');
  const totals = document.getElementById('storyStatsTotals');
  const chaptersList = document.getElementById('storyStatsChapters');
  showLoading();

  try {
    const { data: story, error: storyError } = await db
      .from('stories')
      .select('id, title, cover_url, genre, status, synopsis')
      .eq('id', storyId)
      .maybeSingle();

    if (storyError || !story) throw new Error('Historia no encontrada');

    const { count: totalViews } = await db
      .from('story_views')
      .select('id', { count: 'exact', head: true })
      .eq('story_id', storyId);

    const { count: bookLikes } = await db
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('story_id', storyId)
      .is('chapter_id', null);

    const { data: chapters } = await db
      .from('chapters')
      .select('id, title, chapter_order')
      .eq('story_id', storyId)
      .order('chapter_order', { ascending: true });

    const chapterIds = (chapters || []).map(c => c.id).filter(Boolean);

    const { data: chapterViews } = await db
      .from('story_views')
      .select('chapter_id')
      .eq('story_id', storyId)
      .not('chapter_id', 'is', null);

    const viewsByChapter = {};
    (chapterViews || []).forEach(v => {
      viewsByChapter[v.chapter_id] = (viewsByChapter[v.chapter_id] || 0) + 1;
    });

    const { data: chapterLikes } = await db
      .from('likes')
      .select('chapter_id')
      .in('chapter_id', chapterIds.length ? chapterIds : ['00000000-0000-0000-0000-000000000000']);

    const likesByChapter = {};
    (chapterLikes || []).forEach(l => {
      if (l.chapter_id) likesByChapter[l.chapter_id] = (likesByChapter[l.chapter_id] || 0) + 1;
    });

    const { data: chapterComments } = await db
      .from('comments')
      .select('chapter_id')
      .in('chapter_id', chapterIds.length ? chapterIds : ['00000000-0000-0000-0000-000000000000']);

    const commentsByChapter = {};
    (chapterComments || []).forEach(c => {
      if (c.chapter_id) commentsByChapter[c.chapter_id] = (commentsByChapter[c.chapter_id] || 0) + 1;
    });

    const totalComments = Object.values(commentsByChapter).reduce((a, b) => a + b, 0);

    header.innerHTML = `
      <div class="story-stats-header">
        <div class="story-stats-cover">
          ${story.cover_url
            ? `<img src="${story.cover_url}" alt="" onerror="this.parentElement.innerHTML='<span>${escapeHtml(story.title.charAt(0))}</span>';" />`
            : `<span>${escapeHtml(story.title.charAt(0))}</span>`}
        </div>
        <div class="story-stats-info">
          <div class="story-stats-badges">
            ${story.genre ? `<span class="badge badge-genre">${escapeHtml(story.genre)}</span>` : ''}
            <span class="badge badge-status">${escapeHtml(story.status || 'En curso')}</span>
          </div>
          <h2 class="story-stats-title">${escapeHtml(story.title)}</h2>
          ${story.synopsis ? `<p class="story-stats-synopsis">${escapeHtml(story.synopsis)}</p>` : ''}
        </div>
      </div>
    `;

    totals.innerHTML = `
      <div class="stats-total-card">
        <div class="stats-total-label">Vistas</div>
        <div class="stats-total-value">${(totalViews || 0).toLocaleString('es-ES')}</div>
      </div>
      <div class="stats-total-card">
        <div class="stats-total-label">Likes del libro</div>
        <div class="stats-total-value">${(bookLikes || 0).toLocaleString('es-ES')}</div>
      </div>
      <div class="stats-total-card">
        <div class="stats-total-label">Comentarios</div>
        <div class="stats-total-value">${totalComments.toLocaleString('es-ES')}</div>
      </div>
      <div class="stats-total-card">
        <div class="stats-total-label">Capítulos</div>
        <div class="stats-total-value">${(chapters || []).length}</div>
      </div>
    `;

    if (!chapters?.length) {
      chaptersList.innerHTML = emptyState('book-open', 'Sin capítulos', 'Esta historia aún no tiene capítulos.');
      hideLoading();
      return;
    }

    const maxChapterViews = Math.max(...chapters.map(c => viewsByChapter[c.id] || 0), 1);

    chaptersList.innerHTML = chapters.map((c, i) => {
      const views = viewsByChapter[c.id] || 0;
      const likes = likesByChapter[c.id] || 0;
      const comments = commentsByChapter[c.id] || 0;
      const percent = Math.round((views / maxChapterViews) * 100);
      const num = c.chapter_order || (i + 1);

      return `
        <div class="stats-chapter-item">
          <div class="stats-chapter-num">${String(num).padStart(2, '0')}</div>
          <div class="stats-chapter-body">
            <div class="stats-chapter-title">${escapeHtml(c.title)}</div>
            <div class="stats-chapter-bar">
              <div class="stats-chapter-bar-fill" style="width: ${percent}%;"></div>
            </div>
            <div class="stats-chapter-metrics">
              <span class="stats-metric">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                ${views.toLocaleString('es-ES')}
              </span>
              <span class="stats-metric">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                ${likes.toLocaleString('es-ES')}
              </span>
              <span class="stats-metric">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                ${comments.toLocaleString('es-ES')}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error('Error cargando story stats:', err);
    header.innerHTML = emptyState('alert-circle', 'Error', err.message);
  }

  hideLoading();
}

/* ---------- AJUSTES DEL SITIO ---------- */
async function abrirAjustesView() {
  showView('viewAjustes');
  await cargarAjustes();
}

async function cargarAjustes() {
  showLoading();
  const { data, error } = await db
    .from('site_settings')
    .select('show_likes, show_views')
    .eq('id', 1)
    .maybeSingle();
  hideLoading();

  if (error || !data) {
    toast('No se pudieron cargar los ajustes', 'error');
    return;
  }

  document.getElementById('toggleShowLikes').checked = !!data.show_likes;
  document.getElementById('toggleShowViews').checked = !!data.show_views;
}

document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
  const show_likes = document.getElementById('toggleShowLikes').checked;
  const show_views = document.getElementById('toggleShowViews').checked;

  showLoading();
  const { error } = await db
    .from('site_settings')
    .update({ show_likes, show_views, updated_at: new Date().toISOString() })
    .eq('id', 1);
  hideLoading();

  if (error) {
    toast('Error: ' + error.message, 'error');
    return;
  }
  toast('Ajustes guardados', 'ok');
  limpiarCachePublica();
});

/* ============================================
   ÁRBOLES DE PERSONAJES
   ============================================ */

async function abrirArbolesEstante() {
  showView('viewArbolesEstante');
  await cargarEstante();
}

async function cargarEstante() {
  const shelf = document.getElementById('treesShelf');
  showLoading();

  const { data: stories, error } = await db
    .from('stories')
    .select('id, title, cover_url, genre, status, synopsis')
    .order('created_at', { ascending: false });

  hideLoading();

  if (error || !stories?.length) {
    shelf.innerHTML = emptyState('book', 'Sin historias', 'Crea una historia para empezar.');
    return;
  }

  const { data: nodes } = await db
    .from('character_nodes')
    .select('story_id');

  const countByStory = {};
  (nodes || []).forEach(n => {
    countByStory[n.story_id] = (countByStory[n.story_id] || 0) + 1;
  });

  shelf.innerHTML = stories.map(s => {
    const count = countByStory[s.id] || 0;
    return `
      <button class="tree-shelf-card" data-story-id="${s.id}">
        <div class="tree-shelf-cover">
          ${s.cover_url
            ? `<img src="${s.cover_url}" alt="" loading="lazy" />`
            : `<span>${escapeHtml(s.title.charAt(0))}</span>`}
        </div>
        <div class="tree-shelf-info">
          <div class="tree-shelf-title">${escapeHtml(s.title)}</div>
          <div class="tree-shelf-meta">
            ${s.genre ? `<span>${escapeHtml(s.genre)}</span>` : ''}
            <span>·</span>
            <span>${count} ${count === 1 ? 'personaje' : 'personajes'}</span>
          </div>
        </div>
      </button>
    `;
  }).join('');

  document.querySelectorAll('.tree-shelf-card').forEach(card => {
    card.addEventListener('click', () => abrirArbolLibro(card.dataset.storyId));
  });

  if (window.lucide) lucide.createIcons();
}

async function abrirArbolLibro(storyId) {
  showLoading();
  const { data: story } = await db
    .from('stories')
    .select('id, title, cover_url, genre, status, synopsis')
    .eq('id', storyId)
    .maybeSingle();
  hideLoading();

  if (!story) { toast('Historia no encontrada', 'error'); return; }

  currentTreeStory = story;

  const header = document.getElementById('arbolBookHeader');
  header.innerHTML = `
    <div class="arbol-book-header">
      <div class="arbol-book-cover">
        ${story.cover_url
          ? `<img src="${story.cover_url}" alt="" />`
          : `<span>${escapeHtml(story.title.charAt(0))}</span>`}
      </div>
      <div class="arbol-book-info">
        <div class="story-badges">
          ${story.genre ? `<span class="badge badge-genre">${escapeHtml(story.genre)}</span>` : ''}
          <span class="badge badge-status">${escapeHtml(story.status || 'En curso')}</span>
        </div>
        <h1 class="story-h1" style="margin-top:8px;">${escapeHtml(story.title)}</h1>
        ${story.synopsis ? `<p class="story-synopsis-c" style="margin-top:8px;">${escapeHtml(story.synopsis)}</p>` : ''}
      </div>
    </div>
  `;

  showView('viewArbol');
  await cargarPersonajesAdmin(story.id);
}

async function cargarPersonajesAdmin(storyId) {
  const list = document.getElementById('charactersAdminList');
  showLoading();

  const { data, error } = await db
    .from('character_nodes')
    .select('*')
    .eq('story_id', storyId)
    .order('created_at', { ascending: true });

  hideLoading();

  if (error) {
    list.innerHTML = emptyState('alert-circle', 'Error', error.message);
    return;
  }

  if (!data?.length) {
    list.innerHTML = emptyState('users', 'Sin personajes', 'Añade el primer personaje de esta historia.');
    return;
  }

  list.innerHTML = data.map(c => `
    <div class="character-admin-card">
      <div class="character-admin-avatar">
        ${c.image_url
          ? `<img src="${c.image_url}" alt="" onerror="this.parentElement.innerHTML='<span>${escapeHtml(c.emoji || '👤')}</span>';" />`
          : `<span>${escapeHtml(c.emoji || '👤')}</span>`}
      </div>
      <div class="character-admin-body">
        <div class="character-admin-name">
          ${escapeHtml(c.name)}
          ${c.alias ? `<span class="character-admin-alias">"${escapeHtml(c.alias)}"</span>` : ''}
        </div>
        <div class="character-admin-meta">
          ${c.role ? `<span class="character-admin-role">${escapeHtml(c.role)}</span>` : ''}
          ${c.age ? `<span>· ${escapeHtml(c.age)} años</span>` : ''}
        </div>
        ${c.description ? `<div class="character-admin-desc">${escapeHtml(c.description)}</div>` : ''}
      </div>
      <button class="admin-item-action" data-char-edit="${c.id}" title="Editar">${ic('edit-2', 16)}</button>
    </div>
  `).join('');

  document.querySelectorAll('[data-char-edit]').forEach(btn => {
    btn.addEventListener('click', () => abrirCharacterForm(btn.dataset.charEdit));
  });

  if (window.lucide) lucide.createIcons();
}

function abrirCharacterForm(id = null) {
  currentCharacter = null;
  currentCharacterImageUrl = null;
  document.getElementById('characterForm').reset();
  document.getElementById('characterEmoji').value = '👤';
  document.getElementById('characterDeleteBtn').hidden = true;
  document.getElementById('characterFormTitle').textContent = 'Nuevo personaje';
  document.getElementById('characterRemoveImageBtn').hidden = true;
  document.getElementById('customRoleField').hidden = true;
  document.getElementById('characterCustomRole').value = '';
  document.getElementById('characterRole').value = '';
  actualizarAvatarPreview('👤', null);

  if (id) {
    showLoading();
    db.from('character_nodes').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      hideLoading();
      if (!data) return;
      currentCharacter = data;
      currentCharacterImageUrl = data.image_url || null;
      document.getElementById('characterName').value = data.name || '';
      document.getElementById('characterAlias').value = data.alias || '';
      document.getElementById('characterAge').value = data.age || '';
      document.getElementById('characterEmoji').value = data.emoji || '👤';
      document.getElementById('characterDescription').value = data.description || '';

      const role = data.role || '';
      if (esRolPersonalizado(role)) {
        document.getElementById('characterRole').value = '__custom__';
        document.getElementById('characterCustomRole').value = role;
        document.getElementById('customRoleField').hidden = false;
      } else {
        document.getElementById('characterRole').value = role;
        document.getElementById('customRoleField').hidden = true;
      }

      document.getElementById('characterFormTitle').textContent = 'Editar personaje';
      document.getElementById('characterDeleteBtn').hidden = false;
      actualizarAvatarPreview(data.emoji || '👤', data.image_url);
      if (data.image_url) {
        document.getElementById('characterRemoveImageBtn').hidden = false;
      }
    });
  }

  showView('viewCharacterForm');
  setTimeout(() => document.getElementById('characterName')?.focus(), 100);
}

function actualizarAvatarPreview(emoji, imageUrl) {
  const preview = document.getElementById('characterAvatarPreview');
  if (imageUrl) {
    preview.innerHTML = `<img src="${imageUrl}" alt="" />`;
  } else {
    preview.innerHTML = `<span>${escapeHtml(emoji || '👤')}</span>`;
  }
}

document.getElementById('characterAvatarBtn')?.addEventListener('click', () => {
  document.getElementById('characterAvatarInput').click();
});

document.getElementById('characterAvatarInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('La imagen supera 5 MB', 'error'); return; }
  showLoading();
  try {
    const ext = file.name.split('.').pop();
    const filename = `characters/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await db.storage.from('media').upload(filename, file);
    if (upErr) throw upErr;
    const { data: pub } = db.storage.from('media').getPublicUrl(filename);
    currentCharacterImageUrl = pub.publicUrl;
    const emoji = document.getElementById('characterEmoji').value || '👤';
    actualizarAvatarPreview(emoji, pub.publicUrl);
    document.getElementById('characterRemoveImageBtn').hidden = false;
    toast('Imagen subida', 'ok');
  } catch (err) { toast('Error al subir: ' + err.message, 'error'); }
  hideLoading();
});

document.getElementById('characterRemoveImageBtn')?.addEventListener('click', () => {
  currentCharacterImageUrl = null;
  const emoji = document.getElementById('characterEmoji').value || '👤';
  actualizarAvatarPreview(emoji, null);
  document.getElementById('characterRemoveImageBtn').hidden = true;
  document.getElementById('characterAvatarInput').value = '';
  toast('Imagen quitada', 'info');
});

document.getElementById('characterEmoji')?.addEventListener('input', (e) => {
  if (!currentCharacterImageUrl) {
    actualizarAvatarPreview(e.target.value || '👤', null);
  }
});

document.getElementById('characterRole')?.addEventListener('change', (e) => {
  const field = document.getElementById('customRoleField');
  const input = document.getElementById('characterCustomRole');
  if (!field || !input) return;
  if (e.target.value === '__custom__') {
    field.hidden = false;
    setTimeout(() => input.focus(), 100);
  } else {
    field.hidden = true;
    input.value = '';
  }
});

document.getElementById('characterForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentTreeStory) { toast('Error: no hay libro seleccionado', 'error'); return; }

  const roleSelect = document.getElementById('characterRole').value;
  let finalRole = '';
  if (roleSelect === '__custom__') {
    finalRole = document.getElementById('characterCustomRole').value.trim();
    if (!finalRole) {
      toast('Escribe el rol personalizado o elige otro', 'error');
      return;
    }
  } else {
    finalRole = roleSelect;
  }

  const payload = {
    story_id: currentTreeStory.id,
    user_id: session.user.id,
    name: document.getElementById('characterName').value.trim(),
    alias: document.getElementById('characterAlias').value.trim(),
    role: finalRole,
    age: document.getElementById('characterAge').value.trim(),
    emoji: document.getElementById('characterEmoji').value.trim() || '👤',
    description: document.getElementById('characterDescription').value.trim(),
    image_url: currentCharacterImageUrl || null,
  };

  if (!payload.name) { toast('El nombre es obligatorio', 'error'); return; }

  showLoading();
  let error;
  const vinoDeCanvas = canvasState.storyId === currentTreeStory.id;

  if (currentCharacter) {
    ({ error } = await db.from('character_nodes').update(payload).eq('id', currentCharacter.id));
  } else {
    payload.x = 300 + Math.random() * 200;
    payload.y = 200 + Math.random() * 200;
    ({ error } = await db.from('character_nodes').insert(payload));
  }
  hideLoading();

  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast(currentCharacter ? 'Personaje actualizado' : 'Personaje creado', 'ok');
  limpiarCachePublica();

  setTimeout(() => {
    if (vinoDeCanvas) {
      abrirCanvasArbol(currentTreeStory.id);
    } else {
      showView('viewArbol');
      cargarPersonajesAdmin(currentTreeStory.id);
    }
  }, 400);
});

document.getElementById('characterDeleteBtn')?.addEventListener('click', async () => {
  if (!currentCharacter) return;
  if (!confirm(`¿Eliminar a "${currentCharacter.name}"? Se eliminarán también sus conexiones.`)) return;
  const vinoDeCanvas = canvasState.storyId === currentTreeStory.id;
  showLoading();
  const { error } = await db.from('character_nodes').delete().eq('id', currentCharacter.id);
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Personaje eliminado', 'ok');
  limpiarCachePublica();

  if (vinoDeCanvas) {
    abrirCanvasArbol(currentTreeStory.id);
  } else {
    showView('viewArbol');
    cargarPersonajesAdmin(currentTreeStory.id);
  }
});

/* ============================================
   CANVAS VISUAL (drag & drop)
   ============================================ */

let canvasState = {
  storyId: null,
  nodes: [],
  edges: [],
  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  draggingNode: null,
  dragStartPointerX: 0,
  dragStartPointerY: 0,
  dragStartNodeX: 0,
  dragStartNodeY: 0,
  dirtyNodes: new Set(),
  saveTimer: null,
};

async function abrirCanvasArbol(storyId) {
  showLoading();

  const { data: story } = await db
    .from('stories')
    .select('id, title, cover_url')
    .eq('id', storyId)
    .maybeSingle();

  if (!story) { hideLoading(); toast('Historia no encontrada', 'error'); return; }

  const { data: nodes } = await db
    .from('character_nodes')
    .select('*')
    .eq('story_id', storyId)
    .order('created_at', { ascending: true });

  const { data: edges } = await db
    .from('character_edges')
    .select('*')
    .eq('story_id', storyId);

  hideLoading();

  canvasState.storyId = storyId;
  canvasState.nodes = (nodes || []).map(n => ({
    ...n,
    x: Number(n.x) || 400,
    y: Number(n.y) || 200,
  }));
  canvasState.edges = edges || [];
  canvasState.zoom = 1;
  canvasState.panX = 0;
  canvasState.panY = 0;
  canvasState.dirtyNodes.clear();

  desactivarModoConectar();

  document.getElementById('canvasBookTitle').textContent = story.title;
  document.getElementById('canvasCharCount').textContent =
    `${canvasState.nodes.length} ${canvasState.nodes.length === 1 ? 'personaje' : 'personajes'}`;

  showView('viewArbolCanvas');
  renderizarCanvas();
  dibujarEdges();
  updateZoomLabel();
  if (window.lucide) lucide.createIcons();
}

function renderizarCanvas() {
  const world = document.getElementById('arbolCanvasWorld');
  const nodesEl = document.getElementById('arbolCanvasNodes');
  if (!world || !nodesEl) return;

  world.style.transform = `translate(${canvasState.panX}px, ${canvasState.panY}px) scale(${canvasState.zoom})`;

  if (!canvasState.nodes.length) {
    nodesEl.innerHTML = `
      <div class="canvas-empty">
        <div class="canvas-empty-icon">👤</div>
        <div class="canvas-empty-title">Sin personajes</div>
        <div class="canvas-empty-sub">Toca "Añadir" para crear el primero</div>
      </div>
    `;
    return;
  }

  nodesEl.innerHTML = canvasState.nodes.map(n => {
    const avatar = n.image_url
      ? `<img src="${n.image_url}" alt="" draggable="false" />`
      : `<span>${escapeHtml(n.emoji || '👤')}</span>`;
    return `
      <div class="canvas-node"
           data-node-id="${n.id}"
           style="left: ${n.x}px; top: ${n.y}px;">
        <div class="canvas-node-avatar">${avatar}</div>
        <div class="canvas-node-name">${escapeHtml(n.name)}</div>
        ${n.role ? `<div class="canvas-node-role">${escapeHtml(n.role)}</div>` : ''}
      </div>
    `;
  }).join('');

  nodesEl.querySelectorAll('.canvas-node').forEach(el => {
    el.addEventListener('pointerdown', iniciarDragNode);
    el.addEventListener('dblclick', () => {
      const id = el.dataset.nodeId;
      abrirCharacterForm(id);
    });
    el.addEventListener('click', (e) => {
      if (connectState.active) {
        e.stopPropagation();
        const node = canvasState.nodes.find(n => n.id === el.dataset.nodeId);
        if (node) handleNodeClickForConnect(node);
      }
    });
  });
}

function iniciarDragNode(e) {
  if (e.target.closest('button')) return;
  if (connectState.active) return;

  const el = e.currentTarget;
  const id = el.dataset.nodeId;
  const node = canvasState.nodes.find(n => n.id === id);
  if (!node) return;

  e.preventDefault();
  e.stopPropagation();

  canvasState.draggingNode = node;
  canvasState.dragStartPointerX = e.clientX;
  canvasState.dragStartPointerY = e.clientY;
  canvasState.dragStartNodeX = node.x;
  canvasState.dragStartNodeY = node.y;

  el.classList.add('dragging');
  try { el.setPointerCapture(e.pointerId); } catch {}

  document.addEventListener('pointermove', moverDragNode);
  document.addEventListener('pointerup', terminarDragNode);
  document.addEventListener('pointercancel', terminarDragNode);
}

function moverDragNode(e) {
  if (!canvasState.draggingNode) return;
  e.preventDefault();

  const node = canvasState.draggingNode;
  const el = document.querySelector(`.canvas-node[data-node-id="${node.id}"]`);
  if (!el) return;

  const dx = (e.clientX - canvasState.dragStartPointerX) / canvasState.zoom;
  const dy = (e.clientY - canvasState.dragStartPointerY) / canvasState.zoom;

  const newX = Math.max(0, canvasState.dragStartNodeX + dx);
  const newY = Math.max(0, canvasState.dragStartNodeY + dy);

  node.x = newX;
  node.y = newY;

  el.style.left = newX + 'px';
  el.style.top = newY + 'px';

  canvasState.dirtyNodes.add(node.id);

  if (canvasState.edges.length) dibujarEdges();
}

function terminarDragNode(e) {
  if (!canvasState.draggingNode) return;

  const el = document.querySelector(`.canvas-node[data-node-id="${canvasState.draggingNode.id}"]`);
  if (el) {
    el.classList.remove('dragging');
    try { el.releasePointerCapture(e.pointerId); } catch {}
  }

  canvasState.draggingNode = null;
  document.removeEventListener('pointermove', moverDragNode);
  document.removeEventListener('pointerup', terminarDragNode);
  document.removeEventListener('pointercancel', terminarDragNode);

  programarGuardarPosiciones();
}

function programarGuardarPosiciones() {
  clearTimeout(canvasState.saveTimer);
  canvasState.saveTimer = setTimeout(guardarPosiciones, 500);
}

async function guardarPosiciones() {
  if (!canvasState.dirtyNodes.size) return;

  const ids = [...canvasState.dirtyNodes];
  canvasState.dirtyNodes.clear();

  try {
    const updates = ids.map(id => {
      const n = canvasState.nodes.find(x => x.id === id);
      if (!n) return null;
      return db.from('character_nodes')
        .update({ x: Math.round(n.x), y: Math.round(n.y) })
        .eq('id', id);
    }).filter(Boolean);

    await Promise.all(updates);
    console.log(`[Canvas] ${ids.length} posiciones guardadas`);
  } catch (e) {
    console.warn('Error guardando posiciones:', e);
    toast('No se pudieron guardar las posiciones', 'error');
  }
}

function iniciarPanCanvas(e) {
  if (e.target.closest('.canvas-node')) return;
  if (connectState.active) return;
  if (e.button !== undefined && e.button !== 0) return;

  canvasState.isPanning = true;
  canvasState.panStartX = e.clientX - canvasState.panX;
  canvasState.panStartY = e.clientY - canvasState.panY;

  const viewport = document.getElementById('arbolCanvasViewport');
  viewport?.classList.add('panning');

  document.addEventListener('pointermove', moverPanCanvas);
  document.addEventListener('pointerup', terminarPanCanvas);
  document.addEventListener('pointercancel', terminarPanCanvas);
}

function moverPanCanvas(e) {
  if (!canvasState.isPanning) return;
  canvasState.panX = e.clientX - canvasState.panStartX;
  canvasState.panY = e.clientY - canvasState.panStartY;
  aplicarTransformCanvas();
}

function terminarPanCanvas() {
  canvasState.isPanning = false;
  const viewport = document.getElementById('arbolCanvasViewport');
  viewport?.classList.remove('panning');
  document.removeEventListener('pointermove', moverPanCanvas);
  document.removeEventListener('pointerup', terminarPanCanvas);
  document.removeEventListener('pointercancel', terminarPanCanvas);
}

function aplicarTransformCanvas() {
  const world = document.getElementById('arbolCanvasWorld');
  if (world) {
    world.style.transform = `translate(${canvasState.panX}px, ${canvasState.panY}px) scale(${canvasState.zoom})`;
  }
}

function cambiarZoom(delta) {
  const nuevo = Math.min(2, Math.max(0.3, canvasState.zoom + delta));
  if (nuevo === canvasState.zoom) return;
  canvasState.zoom = nuevo;
  aplicarTransformCanvas();
  updateZoomLabel();
}

function updateZoomLabel() {
  const label = document.getElementById('canvasZoomLabel');
  if (label) label.textContent = Math.round(canvasState.zoom * 100) + '%';
}

function resetearVista() {
  canvasState.zoom = 1;
  canvasState.panX = 0;
  canvasState.panY = 0;
  aplicarTransformCanvas();
  updateZoomLabel();
}

/* ============================================
   CONECTORES
   ============================================ */

const RELATION_TYPES = {
  familia:   { label: 'Familia',   emoji: '🏠', color: '#9c27b0', style: 'solid',  defaultLabel: 'familia de' },
  amor:      { label: 'Amor',      emoji: '❤️', color: '#e91e63', style: 'solid',  defaultLabel: 'pareja de' },
  amistad:   { label: 'Amistad',   emoji: '🤝', color: '#4caf50', style: 'solid',  defaultLabel: 'amigo de' },
  conflicto: { label: 'Conflicto', emoji: '⚔️', color: '#e50914', style: 'dashed', defaultLabel: 'enemigo de' },
  trabajo:   { label: 'Trabajo',   emoji: '💼', color: '#2196f3', style: 'solid',  defaultLabel: 'colega de' },
  mentor:    { label: 'Mentor',    emoji: '🎓', color: '#ff9800', style: 'solid',  defaultLabel: 'mentor de' },
  rival:     { label: 'Rival',     emoji: '🥊', color: '#ff5722', style: 'dashed', defaultLabel: 'rival de' },
  conocido:  { label: 'Conocido',  emoji: '👋', color: '#9e9e9e', style: 'dotted', defaultLabel: 'conoce a' },
  otro:      { label: 'Otro',      emoji: '🔗', color: '#6a6a78', style: 'solid',  defaultLabel: '' },
};

let connectState = {
  active: false,
  fromNode: null,
};

function activarModoConectar() {
  if (canvasState.nodes.length < 2) {
    toast('Necesitas al menos 2 personajes para conectar', 'info');
    return;
  }
  connectState.active = true;
  connectState.fromNode = null;

  document.getElementById('canvasHintDefault').hidden = true;
  document.getElementById('canvasHintConnect').hidden = false;
  document.getElementById('canvasHintConnectText').textContent = 'Selecciona el primer personaje';
  document.getElementById('canvasConnectBtn').classList.add('active');
  document.getElementById('arbolCanvasViewport')?.classList.add('connect-mode');

  toast('Modo conectar activado. Toca el primer personaje.', 'info');
}

function desactivarModoConectar() {
  connectState.active = false;
  connectState.fromNode = null;

  document.getElementById('canvasHintDefault').hidden = false;
  document.getElementById('canvasHintConnect').hidden = true;
  document.getElementById('canvasConnectBtn')?.classList.remove('active');
  document.getElementById('arbolCanvasViewport')?.classList.remove('connect-mode');

  document.querySelectorAll('.canvas-node.selecting-from, .canvas-node.selecting-to').forEach(el => {
    el.classList.remove('selecting-from', 'selecting-to');
  });
}

function handleNodeClickForConnect(node) {
  if (!connectState.active) return;

  if (!connectState.fromNode) {
    connectState.fromNode = node;
    document.getElementById('canvasHintConnectText').textContent = `Desde: ${node.name}. Toca el segundo personaje.`;

    const el = document.querySelector(`.canvas-node[data-node-id="${node.id}"]`);
    if (el) el.classList.add('selecting-from');

    document.querySelectorAll('.canvas-node').forEach(other => {
      if (other.dataset.nodeId !== node.id) other.classList.add('selecting-to');
    });
  } else {
    if (connectState.fromNode.id === node.id) {
      toast('No puedes conectar un personaje consigo mismo', 'error');
      return;
    }

    const fromNode = connectState.fromNode;

    document.querySelectorAll('.canvas-node.selecting-from, .canvas-node.selecting-to').forEach(el => {
      el.classList.remove('selecting-from', 'selecting-to');
    });

    abrirModalConexion(fromNode, node);

    connectState.fromNode = null;
    document.getElementById('canvasHintConnectText').textContent = 'Selecciona el primer personaje';
  }
}

async function abrirModalConexion(fromNode, toNode) {
  const existing = canvasState.edges.find(e =>
    (e.from_node_id === fromNode.id && e.to_node_id === toNode.id) ||
    (e.from_node_id === toNode.id && e.to_node_id === fromNode.id)
  );

  const isEditing = !!existing;
  const edgeData = existing || {
    from_node_id: fromNode.id,
    to_node_id: toNode.id,
    relation_type: 'otro',
    relation_label: '',
    line_color: RELATION_TYPES.otro.color,
    line_style: RELATION_TYPES.otro.style,
    line_width: 2,
    arrow_start: false,
    arrow_end: false,
    curve_offset: 0,
    line_opacity: 1,
  };

  const modal = document.createElement('div');
  modal.className = 'custom-input-overlay';
  modal.id = 'edgeModal';
  modal.innerHTML = `
    <div class="custom-input-modal edge-modal">
      <h3 class="custom-input-title">${isEditing ? 'Editar conexión' : 'Nueva conexión'}</h3>
      <p class="custom-input-desc" style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;">
        <span class="edge-modal-node-preview">
          <span class="edge-modal-avatar">${fromNode.image_url ? `<img src="${fromNode.image_url}" alt="" />` : escapeHtml(fromNode.emoji || '👤')}</span>
          <span>${escapeHtml(fromNode.name)}</span>
        </span>
        <span style="color:var(--accent-color);">↔</span>
        <span class="edge-modal-node-preview">
          <span class="edge-modal-avatar">${toNode.image_url ? `<img src="${toNode.image_url}" alt="" />` : escapeHtml(toNode.emoji || '👤')}</span>
          <span>${escapeHtml(toNode.name)}</span>
        </span>
      </p>

      <div class="custom-input-fields-scroll">
        <div class="custom-input-field">
          <label>Tipo de relación</label>
          <select id="edgeTypeSelect">
            ${Object.entries(RELATION_TYPES).map(([key, t]) => `
              <option value="${key}" ${edgeData.relation_type === key ? 'selected' : ''}>
                ${t.emoji} ${t.label}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="custom-input-field">
          <label>Etiqueta (texto sobre la línea)</label>
          <input type="text" id="edgeLabelInput" maxlength="60" placeholder="Ej: padre de, amigo de…" value="${escapeHtml(edgeData.relation_label || '')}" />
        </div>

        <div class="custom-input-field">
          <label>Color de la línea</label>
          <div class="edge-color-picker">
            <input type="color" id="edgeColorInput" value="${edgeData.line_color || '#e50914'}" />
            <div class="edge-color-presets">
              ${Object.entries(RELATION_TYPES).map(([key, t]) => `
                <button type="button" class="edge-color-preset" data-color="${t.color}" style="background:${t.color};" title="${t.label}"></button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="custom-input-field">
          <label>Estilo de línea</label>
          <div class="edge-style-picker">
            <button type="button" class="edge-style-btn ${edgeData.line_style === 'solid' ? 'active' : ''}" data-style="solid">
              <svg width="40" height="10"><line x1="0" y1="5" x2="40" y2="5" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <button type="button" class="edge-style-btn ${edgeData.line_style === 'dashed' ? 'active' : ''}" data-style="dashed">
              <svg width="40" height="10"><line x1="0" y1="5" x2="40" y2="5" stroke="currentColor" stroke-width="2" stroke-dasharray="6,4"/></svg>
            </button>
            <button type="button" class="edge-style-btn ${edgeData.line_style === 'dotted' ? 'active' : ''}" data-style="dotted">
              <svg width="40" height="10"><line x1="0" y1="5" x2="40" y2="5" stroke="currentColor" stroke-width="2" stroke-dasharray="2,4"/></svg>
            </button>
          </div>
        </div>

        <div class="custom-input-field">
          <label>Flechas</label>
          <div class="edge-arrows-picker">
            <label class="admin-check">
              <input type="checkbox" id="edgeArrowStart" ${edgeData.arrow_start ? 'checked' : ''} />
              <span>Al inicio</span>
            </label>
            <label class="admin-check">
              <input type="checkbox" id="edgeArrowEnd" ${edgeData.arrow_end ? 'checked' : ''} />
              <span>Al final</span>
            </label>
          </div>
        </div>
      </div>

      <div class="custom-input-actions">
        ${isEditing ? `<button class="btn btn-ghost" id="edgeDeleteBtn" style="color:#ff6b6b;">Eliminar</button>` : ''}
        <button class="btn btn-ghost" id="edgeCancelBtn">Cancelar</button>
        <button class="btn btn-primary" id="edgeSaveBtn">${isEditing ? 'Guardar' : 'Crear conexión'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const typeSelect = modal.querySelector('#edgeTypeSelect');
  const labelInput = modal.querySelector('#edgeLabelInput');
  const colorInput = modal.querySelector('#edgeColorInput');
  const styleBtns = modal.querySelectorAll('.edge-style-btn');
  const colorPresets = modal.querySelectorAll('.edge-color-preset');
  const arrowStart = modal.querySelector('#edgeArrowStart');
  const arrowEnd = modal.querySelector('#edgeArrowEnd');

  let selectedStyle = edgeData.line_style || 'solid';

  typeSelect.addEventListener('change', () => {
    const t = RELATION_TYPES[typeSelect.value];
    if (!t) return;
    colorInput.value = t.color;
    selectedStyle = t.style;
    styleBtns.forEach(b => b.classList.toggle('active', b.dataset.style === t.style));
    if (!labelInput.value.trim() || labelInput.dataset.auto === '1') {
      labelInput.value = t.defaultLabel;
      labelInput.dataset.auto = '1';
    }
  });

  labelInput.addEventListener('input', () => {
    labelInput.dataset.auto = '0';
  });

  styleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStyle = btn.dataset.style;
      styleBtns.forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  colorPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      colorInput.value = btn.dataset.color;
    });
  });

  modal.querySelector('#edgeCancelBtn').addEventListener('click', () => modal.remove());

  modal.querySelector('#edgeDeleteBtn')?.addEventListener('click', async () => {
    if (!confirm('¿Eliminar esta conexión?')) return;
    await eliminarConexion(existing.id);
    modal.remove();
  });

  modal.querySelector('#edgeSaveBtn').addEventListener('click', async () => {
    const payload = {
      story_id: canvasState.storyId,
      user_id: session.user.id,
      from_node_id: fromNode.id,
      to_node_id: toNode.id,
      relation_type: typeSelect.value,
      relation_label: labelInput.value.trim(),
      line_color: colorInput.value,
      line_style: selectedStyle,
      line_width: 2,
      arrow_start: arrowStart.checked,
      arrow_end: arrowEnd.checked,
      curve_offset: 0,
      line_opacity: 1,
      is_custom_style: true,
    };

    showLoading();
    let error;
    if (isEditing) {
      ({ error } = await db.from('character_edges').update(payload).eq('id', existing.id));
    } else {
      ({ error } = await db.from('character_edges').insert(payload));
    }
    hideLoading();

    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast(isEditing ? 'Conexión actualizada' : 'Conexión creada', 'ok');
    modal.remove();

    await recargarEdges();
  });
}

async function eliminarConexion(edgeId) {
  showLoading();
  const { error } = await db.from('character_edges').delete().eq('id', edgeId);
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Conexión eliminada', 'ok');
  await recargarEdges();
}

async function recargarEdges() {
  const { data } = await db
    .from('character_edges')
    .select('*')
    .eq('story_id', canvasState.storyId);
  canvasState.edges = data || [];
  dibujarEdges();
}

function dibujarEdges() {
  const svg = document.getElementById('arbolCanvasSvg');
  if (!svg) return;

  const NODE_W = 130;
  const NODE_H = 130;

  svg.innerHTML = `
    <defs>
      <marker id="arrowEnd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
      </marker>
      <marker id="arrowStart" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M 10 0 L 0 5 L 10 10 z" fill="context-stroke" />
      </marker>
    </defs>
  `;

  canvasState.edges.forEach(edge => {
    const from = canvasState.nodes.find(n => n.id === edge.from_node_id);
    const to = canvasState.nodes.find(n => n.id === edge.to_node_id);
    if (!from || !to) return;

    const fromCX = from.x + NODE_W / 2;
    const fromCY = from.y + NODE_H / 2;
    const toCX = to.x + NODE_W / 2;
    const toCY = to.y + NODE_H / 2;

    const angle = Math.atan2(toCY - fromCY, toCX - fromCX);
    const radiusX = NODE_W / 2;
    const radiusY = NODE_H / 2;

    const fromX = fromCX + Math.cos(angle) * radiusX * 0.85;
    const fromY = fromCY + Math.sin(angle) * radiusY * 0.85;
    const toX = toCX - Math.cos(angle) * radiusX * 0.85;
    const toY = toCY - Math.sin(angle) * radiusY * 0.85;

    const color = edge.line_color || '#e50914';
    const style = edge.line_style || 'solid';
    const width = edge.line_width || 2;
    const opacity = edge.line_opacity || 1;

    let dashAttr = '';
    if (style === 'dashed') dashAttr = 'stroke-dasharray="8,6"';
    else if (style === 'dotted') dashAttr = 'stroke-dasharray="2,6"';

    const markerStart = edge.arrow_start ? 'marker-start="url(#arrowStart)"' : '';
    const markerEnd = edge.arrow_end ? 'marker-end="url(#arrowEnd)"' : '';

    svg.insertAdjacentHTML('beforeend', `
      <line
        x1="${fromX}" y1="${fromY}"
        x2="${toX}" y2="${toY}"
        stroke="${color}"
        stroke-width="${width}"
        stroke-opacity="${opacity}"
        ${dashAttr}
        ${markerStart}
        ${markerEnd}
        stroke-linecap="round"
        data-edge-id="${edge.id}"
        class="canvas-edge-line"
        style="cursor: pointer; pointer-events: stroke;"
      />
    `);

    if (edge.relation_label && edge.relation_label.trim()) {
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;

      let angleDeg = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
      if (angleDeg > 90 || angleDeg < -90) angleDeg += 180;

      const labelWidth = edge.relation_label.length * 6.5 + 16;
      const labelHeight = 20;

      svg.insertAdjacentHTML('beforeend', `
        <g class="canvas-edge-label-group" data-edge-id="${edge.id}" style="cursor: pointer;">
          <rect
            x="${midX - labelWidth / 2}"
            y="${midY - labelHeight / 2}"
            width="${labelWidth}"
            height="${labelHeight}"
            rx="10"
            fill="var(--bg-elevated)"
            stroke="${color}"
            stroke-width="1.5"
            opacity="0.95"
          />
          <text
            x="${midX}"
            y="${midY + 4}"
            text-anchor="middle"
            font-family="Inter, sans-serif"
            font-size="11"
            font-weight="600"
            fill="${color}"
            style="user-select: none; pointer-events: none;"
          >${escapeHtml(edge.relation_label)}</text>
        </g>
      `);
    }
  });

  svg.querySelectorAll('.canvas-edge-line, .canvas-edge-label-group').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const edgeId = el.dataset.edgeId;
      const edge = canvasState.edges.find(ed => ed.id === edgeId);
      if (!edge) return;
      const fromNode = canvasState.nodes.find(n => n.id === edge.from_node_id);
      const toNode = canvasState.nodes.find(n => n.id === edge.to_node_id);
      if (fromNode && toNode) abrirModalConexion(fromNode, toNode);
    });
  });
}

function initCanvasListeners() {
  const viewport = document.getElementById('arbolCanvasViewport');
  if (viewport) {
    viewport.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.canvas-node') && !connectState.active) {
        iniciarPanCanvas(e);
      }
    });
    viewport.addEventListener('touchmove', (e) => {
      if (canvasState.draggingNode || canvasState.isPanning) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  document.getElementById('canvasZoomIn')?.addEventListener('click', () => cambiarZoom(0.15));
  document.getElementById('canvasZoomOut')?.addEventListener('click', () => cambiarZoom(-0.15));
  document.getElementById('canvasResetView')?.addEventListener('click', resetearVista);

  document.getElementById('canvasAddChar')?.addEventListener('click', () => abrirCharacterForm(null));
  document.getElementById('canvasBackBtn')?.addEventListener('click', () => {
    showView('viewArbol');
    if (currentTreeStory) cargarPersonajesAdmin(currentTreeStory.id);
  });

  document.getElementById('btnOpenCanvas')?.addEventListener('click', () => {
    if (currentTreeStory) abrirCanvasArbol(currentTreeStory.id);
  });

  document.getElementById('canvasConnectBtn')?.addEventListener('click', () => {
    if (connectState.active) {
      desactivarModoConectar();
      toast('Modo conectar desactivado', 'info');
    } else {
      activarModoConectar();
    }
  });

  document.getElementById('canvasCancelConnect')?.addEventListener('click', () => {
    desactivarModoConectar();
  });
}

/* ---------- BIOGRAFÍA ---------- */
async function abrirBioView() {
  showView('viewBio');
  await cargarBioAdmin();
}

async function cargarBioAdmin() {
  showLoading();
  const { data, error } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  hideLoading();
  if (error || !data) { toast('No se pudo cargar el perfil', 'error'); return; }
  currentProfile = data;

  document.getElementById('bioUsername').value = data.username || '';
  document.getElementById('bioText').value = data.bio || '';

  const preview = document.getElementById('bioAvatarPreview');
  preview.innerHTML = data.avatar_url
    ? `<img src="${data.avatar_url}" alt="" />`
    : escapeHtml((data.username || 'A').charAt(0).toUpperCase());
}

document.getElementById('bioAvatarBtn').addEventListener('click', () => {
  document.getElementById('bioAvatarInput').click();
});

document.getElementById('bioAvatarInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('La imagen supera 5 MB', 'error'); return; }
  showLoading();
  try {
    const ext = file.name.split('.').pop();
    const filename = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await db.storage.from('media').upload(filename, file);
    if (upErr) throw upErr;
    const { data: pub } = db.storage.from('media').getPublicUrl(filename);
    const { error } = await db.from('profiles').update({ avatar_url: pub.publicUrl }).eq('id', session.user.id);
    if (error) throw error;
    const preview = document.getElementById('bioAvatarPreview');
    preview.innerHTML = `<img src="${pub.publicUrl}" alt="" />`;
    toast('Foto actualizada', 'ok');
    limpiarCachePublica();
  } catch (err) { toast('Error: ' + err.message, 'error'); }
  hideLoading();
});

document.getElementById('bioSaveBtn').addEventListener('click', async () => {
  const username = document.getElementById('bioUsername').value.trim();
  const bio = document.getElementById('bioText').value.trim();
  if (!username) { toast('Falta el nombre', 'error'); return; }
  showLoading();
  const { error } = await db.from('profiles').update({ username, bio }).eq('id', session.user.id);
  hideLoading();
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Biografía guardada', 'ok');
  limpiarCachePublica();
});

/* ---------- BOTONES NAV ---------- */
document.getElementById('btnNewStory').addEventListener('click', () => abrirStoryForm(null));
document.getElementById('btnNewPost').addEventListener('click', () => abrirPostForm(null));
document.getElementById('btnRedes').addEventListener('click', () => abrirRedesView());
document.getElementById('btnBio').addEventListener('click', () => abrirBioView());
document.getElementById('btnDonaciones').addEventListener('click', () => abrirDonacionesView());
document.getElementById('btnStats').addEventListener('click', () => abrirStatsView());
document.getElementById('btnAjustes')?.addEventListener('click', () => abrirAjustesView());
document.getElementById('btnArboles')?.addEventListener('click', () => abrirArbolesEstante());

document.getElementById('btnNewChapter').addEventListener('click', () => {
  if (!currentStory) return;
  db.from('chapters').select('chapter_order').eq('story_id', currentStory.id).order('chapter_order', { ascending: false }).limit(1).then(({ data }) => {
    const next = (data?.[0]?.chapter_order || 0) + 1;
    abrirChapterForm(null);
    setTimeout(() => { document.getElementById('chapterOrder').value = next; }, 100);
  });
});

document.getElementById('btnNewCharacter')?.addEventListener('click', () => abrirCharacterForm(null));

document.getElementById('backFromStory').addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromChapter').addEventListener('click', () => { showView('viewStory'); cargarCapitulosAdmin(currentStory.id); });
document.getElementById('backFromPost').addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromRedes').addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromBio').addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromDonaciones').addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromStats').addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromStoryStats').addEventListener('click', () => { showView('viewStats'); });
document.getElementById('backFromAjustes')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromArboles')?.addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromArbol')?.addEventListener('click', () => { showView('viewArbolesEstante'); cargarEstante(); });
document.getElementById('backFromCharacterForm')?.addEventListener('click', () => {
  showView('viewArbol');
  if (currentTreeStory) cargarPersonajesAdmin(currentTreeStory.id);
});

/* ---------- HELPERS ---------- */
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

/* ---------- INIT ---------- */
(async () => {
  initTheme();

  const headerMount = document.getElementById('header-mount');
  const pageMain = document.querySelector('.page-main');
  if (headerMount) headerMount.style.visibility = 'hidden';
  if (pageMain) pageMain.style.visibility = 'hidden';

  inyectarHeader();
  inyectarAuthModal();
  initEditor('editorToolbar', 'chapterEditor', 'edCounter');
  initEditor('postToolbar', 'postEditor', 'postCounter');
  initCanvasListeners();

  const ok = await verificarAutor();

  if (ok) {
    if (headerMount) headerMount.style.visibility = 'visible';
    if (pageMain) pageMain.style.visibility = 'visible';
    await cargarDashboard();
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (window.lucide) lucide.createIcons();
})();
