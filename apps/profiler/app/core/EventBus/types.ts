export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export type EventCallback<T = any> = (payload: T) => Promise<any> | any;

export interface Event<T = any> {
  id: string;
  name: string;
  payload: T;
  status: EventStatus;
  createdAt: Date;
  error?: Error;
}

export type BusListener = {
  onEventAdded?: (event: Event) => void;
  onEventProcessing?: (event: Event) => void;
  onEventSuccess?: (event: Event) => void;
  onEventFailed?: (event: Event, error: Error) => void;
};
