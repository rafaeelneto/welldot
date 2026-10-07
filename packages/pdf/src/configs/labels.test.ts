import { describe, expect, it } from 'vitest';
import { buildHistoryLogSection } from '../sections/historyLogTable';
import { baseWell, makeTestContext } from '../test-utils';
import { resolvePdfLabels } from './labels.utils';

describe('document labels', () => {
  it('resolves the built-in pack per locale, base language first', () => {
    expect(resolvePdfLabels('en').general.name).toBe('Well Name');
    expect(resolvePdfLabels('pt-BR').document.title).toBe('PERFIL GEOLÓGICO');
    // No Spanish text ships: falls back to Portuguese.
    expect(resolvePdfLabels('es').document.page).toBe('Página');
  });

  it('applies overrides leaf by leaf, as plain text or per language', () => {
    const labels = resolvePdfLabels('es', {
      general: { name: 'Nombre del pozo' },
      document: { page: { es: 'Hoja', en: 'Sheet' } },
    });
    expect(labels.general.name).toBe('Nombre del pozo');
    expect(labels.document.page).toBe('Hoja');
    expect(labels.general.driller).toBe(resolvePdfLabels('es').general.driller);
  });
});

describe('vocabulary values', () => {
  it('come from @welldot/core in the export locale, not from the pack', () => {
    const well = baseWell({
      history_logs: [
        {
          id: 'h1',
          datetime: '2024-06-01T10:00:00-03:00',
          category: 'status_change',
          status: 'inactive',
          description: 'Stopped',
        },
      ],
    } as never);
    const pt = JSON.stringify(
      buildHistoryLogSection(well, makeTestContext({ locale: 'pt' })),
    );
    expect(pt).toContain('Paralisado');
    const en = JSON.stringify(
      buildHistoryLogSection(well, makeTestContext({ locale: 'en' })),
    );
    expect(en).toContain('Inactive');
  });
});
