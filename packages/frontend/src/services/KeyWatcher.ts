import { AppService } from './AppService';
import { copyNote, pasteNote } from './Clipboard';

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
    copyNote(this.service, id);
  }

  private pasteClipboard(): void {
    void (async () => {
      const newId = await pasteNote(this.service);
      if (newId != null) {
        this.opts.selectNote(newId);
      }
    })();
  }
}
