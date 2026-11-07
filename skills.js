// Домашний skill — дополнение к существующему слоту, не календарная тренировка.
window.RHYTHM_SKILLS = (() => {
  const skillId = 'home-first-pull-up-v1';
  const bands = ['5–14 кг', '13–23 кг', '15–32 кг', '13–39 кг'];
  const exercises = [
    { exerciseId: 'band-bent-row', name: 'Тяга длинной петли к поясу в наклоне',
      doses: [[2, 8], [2, 10], [3, 8], [3, 10]],
      url: 'https://www.youtube.com/watch?v=xo7QIow0pn4',
      instruction: 'Поставь стопы на петлю и плавно тяни её к поясу. Не раскачивай корпус. Закреплять резинку не нужно.' },
    { exerciseId: 'band-biceps-curl', name: 'Сгибание рук на бицепс с длинной петлёй',
      doses: [[2, 10], [2, 12], [2, 12], [2, 12]],
      url: 'https://www.youtube.com/watch?v=2nG2RZPGgBA',
      instruction: 'Поставь стопы на петлю. Держи локти ближе к телу, сгибай руки и плавно опускай их.' },
    { exerciseId: 'band-seated-row', name: 'Тяга длинной петли к поясу сидя',
      doses: [[2, 8], [2, 10], [2, 12], [3, 10]],
      url: 'https://rutube.ru/video/c6785ca1a60b3cc577e6563ef02125dc/',
      instruction: 'Сядь на пол и надень петлю на стопы. Убедись, что она не соскальзывает, и плавно тяни к поясу.' }
  ];
  const labels = { planned: 'Не начат', completed: 'Выполнен', partial: 'Частично выполнен', skipped: 'Пропущен' };
  function applies(workout) { return workout?.kind === 'strength' && workout.weekday === 5; }
  function dose(exercise, week) { const [sets, reps] = exercise.doses[week - 1]; return { sets, reps }; }
  function makeExercise(exercise, week) {
    const prescribed = dose(exercise, week);
    return { exerciseId: exercise.exerciseId, doseWeek: week, prescribed, band: null,
      actualSets: Array.from({ length: prescribed.sets }, () => ({ done: false, reps: prescribed.reps })) };
  }
  function status(record, session) {
    if (record.explicitlySkipped) return 'skipped';
    const sets = record.exercises.flatMap(item => item.actualSets);
    if (sets.every(item => item.done)) return 'completed';
    if (sets.some(item => item.done)) return 'partial';
    return session.status !== 'planned' ? 'skipped' : 'planned';
  }
  function sync(state, workoutById) {
    state.skillRecords ??= [];
    state.skillLastBands ??= {};
    for (const session of state.sessions) {
      const workout = workoutById[session.workoutId];
      if (!applies(workout)) continue;
      let record = state.skillRecords.find(item => item.scheduledSessionId === session.scheduledSessionId);
      if (!record) {
        record = { skillId, scheduledSessionId: session.scheduledSessionId, week: workout.week,
          explicitlySkipped: false, exercises: exercises.map(item => makeExercise(item, workout.week)) };
        state.skillRecords.push(record);
      }
      record.status = status(record, session);
    }
  }
  function valid(state, workoutById) {
    // Старые JSON без skill-данных остаются совместимыми.
    if (state.skillRecords === undefined && state.skillLastBands === undefined) return true;
    if (!Array.isArray(state.skillRecords) || !state.skillLastBands || typeof state.skillLastBands !== 'object' || Array.isArray(state.skillLastBands)) return false;
    if (Object.entries(state.skillLastBands).some(([id, band]) => !exercises.some(e => e.exerciseId === id) || !bands.includes(band))) return false;
    if (state.skillRecords.length !== state.sessions.filter(s => applies(workoutById[s.workoutId])).length) return false;
    const seen = new Set();
    for (const record of state.skillRecords) {
      if (!record || seen.has(record.scheduledSessionId)) return false;
      seen.add(record.scheduledSessionId);
      const session = state.sessions.find(s => s.scheduledSessionId === record.scheduledSessionId);
      const workout = session && workoutById[session.workoutId];
      if (!applies(workout) || record.skillId !== skillId || record.week !== workout.week || typeof record.explicitlySkipped !== 'boolean' || !Array.isArray(record.exercises) || record.exercises.length !== 3) return false;
      for (let index = 0; index < exercises.length; index++) {
        const item = record.exercises[index], exercise = exercises[index];
        if (!item || item.exerciseId !== exercise.exerciseId || !Number.isInteger(item.doseWeek) || item.doseWeek < 1 || item.doseWeek > record.week) return false;
        const expected = dose(exercise, item.doseWeek);
        if (!item.prescribed || item.prescribed.sets !== expected.sets || item.prescribed.reps !== expected.reps || (item.band !== null && !bands.includes(item.band)) || !Array.isArray(item.actualSets) || item.actualSets.length !== expected.sets) return false;
        if (item.actualSets.some(set => !set || typeof set.done !== 'boolean' || !Number.isInteger(set.reps) || set.reps < 1 || set.reps > 100 || (set.done && !item.band))) return false;
      }
      if (record.status !== status(record, session)) return false;
    }
    return true;
  }
  function render(state, session, workout, editingSet = null) {
    if (!applies(workout)) return '';
    const record = state.skillRecords.find(item => item.scheduledSessionId === session.scheduledSessionId);
    return `<section class="skill-section" aria-labelledby="skill-title">
      <p class="skill-overline">Дополнительно к сегодняшней силовой</p>
      <h2 id="skill-title">Домашняя база к первому подтягиванию</h2>
      <p class="skill-meta">~10–15 мин · 3 упражнения · <strong role="status">${labels[record.status]}</strong></p>
      <p class="skill-intro">После основной силовой · упражнения для первого подтягивания</p>
      <p class="skill-equipment"><strong>Нужно:</strong> длинная резинка-петля</p>
      <details class="skill-help"><summary>Перед тренировкой <span class="skill-help-arrow" aria-hidden="true"></span></summary>
        <div class="skill-help-item"><h3>Как выбрать нагрузку</h3><p>Начни с комфортной петли. Если все подходы получаются уверенно и чувствуешь, что могла бы сделать ещё 2–3 повтора — в следующий раз можно попробовать более тугую.</p></div>
        <div class="skill-help-item"><h3>Если сегодня тяжело</h3><p>Можно повторить объём прошлой недели или выполнить только часть дополнительного блока. Основная силовая всё равно будет считаться выполненной.</p></div>
        <div class="skill-help-item"><h3>А где подтягивания?</h3><p>Этот блок готовит спину и руки дома. Висы и сами подтягивания добавим отдельно, когда будет доступен турник.</p></div>
      </details>
      ${exercises.map((exercise, index) => {
        const item = record.exercises[index];
        const last = state.skillLastBands[item.exerciseId];
        const selected = item.band || last || '';
        const complete = item.actualSets.every(set => set.done);
        return `<details class="skill-exercise ${complete ? 'is-complete' : ''}" ${complete ? '' : 'open'}>
          <summary><span class="skill-exercise-name">${index + 1}. ${exercise.name}</span>${complete ? '<span class="skill-done">✓ Готово</span>' : ''}</summary>
          <a class="skill-video" href="${exercise.url}" target="_blank" rel="noopener noreferrer" aria-label="Техника: ${exercise.name}">Техника ↗</a>
          <div class="skill-exercise-body">
            <p class="skill-dose"><strong>${item.prescribed.sets} × ${item.prescribed.reps}</strong> · отдых 60 сек</p>
            <div class="skill-band"><label>Петля <select data-skill-band="${item.exerciseId}" aria-label="Петля: ${exercise.name}"><option value="">Выберите петлю</option>${bands.map(band => `<option ${selected === band ? 'selected' : ''}>${band}</option>`).join('')}</select></label>${!item.band && last ? '<small>Петля с прошлого раза</small>' : ''}</div>
            ${record.week > 1 ? `<div class="skill-progression"><button type="button" data-skill-previous="${item.exerciseId}">${item.doseWeek === record.week ? 'Повторить прошлую неделю' : 'Вернуться к плану этой недели'}</button>
              <details class="skill-other-doses"><summary>Сколько сделать</summary><label>Подходы и повторы <select data-skill-dose="${item.exerciseId}" aria-label="Подходы и повторы: ${exercise.name}">${Array.from({ length: record.week }, (_, i) => {
            const week = i + 1, d = dose(exercise, week);
            return `<option value="${week}" ${week === item.doseWeek ? 'selected' : ''}>${week === record.week ? 'По плану' : `Повторить неделю ${week}`} · ${d.sets} × ${d.reps}</option>`;
          }).join('')}</select></label></details></div>` : ''}
            <div class="skill-sets">${item.actualSets.map((set, setIndex) => `<div class="skill-set">
              <label class="skill-set-check"><input type="checkbox" data-skill-set="${item.exerciseId}" data-set-index="${setIndex}" ${set.done ? 'checked' : ''}> <span>Подход ${setIndex + 1} · ${set.reps === item.prescribed.reps ? `${item.prescribed.reps} повторов` : `${set.reps} из ${item.prescribed.reps} повторов`}</span></label>
              ${editingSet === `${session.scheduledSessionId}:${item.exerciseId}:${setIndex}`
                ? `<div class="skill-reps-editor"><label>Факт: <input type="number" min="1" max="100" step="1" inputmode="numeric" value="${set.reps}" data-skill-reps-input="${item.exerciseId}" data-set-index="${setIndex}" aria-label="Сделано повторов: ${exercise.name}, подход ${setIndex + 1}"></label><button type="button" data-skill-reps-save="${item.exerciseId}" data-set-index="${setIndex}">Готово</button></div>`
                : `<button type="button" class="skill-reps-trigger" data-skill-reps-edit="${item.exerciseId}" data-set-index="${setIndex}" aria-label="Изменить количество: сделано повторов для ${exercise.name}, подход ${setIndex + 1}">Изменить</button>`}
            </div>`).join('')}</div>
            <details class="skill-technique-note"><summary>Подробнее о движении</summary><p>${exercise.instruction}</p></details>
          </div>
        </details>`;
      }).join('')}
      <button type="button" class="skill-skip" data-skill-skip>${record.explicitlySkipped ? 'Вернуться к дополнительному блоку' : 'Пропустить дополнительный блок'}</button>
    </section>`;
  }
  return { skillId, bands, exercises, applies, dose, makeExercise, status, sync, valid, render };
})();
