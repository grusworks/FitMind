const skill = window.RHYTHM_SKILLS;
const asanas = window.RHYTHM_ASANAS;
const wardrobe = window.RHYTHM_WARDROBE;
const yoga = window.RHYTHM_YOGA;
const garmin = window.RHYTHM_GARMIN;
const decision = window.RHYTHM_DECISION;
const baseProgram = window.RHYTHM_PROGRAM;
const { PROGRAM_ID, videos } = baseProgram;
const cycle2 = window.RHYTHM_CYCLE2;
let { workouts, workoutById } = baseProgram;
function programFor(value) {
  if (value?.programId === PROGRAM_ID) return baseProgram;
  if (value?.programId === cycle2.ID && cycle2.validPlan(value.plan)) return cycle2.build(value.plan);
  return null;
}
function useProgram(value) { const program = programFor(value); if (program) ({ workouts, workoutById } = program); }
const { localDate, parseDate, addDays, nextMonday, isMonday, weekRange, programWeekForDate, dateForWorkout } = window.RHYTHM_SCHEDULE;

const STORAGE_KEY = 'rhythm-mvp-v1';
const app = document.querySelector('#app');
const dialog = document.querySelector('#action-dialog');
const importFile = document.querySelector('#import-file');
const garminFile = document.querySelector('#garmin-file');
const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const ratingLabels = { easy: 'Легко', normal: 'Нормально', hard: 'Тяжело' };
// Что есть дома. Значения по умолчанию взяты из условий программы (TRAINING_SYSTEM.md); отметки Саши хранятся в state.inventory.
const INVENTORY = [
  { id: 'mat', name: 'Коврик', def: true, use: 'пилатес, йога' },
  { id: 'band', name: 'Фитнес-резинка', def: true, use: 'силовая в пятницу (видео Alex Su)' },
  { id: 'loop', name: 'Длинная резинка-петля', def: false, use: 'блок «первое подтягивание» в пятницу' },
  { id: 'bottles', name: 'Две бутылки по 1,5 л', def: true, use: 'силовая в пятницу (вместо гантелей)' },
  { id: 'weights', name: 'Утяжелители по 0,75 кг', def: true, use: 'пока не используются программой' },
  { id: 'chair', name: 'Устойчивый стул', def: true, use: 'пока не используется программой' },
  { id: 'pillow', name: 'Подушка', def: true, use: 'йога: попытки вороны' },
  { id: 'bar', name: 'Турник', def: false, use: 'пока не используется: этапы с турником отложены' }
];
const inventoryIds = INVENTORY.map(item => item.id);
const NOTE_MAX = 500, MINUTES_MAX = 600;
const kindLabels = { pilates: 'Пилатес + подвижность', running: 'Лёгкий бег', strength: 'Силовая' };
const view = { dataOpen: [], page: 'today', selectedId: null, detailOrigin: 'today', detailScrollY: 0, historyScrollY: 0, calendarDate: localDate(), expandedWeeks: [], monthOffset: 0, message: '', skillEditingSet: null, asanaFilter: 'all', progressScrollY: 0, yogaError: '', gearTab: 'outfits', gearOrigin: 'data', gearVariant: null, weather: null };

function addDaysLocal(value, days) { return window.RHYTHM_SCHEDULE.addDays(value, days); }
function fmtDate(value, options = { day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat('ru-RU', options).format(parseDate(value));
}
function fullDate(value) { return fmtDate(value, { day: 'numeric', month: 'long', year: 'numeric' }); }
function weekdayDate(value) {
  const weekday = fmtDate(value, { weekday: 'long' });
  return `${weekday[0].toLocaleUpperCase('ru-RU')}${weekday.slice(1)}, ${fmtDate(value)}`;
}
function todayDate(value) { return `Сегодня · ${weekdays[parseDate(value).getDay()].toLocaleUpperCase('ru-RU')}, ${fmtDate(value)}`; }
function rangeDate(start, end) {
  return parseDate(start).getFullYear() === parseDate(end).getFullYear()
    ? `${fmtDate(start)} — ${fmtDate(end)}`
    : `${fullDate(start)} — ${fullDate(end)}`;
}
function fmtDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining ? `${minutes}:${String(remaining).padStart(2, '0')}` : `${minutes} мин`;
}
function fmtInterval(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining ? `${minutes} мин ${remaining} сек` : `${minutes} мин`;
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function uid() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function sessionsFor(program, startDate, cycleId) {
  return program.workouts.map(workout => ({
      scheduledSessionId: `${cycleId}:${workout.workoutId}`,
      workoutId: workout.workoutId,
      originalDate: dateForWorkout(startDate, workout),
      scheduledDate: dateForWorkout(startDate, workout),
      status: 'planned', variant: 'base'
  }));
}
function initialState(startDate = nextMonday()) {
  const cycleId = uid();
  return {
    schemaVersion: 1, anchorVersion: 2, scheduleVersion: 2, programId: PROGRAM_ID, cycleId, startDate,
    sessions: sessionsFor(baseProgram, startDate, cycleId),
    completions: [], measurements: []
  };
}
// Расписание v2: бег Пн и Чт, пилатес Вт, силовая Пт, йога Ср и Сб. Старые данные (бег Ср и Вс, пилатес Пн, йога Вт) переносим один раз.
const SCHEDULE_SHIFT = { 'run-long': -6, pilates: 1, 'run-short': 1, strength: 0 };
function migrateSchedule(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.scheduleVersion === 2 || !Array.isArray(value.sessions)) return value;
  const next = JSON.parse(JSON.stringify(value));
  const shiftFor = session => {
    const key = Object.keys(SCHEDULE_SHIFT).find(name => typeof session?.workoutId === 'string' && session.workoutId.endsWith(`-${name}`));
    return key === undefined ? null : SCHEDULE_SHIFT[key];
  };
  const unmovedIds = new Set();
  for (const session of next.sessions) {
    const shift = shiftFor(session);
    if (shift === null || !parseDate(session.originalDate) || !parseDate(session.scheduledDate)) return value;
    if (session.scheduledDate === session.originalDate) unmovedIds.add(session);
    session.originalDate = addDays(session.originalDate, shift);
    if (unmovedIds.has(session)) session.scheduledDate = session.originalDate;
  }
  // Перенесённое вручную занятие не должно оказаться в один день с другим: сдвигаем его вперёд.
  const taken = new Set(next.sessions.filter(session => unmovedIds.has(session) && session.status !== 'skipped').map(session => session.scheduledDate));
  for (const session of next.sessions) {
    if (unmovedIds.has(session) || session.status === 'skipped') continue;
    while (taken.has(session.scheduledDate)) session.scheduledDate = addDays(session.scheduledDate, 1);
    taken.add(session.scheduledDate);
  }
  if (next.yoga && typeof next.yoga === 'object' && !Array.isArray(next.yoga)) {
    next.yoga = Object.fromEntries(Object.entries(next.yoga).map(([date, mark]) => [parseDate(date)?.getDay() === 2 ? addDays(date, 1) : date, mark]));
  }
  next.scheduleVersion = 2;
  return next;
}
function validState(value) {
  const program = programFor(value);
  if (!program || value.schemaVersion !== 1 ||
      (value.programId === cycle2.ID && !(Number.isInteger(value.cycleNumber) && value.cycleNumber >= 2 && value.cycleNumber <= 99)) ||
      (value.previous !== undefined && !(value.previous && typeof value.previous === 'object' && !Array.isArray(value.previous) && Array.isArray(value.previous.sessions) && value.previous.sessions.length <= 64 && Array.isArray(value.previous.completions) && value.previous.completions.length <= 64)) ||
      typeof value.cycleId !== 'string' || !isMonday(value.startDate) ||
      !Array.isArray(value.sessions) || !Array.isArray(value.completions) || !Array.isArray(value.measurements)) return false;
  const ids = new Set();
  const templateIds = new Set();
  const occupiedDates = new Set();
  for (const session of value.sessions) {
    if (!session || typeof session.scheduledSessionId !== 'string' || ids.has(session.scheduledSessionId) ||
        !program.workoutById[session.workoutId] || templateIds.has(session.workoutId) ||
        session.originalDate !== dateForWorkout(value.startDate, program.workoutById[session.workoutId]) || !parseDate(session.scheduledDate) ||
        !['planned', 'completed', 'skipped'].includes(session.status) ||
        !['base', 'replacement'].includes(session.variant) ||
        (session.variant === 'replacement' && !program.workoutById[session.workoutId].replacement)) return false;
    ids.add(session.scheduledSessionId);
    templateIds.add(session.workoutId);
    if (session.status !== 'skipped') {
      if (occupiedDates.has(session.scheduledDate)) return false;
      occupiedDates.add(session.scheduledDate);
    }
  }
  if (value.sessions.length !== program.workouts.length) return false;
  const completionSessionIds = new Set();
  const completionIds = new Set();
  for (const completion of value.completions) {
    if (!completion || typeof completion.completionId !== 'string' || !ids.has(completion.scheduledSessionId) ||
        completionIds.has(completion.completionId) || completionSessionIds.has(completion.scheduledSessionId) || !parseDate(completion.completedDate) ||
        !Object.keys(ratingLabels).includes(completion.rating) ||
        (completion.body !== undefined && !Object.keys(decision.bodyLabels).includes(completion.body)) ||
        (completion.note !== undefined && !(typeof completion.note === 'string' && completion.note.length <= NOTE_MAX)) ||
        (completion.alt !== undefined && completion.alt !== true) ||
        (completion.minutes !== undefined && !(Number.isInteger(completion.minutes) && completion.minutes >= 1 && completion.minutes <= MINUTES_MAX))) return false;
    completionIds.add(completion.completionId);
    completionSessionIds.add(completion.scheduledSessionId);
  }
  for (const session of value.sessions) {
    if ((session.status === 'completed') !== completionSessionIds.has(session.scheduledSessionId)) return false;
  }
  const measurementIds = new Set();
  for (const measurement of value.measurements) {
    if (!measurement || typeof measurement.measurementId !== 'string' || !parseDate(measurement.date)) return false;
    if (measurementIds.has(measurement.measurementId)) return false;
    measurementIds.add(measurement.measurementId);
    for (const field of ['weight', 'waist', 'hips', 'chest']) {
      if (measurement[field] !== null && measurement[field] !== undefined &&
          (typeof measurement[field] !== 'number' || !Number.isFinite(measurement[field]) || measurement[field] <= 0 || measurement[field] > 500)) return false;
    }
  }
  if (value.inventory !== undefined && !(value.inventory && typeof value.inventory === 'object' && !Array.isArray(value.inventory) &&
      Object.entries(value.inventory).every(([key, flag]) => inventoryIds.includes(key) && typeof flag === 'boolean'))) return false;
  if (value.extras !== undefined) {
    if (!Array.isArray(value.extras) || value.extras.length > 300) return false;
    const extraIds = new Set();
    for (const extra of value.extras) {
      if (!extra || typeof extra.extraId !== 'string' || extraIds.has(extra.extraId) || !parseDate(extra.date) ||
          typeof extra.title !== 'string' || !extra.title.trim() || extra.title.length > 80 ||
          !(extra.minutes === null || (Number.isInteger(extra.minutes) && extra.minutes >= 1 && extra.minutes <= MINUTES_MAX)) ||
          !Object.keys(ratingLabels).includes(extra.rating) ||
          (extra.note !== undefined && !(typeof extra.note === 'string' && extra.note.length <= NOTE_MAX))) return false;
      extraIds.add(extra.extraId);
    }
  }
  return skill.valid(value, program.workoutById) && asanas.valid(value) && yoga.valid(value) && garmin.valid(value) && wardrobe.valid(value);
}
function isPristineLegacyCycle(value) {
  return value.anchorVersion === undefined && value.completions.length === 0 && value.measurements.length === 0 &&
    value.sessions.every(session => session.status === 'planned' && session.variant === 'base' && session.scheduledDate === session.originalDate);
}
let migratedPristineCycle = false;
let migratedSchedule = false;
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const stored = JSON.parse(raw);
    const parsed = migrateSchedule(stored);
    if (parsed !== stored) migratedSchedule = true;
    if (!validState(parsed)) throw new Error('Данные не соответствуют текущей программе.');
    // Старая версия молча запускала цикл с понедельника уже начавшейся недели.
    // Только совершенно пустой такой цикл можно безопасно выровнять на ближайший понедельник.
    if (isPristineLegacyCycle(parsed) && parsed.startDate < nextMonday()) {
      migratedPristineCycle = true;
      return initialState();
    }
    return parsed;
  } catch (error) {
    view.message = 'Не удалось открыть сохранённые данные. Пока показана новая программа; прежние данные не удалены.';
    return initialState();
  }
}
let state = loadState();
useProgram(state);
skill.sync(state, workoutById);
let storageReady = !view.message;
view.expandedWeeks = [programWeekForDate(state.startDate, localDate()) || (localDate() < state.startDate ? 1 : 4)];
let sync = null;
function save(options = {}) {
  skill.sync(state, workoutById);
  if (!options.fromSync && sync) sync.markDirty();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageReady = true;
  } catch (error) {
    view.message = 'Не удалось сохранить изменения. Скачай данные, чтобы не потерять записи.';
  }
  render();
}
function findSession(id) { return state.sessions.find(session => session.scheduledSessionId === id); }
function sortedSessions() { return [...state.sessions].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.originalDate.localeCompare(b.originalDate)); }
function selectedVideos(session, workout) { return (session.variant === 'replacement' ? workout.replacement.videoIds : workout.videoIds) || []; }
function selectedDuration(session, workout) {
  return selectedVideos(session, workout).length
    ? selectedVideos(session, workout).reduce((total, id) => total + videos[id].durationSeconds, 0)
    : workout.durationSeconds;
}
function statusLabel(status) { return ({ planned: 'По плану', completed: 'Выполнено', skipped: 'Пропущено' })[status]; }
function badge(status) { return `<span class="badge badge-${status}">${statusLabel(status)}</span>`; }
function card(session, compact = false) {
  const workout = workoutById[session.workoutId];
  return `<button type="button" class="session-card ${compact ? 'compact' : ''} ${session.status}" data-open="${escapeHtml(session.scheduledSessionId)}">
    <span class="card-line"><span class="eyebrow">${weekdayDate(session.scheduledDate)}</span>${session.status === 'planned' ? '' : badge(session.status)}</span>
    <strong>${escapeHtml(workout.title)}</strong>
    <span class="card-meta">${escapeHtml(kindLabels[workout.kind])} · ${fmtDuration(selectedDuration(session, workout))}${session.variant === 'replacement' ? ' · замена' : ''}</span>
  </button>`;
}
function header(title, kicker, copy = '') {
  return `<section class="page-heading"><p class="kicker">${escapeHtml(kicker)}</p><h1>${escapeHtml(title)}</h1>${copy ? `<p>${escapeHtml(copy)}</p>` : ''}</section>`;
}
function displayTitle(workout) {
  if (workout.kind === 'pilates') return 'Верх тела и подвижность';
  if (workout.kind === 'running') return workout.weekday === 4 ? 'Лёгкий бег · короткий' : 'Лёгкий бег · выносливость';
  return workout.title;
}
function todayWorkout(session) {
  const workout = workoutById[session.workoutId];
  return `<section class="today-workout">
    <span class="today-direction">${escapeHtml(workout.direction)}</span>
    <h2>${escapeHtml(displayTitle(workout))}</h2>
    <p class="today-duration">${fmtDuration(selectedDuration(session, workout))}</p>
    <p class="today-goal">${escapeHtml(workout.goal)}</p>
    ${workout.run ? `<p class="today-brief">${fmtInterval(workout.run.warmupSeconds)} ходьбы · ${fmtInterval(workout.run.runSeconds)} непрерывного лёгкого бега · ${fmtInterval(workout.run.cooldownSeconds)} ходьбы.</p>` : ''}
    <button type="button" class="primary-btn" data-open="${escapeHtml(session.scheduledSessionId)}">Открыть тренировку</button>
    ${session.status === 'planned' ? `<div class="quick-actions"><button type="button" data-quick-complete="${escapeHtml(session.scheduledSessionId)}">✓ Отметить</button><button type="button" data-quick-skip="${escapeHtml(session.scheduledSessionId)}">Пропустить</button></div>` : sessionStatus(session)}
  </section>`;
}
function sessionStatus(session) {
  if (session.status === 'planned') return '';
  if (session.status === 'skipped') return '<span class="inline-status skipped-status">Пропущено</span>';
  const completion = state.completions.find(item => item.scheduledSessionId === session.scheduledSessionId);
  return `<span class="inline-status completed-status">✓ Выполнено${completion ? ` · ${ratingLabels[completion.rating]}` : ''}</span>`;
}
function weekItem(session, quickActions = false) {
  const workout = workoutById[session.workoutId];
  const dateLabel = weekdayDate(session.scheduledDate);
  const shortTitle = displayTitle(workout);
  return `<div class="week-item ${session.scheduledDate === localDate() ? 'is-today' : ''}">
    <button type="button" class="week-item-main" data-open="${escapeHtml(session.scheduledSessionId)}" aria-label="Открыть ${escapeHtml(shortTitle)}, ${dateLabel}">
      <span class="week-date">${dateLabel}</span>
      <span class="week-kind">${escapeHtml(workout.kind === 'running' ? 'Бег' : kindLabels[workout.kind])} · ${fmtDuration(selectedDuration(session, workout))}</span>
      <strong>${escapeHtml(shortTitle)}</strong>
      ${session.scheduledDate !== session.originalDate ? `<small>Перенесено с ${fmtDate(session.originalDate, { day: 'numeric', month: 'long' })}</small>` : ''}
    </button>
    ${session.status === 'planned' && quickActions ? `<div class="week-actions"><button type="button" data-quick-complete="${escapeHtml(session.scheduledSessionId)}">✓ Отметить</button><button type="button" data-quick-skip="${escapeHtml(session.scheduledSessionId)}">Пропустить</button></div>` : sessionStatus(session)}
  </div>`;
}
function sessionsForWeek(week) {
  return workouts.filter(workout => workout.week === week).map(workout => state.sessions.find(session => session.workoutId === workout.workoutId));
}
function scheduledSessionsInRange(monday, sunday) {
  return sortedSessions().filter(session => session.scheduledDate >= monday && session.scheduledDate <= sunday);
}
function garminMatches(today) {
  const used = new Set();
  const out = [];
  const sessions = sortedSessions().filter(s => s.status === 'planned' && workoutById[s.workoutId].kind === 'running' && s.scheduledDate <= today);
  const runs = state.runs || [];
  const diff = (a, b) => Math.abs(Math.round((parseDate(a) - parseDate(b)) / 86400000));
  for (const exact of [true, false]) {
    for (const session of sessions) {
      if (out.some(m => m.session === session)) continue;
      const run = runs.filter(r => !used.has(r.id) && (exact ? r.date === session.scheduledDate : diff(r.date, session.scheduledDate) === 1))
        .sort((a, b) => b.km - a.km)[0];
      if (run && run.date >= state.startDate) { used.add(run.id); out.push({ session, run }); }
    }
  }
  return out.sort((a, b) => a.session.scheduledDate.localeCompare(b.session.scheduledDate));
}
function garminMatchPanel(today) {
  const found = garminMatches(today);
  if (!found.length) return '';
  return `<section class="content-panel garmin-match"><h2>Нашла пробежки из Garmin</h2><p class="panel-intro">Похоже, ты уже бегала по плану. Выбери, как ощущалась нагрузка, и занятие отметится выполненным с датой пробежки. Если это другая пробежка, просто не нажимай.</p>
    ${found.map(({ session, run }) => `<div class="garmin-match-row"><span>${displayTitle(workoutById[session.workoutId])} · план ${fmtDate(session.scheduledDate)}<br><small>Garmin: ${fmtDate(run.date)} · ${String(run.km).replace('.', ',')} км · ${fmtClock(run.seconds)}${run.avgHr ? ` · пульс ${run.avgHr}` : ''}</small></span>
      <span class="rating-options">${Object.entries(ratingLabels).map(([value, label]) => `<button type="button" data-garmin-done="${session.scheduledSessionId}" data-garmin-run="${run.id}" data-garmin-rating="${value}">${label}</button>`).join('')}</span></div>`).join('')}</section>`;
}
function applyGarminMatch(sessionId, runId, rating) {
  const found = garminMatches(localDate()).find(m => m.session.scheduledSessionId === sessionId && m.run.id === runId);
  if (!found || !Object.keys(ratingLabels).includes(rating)) return;
  state.completions.push({ completionId: uid(), scheduledSessionId: sessionId, completedDate: found.run.date, rating });
  found.session.status = 'completed';
  view.message = `Отмечено: ${displayTitle(workoutById[found.session.workoutId])}, ${fmtDate(found.run.date)}.`;
  save();
}
function renderToday() {
  const today = localDate();
  const todays = sortedSessions().filter(session => session.scheduledDate === today);
  const currentWeek = programWeekForDate(state.startDate, today);
  const displayedWeek = currentWeek || (today < state.startDate ? 1 : 4);
  const range = weekRange(state.startDate, displayedWeek);
  const phase = currentWeek ? `Неделя ${currentWeek} из 4` : today < state.startDate ? 'Программа ещё не началась' : '4 недели завершены';
  const weekSessions = scheduledSessionsInRange(range.monday, range.sunday);
  return `<section class="page-heading home-heading"><h1>Главная</h1></section>
    <section class="hero-panel"><p>${phase} · ${rangeDate(range.monday, range.sunday)}</p></section>
    <h2 class="section-title">${todayDate(today)}</h2>
    ${garminMatchPanel(today)}
    ${bodyTodayCard(today)}
    ${yogaTodayCard(today)}
    ${todays.length ? todays.map(todayWorkout).join('') + gearTodayCard(today, todays) : `<section class="rest-today"><h3>Сегодня отдых</h3><p>${today < state.startDate ? 'Программа начнётся в понедельник.' : 'На сегодня тренировки нет.'}</p></section>`}
    ${gearAheadCard(today, todays)}
    <div class="section-heading"><h2>${currentWeek ? 'Эта неделя' : today < state.startDate ? 'Ближайшая неделя' : 'Последняя неделя программы'}</h2><span>${weekSessions.length === 4 ? '4 тренировки' : `${weekSessions.length} тренировок на этой неделе`}</span></div>
    <div class="week-list">${weekSessions.map(session => weekItem(session, true)).join('')}</div>`;
}
function loadWeather(today) {
  view.weather = { date: today, status: 'loading' };
  Promise.resolve().then(() => wardrobe.fetchForecast(today))
    .then(data => { view.weather = { date: today, status: 'ok', data }; })
    .catch(() => { view.weather = { date: today, status: 'error' }; })
    .then(() => { if (view.page === 'today' || view.page === 'detail') render(); });
}
function gearCard(date, today) {
  if (!view.weather || view.weather.date !== date) { view.gearVariant = null; loadWeather(date); }
  const ahead = date > today;
  const label = ahead ? `${weekdays[parseDate(date).getDay()]}, ${fmtDate(date)}` : '';
  return wardrobe.renderToday(state, view.weather, view.gearVariant, { label, ahead });
}
const isPlannedRun = session => session.status === 'planned' && workoutById[session.workoutId].kind === 'running';
function gearTodayCard(today, todays) {
  return todays.some(isPlannedRun) ? gearCard(today, today) : '';
}
// В день без бега показываем комплект на ближайшую пробежку (в пределах недели), чтобы успеть постирать и приготовить.
function gearAheadCard(today, todays) {
  if (todays.some(isPlannedRun)) return '';
  const limit = addDays(today, 7);
  const next = state.sessions.filter(session => isPlannedRun(session) && session.scheduledDate > today && session.scheduledDate <= limit)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  return next ? gearCard(next.scheduledDate, today) : '';
}
function gearDetailCard(session) {
  if (!isPlannedRun(session)) return '';
  const today = localDate();
  if (session.scheduledDate < today || session.scheduledDate > addDays(today, 7)) return '';
  return gearCard(session.scheduledDate, today);
}
function monthAnchor() {
  const date = parseDate(localDate());
  return new Date(date.getFullYear(), date.getMonth() + view.monthOffset, 1, 12);
}
function calendarUnmarked(session, today) {
  return session.status === 'planned' && session.scheduledDate < today;
}
function calendarPreview(today) {
  const sessions = sortedSessions().filter(session => session.scheduledDate === view.calendarDate);
  return `<aside class="calendar-preview" aria-live="polite" aria-label="Выбранный день">
    <h2>${weekdayDate(view.calendarDate)}</h2>
    ${sessions.length ? sessions.map(session => {
      const workout = workoutById[session.workoutId];
      return `<div class="calendar-preview-session">
        <p class="preview-type">${escapeHtml(kindLabels[workout.kind])} · ${fmtDuration(selectedDuration(session, workout))}</p>
        <h3>${escapeHtml(workout.title)}</h3>
        ${calendarUnmarked(session, today) ? '<span class="preview-unmarked">Не отмечено</span>' : session.status === 'planned' ? '' : sessionStatus(session)}
        ${session.scheduledDate !== session.originalDate ? `<p class="preview-moved">Перенесено с ${fmtDate(session.originalDate)}</p>` : ''}
        <button type="button" class="primary-btn" data-open="${escapeHtml(session.scheduledSessionId)}">Открыть тренировку</button>
      </div>`;
    }).join('') : '<p class="preview-rest">День отдыха</p>'}
  </aside>`;
}
function cycleOverview(today) {
  const weeks = [...new Set(workouts.map(workout => workout.week))].sort((a, b) => a - b);
  return `<section class="cycle-overview" aria-label="Обзор тренировочных недель"><h2>Тренировки по неделям</h2>${weeks.map(week => {
    const range = weekRange(state.startDate, week);
    const start = parseDate(range.monday), end = parseDate(range.sunday);
    const dates = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()
      ? `${start.getDate()}–${fmtDate(range.sunday)}` : rangeDate(range.monday, range.sunday);
    const expanded = view.expandedWeeks.includes(week);
    const weekSessions = sessionsForWeek(week).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.originalDate.localeCompare(b.originalDate));
    return `<section class="cycle-week">
      <h3><button type="button" class="cycle-week-toggle" data-toggle-week="${week}" aria-expanded="${expanded}" aria-controls="cycle-week-${week}"><span class="cycle-week-heading"><strong>Неделя ${week}</strong><small>${dates}</small></span>${expanded ? '' : `<span class="cycle-week-count">${weekSessions.length} тренировки</span>`}<span class="cycle-week-chevron" aria-hidden="true">${expanded ? '⌄' : '›'}</span></button></h3>
      <div class="cycle-week-grid" id="cycle-week-${week}" ${expanded ? '' : 'hidden'}>${weekSessions.map(session => {
        const workout = workoutById[session.workoutId];
        const moved = session.scheduledDate !== session.originalDate;
        const status = session.status === 'completed' ? '✓ Выполнено' : session.status === 'skipped' ? 'Пропущено' : '';
        const unmarked = calendarUnmarked(session, today);
        const kind = workout.kind === 'running' ? 'Бег' : kindLabels[workout.kind];
        const selected = session.scheduledDate === view.calendarDate;
        return `<button type="button" class="cycle-session ${selected ? 'is-selected' : ''}" data-preview-session="${escapeHtml(session.scheduledSessionId)}" aria-pressed="${selected}">
          <span class="cycle-session-top"><span class="cycle-session-date">${weekdays[parseDate(session.scheduledDate).getDay()]}, ${fmtDate(session.scheduledDate)}</span>${status ? `<span class="cycle-session-status ${session.status}">${status}</span>` : ''}</span>
          <span class="cycle-session-kind">${escapeHtml(kind)} · ${fmtDuration(selectedDuration(session, workout))}</span>
          <span class="cycle-session-title">${escapeHtml(displayTitle(workout))}</span>
          ${unmarked || moved ? `<span class="cycle-notes">${unmarked ? '<small class="cycle-note cycle-unmarked">Не отмечено</small>' : ''}${moved ? `<small class="cycle-note cycle-moved">↪ Перенесена с ${fmtDate(session.originalDate)}</small>` : ''}</span>` : ''}
        </button>`;
      }).join('')}</div>
    </section>`;
  }).join('')}</section>`;
}
function renderCalendar() {
  const today = localDate();
  const anchor = monthAnchor();
  const year = anchor.getFullYear(), month = anchor.getMonth();
  const firstWeekday = (anchor.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let index = 0; index < firstWeekday; index++) cells.push('<span class="calendar-blank"></span>');
  for (let day = 1; day <= daysInMonth; day++) {
    const date = localDate(new Date(year, month, day, 12));
    const items = sortedSessions().filter(session => session.scheduledDate === date);
    const moved = items.some(item => item.scheduledDate !== item.originalDate);
    const unmarked = items.some(item => calendarUnmarked(item, today));
    const labels = items.map(item => {
      const label = { pilates: 'Пилатес', running: 'Бег', strength: 'Силовая' }[workoutById[item.workoutId].kind];
      return `<span class="calendar-workout ${item.status}">${label}</span>`;
    }).join('');
    cells.push(`<button type="button" class="calendar-day${date === today ? ' is-today' : ''}${items.length ? ' has-session' : ''}${unmarked ? ' is-unmarked' : ''}" data-day="${date}" aria-pressed="${date === view.calendarDate}" ${date === today ? 'aria-current="date"' : ''} aria-label="${fmtDate(date)}: ${items.length ? items.map(item => `${workoutById[item.workoutId].title}, ${calendarUnmarked(item, today) ? 'Не отмечено' : statusLabel(item.status)}${item.scheduledDate !== item.originalDate ? `, перенесено с ${fmtDate(item.originalDate)}` : ''}`).join('; ') : 'отдых'}"><span class="calendar-number">${day}</span>${moved ? '<span class="calendar-moved" aria-hidden="true">↪</span>' : ''}${labels}</button>`);
  }
  return `${header('Календарь', 'Программа на 4 недели')}
    <div class="calendar-layout"><section class="calendar-panel">
      <div class="calendar-toolbar"><button type="button" data-month="-1" aria-label="Предыдущий месяц">←</button><h2>${new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(anchor)}</h2><button type="button" data-month="1" aria-label="Следующий месяц">→</button></div>
      <div class="calendar-grid weekdays">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid dates">${cells.join('')}</div>
    </section>${calendarPreview(today)}</div>
    ${cycleOverview(today)}`;
}
function bodyButtons(completion) {
  return `<div class="body-options">${Object.entries(decision.bodyLabels).map(([value, label]) => `<button type="button" data-body="${value}" data-body-for="${completion.scheduledSessionId}" aria-pressed="${completion.body === value}" class="${completion.body === value ? 'is-selected' : ''}">${label}</button>`).join('')}</div>`;
}
function bodyTodayCard(today) {
  const from = addDaysLocal(today, -3);
  const pending = state.completions.filter(item => !item.body && item.completedDate < today && item.completedDate >= from)
    .sort((a, b) => b.completedDate.localeCompare(a.completedDate))[0];
  const session = pending && findSession(pending.scheduledSessionId);
  if (!session) return '';
  return `<section class="body-check"><strong>Как тело после «${escapeHtml(workoutById[session.workoutId].title)}»?</strong><small>${fmtDate(session.scheduledDate)}. Тяжесть или боль, особенно справа, повод не повышать нагрузку.</small>${bodyButtons(pending)}</section>`;
}
function decisionPanel() {
  const result = decision.decide(state, workoutById, localDate());
  return `<section class="content-panel decision decision-${result.verdict}"><h2>Нагрузка</h2><p class="decision-verdict">${decision.verdictLabels[result.verdict]}</p><ul class="decision-reasons">${result.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul><p class="panel-intro">По последним ${decision.WINDOW_DAYS} дням. Решаешь ты, приложение ничего не блокирует.</p></section>`;
}
function hasItem(id) { const flag = state.inventory?.[id]; return flag === undefined ? INVENTORY.find(item => item.id === id).def : flag; }
function needsFor(session, workout) {
  if (workout.kind === 'pilates') return ['mat'];
  if (workout.kind === 'strength') return session.variant === 'replacement' ? [] : ['band', 'bottles', ...(skill.applies(workout) ? ['loop'] : [])];
  return [];
}
function needsLine(ids) {
  if (!ids.length) return '';
  const names = ids.map(id => INVENTORY.find(item => item.id === id).name.toLowerCase());
  const missing = ids.filter(id => !hasItem(id)).map(id => INVENTORY.find(item => item.id === id).name.toLowerCase());
  return `<p class="moved-note needs-line">Понадобится: ${escapeHtml(names.join(', '))}.${missing.length ? ` <strong>В твоём списке нет: ${escapeHtml(missing.join(', '))}.</strong> Отметь в «Данные», если уже есть.` : ''}</p>`;
}
function inventoryPanel() {
  return `<section class="content-panel inventory-panel"><h2>Инвентарь</h2><p class="panel-intro">Отметь, что есть дома. В занятии покажу, чего не хватает.</p>${INVENTORY.map(item => `<label class="inventory-row"><input type="checkbox" data-inventory="${item.id}" ${hasItem(item.id) ? 'checked' : ''}><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.use)}</small></span></label>`).join('')}</section>`;
}
function extrasPanel() {
  const list = [...(state.extras || [])].sort((a, b) => b.date.localeCompare(a.date));
  return `<section class="content-panel extras-panel"><h2>Другие занятия</h2><p class="panel-intro">Групповая, прогулка, что-то своё сверх плана. В 16 занятий и в расчёт цикла они не входят, но остаются в Истории.</p>
    ${list.slice(0, 8).map(extra => `<div class="extra-row"><span><strong>${escapeHtml(extra.title)}</strong><small>${fmtDate(extra.date)}${extra.minutes ? ` · ${extra.minutes} мин` : ''} · ${ratingLabels[extra.rating]}</small></span><button type="button" class="text-btn" data-delete-extra="${escapeHtml(extra.extraId)}">Удалить</button></div>`).join('')}
    <button type="button" class="secondary-btn" data-add-extra>＋ Добавить занятие</button></section>`;
}
function renderDetail() {
  const session = findSession(view.selectedId);
  if (!session) { view.page = 'calendar'; return renderCalendar(); }
  const workout = workoutById[session.workoutId];
  const videoIds = selectedVideos(session, workout);
  const run = workout.run;
  const completion = state.completions.find(item => item.scheduledSessionId === session.scheduledSessionId);
  return `<div class="detail-back-bar"><button type="button" class="back-link" data-back>← Назад</button></div>
    ${header(workout.title, `Неделя ${workout.week} · ${weekdays[workout.weekday]} · ${fmtDate(session.scheduledDate)}`)}
    <section class="detail-panel"><div class="detail-top">${session.status === 'planned' ? '' : badge(session.status)}<span class="detail-duration">${fmtDuration(selectedDuration(session, workout))}</span></div>
      <p class="eyebrow">${escapeHtml(workout.direction)}</p><h2>Зачем эта тренировка</h2><p>${escapeHtml(workout.goal)}</p>
      ${session.scheduledDate !== session.originalDate ? `<p class="moved-note">Перенесено с ${fmtDate(session.originalDate)}.</p>` : ''}
      ${completion ? `<p class="moved-note">Оценка нагрузки: <strong>${ratingLabels[completion.rating]}</strong> · выполнено ${fmtDate(completion.completedDate)}</p><p class="moved-note">Как тело на следующий день?</p>${bodyButtons(completion)}` : ''}
      ${completion?.note ? `<p class="moved-note note-text">Заметка: ${escapeHtml(completion.note)}${completion.minutes ? ` (${completion.minutes} мин)` : ''}</p>` : ''}
      ${needsLine(needsFor(session, workout))}
    </section>
    ${gearDetailCard(session)}
    ${videoIds.length ? `<section class="content-panel"><h2>Видео для тренировки</h2><p class="panel-intro">Включай видео по порядку.</p>${videoIds.map((id, index) => `<a class="video-row" href="${videos[id].url}" target="_blank" rel="noopener noreferrer"><span class="video-number">${index + 1}</span><span><strong>${escapeHtml(videos[id].title)}</strong><small>${fmtDuration(videos[id].durationSeconds)}${videos[id].note ? ` · ${escapeHtml(videos[id].note)}` : ''}</small></span><span aria-hidden="true">↗</span></a>`).join('')}</section>` : ''}
    ${run ? `<section class="content-panel"><h2>План пробежки</h2><ol class="interval-list"><li>Ходьба в удобном темпе · ${fmtInterval(run.warmupSeconds)}</li><li>Непрерывный лёгкий бег · ${fmtInterval(run.runSeconds)}</li><li>Ходьба · ${fmtInterval(run.cooldownSeconds)}</li></ol><p class="panel-intro">Всего ${fmtDuration(workout.durationSeconds)}. ${escapeHtml(workout.adaptation)}</p></section>` : ''}
    ${workout.gap && !skill.applies(workout) ? `<section class="notice-panel"><h2>Цель первого подтягивания</h2><p>${escapeHtml(workout.gap)}</p></section>` : ''}
    ${session.variant === 'replacement' ? `<p class="subtle-note">${escapeHtml(workout.replacement.note)}</p>` : ''}
    <div class="action-stack">
      ${session.status === 'planned' ? `<button class="primary-btn" type="button" data-complete>Отметить выполненной</button><div class="action-pair"><button type="button" data-skip>Пропустить</button><button type="button" data-move>Перенести</button></div>${workout.replacement ? `<button class="secondary-btn" type="button" data-replace>${session.variant === 'base' ? 'Другой вариант тренировки' : 'Вернуться к исходной тренировке'}</button>` : ''}` : ''}
      ${session.status === 'planned' ? `<button class="text-btn" type="button" data-alt-done>Сделала по-другому (например, групповая)</button>` : ''}
      ${session.status === 'completed' ? `<button class="secondary-btn" type="button" data-rate>Изменить оценку нагрузки</button><button class="secondary-btn" type="button" data-edit-note>${completion?.note ? 'Изменить заметку' : 'Добавить заметку'}</button>` : ''}
      ${session.status !== 'planned' ? `<button class="text-btn" type="button" data-restore>Вернуть в план</button>` : ''}
    </div>
    ${skill.render(state, session, workout, view.skillEditingSet)}`;
}
function renderHistory() {
  const completed = state.completions.map(completion => ({ completion, session: findSession(completion.scheduledSessionId) }))
    .filter(item => item.session).sort((a, b) => b.session.scheduledDate.localeCompare(a.session.scheduledDate));
  return `${header('История', 'Выполненные занятия', 'Здесь — выполненные тренировки и твоя оценка нагрузки.')}
    ${completed.length ? completed.map(({ completion, session }) => {
      const workout = workoutById[session.workoutId];
      const day = weekdays[parseDate(session.scheduledDate).getDay()];
      const type = workout.kind === 'running' ? 'Бег' : kindLabels[workout.kind];
      const description = workout.kind === 'running'
        ? (workout.weekday === 4 ? 'Короткая лёгкая пробежка' : 'Спокойная работа на выносливость')
        : workout.kind === 'strength' ? 'Силовая на всё тело' : session.variant === 'base' ? 'Верх тела + подвижность' : '';
      return `<button type="button" class="history-card" data-open="${escapeHtml(session.scheduledSessionId)}">
        <span class="history-card-top"><span class="history-date">${day}, ${fmtDate(session.scheduledDate)}</span><span class="history-status">✓ Выполнено</span></span>
        <strong class="history-main">${escapeHtml(type)} · ${fmtDuration(selectedDuration(session, workout))}</strong>
        ${description ? `<span class="history-description">${description}</span>` : ''}
        ${completion.note ? `<span class="history-note">${escapeHtml(completion.note)}${completion.minutes ? ` · ${completion.minutes} мин` : ''}</span>` : ''}
        <span class="history-badges"><span class="history-load">${ratingLabels[completion.rating]}</span>${session.scheduledDate !== session.originalDate ? `<span class="history-moved">↪ Перенесена с ${fmtDate(session.originalDate)}</span>` : ''}</span>
      </button>`;
    }).join('') : (state.extras?.length ? '' : `<section class="empty-state"><span aria-hidden="true">◷</span><h2>История пока пуста</h2><p>После первой выполненной тренировки она появится здесь.</p></section>`)}
    ${state.extras?.length ? `<h2 class="section-title">Сверх плана</h2>${[...state.extras].sort((a, b) => b.date.localeCompare(a.date)).map(extra => `<div class="history-card history-extra"><span class="history-card-top"><span class="history-date">${weekdays[parseDate(extra.date).getDay()]}, ${fmtDate(extra.date)}</span><span class="history-status">+ Сверх плана</span></span><strong class="history-main">${escapeHtml(extra.title)}${extra.minutes ? ` · ${extra.minutes} мин` : ''}</strong>${extra.note ? `<span class="history-note">${escapeHtml(extra.note)}</span>` : ''}<span class="history-badges"><span class="history-load">${ratingLabels[extra.rating]}</span></span></div>`).join('')}` : ''}`;
}
function measureValue(value, unit) { return value === null || value === undefined ? '—' : `${String(value).replace('.', ',')} ${unit}`; }
function recordsLabel(count) {
  const tail = count % 100, last = count % 10;
  return `${count} ${tail > 10 && tail < 15 ? 'записей' : last === 1 ? 'запись' : last >= 2 && last <= 4 ? 'записи' : 'записей'}`;
}
function measureNumber(value) { return String(value).replace('.', ','); }
function hasMeasure(item, field) { return typeof item[field] === 'number'; }
// Изменение относительно ближайшей более ранней записи, где этот же показатель был указан.
// Записи за ту же дату не сравниваются: порядок внутри одного дня неочевиден.
function measureChange(field, unit, latest, sortedDesc, dateOptions) {
  if (!hasMeasure(latest, field)) return null;
  const earlier = sortedDesc.find(item => item.date < latest.date && hasMeasure(item, field));
  if (!earlier) return null;
  const diff = Math.round((latest[field] - earlier[field]) * 10) / 10;
  const since = fmtDate(earlier.date, dateOptions);
  if (diff === 0) return `без изменений с ${since}`;
  return `${diff > 0 ? '+' : '−'}${measureNumber(Math.abs(diff))} ${unit} с ${since}`;
}
const shortDate = { day: 'numeric', month: 'short' };
function weightChart(records) {
  const points = records.filter(item => hasMeasure(item, 'weight')).sort((a, b) => a.date.localeCompare(b.date));
  if (points.length < 2) return '';
  const W = 300, H = 150, left = 38, right = 12, top = 12, bottom = 28;
  const plotW = W - left - right, plotH = H - top - bottom;
  const times = points.map(item => parseDate(item.date).getTime());
  const span = times[times.length - 1] - times[0];
  const x = index => left + (span > 0 ? (times[index] - times[0]) / span : index / (points.length - 1)) * plotW;
  let low = Math.min(...points.map(item => item.weight)), high = Math.max(...points.map(item => item.weight));
  // Минимальный размах шкалы 1 кг: небольшие колебания не выглядят резким скачком.
  if (high - low < 1) { const middle = (high + low) / 2; low = middle - 0.5; high = middle + 0.5; }
  else { const pad = (high - low) * 0.1; low -= pad; high += pad; }
  const y = value => top + (high - value) / (high - low) * plotH;
  const first = points[0], last = points[points.length - 1];
  const coords = points.map((item, index) => `${x(index).toFixed(1)},${y(item.weight).toFixed(1)}`).join(' ');
  const dots = points.length <= 31
    ? points.map((item, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(item.weight).toFixed(1)}" r="${index === points.length - 1 ? 4 : 3}" fill="${index === points.length - 1 ? '#32425e' : '#fff'}" stroke="#32425e" stroke-width="2"/>`).join('')
    : `<circle cx="${x(points.length - 1).toFixed(1)}" cy="${y(last.weight).toFixed(1)}" r="4" fill="#32425e" stroke="#32425e" stroke-width="2"/>`;
  const label = `График веса: от ${measureNumber(first.weight)} кг (${fmtDate(first.date)}) до ${measureNumber(last.weight)} кг (${fmtDate(last.date)}), ${recordsLabel(points.length)}`;
  const dateLabels = first.date === last.date
    ? `<text x="${left + plotW / 2}" y="${H - 8}" text-anchor="middle">${fmtDate(first.date, shortDate)}</text>`
    : `<text x="${left}" y="${H - 8}" text-anchor="start">${fmtDate(first.date, shortDate)}</text><text x="${W - right}" y="${H - 8}" text-anchor="end">${fmtDate(last.date, shortDate)}</text>`;
  return `<div class="measure-chart"><p class="measure-chart-title">Динамика веса</p>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(label)}"><title>${escapeHtml(label)}</title>
      <line x1="${left}" y1="${top}" x2="${W - right}" y2="${top}" stroke="#e4e6ea"/><line x1="${left}" y1="${top + plotH}" x2="${W - right}" y2="${top + plotH}" stroke="#e4e6ea"/>
      <g fill="#656c7b" font-size="11"><text x="${left - 6}" y="${top + 4}" text-anchor="end">${measureNumber(Math.round(high * 10) / 10)}</text><text x="${left - 6}" y="${top + plotH + 4}" text-anchor="end">${measureNumber(Math.round(low * 10) / 10)}</text>${dateLabels}</g>
      <polyline points="${coords}" fill="none" stroke="#435067" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}
    </svg></div>`;
}
function progressTrack(done, total, label) {
  return `<span class="progress-track" role="progressbar" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="width:${total ? done / total * 100 : 0}%"></i></span>`;
}
function renderProgress() {
  const total = state.sessions.length;
  const done = state.sessions.filter(session => session.status === 'completed').length;
  const skipped = state.sessions.filter(session => session.status === 'skipped').length;
  const planned = state.sessions.filter(session => session.status === 'planned').length;
  const measurements = [...state.measurements].sort((a, b) => b.date.localeCompare(a.date));
  const latest = measurements[0];
  const weekCards = [...new Set(workouts.map(workout => workout.week))].sort((a, b) => a - b).map(week => {
    const items = state.sessions.filter(session => workoutById[session.workoutId].week === week);
    const count = items.filter(session => session.status === 'completed').length;
    return `<div class="progress-row"><span>Неделя ${week}</span>${progressTrack(count, items.length, `Неделя ${week}`)}<strong>${count}/${items.length}</strong></div>`;
  }).join('');
  const directionCards = [['running', 'Бег'], ['strength', 'Силовая'], ['pilates', 'Пилатес + подвижность']].map(([kind, label]) => {
    const items = state.sessions.filter(session => workoutById[session.workoutId].kind === kind);
    const count = items.filter(session => session.status === 'completed').length;
    return `<div class="direction-card"><span class="direction-card-top"><span>${label}</span><strong>${count}/${items.length}</strong></span>${progressTrack(count, items.length, label)}</div>`;
  }).join('');
  const group = (title, ...items) => { const body = items.filter(Boolean).join(''); return body ? `<section class="progress-breakdown"><h2>${title}</h2><div class="entry-list">${body}</div></section>` : ''; };
  return `${header('Прогресс', 'Программа на 4 недели')}
    <section class="progress-summary"><strong>${done} из ${total} тренировок</strong>${progressTrack(done, total, 'Программа целиком')}<div class="progress-summary-meta"><span>${planned} осталось</span><span>${skipped} пропущено</span></div></section>
    <section class="progress-breakdown"><h2>По неделям</h2>${weekCards}</section>
    <section class="progress-breakdown"><h2>По направлениям</h2><div class="direction-grid">${directionCards}</div></section>
    ${garminMatchPanel(localDate())}
    ${decisionPanel()}
    ${group('План', replanEntry(), cycleEntry(), archiveEntry())}
    ${group('Йога и асаны', yogaEntry(), asanas.renderEntry(state))}
    <section class="progress-breakdown"><div class="section-row"><h2>Вес и замеры</h2><button type="button" class="small-action" data-add-measure>+ Добавить</button></div>
    ${latest ? (() => {
      const weightChange = measureChange('weight', 'кг', latest, measurements, { day: 'numeric', month: 'long' });
      const otherChanges = [['waist', 'Талия'], ['hips', 'Бёдра'], ['chest', 'Грудь']].map(([field, name]) => { const change = measureChange(field, 'см', latest, measurements, shortDate); return change ? `${name} ${change}`.replace(/ /g, '\u00A0') : ''; }).filter(Boolean);
      return `<div class="measure-latest"><span>Последняя запись · ${fmtDate(latest.date)}</span><strong>${measureValue(latest.weight, 'кг')}</strong>${weightChange ? `<small class="measure-delta">${weightChange}</small>` : ''}<p>Талия ${measureValue(latest.waist, 'см')} · Бёдра ${measureValue(latest.hips, 'см')} · Грудь ${measureValue(latest.chest, 'см')}</p>${otherChanges.length ? `<p class="measure-changes">Изменение: ${otherChanges.join(' · ')}</p>` : ''}</div>`;
    })() : '<p class="panel-intro">Пока нет записей. Можно добавить вес или другие замеры.</p>'}
    ${weightChart(state.measurements)}
    ${state.measurements.filter(item => hasMeasure(item, 'weight')).length === 1 ? '<p class="panel-intro">График появится после второй записи веса.</p>' : ''}
    ${measurements.length ? `<div class="measure-list">${measurements.map(item => `<div><span>${fmtDate(item.date)} · вес ${measureValue(item.weight, 'кг')} · талия ${measureValue(item.waist, 'см')} · бёдра ${measureValue(item.hips, 'см')} · грудь ${measureValue(item.chest, 'см')}</span><button type="button" data-delete-measure="${escapeHtml(item.measurementId)}" aria-label="Удалить замер за ${fmtDate(item.date)}">×</button></div>`).join('')}</div>` : ''}</section>`;
}
function yogaPoseLinks(ids) {
  return ids.map(id => asanas.catalog.find(item => item.id === id)).filter(Boolean).map(item => item.video
    ? `<a href="${item.video.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)} ↗</a>` : `<span>${escapeHtml(item.name)}</span>`).join(' · ');
}
function yogaTodayCard(today) {
  const slots = yoga.slots(state.startDate, state);
  const slot = slots.find(item => item.date === today) || slots.find(item => item.date > today);
  if (!slot) return '';
  const isToday = slot.date === today;
  const done = !!state.yoga?.[slot.date];
  const when = isToday ? 'Сегодня' : `${slot.weekday}, ${fmtDate(slot.date)}`;
  const note = done ? 'Отмечено ✓' : (slot.focus.video ? `Видео ${slot.focus.video.minutes} мин внутри. Не входит в 16 занятий` : '20–30 минут по видео. Не входит в 16 занятий');
  return `<button type="button" class="yoga-today" data-open-yoga><span><strong>Йога по желанию · ${when}</strong><small>${slot.focus.title}. ${note}</small></span><span aria-hidden="true">›</span></button>`;
}
function yogaEntry() {
  return `<button type="button" class="asanas-entry" data-open-yoga><span class="asanas-entry-text"><strong>Йога по средам и субботам</strong><small>Сделано ${yoga.count(state)} из ${yoga.slots(state.startDate).length} · по желанию</small></span><span aria-hidden="true">›</span></button>`;
}
function renderYoga() {
  const today = localDate();
  const rows = yoga.slots(state.startDate, state).map(slot => {
    const mark = state.yoga?.[slot.date];
    const first = slot.weekday === 'Ср';
    return `${first ? `<h2 class="yoga-week">Неделя ${slot.week}: ${slot.focus.title}</h2><p class="yoga-tip">${escapeHtml(slot.focus.tip)}</p><p class="yoga-links">Навык недели: ${yogaPoseLinks(slot.focus.poses)}</p>${slot.focus.video ? `<p class="yoga-links">Практика на ${slot.focus.video.minutes} мин: <a href="${slot.focus.video.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(slot.focus.video.title)} ↗</a> <small>(${escapeHtml(slot.focus.video.author)}, на русском)</small></p>` : ''}` : ''}
    <div class="yoga-row ${mark ? 'is-done' : ''} ${slot.date === today ? 'is-today' : ''}">
      <label class="yoga-check"><input type="checkbox" data-yoga-done="${slot.date}" ${mark ? 'checked' : ''}><span>${slot.weekday}, ${fmtDate(slot.date)}</span></label>
      ${mark ? `<label class="yoga-min">Минут <input type="number" inputmode="numeric" min="1" max="${yoga.MAX_MINUTES}" data-yoga-minutes="${slot.date}" value="${mark.minutes ?? ''}" placeholder="—"></label>` : ''}
    </div>`;
  }).join('');
  return `${header('Йога', 'По желанию', 'Среда и суббота, 20–30 минут: видео-практика недели и один навык. Это не 5-я тренировка, пропуски не считаются.')}
    <section class="yoga-summary"><strong>Сделано ${yoga.count(state)} из ${yoga.slots(state.startDate).length}</strong></section>
    ${view.yogaError ? `<p class="form-error" role="alert">${escapeHtml(view.yogaError)}</p>` : ''}${rows}`;
}
const cycleLastMonday = () => weekRange(state.startDate, 4).monday;
function skipFirstCycle() { return state.programId !== cycle2.ID && state.completions.length === 0 && (state.runs || []).length > 0 && localDate() < cycleLastMonday(); }
function cycleEligible() { return localDate() >= cycleLastMonday() || skipFirstCycle(); }
function nextCycleStart() {
  if (skipFirstCycle()) return nextMonday() > state.startDate && localDate() >= state.startDate ? nextMonday() : state.startDate;
  const afterEnd = addDaysLocal(weekRange(state.startDate, 4).sunday, 1);
  return afterEnd > localDate() ? afterEnd : nextMonday();
}
function cycleEntry() {
  if (!cycleEligible()) return '';
  return `<button type="button" class="asanas-entry" data-open-cycle2><span class="asanas-entry-text"><strong>${skipFirstCycle() ? 'Начать сразу со второго цикла' : 'План следующего цикла'}</strong><small>${skipFirstCycle() ? 'Первый цикл рассчитан на более лёгкий уровень, чем твои пробежки' : 'Считается по твоим реальным пробежкам'}</small></span><span aria-hidden="true">›</span></button>`;
}
function replanEntry() {
  if (state.programId !== cycle2.ID) return '';
  const week = programWeekForDate(state.startDate, localDate());
  if (!week || week >= 4) return '';
  const verdict = decision.decide(state, workoutById, localDate()).verdict;
  return `<button type="button" class="asanas-entry" data-replan><span class="asanas-entry-text"><strong>Обновить следующие недели</strong><small>Сейчас по последним ${decision.WINDOW_DAYS} дням: ${decision.verdictLabels[verdict]}</small></span><span aria-hidden="true">›</span></button>`;
}
function replanNow() {
  const result = cycle2.replan(state, localDate(), decision.decide(state, workoutById, localDate()).verdict);
  if (!result) return;
  state.plan = result.plan; useProgram(state);
  view.message = result.changed.length
    ? `План обновлён: ${result.changed.map(item => `неделя ${item.week}: бег ${item.shortNew} и ${item.longNew} мин (было ${item.shortOld} и ${item.longOld})`).join('; ')}.`
    : 'Менять ничего не нужно: план остаётся как есть.';
  save();
}
function archiveEntry() {
  const prev = state.previous;
  if (!prev) return '';
  const done = prev.sessions.filter(session => session.status === 'completed').length;
  return `<button type="button" class="asanas-entry" data-open-archive><span class="asanas-entry-text"><strong>Предыдущий цикл</strong><small>Выполнено ${done} из ${prev.sessions.length}</small></span><span aria-hidden="true">›</span></button>`;
}
function renderArchive() {
  const prev = state.previous;
  const program = prev && programFor({ programId: prev.programId, plan: prev.plan });
  if (!prev || !program) { view.page = 'progress'; return renderProgress(); }
  const count = status => prev.sessions.filter(session => session.status === status).length;
  const rows = [...prev.sessions].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).map(session => {
    const workout = program.workoutById[session.workoutId];
    const completion = prev.completions.find(item => item.scheduledSessionId === session.scheduledSessionId);
    const meta = [statusLabel(session.status), completion && ratingLabels[completion.rating], completion?.body && decision.bodyLabels[completion.body]].filter(Boolean).join(' · ');
    return `<div class="archive-row"><span>${fmtDate(session.scheduledDate)}</span><span>${escapeHtml(workout ? displayTitle(workout) : 'Занятие')}</span><small>${escapeHtml(meta)}</small></div>`;
  }).join('');
  return `${header('Предыдущий цикл', `С ${fmtDate(prev.startDate)}`, `Выполнено ${count('completed')}, пропущено ${count('skipped')}, осталось по плану ${count('planned')}.`)}${rows}`;
}
function renderCycle2() {
  const today = localDate();
  const verdict = decision.decide(state, workoutById, today).verdict;
  const { plan } = cycle2.makePlan(state, workoutById, today, verdict);
  const start = nextCycleStart();
  const labels = ['', 'ориентир', 'ориентир', 'лёгкая неделя'];
  const weeks = [0, 1, 2, 3].map(index => `<div class="c2-week"><strong>Неделя ${index + 1}${labels[index] ? ` · ${labels[index]}` : ''}</strong>
    <span>Пн лёгкий бег ${plan.long[index]} мин</span><span>Вт пилатес + подвижность</span><span>Чт лёгкий бег ${plan.short[index]} мин</span><span>Пт силовая</span></div>`).join('');
  return `${header(skipFirstCycle() ? 'Цикл 2 вместо первого' : 'Следующий цикл', 'План', `${skipFirstCycle() ? 'Первый цикл рассчитан на начальный уровень, а ты уже бегаешь больше, поэтому можно начать сразу с цикла 2. Первый цикл при этом не нужен, и в архиве его не будет. ' : ''}Старт ${fmtDate(start)}. Те же четыре занятия в неделю, длительность бега считается от твоих реальных пробежек. Указаны минуты самого бега: ещё по 5 минут ходьбы до и после.`)}
    ${weeks}
    <section class="content-panel"><h2>Почему так</h2><ul class="decision-reasons">${plan.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
    <p class="panel-intro">Недели 2–4 это ориентир при хорошем раскладе. Если неделя тяжёлая, повтори предыдущую длительность: так записано в правилах бега.</p></section>
    <button type="button" class="primary-btn" data-start-cycle2>Начать цикл с ${fmtDate(start)}</button>`;
}
function startNextCycle() {
  const today = localDate();
  const verdict = decision.decide(state, workoutById, today).verdict;
  const { plan } = cycle2.makePlan(state, workoutById, today, verdict);
  const startDate = nextCycleStart();
  const program = cycle2.build(plan);
  const cycleId = uid();
  const next = {
    schemaVersion: 1, anchorVersion: 2, scheduleVersion: 2, programId: cycle2.ID, cycleNumber: (state.cycleNumber || 1) + 1, plan, cycleId, startDate,
    sessions: sessionsFor(program, startDate, cycleId), completions: [], measurements: state.measurements,
    ...(skipFirstCycle() ? {} : { previous: { programId: state.programId, plan: state.plan, cycleId: state.cycleId, startDate: state.startDate, sessions: state.sessions, completions: state.completions, skillRecords: state.skillRecords || [], yoga: state.yoga || {} } })
  };
  if (state.asanas) next.asanas = state.asanas;
  if (state.runs) next.runs = state.runs;
  if (state.skillLastBands) next.skillLastBands = state.skillLastBands;
  if (state.inventory) next.inventory = state.inventory;
  if (state.gear) next.gear = state.gear;
  if (state.extras) next.extras = state.extras;
  state = next; useProgram(state);
  view.page = 'today'; view.selectedId = null; view.expandedWeeks = [1]; view.monthOffset = 0; view.message = `Цикл ${state.cycleNumber} начнётся ${fmtDate(startDate)}.`;
  save();
}
function renderAsanas() {
  return `${header('Асаны', 'Каталог', 'Отмечай, что умеешь и что получается с опорой. В 16 занятий программы это не входит.')}${asanas.render(state, view.asanaFilter)}`;
}
function fmtClock(seconds) { const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60; return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s).padStart(2, '0')}`; }
function garminStatus() {
  const today = localDate();
  const inCycle = (state.runs || []).filter(run => run.date >= state.startDate).length;
  const found = garminMatches(today).length;
  const start = fmtDate(state.startDate, { day: 'numeric', month: 'long', year: 'numeric' });
  if (!inCycle) return `Текущая программа началась ${start}, а загруженные пробежки были раньше, поэтому к занятиям плана они не привязываются. Они всё равно учитываются при расчёте следующего цикла.`;
  if (!found) return `С начала программы (${start}) пробежек: ${inCycle}. Свободных беговых занятий плана под них нет: они уже отмечены или даты не подходят.`;
  return `Нашла ${found} пробежк${found === 1 ? 'у' : 'и'} для отметки: они показаны на «Главной» и в «Прогрессе».`;
}
function garminPanel() {
  const runs = state.runs || [];
  const rows = runs.slice(0, 6).map(run => `<div><span>${fmtDate(run.date)} · ${String(run.km).replace('.', ',')} км · ${fmtClock(run.seconds)} · ${garmin.pace(run)}/км${run.avgHr ? ` · пульс ${run.avgHr}` : ''}</span></div>`).join('');
  return `<section class="content-panel"><div class="section-row"><h2>Пробежки из Garmin</h2><button type="button" class="small-action" data-import-garmin>Загрузить CSV</button></div>
    <p class="panel-intro">${runs.length ? `Загружено пробежек: ${runs.length}. Последняя: ${fmtDate(runs[0].date)}.` : 'Загрузи CSV со списком занятий из Garmin Connect. Берутся только пробежки: дата, дистанция, время и пульс. Файл остаётся в этом браузере.'}</p>
    ${runs.length ? `<p class="panel-intro">${garminStatus()}</p>` : ''}
    ${rows ? `<div class="measure-list">${rows}</div>` : ''}</section>`;
}
function renderGear() {
  return `${header('Беговой гардероб', 'Снаряжение', '22 вещи и комплекты на 5 погод. На «Главной» в беговой день подберу комплект по прогнозу на 19:00–20:30.')}${wardrobe.render(state, view.gearTab)}`;
}
function dataGroup(id, title, summary, body, forceOpen = false) {
  const open = forceOpen || view.dataOpen.includes(id);
  return `<section class="data-group${open ? ' is-open' : ''}"><button type="button" class="data-group-head" data-toggle-data="${id}" aria-expanded="${open}" aria-controls="data-group-${id}"><span class="data-group-text"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(summary)}</small></span><span class="data-group-chevron" aria-hidden="true">›</span></button><div class="data-group-body" id="data-group-${id}"${open ? '' : ' hidden'}>${body}</div></section>`;
}
function syncSummary() {
  const s = sync.status();
  if (s.phase === 'off') return 'не подключена';
  if (!s.signedIn) return 'не вошла';
  if (s.phase === 'conflict') return 'нужно выбрать версию';
  if (s.phase === 'error') return 'ошибка, нужна проверка';
  return s.dirty ? 'есть неотправленные изменения' : 'всё синхронизировано';
}
function renderData() {
  const have = INVENTORY.filter(item => hasItem(item.id)).length;
  const runsCount = (state.runs || []).length;
  const syncConflict = sync && sync.status().phase === 'conflict';
  return `${header('Данные', 'Твои записи', 'Отметки хранятся на этом устройстве, а если ты вошла в синхронизацию, ещё и в облаке. Всё ниже раскрывается по нажатию.')}
    <button type="button" class="data-history-link" data-history>История тренировок<span aria-hidden="true">›</span></button>
    ${wardrobe.renderEntry(state)}
    <h2 class="data-section-title">Мои записи</h2>
    ${dataGroup('extras', 'Другие занятия', (state.extras || []).length ? recordsLabel(state.extras.length) : 'пока нет', extrasPanel())}
    ${dataGroup('inventory', 'Инвентарь', `есть ${have} из ${INVENTORY.length}`, inventoryPanel())}
    ${dataGroup('garmin', 'Пробежки из Garmin', runsCount ? `загружено ${runsCount}` : 'не загружены', garminPanel())}
    <h2 class="data-section-title">Устройства и копия</h2>
    ${sync ? dataGroup('sync', 'Синхронизация', syncSummary(), syncPanel(), syncConflict) : ''}
    ${dataGroup('backup', 'Копия данных', 'скачать или загрузить файл', `<section class="content-panel"><div class="action-pair"><button type="button" data-export>Скачать данные</button><button type="button" data-import>Загрузить данные</button></div><p class="panel-intro">Загруженные данные заменят текущие записи. Перед загрузкой потребуется подтверждение. Копию стоит скачивать раз в неделю.</p></section>`)}
    <h2 class="data-section-title">Программа</h2>
    ${dataGroup('program', 'Программа на 4 недели', `старт ${fmtDate(state.startDate, { day: 'numeric', month: 'long', year: 'numeric' })}`, `<section class="content-panel"><p>Дата начала: <strong>${fmtDate(state.startDate, { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p><p class="panel-intro">Программа начинается в понедельник. При выборе новой даты текущие отметки и замеры будут заменены. Сначала скачай копию, если хочешь их сохранить.</p><button type="button" class="secondary-btn" data-restart>Начать программу с другой даты</button></section>`)}`;
}
function render() {
  const meta = document.querySelector('.topbar-meta');
  if (meta) meta.textContent = state.programId === cycle2.ID ? `Цикл ${state.cycleNumber}` : 'Первые 4 недели';
  document.querySelectorAll('[data-nav]').forEach(button => {
    const origin = view.page === 'detail' ? view.detailOrigin : view.page;
    const activePage = (origin === 'history' || origin === 'gear') ? 'data' : (origin === 'asanas' || origin === 'yoga' || origin === 'cycle2' || origin === 'archive') ? 'progress' : origin;
    const active = button.dataset.nav === activePage;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  app.innerHTML = `${view.message ? `<div class="toast" role="status">${escapeHtml(view.message)}<button type="button" data-dismiss aria-label="Закрыть сообщение">×</button></div>` : ''}${view.page === 'history' ? '<div class="detail-back-bar"><button type="button" class="back-link" data-history-back>← Назад</button></div>' : ''}${view.page === 'archive' ? '<div class="detail-back-bar"><button type="button" class="back-link" data-archive-back>← Прогресс</button></div>' : ''}${view.page === 'cycle2' ? '<div class="detail-back-bar"><button type="button" class="back-link" data-cycle2-back>← Прогресс</button></div>' : ''}${view.page === 'yoga' ? '<div class="detail-back-bar"><button type="button" class="back-link" data-yoga-back>← Назад</button></div>' : ''}${view.page === 'asanas' ? '<div class="detail-back-bar"><button type="button" class="back-link" data-asanas-back>← Прогресс</button></div>' : ''}${view.page === 'gear' ? `<div class="detail-back-bar"><button type="button" class="back-link" data-gear-back>← ${view.gearOrigin === 'today' ? 'Главная' : 'Данные'}</button></div>` : ''}${({ today: renderToday, calendar: renderCalendar, detail: renderDetail, history: renderHistory, progress: renderProgress, asanas: renderAsanas, yoga: renderYoga, cycle2: renderCycle2, archive: renderArchive, data: renderData, gear: renderGear })[view.page]()}`;
}
function openDialog(title, body) {
  dialog.innerHTML = `<form method="dialog" class="dialog-content"><div class="dialog-head"><h2 id="dialog-title">${escapeHtml(title)}</h2><button type="submit" class="icon-btn" aria-label="Закрыть">×</button></div>${body}</form>`;
  dialog.showModal();
}
function closeDialog() { dialog.close(); }
function ratingDialog(session, changeOnly = false) {
  const completion = state.completions.find(item => item.scheduledSessionId === session.scheduledSessionId);
  openDialog(changeOnly ? 'Оценка нагрузки' : 'Тренировка выполнена', `<p>Как ощущалась нагрузка?</p><div class="rating-options">${Object.entries(ratingLabels).map(([value, label]) => `<button type="button" data-rating="${value}" ${completion?.rating === value ? 'class="selected"' : ''}>${label}</button>`).join('')}</div><p class="dialog-note">Оценка сохранится в истории и не изменит план.</p>`);
}
function altDialog(session) {
  openDialog('Сделала по-другому', `<p>Опиши, что было вместо занятия по плану. Оно засчитается как выполненное.</p>
    <label class="field-label">Что делала<textarea id="alt-text" rows="3" maxlength="${NOTE_MAX}" placeholder="Например: групповая тренировка по стрейчингу"></textarea></label>
    <label class="field-label">Сколько минут (по желанию)<input type="number" id="alt-min" inputmode="numeric" min="1" max="${MINUTES_MAX}"></label>
    <p>Как ощущалась нагрузка?</p><div class="rating-options">${Object.entries(ratingLabels).map(([value, label]) => `<button type="button" data-alt-rating="${value}">${label}</button>`).join('')}</div><p class="form-error" id="dialog-error" role="alert"></p>`);
}
function noteDialog(session) {
  const completion = state.completions.find(item => item.scheduledSessionId === session.scheduledSessionId);
  openDialog('Заметка к занятию', `<label class="field-label">Заметка<textarea id="note-text" rows="4" maxlength="${NOTE_MAX}">${escapeHtml(completion?.note || '')}</textarea></label><button type="button" class="primary-btn" data-save-note>Сохранить</button><p class="form-error" id="dialog-error" role="alert"></p>`);
}
function extraDialog() {
  openDialog('Занятие сверх плана', `<label class="field-label">Дата<input type="date" id="extra-date" value="${localDate()}" required></label>
    <label class="field-label">Что это было<input type="text" id="extra-title" maxlength="80" placeholder="Например: групповая, йога в студии"></label>
    <label class="field-label">Сколько минут (по желанию)<input type="number" id="extra-min" inputmode="numeric" min="1" max="${MINUTES_MAX}"></label>
    <label class="field-label">Заметка (по желанию)<textarea id="extra-note" rows="2" maxlength="${NOTE_MAX}"></textarea></label>
    <p>Как ощущалась нагрузка?</p><div class="rating-options">${Object.entries(ratingLabels).map(([value, label]) => `<button type="button" data-extra-rating="${value}">${label}</button>`).join('')}</div><p class="form-error" id="dialog-error" role="alert"></p>`);
}
function readMinutes(selector) {
  const raw = dialog.querySelector(selector).value;
  if (String(raw).trim() === '') return { ok: true, value: null };
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= MINUTES_MAX ? { ok: true, value } : { ok: false };
}
function moveDialog(session) {
  openDialog('Перенести занятие', `<p>Выбери день без тренировки. Остальное расписание не изменится.</p><label class="field-label">Новая дата<input type="date" id="move-date" value="${session.scheduledDate}" required></label><button type="button" class="primary-btn" data-confirm-move>Сохранить дату</button><p class="dialog-note" id="dialog-error" role="alert"></p>`);
}
function measureDialog() {
  openDialog('Добавить замеры', `<label class="field-label">Дата<input type="date" id="measure-date" value="${localDate()}" required></label><div class="measure-fields">${[['weight', 'Вес, кг'], ['waist', 'Талия, см'], ['hips', 'Бёдра, см'], ['chest', 'Грудь, см']].map(([id, label]) => `<label class="field-label">${label}<input id="measure-${id}" type="number" min="0.1" max="500" step="0.1" inputmode="decimal" placeholder="—"></label>`).join('')}</div><button type="button" class="primary-btn" data-save-measure>Сохранить замеры</button><p class="dialog-note" id="dialog-error" role="alert"></p>`);
}
function restartDialog() {
  openDialog('Начать заново', `<p>Выбери понедельник для начала программы. Текущие отметки и замеры будут заменены. Сначала скачай данные, если хочешь их сохранить.</p><label class="field-label">Дата начала<input type="date" id="start-date" value="${nextMonday()}" required></label><button type="button" class="primary-btn" data-confirm-restart>Начать заново</button><p class="dialog-note" id="dialog-error" role="alert"></p>`);
}
function showDialogError(message) { dialog.querySelector('#dialog-error').textContent = message; }
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `ritm-${localDate()}.json`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
function openSession(id) {
  view.detailOrigin = view.page;
  view.detailScrollY = window.scrollY || 0;
  view.selectedId = id;
  view.skillEditingSet = null;
  view.page = 'detail';
  render();
  window.scrollTo(0, 0);
}
function backFromDetail() {
  view.page = view.detailOrigin || 'calendar';
  view.selectedId = null;
  render();
  window.scrollTo(0, view.detailScrollY);
}
function completeSession(id) {
  const session = findSession(id);
  if (!session || session.status !== 'planned') return;
  view.selectedId = id;
  ratingDialog(session);
}
function skipSession(id) {
  const session = findSession(id);
  if (!session || session.status !== 'planned') return;
  if (!confirm('Пропустить эту тренировку? Остальное расписание не изменится.')) return;
  session.status = 'skipped';
  save();
}
function changeSkillDose(record, item, exercise, week) {
  if (!Number.isInteger(week) || week < 1 || week > record.week || week === item.doseWeek) return;
  if (item.actualSets.some(set => set.done)) {
    view.message = 'Сначала убери отметки с подходов, потом измени количество.';
    render(); return;
  }
  const fresh = skill.makeExercise(exercise, week);
  Object.assign(item, { doseWeek: week, prescribed: fresh.prescribed, actualSets: fresh.actualSets });
  view.message = '';
  save();
}

document.querySelector('.bottom-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-nav]');
  if (!button) return;
  view.page = button.dataset.nav;
  if (view.page === 'calendar') {
    view.calendarDate = localDate(); view.monthOffset = 0;
  }
  view.selectedId = null;
  render(); window.scrollTo(0, 0);
});
app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.dismiss !== undefined) { view.message = ''; render(); return; }
  if (button.dataset.nav) { view.page = button.dataset.nav; render(); return; }
  if (button.dataset.history !== undefined && view.page === 'data') {
    view.historyScrollY = window.scrollY || 0;
    view.page = 'history'; render(); window.scrollTo(0, 0); return;
  }
  if (button.dataset.historyBack !== undefined && view.page === 'history') {
    view.page = 'data'; render(); window.scrollTo(0, view.historyScrollY); return;
  }
  if (button.dataset.body && button.dataset.bodyFor) {
    const item = state.completions.find(entry => entry.scheduledSessionId === button.dataset.bodyFor);
    if (item && Object.keys(decision.bodyLabels).includes(button.dataset.body)) {
      const y = window.scrollY || 0;
      if (item.body === button.dataset.body) delete item.body; else item.body = button.dataset.body;
      save(); render(); window.scrollTo(0, y);
    }
    return;
  }
  if (button.dataset.garminDone) { applyGarminMatch(button.dataset.garminDone, button.dataset.garminRun, button.dataset.garminRating); return; }
  if (view.page === 'data' && sync) {
    if (button.dataset.syncSignin !== undefined) { const passwordField = document.getElementById('sync-password'); sync.signIn(document.getElementById('sync-email')?.value, passwordField?.value); if (passwordField) passwordField.value = ''; return; }
    if (button.dataset.syncNow !== undefined) { sync.syncNow(); return; }
    if (button.dataset.syncOut !== undefined) { sync.signOut(); return; }
    if (button.dataset.syncConflict !== undefined) { conflictDialog(); return; }
  }
  if (button.dataset.replan !== undefined && view.page === 'progress') { replanNow(); return; }
  if (button.dataset.openArchive !== undefined && view.page === 'progress' && state.previous) { view.page = 'archive'; render(); window.scrollTo(0, 0); return; }
  if (button.dataset.archiveBack !== undefined && view.page === 'archive') { view.page = 'progress'; render(); return; }
  if (button.dataset.openCycle2 !== undefined && view.page === 'progress' && cycleEligible()) { view.page = 'cycle2'; render(); window.scrollTo(0, 0); return; }
  if (button.dataset.cycle2Back !== undefined && view.page === 'cycle2') { view.page = 'progress'; render(); return; }
  if (button.dataset.startCycle2 !== undefined && view.page === 'cycle2' && cycleEligible()) {
    if (confirm('Начать следующий цикл? Текущий цикл сохранится в архиве. Замеры, асаны и пробежки останутся.')) startNextCycle();
    return;
  }
  if (button.dataset.importGarmin !== undefined) { garminFile.click(); return; }
  if (button.dataset.openYoga !== undefined && (view.page === 'progress' || view.page === 'today')) {
    view.yogaOrigin = view.page; view.yogaScrollY = window.scrollY || 0;
    view.page = 'yoga'; view.yogaError = ''; render(); window.scrollTo(0, 0); return;
  }
  if (button.dataset.yogaBack !== undefined && view.page === 'yoga') {
    view.page = view.yogaOrigin === 'today' ? 'today' : 'progress'; render(); window.scrollTo(0, view.yogaScrollY || 0); return;
  }
  if (button.dataset.openAsanas !== undefined && view.page === 'progress') {
    view.progressScrollY = window.scrollY || 0;
    view.page = 'asanas'; render(); window.scrollTo(0, 0); return;
  }
  if (button.dataset.asanasBack !== undefined && view.page === 'asanas') {
    view.page = 'progress'; render(); window.scrollTo(0, view.progressScrollY); return;
  }
  if (button.dataset.openGear !== undefined && (view.page === 'data' || view.page === 'today')) {
    view.gearOrigin = view.page; view.gearTab = wardrobe.tabs.some(([key]) => key === button.dataset.openGear) ? button.dataset.openGear : 'outfits';
    view.page = 'gear'; render(); window.scrollTo(0, 0); return;
  }
  if (button.dataset.gearBack !== undefined && view.page === 'gear') { view.page = view.gearOrigin; render(); window.scrollTo(0, 0); return; }
  if (button.dataset.gearTab && view.page === 'gear') {
    if (wardrobe.tabs.some(([key]) => key === button.dataset.gearTab)) { view.gearTab = button.dataset.gearTab; render(); }
    return;
  }
  if (button.dataset.gearFlip !== undefined) {
    const flipped = !button.classList.contains('is-flipped');
    button.classList.toggle('is-flipped', flipped);
    button.setAttribute('aria-pressed', String(flipped));
    return;
  }
  if (button.dataset.gearVariant && (view.page === 'today' || view.page === 'detail')) { view.gearVariant = button.dataset.gearVariant; render(); return; }
  if (button.dataset.gearRetry !== undefined && (view.page === 'today' || view.page === 'detail')) { view.weather = null; render(); return; }
  if (button.dataset.asanaFilter && view.page === 'asanas') {
    if (asanas.filters.some(([key]) => key === button.dataset.asanaFilter)) { view.asanaFilter = button.dataset.asanaFilter; render(); }
    return;
  }
  if (button.dataset.open) { openSession(button.dataset.open); return; }
  if (button.dataset.quickComplete) { completeSession(button.dataset.quickComplete); return; }
  if (button.dataset.quickSkip) { skipSession(button.dataset.quickSkip); return; }
  if (button.dataset.toggleData && view.page === 'data') {
    const id = button.dataset.toggleData, y = window.scrollY || 0;
    view.dataOpen = view.dataOpen.includes(id) ? view.dataOpen.filter(item => item !== id) : [...view.dataOpen, id];
    render(); window.scrollTo(0, y); return;
  }
  if (button.dataset.toggleWeek) {
    const week = Number(button.dataset.toggleWeek);
    view.expandedWeeks = view.expandedWeeks.includes(week) ? view.expandedWeeks.filter(value => value !== week) : [...view.expandedWeeks, week];
    render();
    app.querySelector(`[data-toggle-week="${week}"]`)?.focus();
    return;
  }
  if (button.dataset.previewSession) {
    const session = findSession(button.dataset.previewSession);
    if (!session) return;
    view.calendarDate = session.scheduledDate;
    const date = parseDate(session.scheduledDate), today = parseDate(localDate());
    view.monthOffset = (date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth();
    render();
    app.querySelector('.calendar-layout')?.scrollIntoView({ block: 'start' });
    return;
  }
  if (button.dataset.day) {
    view.calendarDate = button.dataset.day;
    render();
    return;
  }
  if (button.dataset.month) { view.monthOffset += Number(button.dataset.month); view.calendarDate = localDate(monthAnchor()); render(); return; }
  if (button.dataset.back !== undefined) { backFromDetail(); return; }
  const session = findSession(view.selectedId);
  if ((button.dataset.skillRepsEdit || button.dataset.skillRepsSave) && session && skill.applies(workoutById[session.workoutId])) {
    const exerciseId = button.dataset.skillRepsEdit || button.dataset.skillRepsSave;
    const index = Number(button.dataset.setIndex);
    const record = state.skillRecords.find(item => item.scheduledSessionId === session.scheduledSessionId);
    const item = record?.exercises.find(item => item.exerciseId === exerciseId);
    if (!item || !Number.isInteger(index) || !item.actualSets[index]) return;
    if (button.dataset.skillRepsEdit) {
      view.skillEditingSet = `${session.scheduledSessionId}:${exerciseId}:${index}`;
      render();
      app.querySelector(`[data-skill-reps-input="${exerciseId}"][data-set-index="${index}"]`)?.focus();
    } else {
      const input = app.querySelector(`[data-skill-reps-input="${exerciseId}"][data-set-index="${index}"]`);
      const reps = Number(input?.value);
      if (!input || !Number.isInteger(reps) || reps < 1 || reps > 100) {
        view.message = 'Укажи количество повторов от 1 до 100.';
        render(); return;
      }
      item.actualSets[index].reps = reps;
      view.skillEditingSet = null;
      view.message = '';
      save();
    }
    return;
  }
  if (button.dataset.skillPrevious && session && skill.applies(workoutById[session.workoutId])) {
    const record = state.skillRecords.find(item => item.scheduledSessionId === session.scheduledSessionId);
    const item = record.exercises.find(item => item.exerciseId === button.dataset.skillPrevious);
    const exercise = skill.exercises.find(item => item.exerciseId === button.dataset.skillPrevious);
    if (item && exercise) changeSkillDose(record, item, exercise, item.doseWeek === record.week ? record.week - 1 : record.week);
    return;
  }
  if (button.dataset.skillSkip !== undefined && session && skill.applies(workoutById[session.workoutId])) {
    const record = state.skillRecords.find(item => item.scheduledSessionId === session.scheduledSessionId);
    record.explicitlySkipped = !record.explicitlySkipped; save(); return;
  }
  if (button.dataset.complete !== undefined && session) { completeSession(session.scheduledSessionId); return; }
  if (button.dataset.rate !== undefined && session) { ratingDialog(session, true); return; }
  if (button.dataset.skip !== undefined && session) { skipSession(session.scheduledSessionId); return; }
  if (button.dataset.restore !== undefined && session && confirm('Вернуть занятие в план?')) {
    if (state.sessions.some(item => item.scheduledSessionId !== session.scheduledSessionId && item.scheduledDate === session.scheduledDate && item.status !== 'skipped')) {
      view.message = 'На эту дату уже запланирована тренировка. Выбери другую.';
      render(); return;
    }
    if (session.status === 'completed') state.completions = state.completions.filter(item => item.scheduledSessionId !== session.scheduledSessionId);
    session.status = 'planned'; save(); return;
  }
  if (button.dataset.replace !== undefined && session) { session.variant = session.variant === 'base' ? 'replacement' : 'base'; save(); return; }
  if (button.dataset.move !== undefined && session) { moveDialog(session); return; }
  if (button.dataset.altDone !== undefined && session && session.status === 'planned') { altDialog(session); return; }
  if (button.dataset.editNote !== undefined && session && session.status === 'completed') { noteDialog(session); return; }
  if (button.dataset.addExtra !== undefined && view.page === 'data') { extraDialog(); return; }
  if (button.dataset.deleteExtra && view.page === 'data' && confirm('Удалить это занятие?')) {
    state.extras = (state.extras || []).filter(item => item.extraId !== button.dataset.deleteExtra);
    if (!state.extras.length) delete state.extras;
    save(); return;
  }
  if (button.dataset.addMeasure !== undefined) { measureDialog(); return; }
  if (button.dataset.deleteMeasure && confirm('Удалить эту запись?')) { state.measurements = state.measurements.filter(item => item.measurementId !== button.dataset.deleteMeasure); save(); return; }
  if (button.dataset.export !== undefined) { exportData(); return; }
  if (button.dataset.import !== undefined) { importFile.click(); return; }
  if (button.dataset.restart !== undefined) { restartDialog(); }
});
dialog.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.syncKeep && sync) { const choice = button.dataset.syncKeep; closeDialog(); conflictShown = false; sync.resolve(choice); return; }
  const session = findSession(view.selectedId);
  if (button.dataset.rating && session) {
    const existing = state.completions.find(item => item.scheduledSessionId === session.scheduledSessionId);
    if (existing) existing.rating = button.dataset.rating;
    else state.completions.push({ completionId: uid(), scheduledSessionId: session.scheduledSessionId, completedDate: localDate(), rating: button.dataset.rating });
    session.status = 'completed'; closeDialog(); save(); return;
  }
  if (button.dataset.altRating && session && session.status === 'planned') {
    const note = dialog.querySelector('#alt-text').value.trim();
    const minutes = readMinutes('#alt-min');
    if (!note) { showDialogError('Напиши, что ты делала.'); return; }
    if (!minutes.ok) { showDialogError(`Минуты: целое число от 1 до ${MINUTES_MAX}.`); return; }
    if (!Object.keys(ratingLabels).includes(button.dataset.altRating)) return;
    state.completions.push({ completionId: uid(), scheduledSessionId: session.scheduledSessionId, completedDate: localDate(), rating: button.dataset.altRating, alt: true, note: note.slice(0, NOTE_MAX), ...(minutes.value ? { minutes: minutes.value } : {}) });
    session.status = 'completed'; closeDialog(); save(); return;
  }
  if (button.dataset.saveNote !== undefined && session) {
    const completion = state.completions.find(item => item.scheduledSessionId === session.scheduledSessionId);
    if (!completion) return;
    const note = dialog.querySelector('#note-text').value.trim();
    if (note) completion.note = note.slice(0, NOTE_MAX); else delete completion.note;
    closeDialog(); save(); return;
  }
  if (button.dataset.extraRating) {
    const date = dialog.querySelector('#extra-date').value;
    const title = dialog.querySelector('#extra-title').value.trim();
    const minutes = readMinutes('#extra-min');
    const note = dialog.querySelector('#extra-note').value.trim();
    if (!parseDate(date)) { showDialogError('Укажи корректную дату.'); return; }
    if (!title) { showDialogError('Напиши, что это было.'); return; }
    if (!minutes.ok) { showDialogError(`Минуты: целое число от 1 до ${MINUTES_MAX}.`); return; }
    if (!Object.keys(ratingLabels).includes(button.dataset.extraRating)) return;
    (state.extras ??= []).push({ extraId: uid(), date, title: title.slice(0, 80), minutes: minutes.value, rating: button.dataset.extraRating, ...(note ? { note: note.slice(0, NOTE_MAX) } : {}) });
    closeDialog(); save(); return;
  }
  if (button.dataset.confirmMove !== undefined && session) {
    const date = dialog.querySelector('#move-date').value;
    if (!parseDate(date)) { showDialogError('Укажите корректную дату.'); return; }
    if (state.sessions.some(item => item.scheduledSessionId !== session.scheduledSessionId && item.scheduledDate === date && item.status !== 'skipped')) {
      showDialogError('На этот день уже есть тренировка. Выбери другой.'); return;
    }
    session.scheduledDate = date; closeDialog(); save(); return;
  }
  if (button.dataset.saveMeasure !== undefined) {
    const date = dialog.querySelector('#measure-date').value;
    if (!parseDate(date)) { showDialogError('Укажите корректную дату.'); return; }
    const values = {};
    for (const field of ['weight', 'waist', 'hips', 'chest']) {
      const raw = dialog.querySelector(`#measure-${field}`).value;
      values[field] = raw === '' ? null : Number(raw);
      if (values[field] !== null && (!Number.isFinite(values[field]) || values[field] <= 0 || values[field] > 500)) { showDialogError('Введи число больше нуля.'); return; }
    }
    if (Object.values(values).every(value => value === null)) { showDialogError('Укажи вес или хотя бы один замер.'); return; }
    state.measurements.push({ measurementId: uid(), date, ...values }); closeDialog(); save(); return;
  }
  if (button.dataset.confirmRestart !== undefined) {
    const date = dialog.querySelector('#start-date').value;
    const parsed = parseDate(date);
    if (!parsed || parsed.getDay() !== 1) { showDialogError('Выбери понедельник для начала программы.'); return; }
    if (!confirm('Начать программу заново? Текущие отметки и замеры будут удалены.')) return;
    const keptAsanas = state.asanas, keptRuns = state.runs, keptInventory = state.inventory, keptExtras = state.extras, keptGear = state.gear;
    state = initialState(date); useProgram(state); if (keptAsanas) state.asanas = keptAsanas; if (keptRuns) state.runs = keptRuns; if (keptInventory) state.inventory = keptInventory; if (keptExtras) state.extras = keptExtras; if (keptGear) state.gear = keptGear; view.page = 'today'; view.selectedId = null; view.expandedWeeks = [programWeekForDate(date, localDate()) || (localDate() < date ? 1 : 4)]; view.monthOffset = 0; closeDialog(); save();
  }
});
garminFile.addEventListener('change', async () => {
  const file = garminFile.files?.[0];
  garminFile.value = '';
  if (!file) return;
  if (file.size > 2_000_000) { view.message = 'Этот файл слишком большой для выгрузки занятий.'; render(); return; }
  const result = garmin.parse(await file.text());
  if (result.error) { view.message = result.error; render(); return; }
  const added = garmin.merge(state, result.runs);
  if (added < 0) { view.message = `Можно хранить не больше ${garmin.MAX_RUNS} пробежек.`; render(); return; }
  view.message = `Пробежек добавлено: ${added}${result.runs.length - added ? `, уже были: ${result.runs.length - added}` : ''}${result.bad ? `, не прочитано строк: ${result.bad}` : ''}.`;
  if (added) save();
  render();
});
importFile.addEventListener('change', async () => {
  const file = importFile.files?.[0];
  importFile.value = '';
  if (!file) return;
  if (file.size > 2_000_000) { view.message = 'Этот файл слишком большой. Выбери файл с данными приложения.'; render(); return; }
  try {
    const imported = migrateSchedule(JSON.parse(await file.text()));
    if (!validState(imported)) throw new Error('Формат или данные программы не подходят для этой версии.');
    if (!confirm('Загрузить эти данные? Они заменят текущую программу, отметки и замеры.')) return;
    state = imported; useProgram(state); skill.sync(state, workoutById); view.page = 'today'; view.selectedId = null; view.expandedWeeks = [programWeekForDate(imported.startDate, localDate()) || (localDate() < imported.startDate ? 1 : 4)]; view.monthOffset = 0;
    save(); view.message = 'Данные загружены.'; render();
  } catch (error) { view.message = 'Не удалось загрузить данные. Проверь, что выбран файл с данными этого приложения.'; render(); }
});

const syncConfig = window.RHYTHM_SYNC_CONFIG;
function isPristineState(s) {
  return !s.completions.length && !s.measurements.length && !(s.runs || []).length && !Object.keys(s.asanas || {}).length &&
    !Object.keys(s.yoga || {}).length && !Object.keys(s.inventory || {}).length && !Object.keys(s.gear || {}).length && !(s.extras || []).length && !s.previous && s.programId !== cycle2.ID;
}
function summarizeState(s) {
  return `${s.programId === cycle2.ID ? `цикл ${s.cycleNumber}` : 'первый цикл'}, старт ${fmtDate(s.startDate)}, отмечено занятий: ${s.completions.length}, пробежек Garmin: ${(s.runs || []).length}`;
}
function applyRemoteState(raw) {
  const data = migrateSchedule(raw);
  if (!validState(data)) return false;
  state = data; useProgram(state); skill.sync(state, workoutById);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* данные останутся в памяти до перезагрузки */ }
  if (view.page === 'detail' || view.page === 'cycle2' || view.page === 'archive') view.page = 'today';
  view.selectedId = null;
  view.expandedWeeks = [programWeekForDate(state.startDate, localDate()) || (localDate() < state.startDate ? 1 : 4)];
  view.message = 'Данные обновлены из облака.';
  return true;
}
function loadSupabaseClient() {
  const make = lib => lib.createClient(syncConfig.url, syncConfig.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  if (window.supabase?.createClient) return Promise.resolve(make(window.supabase));
  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.1/dist/umd/supabase.js';
    script.onload = () => resolve(window.supabase?.createClient ? make(window.supabase) : null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}
function syncStatusText(status) {
  const when = status.lastSync ? new Date(status.lastSync).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : null;
  if (status.phase === 'syncing') return 'Синхронизирую…';
  if (status.phase === 'conflict') return status.message;
  if (status.phase === 'error') return status.message;
  return `${status.dirty ? 'Есть изменения, которые ещё не отправлены. ' : 'Всё синхронизировано. '}${when ? `Последняя проверка в ${when}.` : ''}`.trim();
}
function syncPanel() {
  if (!sync) return '';
  const s = sync.status();
  if (s.phase === 'off') return `<section class="content-panel"><h2>Синхронизация</h2><p class="panel-intro">${escapeHtml(s.message || 'Подключаюсь…')}</p></section>`;
  if (!s.signedIn) return `<section class="content-panel sync-panel"><h2>Синхронизация</h2>
    <p class="panel-intro">Войди своей почтой и паролем от аккаунта Supabase, и отметки будут одни и те же на всех твоих устройствах. Пароль приложение не хранит.</p>
    <label class="field-label">Почта<input id="sync-email" type="email" inputmode="email" autocomplete="username" value="${escapeHtml(s.email)}"></label>
    <label class="field-label">Пароль<input id="sync-password" type="password" autocomplete="current-password"></label>
    <button type="button" class="primary-btn" data-sync-signin>Войти</button>
    ${s.message ? `<p class="dialog-note" role="status">${escapeHtml(s.message)}</p>` : ''}</section>`;
  return `<section class="content-panel sync-panel"><h2>Синхронизация</h2>
    <p class="panel-intro">Аккаунт: <strong>${escapeHtml(s.email)}</strong>. ${escapeHtml(syncStatusText(s))}</p>
    <div class="action-pair">${s.phase === 'conflict' ? '<button type="button" data-sync-conflict>Выбрать версию</button>' : '<button type="button" data-sync-now>Синхронизировать</button>'}<button type="button" data-sync-out>Выйти</button></div></section>`;
}
function conflictDialog() {
  const s = sync?.status();
  if (!s?.conflict) return;
  openDialog('Данные разошлись', `<p>Отметки на этом устройстве и в облаке отличаются. Ничего не потеряется, пока ты не выберешь.</p>
    <p><strong>На этом устройстве:</strong> ${escapeHtml(s.conflict.local)}</p><p><strong>В облаке:</strong> ${escapeHtml(s.conflict.remote)}</p>
    <div class="action-pair"><button type="button" data-sync-keep="local">Оставить с этого устройства</button><button type="button" data-sync-keep="cloud">Взять из облака</button></div>
    <p class="dialog-note">Выбранная версия заменит другую. Если не уверена, сначала скачай данные в разделе «Данные».</p>`);
}
let conflictShown = false;
function syncChanged() {
  const s = sync.status();
  if (s.phase === 'conflict' && !conflictShown && !dialog.open) { conflictShown = true; render(); conflictDialog(); return; }
  if (s.phase !== 'conflict') conflictShown = false;
  const typing = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  if (!(view.page === 'data' && typing)) render();
}
if (syncConfig?.url && syncConfig?.anonKey && window.RHYTHM_SYNC) {
  sync = window.RHYTHM_SYNC.create({ getClient: loadSupabaseClient, storage: localStorage, getState: () => state, applyRemote: applyRemoteState, isPristine: isPristineState, summarize: summarizeState, onChange: syncChanged });
  window.addEventListener('online', () => sync.syncNow());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync.syncNow(); });
}
render();
if (sync) sync.init();
if (storageReady && (migratedPristineCycle || migratedSchedule || !localStorage.getItem(STORAGE_KEY))) save({ fromSync: true });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});

app.addEventListener('change', event => {
  const input = event.target, data = input.dataset;
  if (data.inventory !== undefined) {
    if (view.page !== 'data' || !inventoryIds.includes(data.inventory)) return;
    const y = window.scrollY || 0;
    (state.inventory ??= {})[data.inventory] = !!input.checked;
    save(); render(); window.scrollTo(0, y);
    return;
  }
  if (data.gearUse !== undefined) {
    if (view.page !== 'gear' || !wardrobe.setUse(state, data.gearUse, !!input.checked)) { render(); return; }
    const y = window.scrollY || 0;
    save(); render(); window.scrollTo(0, y);
    return;
  }
  if (data.yogaDone !== undefined || data.yogaMinutes !== undefined) {
    if (view.page !== 'yoga') return;
    const y = window.scrollY || 0;
    view.yogaError = '';
    if (data.yogaDone !== undefined) { if (!yoga.setDone(state, data.yogaDone, input.checked)) { render(); return; } }
    else if (!yoga.setMinutes(state, data.yogaMinutes, input.value)) { view.yogaError = `Минуты: целое число от 1 до ${yoga.MAX_MINUTES}.`; render(); window.scrollTo(0, y); return; }
    save(); render(); window.scrollTo(0, y);
    return;
  }
  if (data.asanaFlag) {
    if (view.page !== 'asanas') return;
    if (!asanas.setFlag(state, data.asanaId, data.asanaFlag, input.checked)) { render(); return; }
    view.message = '';
    const y = window.scrollY || 0;
    save(); render(); window.scrollTo(0, y);
    return;
  }
  const exerciseId = data.skillBand || data.skillDose || data.skillSet || data.skillReps;
  if (!exerciseId || view.page !== 'detail') return;
  const session = findSession(view.selectedId);
  if (!session || !skill.applies(workoutById[session.workoutId])) return;
  const record = state.skillRecords.find(item => item.scheduledSessionId === session.scheduledSessionId);
  const item = record.exercises.find(item => item.exerciseId === exerciseId);
  const exercise = skill.exercises.find(item => item.exerciseId === exerciseId);
  if (!item || !exercise) return;
  const reject = message => { view.message = message; render(); };
  if (data.skillBand) {
    if (!skill.bands.includes(input.value)) { render(); return; }
    item.band = input.value;
    state.skillLastBands[exerciseId] = input.value;
  } else if (data.skillDose) {
    const week = Number(input.value);
    if (!Number.isInteger(week) || week < 1 || week > record.week || week === item.doseWeek) { render(); return; }
    changeSkillDose(record, item, exercise, week);
    return;
  } else {
    const index = Number(data.setIndex);
    if (!Number.isInteger(index) || !item.actualSets[index]) return;
    if (data.skillReps) {
      const reps = Number(input.value);
      if (!Number.isInteger(reps) || reps < 1 || reps > 100) { reject('Укажи количество повторов от 1 до 100.'); return; }
      item.actualSets[index].reps = reps;
    } else {
      if (input.checked) {
        const band = item.band || state.skillLastBands[exerciseId];
        if (!band) { reject('Сначала выбери петлю.'); return; }
        item.band = band;
        state.skillLastBands[exerciseId] = band;
      }
      item.actualSets[index].done = input.checked;
      record.explicitlySkipped = false;
    }
  }
  view.message = '';
  save();
});
