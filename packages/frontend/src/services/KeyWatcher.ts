import { AppService, Note } from './AppService';

export interface KeyWatcherOptions {
  /** Get the currently selected note id */
  getSelectedId: () => number | null;
  /** Select a note (used when pasting duplicates) */
  selectNote: (id: number | null) => void;
}

/**
 * Watches global keyboard events and triggers application shortcuts.
 * Currently supports copying and pasting notes via Ctrl/Meta+C and Ctrl/Meta+V.
 */
export class KeyWatcher {
  private clipboard: Note | null = null;

  constructor(private service: AppService, private opts: KeyWatcherOptions) {}

  /** Begin listening for keyboard events */
  start(): void {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  /** Stop listening for keyboard events */
  stop(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!e || !(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();

    if (this.shouldIgnoreTarget(e.target as Element)) {
      return;
    }

    if (key === 'c') {
      this.copySelected();
      e.preventDefault();
    } else if (key === 'v') {
      this.pasteClipboard();
      e.preventDefault();
    }
  };

  private shouldIgnoreTarget(target: Element | null): boolean {
    if (!target) return false;
    const tag = (target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    const el = target as HTMLElement;
    return el.isContentEditable;
  }

  private copySelected(): void {
    const id = this.opts.getSelectedId();
    if (id == null) return;
    const state = this.service.getState();
    const ws = state.workspaces.find(w => w.id === state.currentWorkspaceId);
    const note = ws?.notes.find(n => n.id === id);
    if (!note) return;
    this.clipboard = { ...note };
  }

  private pasteClipboard(): void {
    if (!this.clipboard) return;
    const original = this.clipboard;
    const newId = this.service.addNote();
    this.service.updateNote(newId, {
      content: original.content,
      width: original.width,
      height: original.height,
      color: original.color,
      x: original.x + 20,
      y: original.y + 20,
      archived: original.archived,
      pinned: original.pinned,
    });
    this.opts.selectNote(newId);
  }
}
