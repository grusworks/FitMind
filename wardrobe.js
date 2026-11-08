// Беговой гардероб: 22 вещи, комплекты по погоде и подбор по прогнозу на вечернюю пробежку.
// Не календарная тренировка. Личные отметки — только «не использую» в state.gear.
window.RHYTHM_WARDROBE = (() => {
  const RUN_HOURS = [19, 20]; // пробежка 19:00–20:30
  const RUN_LABEL = '19:00–20:30';
  const MOSCOW = { lat: 55.7558, lon: 37.6173 };

  const categories = [['top', 'Верх'], ['bra', 'Бра'], ['bottom', 'Низ'], ['socks', 'Носки'], ['acc', 'Аксессуары'], ['shoes', 'Кроссовки']];
  const item = (id, cat, name, desc, img) => ({ id, cat, name, desc, img: `./gear/${img}.webp` });
  const items = [
    item('jedi', 'top', 'GRI Джеди 6.0', 'Мятная ветровка с капюшоном. Ветрозащита, DWR, без утепления', 'jedi'),
    item('sekta', 'top', 'GRI Секта', 'Чёрная трикотажная кофта на молнии, капюшон, длинные манжеты', 'sekta'),
    item('vesna', 'top', 'GRI Весна', 'Серо-оливковый лонгслив, QuickDry', 'vesna'),
    item('neverlate', 'top', 'Neverlate', 'Укороченный лонгслив, сиренево-голубой принт. Полупрозрачный', 'neverlate'),
    item('sekta2', 'top', 'GRI Секта 2.0', 'Зелёно-серая майка. Для бега от +8', 'sekta2'),
    item('tee', 'top', 'VETER Performance', 'Белая беговая футболка-реглан, сетка', 'veter-tee'),
    item('uaBlack', 'bra', 'UA Infinity High', 'Чёрное, высокая поддержка, молния спереди', 'ua-black'),
    item('uaGrey', 'bra', 'UA Infinity High 2.0', 'Серо-оливковое, в тон Весне. Высокая поддержка', 'ua-grey'),
    item('gri', 'bottom', 'GRI зимние тайтсы', 'Чёрные, утеплённые, с начёсом, молнии внизу', 'gri'),
    item('euphoria', 'bottom', 'Euphoria', 'Чёрные легинсы, высокая талия, без утепления', 'euphoria'),
    item('veterWhite', 'socks', 'VETER White', 'Белые', 'veter-white'),
    item('veterPeach', 'socks', 'VETER Peach', 'Персиковые', 'veter-peach'),
    item('veterLilac', 'socks', 'VETER Skipper', 'Сиреневые', 'veter-lilac'),
    item('uynLight', 'socks', 'UYN светло-серые', 'Голубые детали, плотнее, выше щиколотки', 'uyn-light'),
    item('uynDark', 'socks', 'UYN тёмно-серые', 'Жёлтые и фиолетовые детали, выше щиколотки', 'uyn-dark'),
    item('hat', 'acc', 'Шапка GRI', 'Светло-серая вязаная', 'hat'),
    item('band', 'acc', 'Повязка на уши', 'Чёрная, флисовая', 'band'),
    item('snood', 'acc', 'Снуд VETER', 'Светло-серый, тонкий, без флиса', 'snood'),
    item('gloves', 'acc', 'Варежки Reusch', 'Чёрные', 'gloves'),
    item('mizuno', 'shoes', 'Mizuno Wave Sky 7', 'White / Nickel / Marina. Сухой асфальт', 'mizuno'),
    item('adidas', 'shoes', 'Adidas Supernova Rise 2', 'Чёрные, кремовая подошва. Сухой асфальт', 'adidas'),
    item('saucony', 'shoes', 'Saucony Triumph 22 GTX', 'Mirage / Navy, GORE-TEX. Мокро, слякоть, снег', 'saucony')
  ];
  const byId = Object.fromEntries(items.map(entry => [entry.id, entry]));
  const shoesIds = ['mizuno', 'adidas', 'saucony'];

  const v = (letter, title, ids, note) => ({ letter, title, ids, note });
  const scenarios = [
    { id: 's1', temp: '+4…+8 °C', min: 4, cond: 'Сухо', rule: 'Один слой сверху, без перчаток. Низ — Euphoria.', tone: 'sky', variants: [
      v('A', 'Светлый, сине-сиреневый', ['uaGrey', 'neverlate', 'euphoria', 'uynLight', 'mizuno'], 'Голубой принта и голубые детали UYN повторяют marina на Mizuno.'),
      v('B', 'Графитовый монохром', ['uaBlack', 'vesna', 'euphoria', 'veterWhite', 'adidas', 'band'], 'Белые носки в тон полосам Adidas. Повязка — если ветрено.')] },
    { id: 's2', temp: '0…+4 °C', min: 0, cond: 'Дождь, слякоть, ветер', rule: 'Джеди от ветра и мороси, ноги — в Saucony GTX.', tone: 'mint', variants: [
      v('A', 'Мята, персик, navy', ['uaGrey', 'vesna', 'jedi', 'euphoria', 'veterPeach', 'saucony', 'band', 'gloves'], 'Мята + персик на тёмно-синих Saucony.'),
      v('B', 'Серо-синий', ['uaBlack', 'vesna', 'jedi', 'euphoria', 'uynDark', 'saucony', 'band', 'gloves'], 'Фиолетовые детали UYN связывают navy и мятный.')] },
    { id: 's3', temp: '−4…0 °C', min: -4, cond: 'Мокрый снег, каша', rule: 'Saucony обязательно. Ветрено — GRI зимние, тихо — Euphoria.', tone: 'lilac', variants: [
      v('A', 'Мята на чёрном', ['uaBlack', 'vesna', 'jedi', 'gri', 'uynLight', 'saucony', 'hat', 'gloves', 'snood'], 'Светлые шапка, снуд и UYN поддерживают мятную Джеди.'),
      v('B', 'Сирень и мята', ['uaGrey', 'neverlate', 'jedi', 'euphoria', 'veterLilac', 'saucony', 'band', 'gloves', 'snood'], 'Neverlate закрыт Джеди, сиреневый принт в вороте — в тон носкам. Только без ветра.')] },
    { id: 's4', temp: '−10…−4 °C', min: -10, cond: 'Сухой снег, мороз', rule: 'База + Секта. Джеди — если ветер от 5 м/с. Низ — GRI зимние.', tone: 'graphite', variants: [
      v('A', 'Чёрно-белый, чистый асфальт', ['uaBlack', 'vesna', 'sekta', 'gri', 'veterWhite', 'adidas', 'hat', 'gloves', 'snood'], 'Монохром. Adidas — только на сухом расчищенном асфальте.'),
      v('B', 'Серый + navy, снег', ['uaGrey', 'neverlate', 'sekta', 'gri', 'uynDark', 'saucony', 'hat', 'gloves', 'snood'], 'Сиреневый Neverlate в вырезе чёрной Секты.')] },
    { id: 's5', temp: '−18…−10 °C', min: -Infinity, cond: 'Сильный мороз', rule: 'Три слоя сверху, все аксессуары. Снуд — на нос в первые минуты.', tone: 'navy', variants: [
      v('A', 'Мята + navy', ['uaGrey', 'vesna', 'sekta', 'jedi', 'gri', 'uynLight', 'saucony', 'hat', 'band', 'gloves', 'snood'], 'Повязка под шапку — для ушей.'),
      v('B', 'Тёмный, ветер', ['uaBlack', 'tee', 'vesna', 'sekta', 'jedi', 'gri', 'uynDark', 'saucony', 'hat', 'gloves', 'snood'], 'Футболка VETER — ещё один слой под Весну на нижней границе и в ветер.')] }
  ];
  const scenarioById = Object.fromEntries(scenarios.map(entry => [entry.id, entry]));

  const tabs = [['outfits', 'Комплекты'], ['items', 'Снаряжение'], ['rules', 'Правила']];
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

  function valid(state) {
    const gear = state.gear;
    return gear === undefined || (gear && typeof gear === 'object' && !Array.isArray(gear) &&
      Object.entries(gear).every(([key, flag]) => byId[key] && typeof flag === 'boolean'));
  }
  const inUse = (state, id) => state.gear?.[id] !== false;
  function setUse(state, id, flag) {
    if (!byId[id] || typeof flag !== 'boolean') return false;
    state.gear ??= {};
    if (flag) delete state.gear[id]; else state.gear[id] = false;
    return true;
  }
  const missing = (state, variant) => variant.ids.filter(id => !inUse(state, id));

  // ---- Прогноз ----
  function forecastUrl() {
    const hourly = 'temperature_2m,apparent_temperature,precipitation,snowfall,wind_speed_10m,wind_gusts_10m';
    return `https://api.open-meteo.com/v1/forecast?latitude=${MOSCOW.lat}&longitude=${MOSCOW.lon}&hourly=${hourly}&past_days=1&forecast_days=2&timezone=Europe%2FMoscow&wind_speed_unit=ms`;
  }
  // Сводка на вечер date из ответа Open-Meteo. null, если нужных часов нет.
  function summarize(json, date) {
    const h = json?.hourly;
    if (!h || !Array.isArray(h.time)) return null;
    const at = hour => h.time.indexOf(`${date}T${String(hour).padStart(2, '0')}:00`);
    const run = RUN_HOURS.map(at);
    if (run.some(index => index < 0)) return null;
    const num = (key, index) => Number(h[key]?.[index]);
    if (run.some(index => !Number.isFinite(num('apparent_temperature', index)) || !Number.isFinite(num('temperature_2m', index)))) return null;
    const avg = key => run.reduce((sum, index) => sum + num(key, index), 0) / run.length;
    const max = key => Math.max(...run.map(index => num(key, index) || 0));
    const sumRange = (key, from, to) => { let total = 0; for (let i = Math.max(0, from); i < to; i++) total += num(key, i) || 0; return total; };
    const start = run[0];
    const before12 = sumRange('precipitation', start - 12, start);
    const before24 = sumRange('precipitation', start - 24, start);
    const temps24 = []; for (let i = Math.max(0, start - 24); i <= start; i++) if (Number.isFinite(num('temperature_2m', i))) temps24.push(num('temperature_2m', i));
    return {
      date,
      feels: Math.round(avg('apparent_temperature')),
      air: Math.round(avg('temperature_2m')),
      wind: Math.round(max('wind_speed_10m')),
      gust: Math.round(max('wind_gusts_10m')),
      precip: Math.round(sumRange('precipitation', start, start + run.length) * 10) / 10,
      snow: sumRange('snowfall', start, start + run.length) > 0,
      wetBefore: before12 >= 0.3,
      iceRisk: before24 >= 0.2 && Math.min(...temps24) <= 0 && Math.max(...temps24) > 0 && avg('temperature_2m') <= 0.5
    };
  }
  async function fetchForecast(date) {
    if (typeof fetch !== 'function') throw new Error('offline');
    const response = await fetch(forecastUrl());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const summary = summarize(await response.json(), date);
    if (!summary) throw new Error('no-hours');
    return summary;
  }
  const scenarioFor = feels => scenarios.find(entry => feels >= entry.min);
  // Подбор: сценарий по ощущаемой температуре, вариант — по ветру и покрытию; кроссовки меняются, если мокро.
  function pick(state, wx, nested = false) {
    const scenario = scenarioFor(wx.feels);
    const wet = wx.precip > 0.1 || wx.wetBefore || wx.snow;
    const windy = wx.wind >= 5 || wx.gust >= 10;
    let letter = 'A';
    if (scenario.id === 's3') letter = windy || wx.feels < -2 ? 'A' : 'B';
    if (scenario.id === 's4') letter = wet ? 'B' : 'A';
    if (scenario.id === 's5') letter = windy || wx.feels < -15 ? 'B' : 'A';
    const preferred = scenario.variants.find(entry => entry.letter === letter);
    const other = scenario.variants.find(entry => entry.letter !== letter);
    if (missing(state, preferred).length && !missing(state, other).length) letter = other.letter;
    const notes = [];
    if (wx.feels > 8) notes.push('Теплее +8: хватит одного лёгкого слоя, Секта 2.0 или футболка VETER.');
    if (wx.feels < -18) notes.push('Ниже −18: тёплого запаса в гардеробе нет. Сократи пробежку и беги рядом с домом.');
    if (wet && !scenario.variants.find(entry => entry.letter === letter).ids.includes('saucony')) notes.push('Мокро или снег: надень Saucony GTX вместо сетчатых кроссовок.');
    if (scenario.id === 's4' && windy) notes.push(`Ветер ${wx.wind} м/с: добавь Джеди поверх Секты.`);
    if (wx.iceRisk) notes.push('Возможен гололёд: подморозило после осадков. Шипов нет ни у одной пары — расчищенный маршрут и короткий шаг.');
    let fallback = '', fallbackVariant = null;
    if (!nested && scenarioFor(wx.feels - 3).id !== scenario.id) {
      const colder = pick(state, { ...wx, feels: wx.feels - 3 }, true);
      fallbackVariant = colder.scenario.variants.find(entry => entry.letter === colder.letter);
      fallback = `Если похолодает на 3° или поднимется ветер — комплект «${colder.scenario.temp}», вариант ${colder.letter}.`;
    }
    return { scenario, letter, notes, fallback, fallbackVariant, wet, windy };
  }

  // ---- Отрисовка ----
  const thumb = (state, id, size = 'sm') => {
    const entry = byId[id];
    return `<span class="gear-thumb gear-thumb-${size} ${inUse(state, id) ? '' : 'is-off'}"><img src="${entry.img}" alt="${esc(entry.name)}" width="120" height="120" loading="lazy" decoding="async"></span>`;
  };
  const names = ids => ids.map(id => byId[id].name).join(' · ');
  function variantBlock(state, variant) {
    const off = missing(state, variant);
    return `<div class="gear-variant">
      <p class="gear-variant-title"><span class="gear-letter">${variant.letter}</span>${esc(variant.title)}</p>
      <div class="gear-thumbs">${variant.ids.map(id => thumb(state, id)).join('')}</div>
      <p class="gear-names">${esc(names(variant.ids))}</p>
      <p class="gear-note">${esc(variant.note)}${off.length ? ` <strong>Не используешь: ${esc(off.map(id => byId[id].name).join(', '))}.</strong>` : ''}</p>
    </div>`;
  }
  function scenarioCard(state, scenario) {
    return `<section class="gear-scenario gear-tone-${scenario.tone}" id="gear-${scenario.id}">
      <div class="gear-scenario-head"><strong>${scenario.temp}</strong><span>${esc(scenario.cond)}</span></div>
      <p class="gear-rule">${esc(scenario.rule)}</p>
      ${scenario.variants.map(entry => variantBlock(state, entry)).join('')}
    </section>`;
  }
  function renderEntry(state) {
    const off = items.filter(entry => !inUse(state, entry.id)).length;
    return `<button type="button" class="asanas-entry" data-open-gear="outfits"><span class="asanas-entry-text"><strong>Беговой гардероб</strong><small>${items.length - off} вещей · 5 погод, по 2 комплекта</small></span><span aria-hidden="true">›</span></button>`;
  }
  const RULES = `
    <section class="content-panel"><h2>Главное правило</h2><p>Одевайся так, будто на 8–10° теплее, чем ощущается. Бег интенсивный и без перехода на шаг: на старте прохладно, через 10 минут — нормально.</p>
      <p class="panel-intro">Жарко на бегу — сначала сними повязку или шапку и расстегни Секту.</p></section>
    <section class="content-panel"><h2>Слои по ощущаемой температуре</h2><div class="gear-rules">
      <div><strong>+4…+8</strong><span>бра + один верх · Euphoria</span></div>
      <div><strong>0…+4</strong><span>бра + Весна + Джеди · Euphoria · повязка, варежки</span></div>
      <div><strong>−4…0</strong><span>бра + база + Джеди · GRI при ветре · шапка или повязка, варежки, снуд</span></div>
      <div><strong>−10…−4</strong><span>бра + база + Секта (+ Джеди при ветре от 5 м/с) · GRI · всё</span></div>
      <div><strong>−18…−10</strong><span>бра + база + Секта + Джеди · GRI · всё, снуд на нос</span></div>
    </div><p class="panel-intro">Neverlate полупрозрачный и короткий: один — только в мягкую погоду, в холод — под Секту или Джеди. Секта 2.0 — для бега от +8.</p></section>
    <section class="content-panel"><h2>Кроссовки по покрытию</h2><div class="gear-rules">
      <div><strong>Сухой асфальт</strong><span>Mizuno или Adidas</span></div>
      <div><strong>Мокро, слякоть, снег</strong><span>Saucony GTX: мембрана держит ногу сухой</span></div>
      <div><strong>Гололёд</strong><span>шипов нет ни у одной пары — расчищенный маршрут, короткий шаг</span></div>
    </div><p class="panel-intro">В темноте заметнее всего мятная Джеди, белые Mizuno и белые VETER.</p></section>`;
  function render(state, tab) {
    const chips = `<div class="asana-filters" role="group" aria-label="Раздел гардероба">${tabs.map(([key, label]) => `<button type="button" data-gear-tab="${key}" aria-pressed="${tab === key}">${label}</button>`).join('')}</div>`;
    if (tab === 'items') {
      return `${chips}${categories.map(([cat, label]) => `<section class="gear-group"><h2>${label}</h2>${items.filter(entry => entry.cat === cat).map(entry => `
        <label class="gear-item ${inUse(state, entry.id) ? '' : 'is-off'}">${thumb(state, entry.id, 'md')}<span class="gear-item-text"><strong>${esc(entry.name)}</strong><small>${esc(entry.desc)}</small></span>
          <span class="gear-use"><input type="checkbox" data-gear-use="${entry.id}" ${inUse(state, entry.id) ? 'checked' : ''}>Использую</span></label>`).join('')}</section>`).join('')}
        <p class="panel-intro">Сними галочку, если вещь порвалась или не нравится: подбор на «Главной» будет её обходить.</p>`;
    }
    if (tab === 'rules') return `${chips}${RULES}`;
    return `${chips}<p class="panel-intro">Температура — ощущаемая. Вариант A и B — равноценные по теплу, отличаются цветом и обувью.</p>${scenarios.map(entry => scenarioCard(state, entry)).join('')}`;
  }
  function weatherLine(wx) {
    const sign = value => (value > 0 ? `+${value}` : String(value).replace('-', '−'));
    const sky = wx.snow ? 'снег' : wx.precip > 0.1 ? `осадки ${String(wx.precip).replace('.', ',')} мм` : 'без осадков';
    return `воздух ${sign(wx.air)}°, ветер ${wx.wind} м/с${wx.gust >= 10 ? `, порывы ${wx.gust}` : ''}, ${sky}${wx.wetBefore && !(wx.precip > 0.1) ? ', днём было мокро' : ''}`;
  }
  // Карточка на «Главной» в беговой день. weather: { status: 'loading' | 'ok' | 'error', data }
  function renderToday(state, weather, letterOverride) {
    const head = `<p class="gear-today-kicker">Что надеть · ${RUN_LABEL}</p>`;
    if (!weather || weather.status === 'loading') return `<section class="gear-today">${head}<p class="gear-today-wait">Загружаю прогноз по Москве…</p></section>`;
    if (weather.status === 'error') return `<section class="gear-today">${head}<p class="gear-today-wait">Прогноз не загрузился. Посмотри погоду и выбери комплект сама.</p><div class="action-pair"><button type="button" data-gear-retry>Повторить</button><button type="button" data-open-gear="outfits">Все комплекты</button></div></section>`;
    const wx = weather.data;
    const picked = pick(state, wx);
    const letter = letterOverride && picked.scenario.variants.some(entry => entry.letter === letterOverride) ? letterOverride : picked.letter;
    const variant = picked.scenario.variants.find(entry => entry.letter === letter);
    const sign = value => (value > 0 ? `+${value}` : String(value).replace('-', '−'));
    return `<section class="gear-today gear-tone-${picked.scenario.tone}">${head}
      <div class="gear-today-temp"><strong>${sign(wx.feels)}°</strong><span>ощущается · ${esc(weatherLine(wx))}</span></div>
      <p class="gear-today-scenario">Комплект «${picked.scenario.temp}» · ${esc(picked.scenario.cond.toLowerCase())}</p>
      <div class="gear-switch" role="group" aria-label="Вариант комплекта">${picked.scenario.variants.map(entry => `<button type="button" data-gear-variant="${entry.letter}" aria-pressed="${entry.letter === letter}">${entry.letter} · ${esc(entry.title)}</button>`).join('')}</div>
      <div class="gear-thumbs">${variant.ids.map(id => thumb(state, id)).join('')}</div>
      <p class="gear-names">${esc(names(variant.ids))}</p>
      ${picked.notes.map(note => `<p class="gear-warn">${esc(note)}</p>`).join('')}
      ${picked.fallback ? `<div class="gear-fallback"><p class="gear-note">${esc(picked.fallback)}</p>
        <div class="gear-thumbs gear-thumbs-mini">${picked.fallbackVariant.ids.map(id => thumb(state, id)).join('')}</div>
        <p class="gear-names">${esc(names(picked.fallbackVariant.ids))}</p></div>` : ''}
      <button type="button" class="data-history-link gear-all" data-open-gear="outfits">Все комплекты и снаряжение<span aria-hidden="true">›</span></button>
    </section>`;
  }

  return { items, byId, scenarios, scenarioById, tabs, valid, inUse, setUse, missing, summarize, fetchForecast, forecastUrl, pick, renderEntry, render, renderToday, RUN_HOURS };
})();
