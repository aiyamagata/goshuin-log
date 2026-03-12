// =============================================
// GOSHUIN LOG — Supabase Client
// =============================================

const SUPABASE_URL     = 'https://qfhumuzbtjpjolunzafu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmaHVtdXpidGpwam9sdW56YWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTUyNDUsImV4cCI6MjA4ODgzMTI0NX0.QsvnOqOvyO0fi_oZ5tbYU-aIhD4SikXhnDcKAaGfxWg';

const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth ─────────────────────────────────────

async function authSignUp(email, password) {
  const { data, error } = await sbClient.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function authSignIn(email, password) {
  const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function authSignOut() {
  const { error } = await sbClient.auth.signOut();
  if (error) throw error;
}

async function authGetUser() {
  const { data: { user } } = await sbClient.auth.getUser();
  return user;
}

function authOnChange(callback) {
  return sbClient.auth.onAuthStateChange(callback);
}

// ── DB mapping ───────────────────────────────

function toRow(r) {
  const row = {};
  if (r.id        !== undefined) row.id         = r.id;
  if (r.userId    !== undefined) row.user_id    = r.userId;
  if (r.name      !== undefined) row.name       = r.name;
  if (r.date      !== undefined) row.date       = r.date;
  if (r.type      !== undefined) row.type       = r.type;
  if (r.memo      !== undefined) row.memo       = r.memo;
  if (r.imageData !== undefined) row.image_data = r.imageData;
  if (r.lat       !== undefined) row.lat        = r.lat;
  if (r.lng       !== undefined) row.lng        = r.lng;
  if (r.weather   !== undefined) row.weather    = r.weather;
  if (r.createdAt !== undefined) row.created_at = r.createdAt;
  if (r.updatedAt !== undefined) row.updated_at = r.updatedAt;
  return row;
}

function fromRow(row) {
  return {
    id:        row.id,
    name:      row.name       || '',
    date:      row.date       || '',
    type:      row.type       || '御朱印',
    memo:      row.memo       || '',
    imageData: row.image_data || null,
    lat:       row.lat        != null ? row.lat : null,
    lng:       row.lng        != null ? row.lng : null,
    weather:   row.weather    || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
  };
}

// ── DB operations ────────────────────────────

async function dbFetchRecords() {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('接続タイムアウト（15秒）')), 15000)
  );
  const query = sbClient
    .from('records')
    .select('id, name, date, type, memo, image_data, lat, lng, weather, created_at, updated_at')
    .order('created_at', { ascending: false })
    .then(res => res);   // materialise into a real Promise

  const { data, error } = await Promise.race([query, timeout]);
  if (error) throw error;
  return (data || []).map(fromRow);
}

async function dbInsertRecord(record) {
  const user = await authGetUser();
  const row  = toRow({ ...record, userId: user.id });
  const { data, error } = await sbClient
    .from('records')
    .insert([row])
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

async function dbUpdateRecord(id, changes) {
  const row = toRow(changes);
  row.updated_at = Date.now();
  delete row.id;
  delete row.user_id;
  delete row.created_at;

  const { data, error } = await sbClient
    .from('records')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

async function dbDeleteRecord(id) {
  const { error } = await sbClient
    .from('records')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
