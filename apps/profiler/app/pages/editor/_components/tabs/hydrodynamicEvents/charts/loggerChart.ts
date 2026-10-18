import type { LoggerSeriesEvent } from '@welldot/core';
import { downsampleLoggerReadings } from '@welldot/utils';
import type { ChartSeries } from './types';

/** Most points drawn for a series; longer ones keep each bucket's extremes. */
export const LOGGER_CHART_MAX_POINTS = 2000;
const MARKER_LIMIT = 40;

export type LoggerChartLabels = { depth: string; min: string; max: string };

/**
 * Series of the logger hydrograph: x is the instant in epoch ms, y the depth.
 * An aggregated series adds muted dashed `depth_min` / `depth_max` lines.
 */
export function loggerChartSeries(
  event: LoggerSeriesEvent,
  labels: LoggerChartLabels,
): ChartSeries[] {
  // Bad rows are dropped first so they cannot take a bucket's extremes.
  const valid = event.readings.filter(
    r => Number.isFinite(Date.parse(r.datetime)) && Number.isFinite(r.depth),
  );
  const readings = downsampleLoggerReadings(valid, LOGGER_CHART_MAX_POINTS);
  if (!readings.length) return [];
  const markers = readings.length <= MARKER_LIMIT;
  const timed = readings.map(r => ({ r, x: Date.parse(r.datetime) }));

  const out: ChartSeries[] = [
    {
      id: 'depth',
      label: labels.depth,
      color: 'var(--chart-series-1)',
      markers,
      points: timed.map(({ r, x }) => ({ x, y: r.depth })),
    },
  ];
  if (event.aggregation === 'hourly' || event.aggregation === 'daily') {
    const bound = (
      id: string,
      label: string,
      pick: (r: (typeof timed)[number]['r']) => number | undefined,
    ): ChartSeries => ({
      id,
      label,
      color: 'var(--color-content-400)',
      dashed: true,
      muted: true,
      markers,
      points: timed.flatMap(({ r, x }) => {
        const y = pick(r);
        return y == null ? [] : [{ x, y }];
      }),
    });
    out.push(
      bound('depth-min', labels.min, r => r.depth_min),
      bound('depth-max', labels.max, r => r.depth_max),
    );
  }
  return out;
}

const DAY = 86_400_000;

/**
 * Label of an x tick of the logger hydrograph, in `timeZone`: the clock time
 * for spans under 2 days, the day and month up to a year (`dd/MM` in pt,
 * `MM-dd` otherwise), month and year beyond that.
 */
export function loggerTickFormatter(
  spanMs: number,
  timeZone: string,
  locale: string,
): (_x: number) => string {
  const make = (opts: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        ...opts,
      });
    } catch {
      return new Intl.DateTimeFormat('en-US', { hourCycle: 'h23', ...opts });
    }
  };
  const part = (fmt: Intl.DateTimeFormat, ms: number) =>
    Object.fromEntries(fmt.formatToParts(ms).map(p => [p.type, p.value]));
  if (spanMs < 2 * DAY) {
    const fmt = make({ hour: '2-digit', minute: '2-digit' });
    return ms => {
      const p = part(fmt, ms);
      return `${p.hour}:${p.minute}`;
    };
  }
  if (spanMs <= 365 * DAY) {
    const fmt = make({ day: '2-digit', month: '2-digit' });
    const pt = locale.toLowerCase().startsWith('pt');
    return ms => {
      const p = part(fmt, ms);
      return pt ? `${p.day}/${p.month}` : `${p.month}-${p.day}`;
    };
  }
  const fmt = make({ month: 'short', year: 'numeric' });
  return ms => {
    const p = part(fmt, ms);
    return `${p.month} ${p.year}`;
  };
}
