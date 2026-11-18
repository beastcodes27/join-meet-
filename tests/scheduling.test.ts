import test from 'node:test';
import assert from 'node:assert/strict';
import { loginReturn, meetingTime, scheduleInstant } from '../src/lib/scheduling.ts';

test('scheduled wall-clock time is converted from the displayed local timezone to UTC', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'Africa/Addis_Ababa';
    assert.equal(scheduleInstant('2027-06-01T10:00'), '2027-06-01T07:00:00.000Z');
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
test('nonexistent daylight-saving times are rejected instead of silently moved', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    assert.equal(scheduleInstant('2027-03-14T02:30'), null);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
test('invalid calendar dates and partial input cannot become a different meeting time', () => {
  for (const value of ['', 'invalid', '2027-02-31T10:30', '2027-13-01T10:30', '2027-01-01T25:30', '2027-01-01']) assert.equal(scheduleInstant(value), null);
});
test('booking login can only return to a canonical local meeting route', () => {
  const path = '/m/' + 'a'.repeat(32);
  assert.equal(loginReturn(path), path);
  for (const path of [null, 'https://untrusted.example', '//untrusted.example', '/m/invalid', '/dashboard?redirect=evil']) assert.equal(loginReturn(path), '/dashboard');
});
test('invalid notification times do not crash the dashboard', () => {
  assert.equal(meetingTime('invalid'), 'Time unavailable');
  assert.doesNotThrow(() => meetingTime('2027-06-01T07:00:00Z', 'invalid/timezone'));
});
