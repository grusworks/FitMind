// Подсказка по нагрузке: растём / держим / шаг назад. Решение по набору признаков за последние 14 дней, а не по одной оценке.
window.RHYTHM_DECISION = (() => {
  const { addDays } = window.RHYTHM_SCHEDULE;
  const bodyLabels = { ok: 'Нормально', heavy: 'Тяжесть', pain: 'Боль' };
  const verdictLabels = { grow: 'Можно повышать', hold: 'Держим уровень', back: 'Шаг назад: лёгкая неделя', wait: 'Пока мало данных' };
  const WINDOW_DAYS = 14, MIN_SESSIONS = 3;
  function decide(state, workoutById, today) {
    const from = addDays(today, -WINDOW_DAYS);
    const items = state.sessions.filter(session => session.scheduledDate >= from && session.scheduledDate < today);
    const done = items.filter(session => session.status === 'completed');
    const completionOf = session => state.completions.find(item => item.scheduledSessionId === session.scheduledSessionId);
    const completions = done.map(completionOf).filter(Boolean);
    const easyRuns = done.filter(session => workoutById[session.workoutId]?.kind === 'running' && ['easy', 'normal'].includes(completionOf(session)?.rating) && !completionOf(session)?.alt).length;
    const heavy = completions.filter(item => item.body === 'heavy').length;
    const pain = completions.filter(item => item.body === 'pain').length;
    const result = { total: items.length, done: done.length, share: items.length ? done.length / items.length : 0, easyRuns, heavy, pain, reasons: [] };
    const marked = items.filter(session => session.status !== 'planned').length;
    if (!marked) return { ...result, verdict: 'wait', reasons: ['За последние 14 дней нет отмеченных занятий, оценить нагрузку пока не по чему.'] };
    if (items.length < MIN_SESSIONS) return { ...result, verdict: 'wait', reasons: [`За последние ${WINDOW_DAYS} дней занятий мало: нужно хотя бы ${MIN_SESSIONS}.`] };
    const pct = Math.round(result.share * 100);
    result.reasons.push(`Выполнено ${done.length} из ${items.length} (${pct}%).`);
    if (pain) result.reasons.push(`Боль после занятий: ${pain}.`);
    if (heavy) result.reasons.push(`Тяжесть после занятий: ${heavy}.`);
    result.reasons.push(`Пробежек с оценкой «легко» или «нормально»: ${easyRuns}.`);
    if (result.share < 0.5 || pain >= 1 || heavy >= 2) result.verdict = 'back';
    else if (result.share >= 0.75 && easyRuns >= 2 && !heavy && !pain) result.verdict = 'grow';
    else result.verdict = 'hold';
    return result;
  }
  return { decide, bodyLabels, verdictLabels, WINDOW_DAYS };
})();
