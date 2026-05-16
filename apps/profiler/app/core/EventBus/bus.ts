import type { AppEvents } from './Events';
import type { BusListener, Event, EventCallback } from './types';
import { EventStatus } from './types';

type AppEventsKeys = keyof AppEvents;
type AppEventsPayload<E extends AppEventsKeys> = AppEvents[E];

interface QueuedEvent<E extends AppEventsKeys = AppEventsKeys> {
  event: Event<AppEventsPayload<E>>;
  consumed: boolean;
}

export class EventBus {
  private callbacks: Map<AppEventsKeys, Set<EventCallback>> = new Map();
  private listeners: Set<BusListener> = new Set();
  private pendingEvents: string[] = [];
  private queuedEvents: Map<AppEventsKeys, QueuedEvent[]> = new Map();

  on<E extends AppEventsKeys>(
    eventName: E,
    callback: EventCallback<AppEventsPayload<E>>,
  ): () => void {
    if (!this.callbacks.has(eventName)) {
      this.callbacks.set(eventName, new Set());
    }
    this.callbacks.get(eventName)!.add(callback);
    this.consumeQueuedEvents(eventName);
    return () => {
      this.callbacks.get(eventName)?.delete(callback);
    };
  }

  once<E extends AppEventsKeys>(
    eventName: E,
    callback: EventCallback<AppEventsPayload<E>>,
  ): () => void {
    const wrapper = async (payload: AppEventsPayload<E>) => {
      try {
        return await callback(payload);
      } finally {
        unsubscribe();
      }
    };
    const unsubscribe = this.on(eventName, wrapper);
    return unsubscribe;
  }

  onAsync<E extends AppEventsKeys>(
    eventName: E,
    timeoutMs: number = 30000,
  ): Promise<AppEventsPayload<E>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(
          new Error(`Timeout waiting for "${eventName}" (${timeoutMs}ms)`),
        );
      }, timeoutMs);

      const unsubscribe = this.once(
        eventName,
        (payload: AppEventsPayload<E>) => {
          clearTimeout(timeout);
          resolve(payload);
        },
      );
    });
  }

  emit<E extends AppEventsKeys>(
    eventName: E,
    payload: AppEventsPayload<E>,
  ): string {
    const eventId = this.generateEventId();
    const event: Event<AppEventsPayload<E>> = {
      id: eventId,
      name: eventName,
      payload,
      status: EventStatus.PENDING,
      createdAt: new Date(),
    };
    this.pendingEvents.push(eventId);
    this.notifyListeners('onEventAdded', event);
    this.processEvent(event);
    return eventId;
  }

  off<E extends AppEventsKeys>(
    eventName: E,
    callback: EventCallback<AppEventsPayload<E>>,
  ): void {
    this.callbacks.get(eventName)?.delete(callback);
  }

  emitQueue<E extends AppEventsKeys>(
    eventName: E,
    payload: AppEventsPayload<E>,
  ): string {
    const eventId = this.generateEventId();
    const event: Event<AppEventsPayload<E>> = {
      id: eventId,
      name: eventName,
      payload,
      status: EventStatus.PENDING,
      createdAt: new Date(),
    };

    const hasListeners =
      this.callbacks.has(eventName) && this.callbacks.get(eventName)!.size > 0;

    if (hasListeners) {
      this.pendingEvents.push(eventId);
      this.notifyListeners('onEventAdded', event);
      this.processEvent(event);
    } else {
      if (!this.queuedEvents.has(eventName)) {
        this.queuedEvents.set(eventName, []);
      }
      this.queuedEvents.get(eventName)!.push({ event, consumed: false });
      this.notifyListeners('onEventAdded', event);
    }

    return eventId;
  }

  private consumeQueuedEvents<E extends AppEventsKeys>(eventName: E): void {
    const queue = this.queuedEvents.get(eventName);
    if (!queue || queue.length === 0) return;

    queue.forEach(queued => {
      if (!queued.consumed) {
        queued.consumed = true;
        this.pendingEvents.push(queued.event.id);
        this.processEvent(queued.event);
      }
    });

    this.queuedEvents.delete(eventName);
  }

  private processEvent(event: Event): void {
    event.status = EventStatus.PROCESSING;
    this.notifyListeners('onEventProcessing', event);

    try {
      const callbacks =
        this.callbacks.get(event.name as AppEventsKeys) || new Set();
      callbacks.forEach(callback => {
        if (!callback) return;
        (callback as (...a: any[]) => any).apply(event, event.payload);
      });
      event.status = EventStatus.SUCCESS;
      this.notifyListeners('onEventSuccess', event);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      event.error = err;
      event.status = EventStatus.FAILED;
      this.notifyListeners('onEventFailed', event, err);
    }
  }

  private notifyListeners(method: keyof BusListener, ...args: any[]): void {
    this.listeners.forEach(listener => {
      const callback = listener[method];
      if (callback) {
        (callback as (...a: any[]) => any).apply(listener, args);
      }
    });
  }

  listen(listener: BusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(key?: AppEventsKeys): void {
    if (key) {
      this.callbacks.delete(key);
    } else {
      this.callbacks.clear();
    }
    this.pendingEvents = [];
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

let globalEventBus: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}
