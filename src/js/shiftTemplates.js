export const SHIFT_TEMPLATES = {
  home: [
    { type: 'shortDay', label: 'Short Day', startTime: '09:00', endTime: '18:00', hours: 9 },
    { type: 'longDay', label: 'Long Day', startTime: '09:00', endTime: '21:00', hours: 12 },
    { type: 'wakingNight', label: 'Waking Night', startTime: '21:00', endTime: '09:00', hours: 12 },
    { type: 'wakingNight', label: 'Waking Night', startTime: '21:00', endTime: '09:00', hours: 12 },
  ],
  away: [
    { type: 'dayShift', label: 'Day Shift', startTime: '09:00', endTime: '23:00', hours: 14 },
    { type: 'dayShift', label: 'Day Shift', startTime: '09:00', endTime: '23:00', hours: 14 },
    { type: 'sleepNight', label: 'Sleep Night', startTime: '23:00', endTime: '09:00', hours: 10 },
    { type: 'sleepNight', label: 'Sleep Night', startTime: '23:00', endTime: '09:00', hours: 10 },
  ],
  // Transition: leaving home (home staff morning, away staff take over afternoon+night)
  'transition-away': [
    { type: 'shortDay', label: 'Short Day', startTime: '09:00', endTime: '16:00', hours: 7 },
    { type: 'shortDay', label: 'Short Day', startTime: '09:00', endTime: '16:00', hours: 7 },
    { type: 'dayShift', label: 'Day Shift', startTime: '16:00', endTime: '23:00', hours: 7 },
    { type: 'dayShift', label: 'Day Shift', startTime: '16:00', endTime: '23:00', hours: 7 },
    { type: 'sleepNight', label: 'Sleep Night', startTime: '23:00', endTime: '09:00', hours: 10 },
    { type: 'sleepNight', label: 'Sleep Night', startTime: '23:00', endTime: '09:00', hours: 10 },
  ],
  // Transition: coming home (away staff morning, home night staff take over evening)
  'transition-home': [
    { type: 'dayShift', label: 'Day Shift', startTime: '09:00', endTime: '21:00', hours: 12 },
    { type: 'dayShift', label: 'Day Shift', startTime: '09:00', endTime: '21:00', hours: 12 },
    { type: 'wakingNight', label: 'Waking Night', startTime: '21:00', endTime: '09:00', hours: 12 },
    { type: 'wakingNight', label: 'Waking Night', startTime: '21:00', endTime: '09:00', hours: 12 },
  ],
};

export function getShiftsForMode(mode) {
  return SHIFT_TEMPLATES[mode].map(t => ({ ...t }));
}

export function calculateHours(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  return (endMins - startMins) / 60;
}
