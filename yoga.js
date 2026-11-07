// Необязательные занятия йоги по вторникам и субботам. Отдельный учёт: 16 основных занятий не затрагивают.
window.RHYTHM_YOGA = (() => {
  const { addDays, weekRange } = window.RHYTHM_SCHEDULE;
  const MAX_MINUTES = 180;
  const defaultFocuses = [
    { week: 1, title: 'Бёдра и запястья', poses: ['garland', 'downward-dog'], tip: 'Гирлянда по 30–40 секунд, разминка запястий. Цель недели: комфортно сидеть в глубоком приседе.' },
    { week: 2, title: 'Пресс и вес на руках', poses: ['boat', 'chaturanga'], tip: 'Лодка 3 × 15 секунд, чатуранга с колен. Цель недели: чувствовать вес на руках.' },
    { week: 3, title: 'Подготовка к вороне', poses: ['garland', 'crow'], tip: 'Из гирлянды колени к плечам, на носки, вес вперёд. Подушка перед лицом. Одна нога на весу.' },
    { week: 4, title: 'Бакасана: попытки', poses: ['crow'], tip: 'Несколько попыток по 3–5 секунд с подушкой. Если больно в запястьях или шее, остановись.' }
  ];
  const NEXT_TARGETS = [['side-crow', 'Боковая ворона'], ['flying-pigeon', 'Летающий голубь'], ['forearm-stand', 'Стойка на предплечьях']];
  // Если бакасана уже получается самостоятельно, навык недели уходит к следующей цели из каталога; иначе подводящая программа к вороне.
  function focusesFor(state) {
    if (!state?.asanas?.crow?.can) return defaultFocuses;
    const target = NEXT_TARGETS.find(([id]) => !state.asanas[id]?.can);
    if (!target) return [{ week: 1, title: 'Закрепление', poses: ['crow'], tip: 'Все ближайшие цели отмечены как «Умею». Держи ворону 10–15 секунд, 3 подхода, и качество, а не новые позы.' }, defaultFocuses[1], defaultFocuses[2], defaultFocuses[3]].map((focus, i) => ({ ...focus, week: i + 1 }));
    const [id, name] = target;
    return [
      { week: 1, title: 'Бакасана: закрепление', poses: ['crow'], tip: 'Ворона уже получается. Держи 10–15 секунд, 3 подхода, и качество входа и выхода.' },
      { week: 2, title: `Подводящие к «${name}»`, poses: [id, 'crow'], tip: `Смотри технику по ссылке. Ворона остаётся разминкой, «${name}» только подводящие упражнения без риска.` },
      { week: 3, title: `«${name}»: углубляем`, poses: [id], tip: 'Подводящие упражнения дольше и увереннее. Если неудобно запястьям, шее или плечам, остановись.' },
      { week: 4, title: 'Лёгкая неделя', poses: ['crow', 'garland'], tip: 'Ворона и гирлянда в комфортном объёме. Тело закрепляет нагрузку.' }
    ];
  }
  const days = [{ weekday: 'Вт', offset: 1 }, { weekday: 'Сб', offset: 5 }];
  function slots(startDate, state) {
    return focusesFor(state).flatMap(focus => days.map(day => ({ date: addDays(weekRange(startDate, focus.week).monday, day.offset), weekday: day.weekday, week: focus.week, focus })));
  }
  const slotFor = (startDate, date, state) => slots(startDate, state).find(slot => slot.date === date) || null;
  function valid(state) {
    if (state.yoga === undefined) return true;
    if (!state.yoga || typeof state.yoga !== 'object' || Array.isArray(state.yoga)) return false;
    const dates = new Set(slots(state.startDate).map(slot => slot.date));
    return Object.entries(state.yoga).every(([date, value]) => dates.has(date) && value && typeof value === 'object' && !Array.isArray(value) &&
      value.done === true && (value.minutes === null || (Number.isInteger(value.minutes) && value.minutes >= 1 && value.minutes <= MAX_MINUTES)));
  }
  function setDone(state, date, done) {
    if (typeof done !== 'boolean' || !slotFor(state.startDate, date)) return false;
    if (done) { state.yoga ??= {}; state.yoga[date] ??= { done: true, minutes: null }; }
    else if (state.yoga) delete state.yoga[date];
    return true;
  }
  function setMinutes(state, date, raw) {
    if (!state.yoga?.[date]) return false;
    const text = String(raw ?? '').trim();
    if (!text) { state.yoga[date].minutes = null; return true; }
    const minutes = Number(text);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) return false;
    state.yoga[date].minutes = minutes;
    return true;
  }
  const count = state => slots(state.startDate).filter(slot => state.yoga?.[slot.date]).length;
  return { slots, slotFor, focusesFor, valid, setDone, setMinutes, count, MAX_MINUTES };
})();
