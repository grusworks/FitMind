// Содержимое первой версии программы перенесено из PROGRAM_4_WEEKS.md.
// Здесь хранятся только утверждённые слоты и ссылки на уже найденные видео.
window.RHYTHM_PROGRAM = (() => {
const PROGRAM_ID = 'first-four-weeks-v1';

const videos = {
  izzy10: { title: 'Izzy Samuel · Day 10 · Upper Body Pilates', durationSeconds: 19 * 60, url: 'https://www.youtube.com/watch?v=CyHP7Y3auUs', note: 'В видео могут не быть объяснений на русском.' },
  izzy22: { title: 'Izzy Samuel · Day 22 · Upper Body Pilates', durationSeconds: 21 * 60, url: 'https://www.youtube.com/watch?v=JjyKkAEkqCY', note: 'В видео могут не быть объяснений на русском.' },
  mobility: { title: 'Natalia Malyshkina · Mobility', durationSeconds: 11 * 60 + 4, url: 'https://rutube.ru/video/408e4b4b7a57c2d7eb0a489f33850719/', note: 'Подвижность таза, верхней части спины и плеч.' },
  smstretching: { title: 'SMSTRETCHING · Pilates', durationSeconds: 28 * 60 + 1, url: 'https://rutube.ru/video/85d8608316d237f74dba41c8411946a3/' },
  alex: { title: 'Alex Su · Всё тело с резинкой и гантелями/бутылками', durationSeconds: 34 * 60 + 37, url: 'https://rutube.ru/video/ad2dacc60e3945e2e4278dbd552ca60e/', note: 'Используй резинку, с которой можешь выполнять движения из видео без рывков. Не крепи её к двери или мебели.' },
  popsport: { title: 'PopSport · Всё тело без прыжков', durationSeconds: 30 * 60 + 21, url: 'https://www.youtube.com/watch?v=kcswbxqOERQ', note: 'Вариант без инвентаря. Упражнения для первого подтягивания выполняются отдельно.' }
};

const pilatesGoals = [
  'Пилатес + подвижность таза, верхней части спины и плеч.',
  'Другой вариант пилатеса + подвижность таза, верхней части спины и плеч.',
  'Повтор знакомого пилатеса + работа над подвижностью.',
  'Повтор второго варианта пилатеса + работа над подвижностью.'
];
const strengthGoals = [
  'Силовая тренировка на всё тело. Если нужно — делай дополнительные паузы.',
  'Повтор знакомой силовой тренировки. Старайся выполнять движения увереннее; паузы можно делать по необходимости.',
  'Если раньше выполнила только часть тренировки, в этот раз попробуй пройти чуть дальше.',
  'Повтор знакомой силовой тренировки. Если нужно — делай дополнительные паузы.'
];
const shortRunGoals = [
  '20 минут лёгкого бега в темпе, при котором можешь разговаривать.',
  '22 минуты лёгкого бега в том же спокойном темпе.',
  '24 минуты лёгкого бега без ускорения.',
  '25 минут лёгкого бега в спокойном темпе.'
];
const longRunGoals = [
  '25 минут лёгкого бега — немного дольше, чем в среду.',
  '28 минут лёгкого бега без ускорения.',
  '30 минут лёгкого бега.',
  '32 минуты лёгкого бега. Не нужно бежать на максимум.'
];
const runningGuidance = 'Беги в темпе, при котором можешь разговаривать. Следить за конкретным темпом или пульсом не нужно. Если станет тяжело — перейди на шаг, а затем снова продолжи бег. Время ходьбы уже входит в тренировку, добавлять минуты не нужно. Если увеличение времени даётся тяжело, можно повторить длительность прошлой недели.';

const workouts = Array.from({ length: 4 }, (_, index) => {
  const week = index + 1;
  const shortRunSeconds = [20, 22, 24, 25][index] * 60;
  const longRunSeconds = [25, 28, 30, 32][index] * 60;
  return [
    {
      workoutId: `${PROGRAM_ID}-w${week}-pilates`, week, weekday: 1,
      kind: 'pilates', direction: 'Пилатес + подвижность', title: 'Пилатес для верхней части тела + подвижность',
      goal: pilatesGoals[index], videoIds: [week % 2 ? 'izzy10' : 'izzy22', 'mobility'],
      replacement: { videoIds: ['smstretching', 'mobility'], note: 'Другой вариант с объяснениями на русском · 39:05.' },
      durationSeconds: (week % 2 ? 19 : 21) * 60 + 664
    },
    {
      workoutId: `${PROGRAM_ID}-w${week}-run-short`, week, weekday: 3,
      kind: 'running', direction: 'Бег / выносливость', title: 'Лёгкий бег · короткая тренировка',
      goal: shortRunGoals[index], durationSeconds: 600 + shortRunSeconds,
      run: { warmupSeconds: 300, runSeconds: shortRunSeconds, cooldownSeconds: 300 },
      adaptation: runningGuidance
    },
    {
      workoutId: `${PROGRAM_ID}-w${week}-strength`, week, weekday: 5,
      kind: 'strength', direction: 'Силовая тренировка', title: 'Силовая · всё тело',
      goal: strengthGoals[index], videoIds: ['alex'],
      replacement: { videoIds: ['popsport'], note: 'Вариант без прыжков и инвентаря. Упражнения для первого подтягивания выполняются отдельно.' },
      durationSeconds: 2077,
      gap: 'Короткого домашнего видео для базы первого подтягивания пока нет; отдельный блок не назначен.'
    },
    {
      workoutId: `${PROGRAM_ID}-w${week}-run-long`, week, weekday: 0,
      kind: 'running', direction: 'Бег / выносливость', title: 'Лёгкий бег · выносливость',
      goal: longRunGoals[index], durationSeconds: 600 + longRunSeconds,
      run: { warmupSeconds: 300, runSeconds: longRunSeconds, cooldownSeconds: 300 },
      adaptation: runningGuidance
    }
  ];
}).flat();

const workoutById = Object.fromEntries(workouts.map(workout => [workout.workoutId, workout]));
return { PROGRAM_ID, videos, workouts, workoutById };
})();
