import { SHIFT_TEMPLATES, getShiftsForMode, calculateHours } from '../src/js/shiftTemplates.js';

describe('Shift Templates', () => {
  it('returns 4 home shifts', () => {
    const shifts = getShiftsForMode('home');
    assert.equal(shifts.length, 4);
    assert.equal(shifts[0].type, 'shortDay');
    assert.equal(shifts[1].type, 'longDay');
    assert.equal(shifts[2].type, 'wakingNight');
    assert.equal(shifts[3].type, 'wakingNight');
  });

  it('returns 4 away shifts', () => {
    const shifts = getShiftsForMode('away');
    assert.equal(shifts.length, 4);
    assert.equal(shifts[0].type, 'dayShift');
    assert.equal(shifts[1].type, 'dayShift');
    assert.equal(shifts[2].type, 'sleepNight');
    assert.equal(shifts[3].type, 'sleepNight');
  });

  it('calculates hours for same-day span', () => {
    assert.equal(calculateHours('09:00', '18:00'), 9);
    assert.equal(calculateHours('09:00', '21:00'), 12);
    assert.equal(calculateHours('09:00', '23:00'), 14);
  });

  it('calculates hours for overnight span', () => {
    assert.equal(calculateHours('21:00', '09:00'), 12);
    assert.equal(calculateHours('23:00', '09:00'), 10);
  });

  it('home shifts have correct default hours', () => {
    const shifts = getShiftsForMode('home');
    assert.equal(shifts[0].hours, 9);
    assert.equal(shifts[1].hours, 12);
    assert.equal(shifts[2].hours, 12);
    assert.equal(shifts[3].hours, 12);
  });

  it('away shifts have correct default hours', () => {
    const shifts = getShiftsForMode('away');
    assert.equal(shifts[0].hours, 14);
    assert.equal(shifts[1].hours, 14);
    assert.equal(shifts[2].hours, 10);
    assert.equal(shifts[3].hours, 10);
  });
});
