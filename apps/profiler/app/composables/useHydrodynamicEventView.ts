/**
 * The hydrodynamic event open in the read-only event view (Hydrodynamic tab),
 * shared by the editor page (which mirrors it in the URL hash as
 * `#hydrodynamic/<id>`), the events tab and the Summary latest-event card.
 */
export function useHydrodynamicEventView() {
  const eventId = useState<string | null>(
    'hydrodynamicEventViewId',
    () => null,
  );

  return {
    eventId,
    open: (id: string) => (eventId.value = id),
    close: () => (eventId.value = null),
  };
}
