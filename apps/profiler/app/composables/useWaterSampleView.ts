/**
 * The water sample open in the read-only sample view (Water quality tab),
 * shared by the editor page (which mirrors it in the URL hash as
 * `#water-quality/<id>`), the samples panel and the Summary water card.
 */
export function useWaterSampleView() {
  const sampleId = useState<string | null>('waterSampleViewId', () => null);

  return {
    sampleId,
    open: (id: string) => (sampleId.value = id),
    close: () => (sampleId.value = null),
  };
}
