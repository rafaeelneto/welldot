import type { VocabEntry } from './vocab';

/** Recommended `bore_hole[].drilling_method` values. */
export const DRILLING_METHODS = [
  { value: 'rotary', label: { en: 'Rotary', pt: 'Rotativo' } },
  { value: 'percussion', label: { en: 'Percussion', pt: 'Percussão' } },
  { value: 'cable_tool', label: { en: 'Cable tool', pt: 'Percussão a cabo' } },
  { value: 'auger', label: { en: 'Auger', pt: 'Trado' } },
  {
    value: 'air_hammer',
    label: { en: 'Air hammer', pt: 'Martelo pneumático' },
  },
] as const satisfies readonly VocabEntry[];

export type DrillingMethod = (typeof DRILLING_METHODS)[number]['value'];

/**
 * Recommended construction materials, shared by `well_case[].type`,
 * `well_screen[].type`, `reduction[].type` and
 * `pump_installations[].riser_material`.
 */
export const CONSTRUCTION_MATERIALS = [
  { value: 'pvc', label: { en: 'PVC', pt: 'PVC' } },
  {
    value: 'geomechanical_pvc',
    label: { en: 'Geomechanical PVC', pt: 'PVC geomecânico' },
  },
  { value: 'carbon_steel', label: { en: 'Carbon steel', pt: 'Aço carbono' } },
  {
    value: 'galvanized_steel',
    label: { en: 'Galvanized steel', pt: 'Aço galvanizado' },
  },
  {
    value: 'stainless_steel',
    label: { en: 'Stainless steel', pt: 'Aço inox' },
  },
  { value: 'fiberglass', label: { en: 'Fiberglass', pt: 'Fibra de vidro' } },
] as const satisfies readonly VocabEntry[];

export type ConstructionMaterial =
  (typeof CONSTRUCTION_MATERIALS)[number]['value'];

/**
 * Recommended `well_screen[].slot_type` values (since v2.3): the screen
 * design, independent of its material (`well_screen[].type`).
 */
export const SCREEN_SLOT_TYPES = [
  {
    value: 'continuous_slot',
    label: { en: 'Continuous slot', pt: 'Espiralado (tipo Johnson)' },
  },
  { value: 'slotted', label: { en: 'Slotted', pt: 'Ranhurado' } },
  { value: 'bridge_slot', label: { en: 'Bridge slot', pt: 'Tipo ponte' } },
  { value: 'louver', label: { en: 'Louver', pt: 'Veneziana' } },
  { value: 'perforated', label: { en: 'Perforated', pt: 'Perfurado' } },
  { value: 'nold', label: { en: 'Nold type', pt: 'Tipo Nold' } },
] as const satisfies readonly VocabEntry[];

export type ScreenSlotType = (typeof SCREEN_SLOT_TYPES)[number]['value'];

/**
 * Recommended `centralizers[].type` values (since v2.1): the centralizer
 * design, plus the steel materials commonly used to name rigid ones.
 */
export const CENTRALIZER_TYPES = [
  { value: 'spring_bow', label: { en: 'Spring bow', pt: 'Mola (spring bow)' } },
  { value: 'rigid', label: { en: 'Rigid', pt: 'Rígido' } },
  { value: 'semi_rigid', label: { en: 'Semi-rigid', pt: 'Semirrígido' } },
  { value: 'polymer', label: { en: 'Polymer', pt: 'Polimérico' } },
  { value: 'carbon_steel', label: { en: 'Carbon steel', pt: 'Aço carbono' } },
  {
    value: 'galvanized_steel',
    label: { en: 'Galvanized steel', pt: 'Aço galvanizado' },
  },
  {
    value: 'stainless_steel',
    label: { en: 'Stainless steel', pt: 'Aço inox' },
  },
] as const satisfies readonly VocabEntry[];

export type CentralizerType = (typeof CENTRALIZER_TYPES)[number]['value'];

/** Recommended `cement_pad.type` values. */
export const CEMENT_PAD_TYPES = [
  { value: 'concrete', label: { en: 'Concrete', pt: 'Concreto' } },
  {
    value: 'reinforced_concrete',
    label: { en: 'Reinforced concrete', pt: 'Concreto armado' },
  },
  { value: 'cement', label: { en: 'Cement', pt: 'Cimento' } },
  { value: 'mortar', label: { en: 'Mortar', pt: 'Argamassa' } },
] as const satisfies readonly VocabEntry[];

export type CementPadType = (typeof CEMENT_PAD_TYPES)[number]['value'];
