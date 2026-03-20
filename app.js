/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function uid() { return Math.random().toString(36).slice(2, 9); }

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const PALETTE = [
  { hex: '#1a56db', lt: '#eff4ff' },
  { hex: '#e3622d', lt: '#fff4ee' },
  { hex: '#16a34a', lt: '#f0fdf4' },
  { hex: '#8b5cf6', lt: '#f5f3ff' },
  { hex: '#dc2626', lt: '#fef2f2' },
  { hex: '#0ea5e9', lt: '#f0f9ff' },
  { hex: '#d97706', lt: '#fffbeb' },
  { hex: '#db2777', lt: '#fdf2f8' },
  { hex: '#0d9488', lt: '#f0fdfa' },
  { hex: '#6b7280', lt: '#f9fafb' },
];

const ICONS = ['📘','🎯','🔬','📊','⚠️','💡','🧾','📝','🧠','🏆','🌍','💼','🗂️','🔍','✏️','📌'];

const DEFAULT_LABELS = [
  'Introduction','Target Market','Research','Statistics',
  'Problem','Solution','Conclusion','General Note',
  'Methodology','Interview','Survey','Analysis'
];

// Preset starter fields per label — user can delete / rename / add freely
const SMART_PRESETS = {
  'Target Market': [
    { id: uid(), label: 'Age Group',  value: '', placeholder: 'e.g. 8–9 years old' },
    { id: uid(), label: 'Buyer',      value: '', placeholder: 'e.g. Parents, Students' },
    { id: uid(), label: 'Problem',    value: '', placeholder: 'e.g. Struggling with math' },
  ],
  'Statistics': [
    { id: uid(), label: 'Survey Question', value: '', placeholder: 'What did you ask?' },
    { id: uid(), label: 'Yes Count',       value: '', placeholder: 'e.g. 8' },
    { id: uid(), label: 'Total',           value: '', placeholder: 'e.g. 10' },
  ],
  'Problem': [
    { id: uid(), label: 'Description',     value: '', placeholder: 'What is the problem?' },
    { id: uid(), label: 'Who is Affected', value: '', placeholder: 'e.g. Grade 3 students' },
    { id: uid(), label: 'Impact',          value: '', placeholder: 'e.g. Low academic performance' },
  ],
  'Solution': [
    { id: uid(), label: 'Product / Idea', value: '', placeholder: 'Name of your solution' },
    { id: uid(), label: 'How It Helps',   value: '', placeholder: 'How does it solve the problem?' },
    { id: uid(), label: 'Target User',    value: '', placeholder: 'Who benefits?' },
  ],
  'Conclusion': [
    { id: uid(), label: 'Key Finding 1',  value: '', placeholder: 'Most important finding' },
    { id: uid(), label: 'Key Finding 2',  value: '', placeholder: 'Second important finding' },
    { id: uid(), label: 'Recommendation', value: '', placeholder: 'Your final recommendation' },
  ],
};

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let state = {
  sections:     [],
  posts:        [],       // { id, sectionId, label, title, content, customFields:[{id,label,value}], image, imgSize, pinned, date }
  customLabels: [...DEFAULT_LABELS],
};

let currentSectionId  = null;
let editingPostId     = null;
let pendingDeleteId   = null;
let pendingDeleteType = null;
let selectedColor     = PALETTE[0];
let selectedIcon      = ICONS[0];

// live custom fields while editing a post
let _liveFields = [];

/* ══════════════════════════════════════════
   STORAGE
══════════════════════════════════════════ */
function loadState() {
  try {
    const raw = localStorage.getItem('rf_state_v3');
    if (raw) {
      const p = JSON.parse(raw);
      state.sections     = p.sections     || [];
      state.posts        = p.posts        || [];
      state.customLabels = p.customLabels || [...DEFAULT_LABELS];
    }
  } catch { /* ignore */ }
}
function saveState() {
  try { localStorage.setItem('rf_state_v3', JSON.stringify(state)); } catch { /* ignore */ }
}

/* ══════════════════════════════════════════
   SCREENS
══════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */
function renderDashboard() {
  const grid  = document.getElementById('dashGrid');
  const empty = document.getElementById('dashEmpty');
  grid.innerHTML = '';
  if (state.sections.length === 0) { empty.classList.add('visible'); return; }
  empty.classList.remove('visible');

  state.sections.forEach((sec, idx) => {
    const count = state.posts.filter(p => p.sectionId === sec.id).length;
    const card  = document.createElement('div');
    card.className = 'section-card';
    card.style.setProperty('--c',    sec.color);
    card.style.setProperty('--c-lt', sec.colorLight);
    card.style.animationDelay = (idx * 0.04) + 's';
    card.innerHTML = `
      <div class="card-icon">${sec.icon}</div>
      <div class="card-title">${escHtml(sec.title)}</div>
      <div class="card-meta">
        <div class="card-count">
          <span class="card-count-badge">${count}</span>
          ${count === 1 ? 'note' : 'notes'}
        </div>
        <button class="card-delete-btn" title="Delete section">🗑️</button>
      </div>`;
    card.addEventListener('click', e => {
      if (e.target.closest('.card-delete-btn')) return;
      openSection(sec.id);
    });
    card.querySelector('.card-delete-btn').addEventListener('click', e => {
      e.stopPropagation();
      askDelete('section', sec.id);
    });
    grid.appendChild(card);
  });
}

/* ══════════════════════════════════════════
   NEW SECTION MODAL
══════════════════════════════════════════ */
function openSectionModal() {
  document.getElementById('sectionNameInput').value = '';
  selectedColor = PALETTE[0];
  selectedIcon  = ICONS[0];
  renderColorPicker();
  renderIconPicker();
  openModal('sectionModal');
  setTimeout(() => document.getElementById('sectionNameInput').focus(), 320);
}

function renderColorPicker() {
  const el = document.getElementById('colorPicker');
  el.innerHTML = '';
  PALETTE.forEach(p => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (p.hex === selectedColor.hex ? ' selected' : '');
    sw.style.background = p.hex;
    sw.addEventListener('click', () => { selectedColor = p; renderColorPicker(); });
    el.appendChild(sw);
  });
}

function renderIconPicker() {
  const el = document.getElementById('iconPicker');
  el.innerHTML = '';
  ICONS.forEach(icon => {
    const btn = document.createElement('div');
    btn.className = 'icon-opt' + (icon === selectedIcon ? ' selected' : '');
    btn.textContent = icon;
    btn.addEventListener('click', () => { selectedIcon = icon; renderIconPicker(); });
    el.appendChild(btn);
  });
}

function saveSectionModal() {
  const name = document.getElementById('sectionNameInput').value.trim();
  if (!name) { shakeEl(document.getElementById('sectionNameInput')); return; }
  state.sections.push({ id: Date.now().toString(), title: name, icon: selectedIcon, color: selectedColor.hex, colorLight: selectedColor.lt });
  saveState();
  closeModal('sectionModal');
  renderDashboard();
}

/* ══════════════════════════════════════════
   SECTION FEED
══════════════════════════════════════════ */
function openSection(sectionId) {
  currentSectionId = sectionId;
  const sec = state.sections.find(s => s.id === sectionId);
  document.getElementById('feedTitle').textContent = sec.title;
  showScreen('feed');
  document.getElementById('fab').classList.add('visible');
  renderFeed();
}

function renderFeed() {
  const body = document.getElementById('feedBody');
  body.innerHTML = '';

  const topBtn = document.createElement('button');
  topBtn.className = 'new-post-top-btn';
  topBtn.innerHTML = `<span>✏️</span> Write a new note…`;
  topBtn.addEventListener('click', () => openPostPanel(null));
  body.appendChild(topBtn);

  const posts = state.posts
    .filter(p => p.sectionId === currentSectionId)
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return  1;
      return new Date(b.date) - new Date(a.date);
    });

  if (posts.length === 0) {
    const e = document.createElement('div');
    e.className = 'feed-empty';
    e.innerHTML = `<div class="empty-icon">📭</div><p>No notes yet.<br>Tap the button above to get started.</p>`;
    body.appendChild(e);
    return;
  }
  posts.forEach(post => body.appendChild(buildPostCard(post)));
}

/* ══════════════════════════════════════════
   POST CARD
══════════════════════════════════════════ */
function buildPostCard(post) {
  const sec  = state.sections.find(s => s.id === post.sectionId) || {};
  const card = document.createElement('div');
  card.className = 'post-card' + (post.pinned ? ' is-pinned' : '');
  card.id = 'post-' + post.id;
  if (post.pinned) card.style.setProperty('--c', sec.color || '#1a56db');

  // label bar
  const bar = document.createElement('div');
  bar.className = 'post-label-bar';
  bar.style.background = sec.colorLight || '#eff4ff';
  bar.style.color       = sec.color      || '#1a56db';
  bar.innerHTML = `
    <span class="post-label-name">${sec.icon || '📝'} ${escHtml(post.label || sec.title || '')}</span>
    <button class="post-pin-btn ${post.pinned ? 'on' : 'off'}" title="${post.pinned ? 'Unpin' : 'Pin'}">📌</button>`;
  bar.querySelector('.post-pin-btn').addEventListener('click', () => togglePin(post.id));
  card.appendChild(bar);

  // body
  const body = document.createElement('div');
  body.className = 'post-body';

  if (post.title) {
    const t = document.createElement('div');
    t.className = 'post-title';
    t.textContent = post.title;
    body.appendChild(t);
  }

  if (post.content) {
    const c = document.createElement('div');
    c.className = 'post-content';
    c.innerHTML = renderHighlights(escHtml(post.content));
    body.appendChild(c);
  }

  // custom fields (shown as compact data chips, NO extra box)
  if (post.customFields && post.customFields.some(f => f.value)) {
    const chips = document.createElement('div');
    chips.className = 'post-chips';
    post.customFields.filter(f => f.value).forEach(f => {
      const chip = document.createElement('div');
      chip.className = 'post-chip';
      chip.innerHTML = `<span class="chip-label">${escHtml(f.label)}</span><span class="chip-val">${escHtml(f.value)}</span>`;
      chips.appendChild(chip);
    });
    body.appendChild(chips);
  }

  // image — never crop, with size control
  if (post.image) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'post-img-wrap';
    const imgSize = post.imgSize || 'full';
    imgWrap.setAttribute('data-size', imgSize);

    const img = document.createElement('img');
    img.className = 'post-img';
    img.src = post.image;
    img.alt = 'note image';
    imgWrap.appendChild(img);

    // size toggles
    const sizeRow = document.createElement('div');
    sizeRow.className = 'img-size-row';
    ['S','M','L','Full'].forEach(sz => {
      const btn = document.createElement('button');
      btn.className = 'img-size-btn' + (imgSize === sz.toLowerCase() ? ' active' : '');
      btn.textContent = sz;
      btn.addEventListener('click', () => {
        const idx = state.posts.findIndex(p => p.id === post.id);
        if (idx > -1) {
          state.posts[idx].imgSize = sz.toLowerCase();
          saveState();
          renderFeed();
        }
      });
      sizeRow.appendChild(btn);
    });
    imgWrap.appendChild(sizeRow);
    body.appendChild(imgWrap);
  }

  card.appendChild(body);

  // footer
  const footer = document.createElement('div');
  footer.className = 'post-footer';
  footer.innerHTML = `
    <span class="post-date">📅 ${formatDate(post.date)}</span>
    <div class="post-actions">
      <button class="post-act-btn" title="Edit">✏️</button>
      <button class="post-act-btn" title="Delete">🗑️</button>
    </div>`;
  footer.querySelectorAll('.post-act-btn')[0].addEventListener('click', () => openPostPanel(post.id));
  footer.querySelectorAll('.post-act-btn')[1].addEventListener('click', () => askDelete('post', post.id));
  card.appendChild(footer);

  return card;
}

/* ══════════════════════════════════════════
   POST PANEL
══════════════════════════════════════════ */
function openPostPanel(postId) {
  editingPostId = postId;
  populateLabelSelect();

  if (postId) {
    const post = state.posts.find(p => p.id === postId);
    document.getElementById('panelTitle').textContent = 'Edit Post';
    document.getElementById('postLabel').value        = post.label || '';
    document.getElementById('postTitle').value        = post.title || '';
    document.getElementById('postContent').value      = post.content || '';
    _liveFields = (post.customFields || []).map(f => ({ ...f }));
    if (post.image) showImagePreview(post.image);
    else hideImagePreview();
  } else {
    document.getElementById('panelTitle').textContent = 'New Post';
    document.getElementById('postTitle').value   = '';
    document.getElementById('postContent').value = '';
    _liveFields = [];
    hideImagePreview();
  }

  renderSmartTools();
  document.getElementById('postPanel').classList.add('open');
}

function closePostPanel() {
  document.getElementById('postPanel').classList.remove('open');
  editingPostId = null;
  _liveFields   = [];
}

function savePost() {
  // flush current field values from DOM into _liveFields
  syncFieldsFromDOM();

  const label   = document.getElementById('postLabel').value;
  const title   = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  const imgEl   = document.getElementById('imgPreview');
  const hasImg  = imgEl.style.display !== 'none' && imgEl.src && imgEl.src !== window.location.href;

  if (editingPostId) {
    const idx = state.posts.findIndex(p => p.id === editingPostId);
    if (idx > -1) {
      state.posts[idx] = {
        ...state.posts[idx],
        label, title, content,
        customFields: [..._liveFields],
        image: hasImg ? imgEl.src : null,
      };
    }
  } else {
    state.posts.push({
      id:           Date.now().toString(),
      sectionId:    currentSectionId,
      label, title, content,
      customFields: [..._liveFields],
      image:        hasImg ? imgEl.src : null,
      imgSize:      'full',
      pinned:       false,
      date:         new Date().toISOString().split('T')[0],
    });
  }

  saveState();
  closePostPanel();
  renderFeed();
  renderDashboard();
}

/* ══════════════════════════════════════════
   LABEL SELECT
══════════════════════════════════════════ */
function populateLabelSelect() {
  const sel = document.getElementById('postLabel');
  const cur = sel.value;
  sel.innerHTML = '';
  state.customLabels.forEach(lbl => {
    const opt = document.createElement('option');
    opt.value = lbl; opt.textContent = lbl;
    sel.appendChild(opt);
  });
  if (cur && state.customLabels.includes(cur)) sel.value = cur;
}

function openAddLabelModal() {
  document.getElementById('newLabelInput').value = '';
  openModal('addLabelModal');
  setTimeout(() => document.getElementById('newLabelInput').focus(), 300);
}

function saveCustomLabel() {
  const name = document.getElementById('newLabelInput').value.trim();
  if (!name) { shakeEl(document.getElementById('newLabelInput')); return; }
  if (!state.customLabels.includes(name)) {
    state.customLabels.push(name);
    saveState();
  }
  closeModal('addLabelModal');
  populateLabelSelect();
  document.getElementById('postLabel').value = name;
  // new label = no presets, keep current fields
  renderSmartTools();
}

/* ══════════════════════════════════════════
   SMART TOOLS — fully customizable fields
══════════════════════════════════════════ */
function onLabelChange() {
  syncFieldsFromDOM();
  renderSmartTools();
}

function syncFieldsFromDOM() {
  document.querySelectorAll('.smart-field-row').forEach(row => {
    const id     = row.dataset.id;
    const lbl    = row.querySelector('.sf-label-input').value.trim();
    const val    = row.querySelector('.sf-value-input').value;
    const idx    = _liveFields.findIndex(f => f.id === id);
    if (idx > -1) { _liveFields[idx].label = lbl; _liveFields[idx].value = val; }
  });
}

function renderSmartTools() {
  const label     = document.getElementById('postLabel').value;
  const container = document.getElementById('smartTools');
  let html = `<div class="smart-header">🗂️ Custom Data Fields <span class="smart-sub">— shown on the post card</span></div>`;

  if (_liveFields.length === 0) {
    html += `<div class="smart-empty">No fields yet. Tap ＋ Add Field to get started.</div>`;
  }

  html += `<div id="smartFieldsList"></div>`;

  html += `<div class="smart-actions">`;
  html += `<button class="smart-add-btn" id="smartAddBtn">＋ Add Field</button>`;

  html += `</div>`;

  container.innerHTML = html;
  renderFieldsList();

  document.getElementById('smartAddBtn').addEventListener('click', () => {
    syncFieldsFromDOM();
    _liveFields.push({ id: uid(), label: '', value: '', placeholder: 'Value…' });
    renderFieldsList();
  });

}

function renderFieldsList() {
  const list = document.getElementById('smartFieldsList');
  if (!list) return;
  list.innerHTML = '';
  _liveFields.forEach(field => {
    const row = document.createElement('div');
    row.className = 'smart-field-row';
    row.dataset.id = field.id;
    row.innerHTML = `
      <input class="sf-label-input form-input" placeholder="Field name…" value="${escAttr(field.label)}">
      <input class="sf-value-input form-input" placeholder="${escAttr(field.placeholder || 'Value…')}" value="${escAttr(field.value)}">
      <button class="sf-del-btn" title="Remove field">✕</button>`;
    row.querySelector('.sf-del-btn').addEventListener('click', () => {
      syncFieldsFromDOM();
      _liveFields = _liveFields.filter(f => f.id !== field.id);
      renderFieldsList();
    });
    list.appendChild(row);
  });
}

/* ══════════════════════════════════════════
   PIN / DELETE
══════════════════════════════════════════ */
function togglePin(postId) {
  const idx = state.posts.findIndex(p => p.id === postId);
  if (idx > -1) { state.posts[idx].pinned = !state.posts[idx].pinned; saveState(); renderFeed(); }
}

function askDelete(type, id) {
  pendingDeleteId   = id;
  pendingDeleteType = type;
  const titleEl = document.getElementById('deleteModalTitle');
  const subEl   = document.getElementById('deleteModalSub');
  const iconEl  = document.getElementById('deleteModalIcon');
  if (type === 'section') {
    const sec   = state.sections.find(s => s.id === id);
    const count = state.posts.filter(p => p.sectionId === id).length;
    iconEl.textContent  = '🗂️';
    titleEl.textContent = `Delete "${sec?.title}"?`;
    subEl.textContent   = count > 0
      ? `This will also delete ${count} note${count > 1 ? 's' : ''} inside it.`
      : 'This section is empty.';
  } else {
    iconEl.textContent  = '🗑️';
    titleEl.textContent = 'Delete this post?';
    subEl.textContent   = 'This action cannot be undone.';
  }
  openModal('deleteModal');
}

function doDelete() {
  if (pendingDeleteType === 'section') {
    state.sections = state.sections.filter(s => s.id !== pendingDeleteId);
    state.posts    = state.posts.filter(p => p.sectionId !== pendingDeleteId);
  } else {
    state.posts = state.posts.filter(p => p.id !== pendingDeleteId);
  }
  saveState();
  closeModal('deleteModal');
  if (pendingDeleteType === 'section') renderDashboard();
  else { renderFeed(); renderDashboard(); }
  pendingDeleteId = null; pendingDeleteType = null;
}

/* ══════════════════════════════════════════
   IMAGE
══════════════════════════════════════════ */
function showImagePreview(src) {
  const img    = document.getElementById('imgPreview');
  const remBtn = document.getElementById('imgRemoveBtn');
  const zone   = document.getElementById('imgUploadZone');
  img.src = src; img.style.display = 'block';
  remBtn.style.display = 'block';
  zone.style.display   = 'none';
}
function hideImagePreview() {
  const img    = document.getElementById('imgPreview');
  const remBtn = document.getElementById('imgRemoveBtn');
  const zone   = document.getElementById('imgUploadZone');
  img.src = ''; img.style.display = 'none';
  remBtn.style.display = 'none';
  zone.style.display   = '';
  document.getElementById('imgInput').value = '';
}

/* ══════════════════════════════════════════
   MODALS
══════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeModalOnOverlay(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function renderHighlights(html) {
  return html.replace(/\*\*(.*?)\*\*/g, '<mark>$1</mark>');
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function shakeEl(el) {
  el.style.borderColor = 'var(--danger)';
  setTimeout(() => { el.style.borderColor = ''; }, 1200);
}

/* ══════════════════════════════════════════
   EVENT WIRING
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderDashboard();

  document.getElementById('addSectionBtn').addEventListener('click', openSectionModal);
  document.getElementById('sectionSave').addEventListener('click', saveSectionModal);
  document.getElementById('sectionCancel').addEventListener('click', () => closeModal('sectionModal'));
  document.getElementById('sectionModal').addEventListener('click', e => closeModalOnOverlay(e, 'sectionModal'));
  document.getElementById('sectionNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveSectionModal(); });

  document.getElementById('feedBackBtn').addEventListener('click', () => {
    document.getElementById('fab').classList.remove('visible');
    showScreen('dashboard');
    renderDashboard();
  });

  document.getElementById('fab').addEventListener('click', () => openPostPanel(null));
  document.getElementById('panelCloseBtn').addEventListener('click', closePostPanel);
  document.getElementById('panelSaveBtn').addEventListener('click', savePost);
  document.getElementById('postLabel').addEventListener('change', onLabelChange);

  document.getElementById('addLabelBtn').addEventListener('click', openAddLabelModal);
  document.getElementById('addLabelSave').addEventListener('click', saveCustomLabel);
  document.getElementById('addLabelCancel').addEventListener('click', () => closeModal('addLabelModal'));
  document.getElementById('addLabelModal').addEventListener('click', e => closeModalOnOverlay(e, 'addLabelModal'));
  document.getElementById('newLabelInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveCustomLabel(); });

  document.getElementById('imgUploadZone').addEventListener('click', () => document.getElementById('imgInput').click());
  document.getElementById('imgInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => showImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  });
  document.getElementById('imgRemoveBtn').addEventListener('click', hideImagePreview);

  document.getElementById('deleteConfirm').addEventListener('click', doDelete);
  document.getElementById('deleteCancel').addEventListener('click', () => closeModal('deleteModal'));
  document.getElementById('deleteModal').addEventListener('click', e => closeModalOnOverlay(e, 'deleteModal'));
});
