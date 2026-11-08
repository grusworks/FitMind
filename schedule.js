// Календарные даты цикла. Неделя программы всегда начинается в понедельник.
window.RHYTHM_SCHEDULE = (() => {
  function localDate(date = new Date()) {
    const value = new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    return localDate(date) === value ? date : null;
  }

  function addDays(value, days) {
    const date = parseDate(value);
    if (!date || !Number.isInteger(days)) throw new Error('Некорректная дата цикла.');
    date.setDate(date.getDate() + days);
    return localDate(date);
  }

  function dayNumber(value) {
    const date = parseDate(value);
    if (!date) throw new Error('Некорректная дата цикла.');
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  }

  function nextMonday(value = localDate()) {
    const date = parseDate(value);
    if (!date) throw new Error('Некорректная дата цикла.');
    return addDays(value, (8 - date.getDay()) % 7);
  }

  function isMonday(value) { return parseDate(value)?.getDay() === 1; }

  function weekRange(startDate, week) {
    if (!isMonday(startDate) || !Number.isInteger(week) || week < 1 || week > 4) {
      throw new Error('Неделя программы должна начинаться в понедельник.');
    }
    const monday = addDays(startDate, (week - 1) * 7);
    return { monday, sunday: addDays(monday, 6) };
  }

  function programWeekForDate(startDate, date) {
    if (!isMonday(startDate)) throw new Error('Некорректная стартовая дата.');
    const week = Math.floor((dayNumber(date) - dayNumber(startDate)) / 7) + 1;
    return week >= 1 && week <= 4 ? week : null;
  }

  function dateForWorkout(startDate, workout) {
    const { monday } = weekRange(startDate, workout.week);
    if (![1, 2, 4, 5].includes(workout.weekday)) throw new Error('Некорректный день тренировки.');
    return addDays(monday, workout.weekday - 1);
  }

  return { localDate, parseDate, addDays, nextMonday, isMonday, weekRange, programWeekForDate, dateForWorkout };
})();
