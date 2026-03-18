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

const SMART_CONFIGS = {
  'Target Market': {
    emoji: '🎯',
    desc: 'Define your audience',
    fields: [
      { key: 'Age Group',  placeholder: 'e.g. 8–9 years old' },
      { key: 'Buyer',      placeholder: 'e.g. Parents, Students' },
      { key: 'Problem',    placeholder: 'e.g. Struggling with math' },
    ],
    generate: d =>
      `${d['Buyer'] || 'Students'} aged ${d['Age Group'] || '?'} who struggle with: ${d['Problem'] || '(not specified)'}. This group is our primary target audience.`
  },
  'Statistics': {
    emoji: '📊',
    desc: 'Auto-calculate percentages',
    fields: [
      { key: 'Survey Question', placeholder: 'What did you ask?' },
      { key: 'Yes Count',       placeholder: 'Number who said yes', type: 'number' },
      { key: 'Total',           placeholder: 'Total respondents',   type: 'number' },
    ],
    generate: d => {
      const yes   = parseInt(d['Yes Count']) || 0;
      const total = parseInt(d['Total'])     || 1;
      const pct   = Math.round((yes / total) * 100);
      return `Survey: "${d['Survey Question'] || '(question)'}"\n${yes} out of ${total} respondents answered yes — **${pct}%**.`;
    }
  },
  'Problem': {
    emoji: '⚠️',
    desc: 'Define the problem clearly',
    fields: [
      { key: 'Description',   placeholder: 'What is the problem?' },
      { key: 'Who is Affected', placeholder: 'e.g. Grade 3 students' },
      { key: 'Impact',         placeholder: 'e.g. Low academic performance' },
    ],
    generate: d =>
      `Problem: ${d['Description'] || '(not stated)'}.\nThis affects ${d['Who is Affected'] || 'the target group'}, leading to ${d['Impact'] || 'negative outcomes'}.`
  },
  'Solution': {
    emoji: '💡',
    desc: 'Describe your solution',
    fields: [
      { key: 'Product / Idea', placeholder: 'Name of your solution' },
      { key: 'How It Helps',   placeholder: 'How does it solve the problem?' },
      { key: 'Target User',    placeholder: 'Who benefits?' },
    ],
    generate: d =>
      `Solution: **${d['Product / Idea'] || '(product)'}** — ${d['How It Helps'] || '(description)'}.\nBenefits: ${d['Target User'] || 'the target audience'}.`
  },
  'Conclusion': {
    emoji: '🧾',
    desc: 'Summarize your findings',
    fields: [
      { key: 'Key Finding 1', placeholder: 'Most important finding' },
      { key: 'Key Finding 2', placeholder: 'Second important finding' },
      { key: 'Recommendation', placeholder: 'Your final recommendation' },
    ],
    generate: d =>
      `Key findings:\n1. ${d['Key Finding 1'] || '—'}\n2. ${d['Key Finding 2'] || '—'}\n\nRecommendation: ${d['Recommendation'] || '(not stated)'}.`
  },
};

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let state = {
  sections:      [],   // { id, title, icon, color, colorLight }
  posts:         [],   // { id, sectionId, label, title, content, extraData, image, pinned, date }
  customLabels:  [...DEFAULT_LABELS],
};

let currentSectionId  = null;
let editingPostId     = null;
let pendingDeleteId   = null;
let pendingDeleteType = null; // 'post' | 'section'
let selectedColor     = PALETTE[0];
let selectedIcon      = ICONS[0];
let _editExtra        = {};

/* ══════════════════════════════════════════
   STORAGE
══════════════════════════════════════════ */
function loadState() {
  try {
    const raw = localStorage.getItem('rf_state_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      state.sections     = parsed.sections     || [];
      state.posts        = parsed.posts        || [];
      state.customLabels = parsed.customLabels || [...DEFAULT_LABELS];
    }
  } catch { /* ignore */ }
}

function saveState() {
  try { localStorage.setItem('rf_state_v2', JSON.stringify(state)); } catch { /* ignore */ }
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

  if (state.sections.length === 0) {
    empty.classList.add('visible');
    return;
  }
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
        <button class="card-delete-btn" title="Delete section" data-id="${sec.id}">🗑️</button>
      </div>
    `;

    // open section on click (but not on delete button)
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
  // reset
  document.getElementById('sectionNameInput').value = '';
  selectedColor = PALETTE[0];
  selectedIcon  = ICONS[0];
  renderColorPicker();
  renderIconPicker();
  openModal('sectionModal');
  setTimeout(() => document.getElementById('sectionNameInput').focus(), 320);
}

function renderColorPicker() {
  const picker = document.getElementById('colorPicker');
  picker.innerHTML = '';
  PALETTE.forEach(p => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (p.hex === selectedColor.hex ? ' selected' : '');
    sw.style.background = p.hex;
    sw.addEventListener('click', () => {
      selectedColor = p;
      renderColorPicker();
    });
    picker.appendChild(sw);
  });
}

function renderIconPicker() {
  const picker = document.getElementById('iconPicker');
  picker.innerHTML = '';
  ICONS.forEach(icon => {
    const btn = document.createElement('div');
    btn.className = 'icon-opt' + (icon === selectedIcon ? ' selected' : '');
    btn.textContent = icon;
    btn.addEventListener('click', () => {
      selectedIcon = icon;
      renderIconPicker();
    });
    picker.appendChild(btn);
  });
}

function saveSectionModal() {
  const name = document.getElementById('sectionNameInput').value.trim();
  if (!name) { shakeEl(document.getElementById('sectionNameInput')); return; }

  const sec = {
    id:         Date.now().toString(),
    title:      name,
    icon:       selectedIcon,
    color:      selectedColor.hex,
    colorLight: selectedColor.lt,
  };
  state.sections.push(sec);
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
  const body  = document.getElementById('feedBody');
  body.innerHTML = '';

  // top new post button
  const topBtn = document.createElement('button');
  topBtn.className = 'new-post-top-btn';
  topBtn.innerHTML = `<span>✏️</span> Write a new note…`;
  topBtn.addEventListener('click', () => openPostPanel(null));
  body.appendChild(topBtn);

  // posts for this section
  const posts = state.posts
    .filter(p => p.sectionId === currentSectionId)
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return  1;
      return new Date(b.date) - new Date(a.date);
    });

  if (posts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'feed-empty';
    empty.innerHTML = `<div class="empty-icon">📭</div><p>No notes yet.<br>Tap the button above to get started.</p>`;
    body.appendChild(empty);
    return;
  }

  posts.forEach(post => body.appendChild(buildPostCard(post)));
}

/* ══════════════════════════════════════════
   BUILD POST CARD
══════════════════════════════════════════ */
function buildPostCard(post) {
  const sec  = state.sections.find(s => s.id === post.sectionId) || {};
  const card = document.createElement('div');
  card.className = 'post-card' + (post.pinned ? ' is-pinned' : '');
  card.id = 'post-' + post.id;
  if (post.pinned) {
    card.style.setProperty('--c', sec.color || '#1a56db');
  }

  // label bar
  const bar = document.createElement('div');
  bar.className = 'post-label-bar';
  bar.style.background = sec.colorLight || '#eff4ff';
  bar.style.color       = sec.color      || '#1a56db';
  bar.innerHTML = `
    <span class="post-label-name">${sec.icon || '📝'} ${escHtml(post.label || sec.title || '')}</span>
    <button class="post-pin-btn ${post.pinned ? 'on' : 'off'}" title="${post.pinned ? 'Unpin' : 'Pin'}">📌</button>
  `;
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

  // extra data
  if (post.extraData && Object.keys(post.extraData).some(k => post.extraData[k])) {
    const extra = document.createElement('div');
    extra.className = 'post-extra';
    Object.entries(post.extraData).forEach(([k, v]) => {
      if (!v) return;
      const item = document.createElement('div');
      item.className = 'extra-item';
      item.innerHTML = `<strong>${escHtml(k)}</strong><span>${escHtml(v)}</span>`;
      extra.appendChild(item);
    });
    body.appendChild(extra);
  }

  if (post.image) {
    const img = document.createElement('img');
    img.className = 'post-img';
    img.src = post.image;
    img.alt = 'note image';
    body.appendChild(img);
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
    </div>
  `;
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
  _editExtra    = {};

  // populate label dropdown
  populateLabelSelect();

  if (postId) {
    const post = state.posts.find(p => p.id === postId);
    document.getElementById('panelTitle').textContent   = 'Edit Post';
    document.getElementById('postLabel').value          = post.label || '';
    document.getElementById('postTitle').value          = post.title || '';
    document.getElementById('postContent').value        = post.content || '';
    _editExtra = { ...(post.extraData || {}) };

    if (post.image) {
      showImagePreview(post.image);
    } else {
      hideImagePreview();
    }
  } else {
    document.getElementById('panelTitle').textContent = 'New Post';
    document.getElementById('postTitle').value        = '';
    document.getElementById('postContent').value      = '';
    hideImagePreview();
  }

  updateSmartTools();
  document.getElementById('postPanel').classList.add('open');
}

function closePostPanel() {
  document.getElementById('postPanel').classList.remove('open');
  editingPostId = null;
  _editExtra    = {};
}

function savePost() {
  const label   = document.getElementById('postLabel').value;
  const title   = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  const imgEl   = document.getElementById('imgPreview');
  const hasImg  = imgEl.style.display !== 'none' && imgEl.src && imgEl.src !== window.location.href;
  const extra   = collectExtraData(label);

  if (editingPostId) {
    const idx = state.posts.findIndex(p => p.id === editingPostId);
    if (idx > -1) {
      state.posts[idx] = {
        ...state.posts[idx],
        label, title, content, extraData: extra,
        image: hasImg ? imgEl.src : null,
      };
    }
  } else {
    state.posts.push({
      id:         Date.now().toString(),
      sectionId:  currentSectionId,
      label, title, content,
      extraData:  extra,
      image:      hasImg ? imgEl.src : null,
      pinned:     false,
      date:       new Date().toISOString().split('T')[0],
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
  sel.innerHTML = '';
  state.customLabels.forEach(lbl => {
    const opt = document.createElement('option');
    opt.value = lbl;
    opt.textContent = lbl;
    sel.appendChild(opt);
  });
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
  updateSmartTools();
}

/* ══════════════════════════════════════════
   SMART TOOLS
══════════════════════════════════════════ */
function updateSmartTools() {
  const label   = document.getElementById('postLabel').value;
  const config  = SMART_CONFIGS[label];
  const container = document.getElementById('smartTools');

  if (!config) {
    container.innerHTML = `<div class="smart-header">📝 General — write freely in the content field above.</div>`;
    return;
  }

  let html = `<div class="smart-header">${config.emoji} Smart Tools — ${config.desc}</div>`;
  config.fields.forEach(f => {
    const val = _editExtra[f.key] || '';
    html += `
      <div class="form-group">
        <label class="form-label">${f.key}</label>
        <input type="${f.type || 'text'}" class="form-input smart-field"
               data-key="${escAttr(f.key)}"
               placeholder="${escAttr(f.placeholder)}"
               value="${escAttr(val)}">
      </div>`;
  });
  html += `<button class="smart-generate-btn" id="autoGenBtn">✨ Auto-Generate Content</button>`;
  container.innerHTML = html;

  document.getElementById('autoGenBtn').addEventListener('click', autoGenerate);
}

function collectExtraData(label) {
  const config = SMART_CONFIGS[label];
  if (!config) return {};
  const data = {};
  document.querySelectorAll('.smart-field').forEach(el => {
    data[el.dataset.key] = el.value.trim();
  });
  return data;
}

function autoGenerate() {
  const label  = document.getElementById('postLabel').value;
  const config = SMART_CONFIGS[label];
  if (!config) return;
  const data = {};
  document.querySelectorAll('.smart-field').forEach(el => {
    data[el.dataset.key] = el.value.trim();
  });
  const generated = config.generate(data);
  const ta = document.getElementById('postContent');
  ta.value = generated;
  ta.style.borderColor = 'var(--accent)';
  setTimeout(() => { ta.style.borderColor = ''; }, 1400);
}

/* ══════════════════════════════════════════
   PIN / DELETE
══════════════════════════════════════════ */
function togglePin(postId) {
  const idx = state.posts.findIndex(p => p.id === postId);
  if (idx > -1) {
    state.posts[idx].pinned = !state.posts[idx].pinned;
    saveState();
    renderFeed();
  }
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
      ? `This will also delete ${count} note${count > 1 ? 's' : ''} inside it. Cannot be undone.`
      : 'This section is empty. Cannot be undone.';
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

  if (pendingDeleteType === 'section') {
    renderDashboard();
  } else {
    renderFeed();
    renderDashboard();
  }

  pendingDeleteId   = null;
  pendingDeleteType = null;
}

/* ══════════════════════════════════════════
   IMAGE
══════════════════════════════════════════ */
function showImagePreview(src) {
  const img     = document.getElementById('imgPreview');
  const remBtn  = document.getElementById('imgRemoveBtn');
  const zone    = document.getElementById('imgUploadZone');
  img.src             = src;
  img.style.display   = 'block';
  remBtn.style.display = 'block';
  zone.style.display  = 'none';
}

function hideImagePreview() {
  const img    = document.getElementById('imgPreview');
  const remBtn = document.getElementById('imgRemoveBtn');
  const zone   = document.getElementById('imgUploadZone');
  img.src              = '';
  img.style.display    = 'none';
  remBtn.style.display = 'none';
  zone.style.display   = '';
  document.getElementById('imgInput').value = '';
}

/* ══════════════════════════════════════════
   MODALS
══════════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function closeModalOnOverlay(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderHighlights(html) {
  return html.replace(/\*\*(.*?)\*\*/g, '<mark>$1</mark>');
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function shakeEl(el) {
  el.style.animation = 'none';
  el.style.borderColor = 'var(--danger)';
  setTimeout(() => { el.style.borderColor = ''; }, 1200);
}

/* ══════════════════════════════════════════
   EVENT WIRING
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderDashboard();

  // Dashboard — add section
  document.getElementById('addSectionBtn').addEventListener('click', openSectionModal);

  // Section modal
  document.getElementById('sectionSave').addEventListener('click', saveSectionModal);
  document.getElementById('sectionCancel').addEventListener('click', () => closeModal('sectionModal'));
  document.getElementById('sectionModal').addEventListener('click', e => closeModalOnOverlay(e, 'sectionModal'));
  document.getElementById('sectionNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveSectionModal(); });

  // Feed back
  document.getElementById('feedBackBtn').addEventListener('click', () => {
    document.getElementById('fab').classList.remove('visible');
    showScreen('dashboard');
    renderDashboard();
  });

  // FAB
  document.getElementById('fab').addEventListener('click', () => openPostPanel(null));

  // Post panel
  document.getElementById('panelCloseBtn').addEventListener('click', closePostPanel);
  document.getElementById('panelSaveBtn').addEventListener('click', savePost);

  document.getElementById('postLabel').addEventListener('change', () => {
    _editExtra = {};
    updateSmartTools();
  });

  // Add label
  document.getElementById('addLabelBtn').addEventListener('click', openAddLabelModal);
  document.getElementById('addLabelSave').addEventListener('click', saveCustomLabel);
  document.getElementById('addLabelCancel').addEventListener('click', () => closeModal('addLabelModal'));
  document.getElementById('addLabelModal').addEventListener('click', e => closeModalOnOverlay(e, 'addLabelModal'));
  document.getElementById('newLabelInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveCustomLabel(); });

  // Image upload
  document.getElementById('imgUploadZone').addEventListener('click', () => document.getElementById('imgInput').click());
  document.getElementById('imgInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => showImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  });
  document.getElementById('imgRemoveBtn').addEventListener('click', hideImagePreview);

  // Delete modal
  document.getElementById('deleteConfirm').addEventListener('click', doDelete);
  document.getElementById('deleteCancel').addEventListener('click', () => closeModal('deleteModal'));
  document.getElementById('deleteModal').addEventListener('click', e => closeModalOnOverlay(e, 'deleteModal'));
});
