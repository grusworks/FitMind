// Импорт пробежек из CSV-выгрузки Garmin Connect (русские заголовки). Данные остаются в браузере.
window.RHYTHM_GARMIN = (() => {
  const { parseDate } = window.RHYTHM_SCHEDULE;
  const MAX_RUNS = 3000, MAX_ROWS = 6000;
  const needed = ['Тип занятия', 'Дата', 'Расстояние', 'Время'];

  function parseCsv(text) {
    const rows = []; let row = [], field = '', quoted = false;
    const source = String(text).replace(/^﻿/, '');
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (quoted) {
        if (ch === '"') { if (source[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && source[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(cell => cell !== '')) rows.push(row);
        row = [];
        if (rows.length > MAX_ROWS) throw new Error('Слишком много строк.');
      } else field += ch;
    }
    row.push(field); if (row.some(cell => cell !== '')) rows.push(row);
    return rows;
  }
  const number = value => { const n = Number(String(value ?? '').replace(',', '.').replace(/^'/, '').trim()); return value === '--' || value === '' || !Number.isFinite(n) ? null : n; };
  function seconds(value) {
    const m = /^(\d{1,2}):(\d{2}):(\d{2})(?:\.\d+)?$/.exec(String(value || '').trim());
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
  }
  function parse(text) {
    let rows;
    try { rows = parseCsv(text); } catch { return { error: 'Файл слишком большой или повреждён.' }; }
    if (!rows.length) return { error: 'Файл пустой.' };
    const header = rows[0].map(cell => cell.trim());
    if (!needed.every(name => header.includes(name))) return { error: 'Это не похоже на выгрузку занятий из Garmin Connect (нужны колонки «Тип занятия», «Дата», «Расстояние», «Время»).' };
    if (rows.length < 2) return { error: 'В файле нет строк с занятиями.' };
    const col = name => header.indexOf(name);
    const runs = []; let other = 0, bad = 0;
    for (const row of rows.slice(1)) {
      if (!/^бег/i.test((row[col('Тип занятия')] || '').trim())) { other++; continue; }
      const id = (row[col('Дата')] || '').trim();
      const date = id.slice(0, 10);
      const km = number(row[col('Расстояние')]);
      const secs = seconds(row[col('Время')]);
      const avgHr = number(row[col('Средняя ЧП')]), maxHr = number(row[col('Максимальная ЧП')]);
      if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(id) || !parseDate(date) || !(km > 0 && km <= 200) || !(secs >= 60 && secs <= 86400) ||
          [avgHr, maxHr].some(hr => hr !== null && !(Number.isInteger(hr) && hr >= 30 && hr <= 250))) { bad++; continue; }
      runs.push({ id, date, km: Math.round(km * 100) / 100, seconds: secs, avgHr, maxHr });
    }
    return { runs, other, bad };
  }
  function valid(state) {
    if (state.runs === undefined) return true;
    if (!Array.isArray(state.runs) || state.runs.length > MAX_RUNS) return false;
    const seen = new Set();
    return state.runs.every(run => run && typeof run === 'object' && typeof run.id === 'string' && run.id.length <= 30 && !seen.has(run.id) && seen.add(run.id) &&
      typeof run.date === 'string' && parseDate(run.date) && run.id.startsWith(run.date) &&
      typeof run.km === 'number' && run.km > 0 && run.km <= 200 && Number.isInteger(run.seconds) && run.seconds >= 60 && run.seconds <= 86400 &&
      [run.avgHr, run.maxHr].every(hr => hr === null || (Number.isInteger(hr) && hr >= 30 && hr <= 250)));
  }
  function merge(state, runs) {
    const have = new Set((state.runs || []).map(run => run.id));
    const fresh = runs.filter((run, i) => !have.has(run.id) && runs.findIndex(other => other.id === run.id) === i);
    if ((state.runs?.length || 0) + fresh.length > MAX_RUNS) return -1;
    if (fresh.length) state.runs = [...(state.runs || []), ...fresh].sort((a, b) => b.id.localeCompare(a.id));
    return fresh.length;
  }
  const pace = run => { const s = Math.round(run.seconds / run.km); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  return { parse, valid, merge, pace, MAX_RUNS };
})();
