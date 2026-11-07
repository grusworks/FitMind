// Цикл 2: те же четыре занятия в неделю, длительность бега считается от реальных пробежек, а не от плана.
window.RHYTHM_CYCLE2 = (() => {
  const base = window.RHYTHM_PROGRAM;
  const { addDays, parseDate } = window.RHYTHM_SCHEDULE;
  const ID = 'second-cycle-v1';
  const LONG = [25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 55, 60];
  const SHORT = [20, 22, 24, 25, 28, 30, 32, 35, 38, 40, 42, 45];
  const SHORT_SHARE = 0.75, EASY_SHARE = 0.75, DELOAD = 0.8, RECENT_DAYS = 30, PAUSE_DAYS = 14, LONG_RUN_CAP = 1.1;
  const pilatesGoals = [
    'Пилатес + подвижность. Двигайся чище и спокойнее, без спешки.',
    'Другой вариант пилатеса + подвижность. Следи за контролем корпуса.',
    'Знакомый пилатес. Сделай движения точнее, чем в прошлый раз.',
    'Лёгкая неделя: знакомый пилатес в комфортном объёме.'
  ];
  const strengthGoals = [
    'Силовая на всё тело. Пройди тренировку до конца, паузы по необходимости.',
    'Попробуй пройти тренировку с меньшим числом пауз. Бутылки по 1,5 л остаются.',
    'Если предыдущая прошла без лишних пауз, добавь утяжелители 0,75 кг в упражнениях на ноги и плечи.',
    'Лёгкая неделя: тот же объём, без утяжелителей, технику держи чище.'
  ];

  const intList = (list, min, max) => Array.isArray(list) && list.length === 4 && list.every(n => Number.isInteger(n) && n >= min && n <= max);
  function validPlan(plan) {
    return !!plan && typeof plan === 'object' && !Array.isArray(plan) && intList(plan.long, 10, 120) && intList(plan.short, 10, 120) &&
      (plan.reasons === undefined || (Array.isArray(plan.reasons) && plan.reasons.length <= 12 && plan.reasons.every(text => typeof text === 'string' && text.length <= 300)));
  }
  function build(plan) {
    if (!validPlan(plan)) throw new Error('Некорректный план цикла 2.');
    const workouts = base.workouts.map(source => {
      const suffix = source.workoutId.slice(base.PROGRAM_ID.length + 1);
      const workout = { ...source, workoutId: `${ID}-${suffix}` };
      delete workout.gap;
      const index = source.week - 1;
      if (source.run) {
        const minutes = (source.workoutId.endsWith('run-short') ? plan.short : plan.long)[index];
        const runSeconds = minutes * 60;
        workout.run = { warmupSeconds: 300, runSeconds, cooldownSeconds: 300 };
        workout.durationSeconds = 600 + runSeconds;
        workout.goal = `${minutes} минут лёгкого бега в разговорном темпе.${index === 3 ? ' Это лёгкая неделя.' : ''}`;
      } else if (source.kind === 'pilates') workout.goal = pilatesGoals[index];
      else workout.goal = strengthGoals[index];
      return workout;
    });
    return { PROGRAM_ID: ID, workouts, workoutById: Object.fromEntries(workouts.map(workout => [workout.workoutId, workout])) };
  }

  const floorIndex = (list, value) => { let found = 0; list.forEach((item, i) => { if (item <= value) found = i; }); return found; };
  const daysBetween = (from, to) => Math.round((parseDate(to) - parseDate(from)) / 86400000);
  const clock = seconds => `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}` : Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  // Возвращает { plan, summary }. verdict приходит из decision.decide: grow / hold / back / wait.
  function makePlan(state, workoutById, today, verdict) {
    const from = addDays(today, -RECENT_DAYS);
    const reasons = [];
    const own = state.completions.map(completion => {
      const session = state.sessions.find(item => item.scheduledSessionId === completion.scheduledSessionId);
      const workout = session && workoutById[session.workoutId];
      return workout?.run && completion.rating !== 'hard' && completion.completedDate >= from
        ? { date: completion.completedDate, minutes: workout.run.runSeconds / 60 } : null;
    }).filter(Boolean);
    const garminRuns = (state.runs || []).filter(run => run.date >= from);
    const real = [...own, ...garminRuns.map(run => ({ date: run.date, minutes: run.seconds / 60 }))];
    const lastRunPool = [...state.completions.filter(c => workoutById[state.sessions.find(s => s.scheduledSessionId === c.scheduledSessionId)?.workoutId]?.run).map(c => c.completedDate), ...(state.runs || []).map(run => run.date)];
    const lastRun = lastRunPool.sort().pop() || null;
    const candidates = [...own.map(item => item.minutes), ...garminRuns.map(run => run.seconds / 60 * EASY_SHARE)];
    const anchor = candidates.length ? Math.max(...candidates) : LONG[3];
    let start = floorIndex(LONG, anchor);
    if (candidates.length) {
      const top = garminRuns.slice().sort((a, b) => b.seconds - a.seconds)[0];
      reasons.push(top ? `Опора: самая длинная пробежка за 30 дней, ${top.date.slice(8)}.${top.date.slice(5, 7)}, ${String(top.km).replace('.', ',')} км за ${clock(top.seconds)}. Для лёгкого бега берём 75% от её времени (это моя консервативная оценка): около ${Math.round(top.seconds / 60 * EASY_SHARE)} мин.` : `Опора: твои лёгкие пробежки по программе, до ${Math.round(anchor)} мин.`);
    } else reasons.push('За последние 30 дней нет пробежек в данных, поэтому старт взят из конца цикла 1: 32 минуты.');
    const pause = lastRun ? daysBetween(lastRun, today) : null;
    if (pause !== null && pause >= PAUSE_DAYS) { start = Math.max(0, start - 1); reasons.push(`Пауза в беге ${pause} дн.: старт на ступень ниже.`); }
    if (verdict === 'back') { start = Math.max(0, start - 1); reasons.push('По последним двум неделям нагрузку лучше снизить: старт на ступень ниже.'); }
    const growth = verdict === 'grow' ? [0, 1, 2] : verdict === 'back' ? [0, 0, 0] : [0, 0, 1];
    reasons.push(verdict === 'grow' ? 'Последние две недели прошли хорошо: длинный бег растёт на ступень в неделю.' : verdict === 'back' ? 'Лёгкая неделя в начале: рост только после того, как тело подтвердит.' : 'Рост медленный: одна ступень за три недели. Если неделя тяжёлая, повтори предыдущую длительность.');
    const recentLongest = real.length ? Math.max(...real.map(item => item.minutes)) : null;
    const cap = recentLongest ? Math.max(LONG[start], recentLongest * LONG_RUN_CAP) : Infinity;
    const capIndex = Math.max(start, floorIndex(LONG, cap));
    const long = growth.map(step => LONG[Math.min(start + step, capIndex, LONG.length - 1)]);
    long.push(LONG[floorIndex(LONG, long[2] * DELOAD)]);
    const short = long.slice(0, 3).map(minutes => SHORT[floorIndex(SHORT, minutes * SHORT_SHARE)]);
    short.push(SHORT[floorIndex(SHORT, short[2] * DELOAD)]);
    reasons.push('Неделя 4 легче примерно на 20%: тело успевает догнать нагрузку.');
    reasons.push('Если хочется быстрее, одну пробежку в неделю можно сделать «рабочей» (как твои прежние), остальные лёгкие. Приложение ничего не блокирует.');
    return { plan: { long, short, reasons }, pauseDays: pause, anchor };
  }
  // Пересчёт оставшихся недель по факту: только будущие недели, выполненные не меняются. Неделя 4 всегда лёгкая.
  function replan(state, today, verdict) {
    if (state.programId !== ID || !validPlan(state.plan)) return null;
    const current = window.RHYTHM_SCHEDULE.programWeekForDate(state.startDate, today);
    if (!current || current >= 4) return null;
    const long = [...state.plan.long], short = [...state.plan.short];
    const step = verdict === 'grow' ? 1 : verdict === 'back' ? -1 : 0;
    for (let i = current; i < 3; i++) {
      const rung = floorIndex(LONG, long[i - 1]);
      long[i] = LONG[Math.max(0, Math.min(LONG.length - 1, rung + step))];
      short[i] = SHORT[floorIndex(SHORT, long[i] * SHORT_SHARE)];
    }
    long[3] = LONG[floorIndex(LONG, long[2] * DELOAD)];
    short[3] = SHORT[floorIndex(SHORT, short[2] * DELOAD)];
    const changed = [];
    for (let i = current; i < 4; i++) if (long[i] !== state.plan.long[i] || short[i] !== state.plan.short[i]) changed.push({ week: i + 1, shortOld: state.plan.short[i], shortNew: short[i], longOld: state.plan.long[i], longNew: long[i] });
    const note = { grow: 'можно повышать, шаг на одну ступень в неделю', back: 'нагрузку лучше снизить, шаг на одну ступень вниз', hold: 'держим уровень', wait: 'мало данных, держим уровень' }[verdict] || 'держим уровень';
    const reasons = [...(state.plan.reasons || []), `Обновлено ${today.slice(8)}.${today.slice(5, 7)}: ${note}.`].slice(-12);
    return { plan: { long, short, reasons }, changed };
  }
  return { ID, LONG, SHORT, validPlan, build, makePlan, replan };
})();
