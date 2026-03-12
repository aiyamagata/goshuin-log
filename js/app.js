// =============================================
// GOSHUIN LOG — Main Application
// =============================================

// ── State ───────────────────────────────────
let records          = [];
let editingId        = null;
let deletingId       = null;
let leafletMap       = null;
let mapMarkers       = [];
let pendingImageData = null;

// ── Boot ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  applyTranslations();

  // Auth state listener — fires immediately with current session
  authOnChange(async (event, session) => {
    if (session) {
      showApp(session.user);
      // Fetch only on initial load or sign-in, not on every token refresh
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        await loadRecords(session.user.id);
      }
    } else {
      showAuthScreen();
    }
  });
});

let _fetchSeq = 0;

// ── Cache helpers ─────────────────────────────
function _cacheKey(userId) {
  return 'goshuin_records_' + userId;
}

function _loadCache(userId) {
  try {
    const raw = localStorage.getItem(_cacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _saveCache(userId, data) {
  try {
    localStorage.setItem(_cacheKey(userId), JSON.stringify(data));
  } catch {
    // Quota exceeded — retry without imageData to save space
    try {
      const slim = data.map(r => ({ ...r, imageData: null }));
      localStorage.setItem(_cacheKey(userId), JSON.stringify(slim));
    } catch { /* give up */ }
  }
}

function _clearCache(userId) {
  try { localStorage.removeItem(_cacheKey(userId)); } catch { /* ignore */ }
}

async function loadRecords(userId) {
  const seq = ++_fetchSeq;

  // Stale-while-revalidate: show cached data instantly
  const cached = userId ? _loadCache(userId) : null;
  if (cached) {
    records = cached;
    hideLoadingState();
    renderList();
  } else {
    showLoadingState();
  }

  try {
    const result = await dbFetchRecords();
    if (seq !== _fetchSeq) return; // 新しい呼び出しが始まっていれば破棄
    records = result;
    if (userId) _saveCache(userId, result);
    hideLoadingState();
    renderList();
  } catch (e) {
    if (seq !== _fetchSeq) return;
    console.error('loadRecords failed:', e);
    if (!cached) {
      // キャッシュもなければエラー表示
      records = [];
      try { hideLoadingState(); } catch {}
      showErrorState(e?.message || t('loadError'));
    }
    // キャッシュがあれば黙って維持（バックグラウンド更新失敗は無視）
  }
}

// ── Auth UI ──────────────────────────────────
function showApp(user) {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appContent').classList.remove('hidden');
  document.getElementById('logoutBtn').classList.remove('hidden');
  document.getElementById('userEmail').textContent = user.email;
}

function showLoadingState() {
  const ids = ['loadingState', 'errorState', 'recordGrid', 'emptyState', 'noResultState'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'loadingState') el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

function hideLoadingState() {
  const l = document.getElementById('loadingState');
  const g = document.getElementById('recordGrid');
  if (l) l.classList.add('hidden');
  if (g) g.classList.remove('hidden');
}

function showErrorState(msg) {
  const msgEl  = document.getElementById('errorMsg');
  const errEl  = document.getElementById('errorState');
  const gridEl = document.getElementById('recordGrid');
  if (msgEl)  msgEl.textContent = msg || t('loadError');
  if (errEl)  errEl.classList.remove('hidden');
  if (gridEl) gridEl.classList.add('hidden');
}

function showAuthScreen() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('appContent').classList.add('hidden');
  document.getElementById('logoutBtn').classList.add('hidden');
  document.getElementById('userEmail').textContent = '';
  records = [];
}

// ── CRUD ─────────────────────────────────────
async function addRecord(data) {
  const record = { id: generateId(), createdAt: Date.now(), ...data };
  const saved  = await dbInsertRecord(record);
  records.unshift(saved);
}

async function updateRecord(id, data) {
  const updated = await dbUpdateRecord(id, data);
  const idx = records.findIndex(r => r.id === id);
  if (idx !== -1) records[idx] = { ...records[idx], ...updated };
}

async function deleteRecord(id) {
  await dbDeleteRecord(id);
  records = records.filter(r => r.id !== id);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── List Rendering ────────────────────────────
function getFilteredSorted() {
  const q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  let list = [...records];

  if (q) {
    list = list.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.memo || '').toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => {
    const da = a.date || '';
    const db = b.date || '';
    if (db !== da) return db.localeCompare(da);
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return list;
}

function renderList() {
  const list     = getFilteredSorted();
  const grid     = document.getElementById('recordGrid');
  const empty    = document.getElementById('emptyState');
  const noRes    = document.getElementById('noResultState');
  const count    = document.getElementById('recordCount');
  const hasQuery = (document.getElementById('searchInput').value || '').trim().length > 0;

  grid.innerHTML = '';
  count.textContent = t('recordCountFmt', { n: list.length });

  if (records.length === 0) {
    empty.classList.remove('hidden');
    noRes.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');

  if (list.length === 0 && hasQuery) {
    noRes.classList.remove('hidden');
    return;
  }
  noRes.classList.add('hidden');

  const lang = getLang();
  list.forEach(r => {
    grid.appendChild(buildCard(r, lang));
  });
}

function buildCard(r, lang) {
  const card = document.createElement('article');
  card.className = 'record-card';
  card.dataset.id = r.id;

  const imgSrc = r.imageData || r.imageUrl;
  if (imgSrc) {
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = imgSrc;
    img.alt = r.name;
    img.loading = 'lazy';
    img.onerror = () => img.remove();
    card.appendChild(img);
  }

  const body = document.createElement('div');
  body.className = 'card-body';

  const header = document.createElement('div');
  header.className = 'card-header';
  header.innerHTML = `
    <span class="card-name">${escHtml(r.name)}</span>
    <span class="card-type-badge">${escHtml(typeLabel(r.type || ''))}</span>
  `;
  body.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const dateEl = document.createElement('span');
  dateEl.className = 'card-date';
  dateEl.innerHTML = `📅 ${formatDate(r.date, lang)}`;
  meta.appendChild(dateEl);

  const weatherEl = document.createElement('span');
  weatherEl.className = 'card-weather';
  if (r.weather) {
    weatherEl.textContent = weatherText(r.weather, lang);
  } else if (r.lat && r.lng && r.date) {
    weatherEl.textContent = t('weatherLoading');
    weatherEl.classList.add('weather-loading');
    fetchWeather(r.lat, r.lng, r.date)
      .then(w => {
        r.weather = w;
        // Cache weather to DB (best-effort, no await)
        dbUpdateRecord(r.id, { weather: w }).catch(() => {});
        weatherEl.textContent = weatherText(w, lang);
        weatherEl.classList.remove('weather-loading');
      })
      .catch(() => {
        weatherEl.textContent = t('weatherUnavailable');
        weatherEl.classList.remove('weather-loading');
      });
  }
  if (weatherEl.textContent) meta.appendChild(weatherEl);

  body.appendChild(meta);

  if (r.memo) {
    const memo = document.createElement('p');
    memo.className = 'card-memo';
    memo.textContent = r.memo;
    body.appendChild(memo);
  }

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  actions.innerHTML = `
    <button class="btn-icon edit-btn">✏️ ${lang === 'en' ? 'Edit' : '編集'}</button>
    <button class="btn-icon delete delete-btn">🗑️ ${lang === 'en' ? 'Delete' : '削除'}</button>
  `;
  actions.querySelector('.edit-btn').addEventListener('click', () => openModal(r));
  actions.querySelector('.delete-btn').addEventListener('click', () => openDeleteModal(r.id));
  body.appendChild(actions);

  card.appendChild(body);
  return card;
}

// ── Map Rendering ─────────────────────────────
function renderMap() {
  const lang = getLang();
  const withCoords = records.filter(r => r.lat && r.lng);

  if (!leafletMap) {
    leafletMap = L.map('map').setView([36.5, 136.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(leafletMap);
  }

  mapMarkers.forEach(m => m.remove());
  mapMarkers = [];

  const mapList  = document.getElementById('mapList');
  const noCoords = document.getElementById('mapNoCoords');
  mapList.innerHTML = '';

  if (withCoords.length === 0) {
    noCoords.classList.remove('hidden');
    return;
  }
  noCoords.classList.add('hidden');

  const bounds = [];

  withCoords.forEach(r => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lng);

    const icon = L.divIcon({
      html: '<span style="font-size:28px;line-height:1;display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35))">📍</span>',
      className: '',
      iconSize: [28, 32],
      iconAnchor: [14, 32],
      popupAnchor: [0, -34],
    });

    const weatherStr = r.weather ? weatherText(r.weather, lang) : '';
    const popupHtml = `
      <div class="popup-title">${escHtml(r.name)}</div>
      <div class="popup-date">📅 ${formatDate(r.date, lang)}</div>
      ${weatherStr ? `<div class="popup-weather">${escHtml(weatherStr)}</div>` : ''}
    `;

    const marker = L.marker([lat, lng], { icon })
      .addTo(leafletMap)
      .bindPopup(popupHtml);
    mapMarkers.push(marker);
    bounds.push([lat, lng]);

    const item = document.createElement('div');
    item.className = 'map-list-item';
    item.innerHTML = `
      <div class="map-item-name">${escHtml(r.name)}</div>
      <div class="map-item-date">${formatDate(r.date, lang)}</div>
    `;
    item.addEventListener('click', () => {
      leafletMap.setView([lat, lng], 15, { animate: true });
      marker.openPopup();
    });
    mapList.appendChild(item);
  });

  if (bounds.length > 0) {
    leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }

  setTimeout(() => leafletMap.invalidateSize(), 100);
}

// ── Modal ─────────────────────────────────────
function openModal(record = null) {
  editingId = record ? record.id : null;
  const title = document.getElementById('modalTitle');
  title.setAttribute('data-i18n', record ? 'editRecord' : 'addRecord');
  title.textContent = t(record ? 'editRecord' : 'addRecord');

  resetForm();

  if (record) {
    document.getElementById('fieldName').value = record.name || '';
    document.getElementById('fieldDate').value = record.date || '';
    document.getElementById('fieldMemo').value = record.memo || '';
    document.getElementById('fieldLat').value  = record.lat  != null ? record.lat : '';
    document.getElementById('fieldLng').value  = record.lng  != null ? record.lng : '';

    const existingImg = record.imageData || record.imageUrl || null;
    if (existingImg) {
      pendingImageData = existingImg;
      showImagePreview(existingImg);
    }

    const sel   = document.getElementById('fieldType');
    const known = Array.from(sel.options).some(o => o.value === record.type);
    if (known && record.type !== '__custom__') {
      sel.value = record.type || '御朱印';
      document.getElementById('fieldTypeCustom').classList.add('hidden');
    } else {
      sel.value = '__custom__';
      document.getElementById('fieldTypeCustom').classList.remove('hidden');
      document.getElementById('fieldTypeCustom').value = record.type || '';
    }
  } else {
    document.getElementById('fieldDate').value = todayStr();
  }

  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('fieldName').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  editingId = null;
}

function resetForm() {
  document.getElementById('recordForm').reset();
  document.getElementById('fieldTypeCustom').classList.add('hidden');
  document.getElementById('geocodeStatus').classList.add('hidden');
  document.getElementById('weatherPreview').classList.add('hidden');
  pendingImageData = null;
  clearImagePreview();
}

// ── Delete Modal ──────────────────────────────
function openDeleteModal(id) {
  deletingId = id;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
  deletingId = null;
}

// ── Form Save ─────────────────────────────────
async function handleSave() {
  const name = document.getElementById('fieldName').value.trim();
  const date = document.getElementById('fieldDate').value.trim();

  if (!name) { showToast(t('validationName')); return; }
  if (!date) { showToast(t('validationDate')); return; }

  const typeSelect = document.getElementById('fieldType').value;
  const type = typeSelect === '__custom__'
    ? document.getElementById('fieldTypeCustom').value.trim() || 'その他'
    : typeSelect;

  const lat = parseFloat(document.getElementById('fieldLat').value) || null;
  const lng = parseFloat(document.getElementById('fieldLng').value) || null;

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = '…';

  let weather = null;
  if (editingId) {
    const existing = records.find(r => r.id === editingId);
    if (existing?.weather &&
        existing.lat === lat && existing.lng === lng &&
        existing.date === date) {
      weather = existing.weather;
    }
  }

  if (!weather && lat && lng && date) {
    try {
      weather = await fetchWeather(lat, lng, date);
    } catch {
      weather = null;
    }
  }

  const data = {
    name,
    date,
    type,
    memo:      document.getElementById('fieldMemo').value.trim(),
    imageData: pendingImageData || null,
    lat, lng,
    weather,
  };

  try {
    if (editingId) {
      await updateRecord(editingId, data);
    } else {
      await addRecord(data);
    }
    closeModal();
    renderList();
    showToast(t('saved'));
    if (!document.getElementById('mapView').classList.contains('hidden')) {
      renderMap();
    }
  } catch (e) {
    showToast(t('saveError'));
    console.error(e);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = t('save');
  }
}

// ── Tab Switching ─────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.view').forEach(v => {
    const isTarget = v.id === tab + 'View';
    v.classList.toggle('active', isTarget);
    v.classList.toggle('hidden', !isTarget);
  });

  if (tab === 'map') renderMap();
}

// ── i18n ──────────────────────────────────────
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t(key) !== key) el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = t(key);
  });

  const sel = document.getElementById('fieldType');
  const lang = getLang();
  const typeMap = {
    '御朱印': lang === 'en' ? 'Goshuin'          : '御朱印',
    '御城印': lang === 'en' ? 'Gojoin (Castle)'  : '御城印',
    '御首題': lang === 'en' ? 'Oshudai'          : '御首題',
    '絵馬':   lang === 'en' ? 'Ema'              : '絵馬',
    'その他': lang === 'en' ? 'Other'            : 'その他',
  };
  Array.from(sel.options).forEach(opt => {
    if (typeMap[opt.value]) opt.text = typeMap[opt.value];
  });

  document.getElementById('langToggle').textContent = t('langToggleLabel');
}

// ── Event Listeners ───────────────────────────
function setupEventListeners() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Retry button
  document.getElementById('retryBtn').addEventListener('click', async () => {
    const user = await authGetUser();
    loadRecords(user ? user.id : null);
  });

  // Add button
  document.getElementById('addBtn').addEventListener('click', () => openModal());

  // Modal close / cancel
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });

  // Save
  document.getElementById('saveBtn').addEventListener('click', handleSave);

  // Type custom toggle
  document.getElementById('fieldType').addEventListener('change', e => {
    const custom = document.getElementById('fieldTypeCustom');
    if (e.target.value === '__custom__') {
      custom.classList.remove('hidden');
      custom.focus();
    } else {
      custom.classList.add('hidden');
    }
  });

  // Image file input
  document.getElementById('fieldImage').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      pendingImageData = dataUrl;
      showImagePreview(dataUrl);
    } catch {
      showToast(t('imageReadError'));
    }
  });

  // Image remove
  document.getElementById('imageRemoveBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    pendingImageData = null;
    clearImagePreview();
    document.getElementById('fieldImage').value = '';
  });

  // Geocode
  document.getElementById('geocodeBtn').addEventListener('click', handleGeocode);

  // Delete modal
  document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
    if (!deletingId) return;
    const id = deletingId;
    closeDeleteModal();
    try {
      await deleteRecord(id);
      renderList();
      showToast(t('deleted'));
      if (!document.getElementById('mapView').classList.contains('hidden')) {
        renderMap();
      }
    } catch (e) {
      showToast(t('deleteError'));
      console.error(e);
    }
  });
  document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteModal').addEventListener('click', e => {
    if (e.target === document.getElementById('deleteModal')) closeDeleteModal();
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', renderList);

  // Lang toggle
  document.getElementById('langToggle').addEventListener('click', () => {
    setLang(getLang() === 'ja' ? 'en' : 'ja');
    applyTranslations();
    renderList();
    if (!document.getElementById('mapView').classList.contains('hidden')) {
      renderMap();
    }
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      const user = await authGetUser();
      if (user) _clearCache(user.id);
      await authSignOut();
    } catch (e) {
      console.error(e);
    }
  });

  // Auth form
  let authMode = 'login'; // 'login' | 'signup'

  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const btn      = document.getElementById('authSubmitBtn');
    const errEl    = document.getElementById('authError');

    btn.disabled = true;
    btn.textContent = '…';
    errEl.classList.add('hidden');

    try {
      if (authMode === 'signup') {
        const { user, session } = await authSignUp(email, password);
        if (!session) {
          // Email confirmation required
          errEl.classList.remove('hidden');
          errEl.classList.add('auth-info');
          errEl.textContent = t('authConfirmEmail');
        }
      } else {
        await authSignIn(email, password);
      }
    } catch (err) {
      errEl.classList.remove('hidden');
      errEl.classList.remove('auth-info');
      errEl.textContent = translateAuthError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = authMode === 'signup' ? t('authSignUp') : t('authLogin');
    }
  });

  document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    const btn   = document.getElementById('googleLoginBtn');
    const errEl = document.getElementById('authError');
    btn.disabled = true;
    errEl.classList.add('hidden');
    try {
      await authSignInWithGoogle();
      // ブラウザがGoogleのOAuth画面にリダイレクトされるため、以降の処理は不要
    } catch (err) {
      errEl.classList.remove('hidden');
      errEl.classList.remove('auth-info');
      errEl.textContent = translateAuthError(err.message);
      btn.disabled = false;
    }
  });

  document.getElementById('authToggleBtn').addEventListener('click', () => {
    authMode = authMode === 'login' ? 'signup' : 'login';
    const isSignup = authMode === 'signup';
    document.getElementById('authSubmitBtn').textContent  = isSignup ? t('authSignUp')    : t('authLogin');
    document.getElementById('authToggleText').textContent = isSignup ? t('authHaveAccount') : t('authNoAccount');
    document.getElementById('authToggleBtn').textContent  = isSignup ? t('authLoginLink')   : t('authSignUpLink');
    document.getElementById('authError').classList.add('hidden');
  });

  // Keyboard: Escape closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!document.getElementById('deleteModal').classList.contains('hidden')) closeDeleteModal();
      else if (!document.getElementById('modal').classList.contains('hidden')) closeModal();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      if (!document.getElementById('modal').classList.contains('hidden')) handleSave();
    }
  });
}

// ── Auth error messages ───────────────────────
function translateAuthError(msg) {
  if (!msg) return t('authErrorUnknown');
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return t('authErrorInvalid');
  if (m.includes('email not confirmed'))    return t('authErrorNotConfirmed');
  if (m.includes('user already registered')) return t('authErrorAlreadyExists');
  if (m.includes('password'))               return t('authErrorPassword');
  if (m.includes('rate limit'))             return t('authErrorRateLimit');
  return msg;
}

// ── Geocode Handler ───────────────────────────
async function handleGeocode() {
  const name    = document.getElementById('fieldName').value.trim();
  const weatherEl = document.getElementById('weatherPreview');

  if (!name) {
    setGeocodeStatus('error', t('geocodeNoName'));
    return;
  }

  setGeocodeStatus('loading', t('geocodeLoading'));

  try {
    const result = await geocode(name);
    document.getElementById('fieldLat').value = result.lat.toFixed(6);
    document.getElementById('fieldLng').value = result.lng.toFixed(6);
    setGeocodeStatus('success', `${t('geocodeSuccess')}: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);

    const date = document.getElementById('fieldDate').value;
    if (date) {
      weatherEl.classList.remove('hidden');
      weatherEl.textContent = t('weatherLoading');
      try {
        const w = await fetchWeather(result.lat, result.lng, date);
        weatherEl.textContent = `${t('weatherOn')}: ${weatherText(w, getLang())}`;
      } catch {
        weatherEl.classList.add('hidden');
      }
    }
  } catch {
    setGeocodeStatus('error', t('geocodeError'));
  }
}

function setGeocodeStatus(type, msg) {
  const el = document.getElementById('geocodeStatus');
  el.className = `geocode-status ${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ── Utilities ─────────────────────────────────
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr, lang) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (lang === 'en') {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ── Image Utilities ────────────────────────────
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const MAX_PX  = 1200;
    const QUALITY = 0.82;
    const reader  = new FileReader();

    reader.onerror = reject;
    reader.onload  = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload  = () => {
        let { width, height } = img;
        if (width > MAX_PX || height > MAX_PX) {
          if (width >= height) {
            height = Math.round(height * MAX_PX / width);
            width  = MAX_PX;
          } else {
            width  = Math.round(width * MAX_PX / height);
            height = MAX_PX;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', QUALITY));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function showImagePreview(src) {
  document.getElementById('imageUploadPlaceholder').classList.add('hidden');
  const preview = document.getElementById('imagePreview');
  preview.src   = src;
  preview.classList.remove('hidden');
  document.getElementById('imageRemoveBtn').classList.remove('hidden');
}

function clearImagePreview() {
  document.getElementById('imageUploadPlaceholder').classList.remove('hidden');
  const preview = document.getElementById('imagePreview');
  preview.src   = '';
  preview.classList.add('hidden');
  document.getElementById('imageRemoveBtn').classList.add('hidden');
}

function showToast(msg, duration = 2200) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add('hidden'), duration);
}
