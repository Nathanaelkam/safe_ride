import {
  formatRelativeTime,
  formatTripDuration,
  formatPhone,
  maskCoordinate,
} from '@/utils/format';

describe('formatRelativeTime', () => {
  it('returns "Just now" for timestamps within the last minute', () => {
    expect(formatRelativeTime(Date.now() - 5_000)).toBe('Just now');
  });

  it('returns minutes for timestamps under an hour', () => {
    expect(formatRelativeTime(Date.now() - 7 * 60_000)).toBe('7 min ago');
  });

  it('returns hours for timestamps under a day', () => {
    expect(formatRelativeTime(Date.now() - 3 * 3_600_000)).toBe('3 hr ago');
  });

  it('returns singular "day" exactly once', () => {
    expect(formatRelativeTime(Date.now() - 1 * 86_400_000)).toBe('1 day ago');
  });

  it('pluralises days correctly', () => {
    expect(formatRelativeTime(Date.now() - 4 * 86_400_000)).toBe('4 days ago');
  });
});

describe('formatTripDuration', () => {
  it('formats sub-hour durations in minutes', () => {
    const start = Date.now() - 23 * 60_000;
    expect(formatTripDuration(start, Date.now())).toBe('23 min');
  });

  it('formats whole-hour durations cleanly', () => {
    const start = Date.now() - 2 * 60 * 60_000;
    expect(formatTripDuration(start, Date.now())).toBe('2 hr');
  });

  it('formats mixed hour/minute durations', () => {
    const start = Date.now() - (1 * 60 + 17) * 60_000;
    expect(formatTripDuration(start, Date.now())).toBe('1 hr 17 min');
  });

  it('uses Date.now() as a default end time', () => {
    const start = Date.now() - 6 * 60_000;
    expect(formatTripDuration(start)).toBe('6 min');
  });
});

describe('formatPhone', () => {
  it('pretty-prints a 13-digit +237 Cameroonian number', () => {
    expect(formatPhone('+237677442199')).toBe('+237 677 442 199');
  });

  it('returns the input unchanged for unknown formats', () => {
    expect(formatPhone('555-0100')).toBe('555-0100');
  });
});

describe('maskCoordinate', () => {
  it('rounds to the requested number of decimals', () => {
    expect(maskCoordinate(3.886712345, 4)).toBe('3.8867');
  });

  it('defaults to 4 decimals', () => {
    expect(maskCoordinate(11.522678)).toBe('11.5227');
  });
});
