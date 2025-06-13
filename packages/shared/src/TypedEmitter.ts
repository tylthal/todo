import { EventEmitter } from 'events';

export interface TypedEmitter<E extends Record<PropertyKey, unknown[]>> extends EventEmitter {
  addListener<EventKey extends keyof E>(event: EventKey, listener: (...args: E[EventKey]) => void): this;
  on<EventKey extends keyof E>(event: EventKey, listener: (...args: E[EventKey]) => void): this;
  once<EventKey extends keyof E>(event: EventKey, listener: (...args: E[EventKey]) => void): this;
  removeListener<EventKey extends keyof E>(event: EventKey, listener: (...args: E[EventKey]) => void): this;
  off<EventKey extends keyof E>(event: EventKey, listener: (...args: E[EventKey]) => void): this;
  emit<EventKey extends keyof E>(event: EventKey, ...args: E[EventKey]): boolean;
}
