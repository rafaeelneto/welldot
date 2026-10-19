import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractReleaseNotes } from './release-notes.mjs';

const changelog = `# @welldot/core

## 0.5.0

### Minor Changes

- abc123: v2.4 format.

## 0.4.0

### Minor Changes

- old entry
`;

test('returns the body of the requested version', () => {
  assert.equal(extractReleaseNotes(changelog, '0.5.0'), '### Minor Changes\n\n- abc123: v2.4 format.');
});

test('stops at the next version heading', () => {
  assert.equal(extractReleaseNotes(changelog, '0.4.0'), '### Minor Changes\n\n- old entry');
});

test('returns null for a missing version', () => {
  assert.equal(extractReleaseNotes(changelog, '9.9.9'), null);
});

test('does not match a version that is a prefix of another', () => {
  assert.equal(extractReleaseNotes(changelog, '0.5'), null);
});
