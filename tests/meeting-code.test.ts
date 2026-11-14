import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMeetingCode } from '../src/lib/meeting-code.ts';
const code = 'a'.repeat(32);
test('accepts canonical codes and trims whitespace', () => {
    assert.equal(parseMeetingCode(`  ${code} `), code);
});
test('extracts a code from a full meeting URL without navigating off-site', () => {
    assert.equal(parseMeetingCode(`https://meet.example.test/m/${code}?invite=yes`), code);
});
test('rejects malformed, short, and potentially executable input', () => {
    for (const input of ['', 'abc', 'A'.repeat(32), 'a'.repeat(33), 'g'.repeat(32), 'javascript:alert(1)', 'https://', '../login']) {
        assert.equal(parseMeetingCode(input), null);
    }
});
