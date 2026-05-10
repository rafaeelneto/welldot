import { EventBus, getEventBus } from '~/core/EventBus';

export function useBus(): EventBus {
  return getEventBus();
}

export default useBus;
