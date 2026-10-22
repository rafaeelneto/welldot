import { describe, expect, it } from 'vitest';

import { isIanaTimeZone } from './timezone.utils';

describe('isIanaTimeZone', () => {
  it('accepts IANA names', () => {
    for (const name of [
      'America/Belem',
      'America/Sao_Paulo',
      'UTC',
      'Etc/GMT+3',
    ]) {
      expect(isIanaTimeZone(name), name).toBe(true);
    }
  });

  it('rejects offsets and unknown names', () => {
    for (const name of ['-03:00', '+0300', 'GMT-3', 'America/Atlantis', '']) {
      expect(isIanaTimeZone(name), name).toBe(false);
    }
  });
});
