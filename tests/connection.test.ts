import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionFailure, connectionIssue } from '../src/lib/connection.ts';
test('React lifecycle cleanup is not reported as a failed call', () => assert.equal(connectionIssue('CLIENT_INITIATED'), null));
test('network and media failures can obtain a fresh token and retry', () => {
  for (const reason of ['JOIN_FAILURE', 'CONNECTION_TIMEOUT', 'MEDIA_FAILURE', 'SIGNAL_CLOSE', 'SERVER_SHUTDOWN', 'STATE_MISMATCH', undefined]) assert.equal(connectionIssue(reason)?.retry, true);
});
test('host removal and room closure never offer a reconnect bypass', () => {
  for (const reason of ['PARTICIPANT_REMOVED', 'ROOM_DELETED', 'ROOM_CLOSED', 'USER_REJECTED']) assert.equal(connectionIssue(reason)?.retry, false);
});
test('duplicate tab identities have an actionable explanation', () => {
  assert.match(connectionIssue('DUPLICATE_IDENTITY')!.message, /another tab or browser/);
});
test('initial failure distinguishes an unreachable server from failed media after signaling', () => {
  assert.equal(connectionFailure('ServerUnreachable').code, 'SIGNAL_CONNECTION_FAILED');
  assert.equal(connectionFailure('InternalError', true, 'UNKNOWN_REASON').code, 'MEDIA_CONNECTION_FAILED');
  assert.equal(connectionFailure('NotAllowed', true).code, 'ACCESS_DENIED');
});
test('initial failure preserves host removal and duplicate identity restrictions', () => {
  assert.equal(connectionFailure('LeaveRequest', true, 'PARTICIPANT_REMOVED').retry, false);
  assert.equal(connectionFailure('LeaveRequest', false, 'ROOM_DELETED').retry, false);
  assert.equal(connectionFailure('InternalError', true, 'DUPLICATE_IDENTITY').code, 'DUPLICATE_IDENTITY');
});
