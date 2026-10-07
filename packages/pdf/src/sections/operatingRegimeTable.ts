import type { OperatingRegime, Well } from '@welldot/core';
import { formatNumber, getCurrentRegime } from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { createPdfFormatters } from '../formatters';
import { headerCell, rightCell, withTableTitle } from '../layout/tables';
import type { PdfContext } from '../types/options.types';
import type { Content, TableCell } from '../types/pdfmake.types';

/**
 * Builds the `operating_regime` table (.well v2.3), most recent entry first,
 * marking the regime in force. Absent values print as "—" (unknown, never
 * zero). Returns `null` when there are none.
 */
export function buildOperatingRegimeSection(
  well: Well,
  ctx: PdfContext,
): Content | null {
  const regimes = well.operating_regime;
  if (!regimes?.length) return null;

  const fmt = createPdfFormatters(ctx);
  const currentId = getCurrentRegime(well)?.id;
  const { t } = ctx;
  const field = (key: string) => t(`operation.regime.fields.${key}`);
  const sorted: OperatingRegime[] = [...regimes].sort(
    (a, b) =>
      new Date(b.effective_from).getTime() -
      new Date(a.effective_from).getTime(),
  );

  const body: TableCell[][] = [
    [
      headerCell(field('effectiveFrom')),
      headerCell(field('flowRate'), true),
      headerCell(`${field('dailyOperatingTime')} (h)`, true),
      headerCell(field('daysPerWeek'), true),
      headerCell(field('notes')),
    ],
  ];
  sorted.forEach(r => {
    const date = format(parseISO(r.effective_from), ctx.dateFormats.dateTime);
    body.push([
      r.id === currentId ? `${date}  (${t('operation.regime.inForce')})` : date,
      rightCell(fmt.formatFlow(r.flow_rate, 2)),
      rightCell(
        r.daily_operating_time != null
          ? formatNumber(r.daily_operating_time, { maximumFractionDigits: 2 })
          : '—',
      ),
      rightCell(r.days_per_week != null ? String(r.days_per_week) : '—'),
      r.notes ?? '',
    ]);
  });

  return {
    stack: [
      { text: ' ' },
      withTableTitle(t('operation.regime.title'), {
        layout: 'lightHorizontalLines',
        table: {
          widths: ['auto', 'auto', 'auto', 'auto', '*'],
          headerRows: 1,
          dontBreakRows: true,
          body,
        },
      }),
    ],
  };
}
