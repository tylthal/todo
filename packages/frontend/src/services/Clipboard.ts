import { EventEmitter } from 'events';
import { AppService } from './AppService';
import type { Note } from '@sticky-notes/shared';

const emitter = new EventEmitter();

let clipboard: Note | null = null;

function emitChange(): void {
  emitter.emit('change', clipboard);
}

export function copyNote(service: AppService, id: number): void {
  const state = service.getState();
  const ws = state.workspaces.find(w => w.id === state.currentWorkspaceId);
  const note = ws?.notes.find(n => n.id === id);
  clipboard = note ? { ...note } : null;
  emitChange();
}

export function pasteNote(
  service: AppService,
  x?: number,
  y?: number,
): number | null {
  if (!clipboard) return null;
  const original = clipboard;
  const newId = service.addNote();
  service.updateNote(newId, {
    content: original.content,
    width: original.width,
    height: original.height,
    color: original.color,
    x: x ?? original.x + 20,
    y: y ?? original.y + 20,
    rotation: original.rotation,
    archived: original.archived,
    pinned: original.pinned,
    locked: original.locked,
  });
  return newId;
}

export function hasClipboard(): boolean {
  return clipboard != null;
}

export function clearClipboard(): void {
  clipboard = null;
  emitChange();
}

export function onClipboardChange(
  listener: (note: Note | null) => void
): () => void {
  emitter.on('change', listener);
  // compatibility with older versions of events library
  return () => emitter.removeListener('change', listener);
}
