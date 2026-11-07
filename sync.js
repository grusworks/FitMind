// Синхронизация состояния «Ритма» между устройствами через Supabase.
// Одна запись на аккаунт, версия растёт на 1 при каждой отправке. Расхождение никогда не затирается молча.
window.RHYTHM_SYNC = (() => {
  const META_KEY = 'rhythm-sync-meta-v1';
  const TABLE = 'ritm_state';
  const OFFLINE = 'Нет связи с облаком. Данные сохранены на этом устройстве, отправлю позже.';
  function create(deps) {
    const { getClient, storage, getState, applyRemote, isPristine, summarize, onChange, delay = 2000 } = deps;
    let client = null, session = null, busy = false, again = false, timer = null, conflict = null, seq = 0;
    const st = { phase: 'off', email: '', message: '', lastSync: null };
    const loadMeta = () => { try { return JSON.parse(storage.getItem(META_KEY)) || {}; } catch (error) { return {}; } };
    const saveMeta = meta => { try { storage.setItem(META_KEY, JSON.stringify(meta)); } catch (error) { /* без хранилища работаем в памяти сессии */ } };
    const emit = () => { if (onChange) onChange(); };

    async function init() {
      client = await getClient();
      if (!client) { st.phase = 'off'; st.message = 'Не удалось загрузить библиотеку синхронизации.'; emit(); return; }
      try {
        const { data } = await client.auth.getSession();
        session = data?.session || null;
        client.auth.onAuthStateChange((event, next) => { session = next; });
      } catch (error) { session = null; }
      st.phase = session ? 'idle' : 'signedout';
      st.email = session?.user?.email || '';
      emit();
      if (session) await syncNow();
    }
    function markDirty() {
      seq += 1;
      const meta = loadMeta(); meta.dirty = true; saveMeta(meta);
      if (!session) return;
      clearTimeout(timer);
      timer = setTimeout(() => { syncNow(); }, delay);
    }
    function finish(patch, mySeq) {
      saveMeta({ ...loadMeta(), ...patch, dirty: seq !== mySeq });
      st.phase = 'idle'; st.message = ''; st.lastSync = new Date().toISOString();
    }
    function takeRemote(remote, mySeq) {
      if (!applyRemote(remote.data)) {
        st.phase = 'error'; st.message = 'Данные в облаке не подходят для этой версии приложения. Обнови страницу и попробуй снова.';
        return;
      }
      finish({ version: remote.version }, mySeq);
    }
    async function push(local, version, mySeq, attempt) {
      const { data, error } = await client.from('ritm_state').update({ data: local, version: version + 1 }).eq('version', version).select('version');
      if (error) throw error;
      if (!data || !data.length) { if (attempt < 3) return runOnce(attempt + 1); throw new Error('race'); }
      finish({ version: version + 1 }, mySeq);
    }
    async function runOnce(attempt = 0) {
      const mySeq = seq;
      let meta = loadMeta();
      if (meta.userId !== session.user.id) { meta = { ...meta, userId: session.user.id, version: null }; saveMeta(meta); }
      const { data: remote, error } = await client.from(TABLE).select('data,version').maybeSingle();
      if (error) throw error;
      if (seq !== mySeq && attempt < 3) return runOnce(attempt + 1);
      const local = getState();
      const dirty = !!meta.dirty;
      const known = meta.version !== null && meta.version !== undefined;
      if (!remote) {
        if (isPristine(local) && !dirty) { finish({}, mySeq); return; }
        const { error: insertError } = await client.from(TABLE).insert({ data: local, version: 1 });
        if (insertError) { if (insertError.code === '23505' && attempt < 3) return runOnce(attempt + 1); throw insertError; }
        finish({ version: 1 }, mySeq); return;
      }
      if (known && meta.version === remote.version) {
        if (!dirty) { finish({}, mySeq); return; }
        return push(local, remote.version, mySeq, attempt);
      }
      if (!dirty && (known || isPristine(local))) { takeRemote(remote, mySeq); return; }
      conflict = { remote, local };
      st.phase = 'conflict'; st.message = 'Данные на этом устройстве и в облаке разошлись. Выбери, какие оставить.';
    }
    async function syncNow() {
      if (!client || !session) return;
      if (busy) { again = true; return; }
      if (conflict) return;
      busy = true; st.phase = 'syncing'; st.message = ''; emit();
      try { await runOnce(); } catch (error) { st.phase = 'error'; st.message = OFFLINE; }
      busy = false;
      if (again) { again = false; return syncNow(); }
      emit();
    }
    async function resolve(choice) {
      if (!conflict || busy) return;
      const picked = conflict; conflict = null;
      busy = true; st.phase = 'syncing'; emit();
      const mySeq = seq;
      try {
        if (choice === 'cloud') takeRemote(picked.remote, mySeq);
        else await push(getState(), picked.remote.version, mySeq, 0);
      } catch (error) { st.phase = 'error'; st.message = OFFLINE; }
      busy = false; emit();
    }
    async function signIn(email, password) {
      const value = String(email || '').trim();
      if (!/^\S+@\S+\.\S+$/.test(value) || !password) { st.email = value; st.message = 'Введи почту и пароль.'; emit(); return; }
      st.email = value; st.message = 'Вхожу…'; emit();
      try {
        const { data, error } = await client.auth.signInWithPassword({ email: value, password: String(password) });
        if (error || !data?.session) { st.message = 'Неверная почта или пароль.'; emit(); return; }
        session = data.session; st.phase = 'idle'; st.message = '';
        emit();
        await syncNow();
      } catch (error) { st.message = OFFLINE; emit(); }
    }
    async function signOut() {
      try { await client.auth.signOut(); } catch (error) { /* всё равно выходим локально */ }
      session = null; conflict = null; st.phase = 'signedout'; st.message = ''; emit();
    }
    function status() {
      return { ...st, signedIn: !!session, dirty: !!loadMeta().dirty, conflict: conflict ? { local: summarize(conflict.local), remote: summarize(conflict.remote.data) } : null };
    }
    return { init, markDirty, syncNow, resolve, signIn, signOut, status };
  }
  return { create, META_KEY };
})();
