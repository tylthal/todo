import { AppService, Note } from './AppService';

let clipboard: Note | null = null;

export function copyNote(service: AppService, id: number): void {
  const state = service.getState();
  const ws = state.workspaces.find(w => w.id === state.currentWorkspaceId);
  const note = ws?.notes.find(n => n.id === id);
  clipboard = note ? { ...note } : null;
}

export function pasteNote(service: AppService): number | null {
  if (!clipboard) return null;
  const original = clipboard;
  const newId = service.addNote();
  service.updateNote(newId, {
    content: original.content,
    width: original.width,
    height: original.height,
    color: original.color,
    x: original.x + 20,
    y: original.y + 20,
    archived: original.archived,
    pinned: original.pinned,
    locked: original.locked,
  });
  return newId;
}

export function hasClipboard(): boolean {
  return clipboard != null;
}
