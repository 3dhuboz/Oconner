import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./app/account/page.tsx', import.meta.url), 'utf8');

test('customer account sign-in hides broken social OAuth buttons', () => {
  assert.match(source, /socialButtonsBlockButton:\s*'hidden'/);
  assert.match(source, /dividerRow:\s*'hidden'/);
  assert.match(source, /<SignIn routing="hash" appearance=\{socialLoginHidden\}/);
});
