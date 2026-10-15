import type { Well } from '@welldot/core';
import { WELL_PURPOSES, WELL_TYPES } from '@welldot/core';
import { calculatedWellDepth } from '~/utils/wellDepth';

export type WellMetadataFieldKey =
  | 'name'
  | 'well_type'
  | 'well_purpose'
  | 'well_driller'
  | 'construction_date'
  | 'lat'
  | 'lng'
  | 'elevation'
  | 'well_depth'
  | 'obs';

export function useWellMetadataFields() {
  const { t } = useI18n();
  const { vocabLabel, vocabList } = useVocab();

  const metadataFields = computed<
    { key: WellMetadataFieldKey; label: string }[]
  >(() => [
    { key: 'name', label: t('editor.exportPdfDialog.metadataFields.name') },
    {
      key: 'well_type',
      label: t('editor.exportPdfDialog.metadataFields.wellType'),
    },
    {
      key: 'well_purpose',
      label: t('editor.exportPdfDialog.metadataFields.wellPurpose'),
    },
    {
      key: 'well_driller',
      label: t('editor.exportPdfDialog.metadataFields.driller'),
    },
    {
      key: 'construction_date',
      label: t('editor.exportPdfDialog.metadataFields.constructionDate'),
    },
    {
      key: 'lat',
      label: t('editor.exportPdfDialog.metadataFields.latitude'),
    },
    {
      key: 'lng',
      label: t('editor.exportPdfDialog.metadataFields.longitude'),
    },
    {
      key: 'elevation',
      label: t('editor.exportPdfDialog.metadataFields.elevation'),
    },
    {
      key: 'well_depth',
      label: t('editor.exportPdfDialog.metadataFields.wellDepth'),
    },
    {
      key: 'obs',
      label: t('editor.exportPdfDialog.metadataFields.observations'),
    },
  ]);

  function resolveMetadataValue(well: Well, key: WellMetadataFieldKey): string {
    switch (key) {
      case 'lat':
        return well.location?.lat != null ? String(well.location.lat) : '';
      case 'lng':
        return well.location?.lng != null ? String(well.location.lng) : '';
      case 'elevation':
        return well.location?.elevation != null
          ? String(well.location.elevation)
          : '';
      case 'well_type':
        return well.well_type ? vocabLabel(WELL_TYPES, well.well_type) : '';
      case 'well_purpose':
        return vocabList(WELL_PURPOSES, well.well_purpose);
      case 'well_depth':
        return String(well.well_depth ?? calculatedWellDepth(well));
      default:
        return String(well[key] ?? '');
    }
  }

  return { metadataFields, resolveMetadataValue };
}
