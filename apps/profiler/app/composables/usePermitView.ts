/**
 * The permit open in the read-only permit view (Permits tab), shared by the
 * editor page (which mirrors it in the URL hash as `#permits/<id>`), the
 * Permits panel and the Summary permit card.
 */
export function usePermitView() {
  const permitId = useState<string | null>('permitViewId', () => null);

  return {
    permitId,
    open: (id: string) => (permitId.value = id),
    close: () => (permitId.value = null),
  };
}
