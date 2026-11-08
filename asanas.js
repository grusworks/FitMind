// Каталог асан — отдельный справочник с личными отметками. Не календарная тренировка.
window.RHYTHM_ASANAS = (() => {
  const levels = [['basic', 'База'], ['mid', 'Средний уровень'], ['hard', 'Сложные и цели']];
  const checkLabels = { page: 'страница проверена', desc: 'по описанию', weak: 'про пользу, не про технику', unverified: 'не проверено' };
  const yt = id => `https://www.youtube.com/watch?v=${id}`;
  const ru = id => `https://rutube.ru/video/${id}/`;
  const pose = (id, name, sanskrit, level, fun, useful, video, goal = false) => ({ id, name, sanskrit, level, fun, useful, goal, video });
  const catalog = [
    pose('downward-dog', 'Собака мордой вниз', 'Адхо мукха шванасана', 'basic', false, true, { url: ru('c732a0de180149f80a45e78a9fe1ab56'), channel: 'Наталья Орбу', length: '4:37', check: 'page' }),
    pose('tree', 'Дерево', 'Врикшасана', 'basic', false, true, { url: ru('b3c4a6216a2a171bc7c9be4b7a8fc066'), channel: 'Юлианна Соколовская', length: '8:38', check: 'page' }),
    pose('warrior-2', 'Воин II', 'Вирабхадрасана II', 'basic', false, true, { url: yt('U0yma6vXHbQ'), channel: 'Федерация йоги России', length: '', check: 'desc' }),
    pose('chair', 'Стул', 'Уткатасана', 'basic', false, true, { url: yt('yV0SuRy5Nwo'), channel: 'ТАНЯ САН с ВАМИ', length: '', check: 'unverified' }),
    pose('garland', 'Гирлянда', 'Маласана', 'basic', false, true, { url: yt('Pi-pX5-kNBg'), channel: 'AnatolYoga', length: '~3 мин', check: 'desc' }),
    pose('eagle', 'Орёл', 'Гарудасана', 'basic', true, true, { url: ru('667e2aa8081170ed5a0da810519556c8'), channel: 'АнатолиЙога', length: '1:57', check: 'desc' }),
    pose('warrior-3', 'Воин III', 'Вирабхадрасана III', 'basic', false, true, { url: yt('KNyar3X1-Ao'), channel: 'ЙОГА Марина Карпова', length: '', check: 'desc' }),
    pose('chaturanga', 'Чатуранга', 'Чатуранга дандасана', 'mid', false, true, { url: yt('vJbHtvNwFIA'), channel: 'Anna Kolmakova', length: '', check: 'desc' }),
    pose('boat', 'Лодка', 'Навасана', 'mid', false, true, { url: yt('MsQfVeu4EY4'), channel: 'Виктор Бойко', length: '', check: 'desc' }),
    pose('pigeon', 'Голубь', 'Эка пада раджакапотасана', 'mid', false, false, { url: yt('gNXo3ygwM48'), channel: 'Марина Баланс', length: '', check: 'desc' }),
    pose('dolphin', 'Дельфин', 'Ардха пинча майюрасана', 'mid', false, true, { url: yt('cA10orNhZ84'), channel: 'В гармонии с собой', length: '', check: 'weak' }),
    pose('half-moon', 'Полумесяц', 'Ардха чандрасана', 'mid', true, true, { url: yt('cjhLfIqki_w'), channel: 'Сергей Митропольский', length: '', check: 'desc' }),
    pose('camel', 'Верблюд', 'Уштрасана', 'mid', false, false, { url: yt('pwxQra8TWYY'), channel: 'Доктор Чернов', length: '', check: 'desc' }),
    pose('side-crow', 'Боковая ворона', 'Паршва бакасана', 'mid', true, true, { url: yt('fLLg8-AE5AU'), channel: '', length: '', check: 'unverified' }),
    pose('crow', 'Бакасана (ворона)', 'Бакасана', 'hard', true, true, { url: yt('bn_qkmCH9lI'), channel: 'Yoga with Nelly Keks', length: '', check: 'desc' }),
    pose('flying-pigeon', 'Летающий голубь', 'Эка пада галавасана', 'hard', true, true, { url: yt('2c44X86lIfc'), channel: 'Йога с ASANNA', length: '', check: 'desc' }),
    pose('firefly', 'Светлячок', 'Титтибхасана', 'hard', true, false, { url: yt('-VGsVtJZSMM'), channel: 'Сергей Митропольский', length: '', check: 'desc' }),
    pose('forearm-stand', 'Стойка на предплечьях', 'Пинча майюрасана', 'hard', true, true, { url: ru('ecdac62cbdbbb500fb3c065c86878fda'), channel: 'Елена Малова', length: '48:59', check: 'page' }, true),
    pose('headstand', 'Стойка на голове', 'Ширшасана', 'hard', true, false, { url: yt('1PbHfzuqgUA'), channel: 'Йога и Медитация', length: '', check: 'desc' }, true),
    pose('handstand', 'Стойка на руках', 'Адхо мукха врикшасана', 'hard', true, false, { url: yt('F1tQ1-fBkhI'), channel: 'Школа Воркаута', length: '', check: 'unverified' }, true),
    pose('wheel', 'Колесо', 'Урдхва дханурасана', 'hard', true, false, null, true),
    pose('scorpion', 'Скорпион', 'Вриччикасана', 'hard', true, false, null, true)
  ];
  const ids = new Set(catalog.map(item => item.id));
  const isTop = item => item.fun && item.useful;
  const mark = (state, id) => state.asanas?.[id] || { support: false, can: false };
  function summary(state) {
    const can = catalog.filter(item => mark(state, item.id).can).length;
    const support = catalog.filter(item => !mark(state, item.id).can && mark(state, item.id).support).length;
    return { total: catalog.length, can, support };
  }
  function valid(state) {
    // Старые JSON без поля asanas остаются совместимыми.
    if (state.asanas === undefined) return true;
    if (!state.asanas || typeof state.asanas !== 'object' || Array.isArray(state.asanas)) return false;
    return Object.entries(state.asanas).every(([id, value]) => ids.has(id) && value && typeof value === 'object' && !Array.isArray(value) &&
      typeof value.support === 'boolean' && typeof value.can === 'boolean');
  }
  function setFlag(state, id, field, checked) {
    if (!ids.has(id) || !['support', 'can'].includes(field) || typeof checked !== 'boolean') return false;
    state.asanas ??= {};
    state.asanas[id] ??= { support: false, can: false };
    state.asanas[id][field] = checked;
    return true;
  }
  function renderEntry(state) {
    const { total, can, support } = summary(state);
    return `<button type="button" class="asanas-entry" data-open-asanas><span class="asanas-entry-text"><strong>Асаны</strong><small>Умею ${can} из ${total}${support ? ` · с опорой ${support}` : ''}</small></span><span aria-hidden="true">›</span></button>`;
  }
  const tagsHtml = item => `<p class="asana-tags">${isTop(item) ? '<span class="asana-tag asana-tag-top">⭐ топ</span>' : ''}${item.fun ? '<span class="asana-tag">🔥 прикольная</span>' : ''}${item.useful ? '<span class="asana-tag">💪 полезная</span>' : ''}${item.goal ? '<span class="asana-tag">цель</span>' : ''}</p>`;
  const artHtml = item => `<img src="./asanas/${item.id}.svg" alt="" width="180" height="150" loading="lazy" decoding="async">`;
  function tile(state, item) {
    const m = mark(state, item.id);
    const emoji = `${item.fun ? '<span title="прикольная">🔥</span>' : ''}${item.useful ? '<span title="полезная">💪</span>' : ''}${item.goal ? '<span class="asana-goal">цель</span>' : ''}`;
    const video = item.video
      ? `<a class="asana-video-link" href="${item.video.url}" target="_blank" rel="noopener noreferrer" aria-label="Техника: ${item.name}" title="${[item.video.channel, item.video.length, checkLabels[item.video.check]].filter(Boolean).join(' · ')}">Техника ↗</a>${['unverified', 'weak'].includes(item.video.check) ? `<small class="asana-video-note">${checkLabels[item.video.check]}</small>` : ''}`
      : '<small class="asana-video-note">Видео пока нет</small>';
    return `<div class="asana-tile ${m.can ? 'is-can' : ''}">
      <span class="asana-tile-art">${artHtml(item)}${isTop(item) ? '<span class="asana-badge asana-badge-top" aria-hidden="true">⭐</span>' : ''}</span>
      <span class="asana-tile-name">${item.name}</span>
      <span class="asana-sanskrit">${item.sanskrit}</span>
      ${emoji ? `<span class="asana-emoji">${emoji}</span>` : ''}
      <span class="asana-video-box">${video}</span>
      <label class="asana-check"><input type="checkbox" data-asana-flag="support" data-asana-id="${item.id}" ${m.support ? 'checked' : ''}> <span>С опорой</span></label>
      <label class="asana-check"><input type="checkbox" data-asana-flag="can" data-asana-id="${item.id}" ${m.can ? 'checked' : ''}> <span>Умею</span></label></div>`;
  }
  const filters = [['all', 'Все'], ['top', '⭐ Топ'], ['todo', 'Ещё не умею']];
  function matches(state, item, filter) {
    return filter === 'top' ? isTop(item) : filter === 'todo' ? !mark(state, item.id).can : true;
  }
  function render(state, filter = 'all') {
    const { total, can, support } = summary(state);
    const groups = levels.map(([level, title]) => {
      const all = catalog.filter(item => item.level === level);
      const shown = all.filter(item => matches(state, item, filter));
      if (!shown.length) return '';
      const done = all.filter(item => mark(state, item.id).can).length;
      return `<section class="asana-group"><h2>${title} <small>${done}/${all.length}</small></h2><div class="asana-grid">${shown.map(item => tile(state, item)).join('')}</div></section>`;
    }).join('');
    return `<p class="asanas-summary"><strong>Умею ${can} из ${total}</strong>${support ? `<span>С опорой: ${support}</span>` : ''}</p>
      <div class="asana-filters" role="group" aria-label="Фильтр асан">${filters.map(([key, label]) => `<button type="button" data-asana-filter="${key}" aria-pressed="${key === filter}">${label}</button>`).join('')}</div>
      ${groups || '<p class="panel-intro">Здесь пока пусто.</p>'}`;
  }
  return { catalog, levels,  valid, summary, setFlag, renderEntry, render, filters };
})();
