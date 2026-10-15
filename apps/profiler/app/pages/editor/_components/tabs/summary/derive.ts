import type { Permit, WaterSample, Well } from '@welldot/core';
import {
  getConditionDeadlineStates,
  getEffectiveWaterSamples,
  getPermitStartDate,
} from '@welldot/utils';
import { getActivePermit } from '~/utils/permitVocab';

/** The permit in force, else the most recent one on record. */
export function getSummaryPermit(
  well: Well,
  today: string,
): Permit | undefined {
  return (
    getActivePermit(well, today) ??
    [...(well.permits ?? [])].sort((a, b) =>
      (getPermitStartDate(b) ?? '').localeCompare(getPermitStartDate(a) ?? ''),
    )[0]
  );
}

export type PendingCondition = {
  id: string;
  description: string;
  /** Overdue deadlines, oldest first. */
  overdue: string[];
  /** Next upcoming deadline. */
  next?: string;
};

/** Conditions of `permit` with overdue or upcoming deadlines. */
export function getPendingConditions(
  well: Well,
  permit: Permit,
  today: string,
): PendingCondition[] {
  return (permit.conditions ?? []).flatMap(c => {
    const states = getConditionDeadlineStates(well, permit, c, { today });
    const overdue = states
      .filter(s => s.status === 'overdue' && s.due_date)
      .map(s => s.due_date!)
      .sort();
    const next = states.find(
      s => s.status === 'upcoming' && s.due_date,
    )?.due_date;
    if (!overdue.length && !next) return [];
    return [{ id: c.id, description: c.description, overdue, next }];
  });
}

/** Latest effective sample of the well water (blanks never describe it). */
export function getLatestWellSample(well: Well): WaterSample | undefined {
  return getEffectiveWaterSamples(well)
    .filter(s => !s.sample_type.endsWith('_blank'))
    .sort(
      (a, b) =>
        new Date(b.datetime).getTime() - new Date(a.datetime).getTime() ||
        (b.sequence ?? 0) - (a.sequence ?? 0),
    )[0];
}

/** Whole days from `from` to `to` (calendar dates, YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}
