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

/* ---------- MODAL INPUT PERSONALIZADO ---------- */
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
    .select('id, title, chapter_order, is_premium, reading_time, created_at')
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
          ${c.reading_time ? `${c.reading_time} min` : ''}
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
  const words = contarPalabras(content);
  const payload = {
    story_id: currentStory.id,
    title: document.getElementById('chapterTitle').value.trim(),
    content,
    author_note: document.getElementById('chapterNote').value.trim(),
    chapter_order: parseInt(document.getElementById('chapterOrder').value, 10) || 1,
    is_premium: document.getElementById('chapterPremium').checked,
    reading_time: Math.max(1, Math.round(words / 200)),
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
  editor.addEventListener('input', () => {
    if (counterId) actualizarContador(editorId, counterId);
    guardarBorrador(editorId);
  });
  setInterval(() => guardarBorrador(editorId), 30000);
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
      desc: isBinance
        ? 'Pega tu número de Binance (ID).'
        : 'Pega el enlace de tu cuenta de PayPal.',
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
document.getElementById('btnNewChapter').addEventListener('click', () => {
  if (!currentStory) return;
  db.from('chapters').select('chapter_order').eq('story_id', currentStory.id).order('chapter_order', { ascending: false }).limit(1).then(({ data }) => {
    const next = (data?.[0]?.chapter_order || 0) + 1;
    abrirChapterForm(null);
    setTimeout(() => { document.getElementById('chapterOrder').value = next; }, 100);
  });
});

document.getElementById('backFromStory').addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromChapter').addEventListener('click', () => { showView('viewStory'); cargarCapitulosAdmin(currentStory.id); });
document.getElementById('backFromPost').addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromRedes').addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromBio').addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });
document.getElementById('backFromDonaciones').addEventListener('click', () => { showView('viewDashboard'); cargarDashboard(); });

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
