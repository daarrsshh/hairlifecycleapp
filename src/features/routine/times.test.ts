import { addTime, removeTime, replaceTime } from './times';

describe('addTime', () => {
  it('builds up a three-times-a-day schedule', () => {
    let times = ['08:00'];
    times = addTime(times, '14:00');
    times = addTime(times, '20:00');
    expect(times).toEqual(['08:00', '14:00', '20:00']);
  });

  it('keeps times sorted regardless of the order they were entered', () => {
    let times = ['20:00'];
    times = addTime(times, '08:00');
    times = addTime(times, '14:00');
    expect(times).toEqual(['08:00', '14:00', '20:00']);
  });

  it('ignores a time that is already scheduled', () => {
    expect(addTime(['08:00', '20:00'], '08:00')).toEqual(['08:00', '20:00']);
  });

  it('sorts across midday and midnight boundaries', () => {
    expect(addTime(['09:00'], '00:30')).toEqual(['00:30', '09:00']);
    expect(addTime(['09:00'], '23:45')).toEqual(['09:00', '23:45']);
  });
});

describe('replaceTime', () => {
  it('changes the time at a position', () => {
    expect(replaceTime(['08:00', '20:00'], 1, '21:00')).toEqual(['08:00', '21:00']);
  });

  it('re-sorts when the new time moves earlier', () => {
    expect(replaceTime(['08:00', '20:00'], 1, '06:00')).toEqual(['06:00', '08:00']);
  });

  it('collapses to one when edited onto an existing time', () => {
    expect(replaceTime(['08:00', '20:00'], 1, '08:00')).toEqual(['08:00']);
  });
});

describe('removeTime', () => {
  it('drops the time at a position', () => {
    expect(removeTime(['08:00', '14:00', '20:00'], 1)).toEqual(['08:00', '20:00']);
  });
});
