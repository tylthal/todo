import { EventEmitter } from 'events';
import type { User } from '@sticky-notes/shared';


/** Sticky note data model */
export interface Note {
  id: number;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  archived: boolean;
  color: string;
  zIndex: number;
  pinned?: boolean;
  locked?: boolean;
}

/** Canvas state for a workspace */
export interface CanvasState {
  offset: { x: number; y: number };
  zoom: number;
  zCounter: number; // used to maintain z-order of notes
  snapToEdges: boolean;
}

/** Workspace groups a canvas and its notes */
export interface Workspace {
  id: number;
  name: string;
  notes: Note[];
  canvas: CanvasState;
}

/** Shape of the global application state managed by {@link AppService}. */
export interface AppState {
  user: User | null;
  workspaces: Workspace[];
  currentWorkspaceId: number;
}

/**
 * Centralized service responsible for storing application state. All
 * components should mutate state through this service so that future API
 * integration can synchronize changes with the backend.
 *
 * The service emits a `"change"` event whenever state updates.
 */
export class AppService extends EventEmitter {
  private state: AppState;

  constructor() {
    super();
    const defaultWorkspace: Workspace = {
      id: 1,
      name: 'Default',
      notes: [],
      canvas: { offset: { x: 0, y: 0 }, zoom: 1, zCounter: 0, snapToEdges: false },
    };

    this.state = {
      user: null,
      workspaces: [defaultWorkspace],
      currentWorkspaceId: 1,
    };
  }

  /** Get a readonly snapshot of the current state. */
  getState(): AppState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: (state: AppState) => void): () => void {
    this.on('change', listener);
    // Older versions of the `events` package used by our browser build do not
    // implement the `off` alias that Node's `EventEmitter` provides.
    // Use `removeListener` for maximum compatibility when unsubscribing.
    return () => this.removeListener('change', listener);
  }

  private emitChange(): void {
    this.emit('change', this.getState());
    this.syncWithBackend();
  }

  /** Placeholder for future API calls to persist state. */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private async syncWithBackend(): Promise<void> {
    // In a real implementation this would POST the state diff to the API.
  }

  // ─── User Actions ────────────────────────────────────────────────────────

  /** Set the currently authenticated user */
  setUser(user: User | null): void {
    this.state.user = user;
    this.emitChange();
  }

  // ─── Workspace Actions ───────────────────────────────────────────────────

  /** Create a new workspace and switch to it */
  createWorkspace(name?: string): number {
    const id = Date.now();
    const ws: Workspace = {
      id,
      name: name || `Workspace ${this.state.workspaces.length + 1}`,
      notes: [],
      canvas: { offset: { x: 0, y: 0 }, zoom: 1, zCounter: 0, snapToEdges: false },
    };
    this.state.workspaces.push(ws);
    this.state.currentWorkspaceId = id;
    this.emitChange();
    return id;
  }

  /** Rename a workspace */
  renameWorkspace(id: number, name: string): void {
    const ws = this.state.workspaces.find(w => w.id === id);
    if (!ws || ws.id === 1) return; // default workspace immutable
    ws.name = name;
    this.emitChange();
  }

  /** Switch to another workspace */
  switchWorkspace(id: number): void {
    if (this.state.workspaces.some(w => w.id === id)) {
      this.state.currentWorkspaceId = id;
      this.emitChange();
    }
  }

  /** Delete a workspace */
  deleteWorkspace(id: number): void {
    if (id === 1) return; // prevent deleting default workspace
    const index = this.state.workspaces.findIndex(w => w.id === id);
    if (index === -1) return;
    this.state.workspaces.splice(index, 1);
    if (this.state.currentWorkspaceId === id) {
      const next = this.state.workspaces[0];
      this.state.currentWorkspaceId = next ? next.id : 1;
    }
    this.emitChange();
  }

  // ─── Canvas / Note Actions ──────────────────────────────────────────────

  private get currentWorkspace(): Workspace {
    return (
      this.state.workspaces.find(w => w.id === this.state.currentWorkspaceId) ||
      this.state.workspaces[0]
    );
  }

  /** Add a new note to the active workspace */
  addNote(): number {
    const ws = this.currentWorkspace;
    const id = Date.now();
    const newZ = ws.canvas.zCounter + 1;
    const note: Note = {
      id,
      content: '',
      x: (-ws.canvas.offset.x + 40) / ws.canvas.zoom,
      y: (-ws.canvas.offset.y + 40) / ws.canvas.zoom,
      width: 150,
      height: 120,
      archived: false,
      color: '#fef08a',
      zIndex: newZ,
      pinned: false,
      locked: false,
    };
    ws.canvas.zCounter = newZ;
    ws.notes.push(note);
    this.emitChange();
    return id;
  }

  /** Update an existing note */
  updateNote(id: number, data: Partial<Note>): void {
    const ws = this.currentWorkspace;
    const note = ws.notes.find(n => n.id === id);
    if (!note) return;
    Object.assign(note, data);
    this.emitChange();
  }

  /**
   * Move a note to the front of the z-order. This mimics selecting a note in
   * the UI and ensures newly focused notes appear above others.
   */
  bringNoteToFront(id: number): void {
    const ws = this.currentWorkspace;
    const note = ws.notes.find(n => n.id === id);
    if (!note) return;
    const newZ = ws.canvas.zCounter + 1;
    ws.canvas.zCounter = newZ;
    note.zIndex = newZ;
    this.emitChange();
  }

  /** Move a note to the back of the z-order */
  sendNoteToBack(id: number): void {
    const ws = this.currentWorkspace;
    const note = ws.notes.find(n => n.id === id);
    if (!note) return;
    const minZ = Math.min(...ws.notes.map(n => n.zIndex));
    note.zIndex = minZ - 1;
    this.emitChange();
  }

  /** Pin or unpin a note behind others */
  setNotePinned(id: number, pinned: boolean): void {
    const ws = this.currentWorkspace;
    const note = ws.notes.find(n => n.id === id);
    if (!note) return;
    note.pinned = pinned;
    if (pinned) {
      const minZ = Math.min(...ws.notes.map(n => n.zIndex));
      note.zIndex = minZ - 1;
      this.emitChange();
    } else {
      this.bringNoteToFront(id);
    }
  }

  /** Lock or unlock a note */
  setNoteLocked(id: number, locked: boolean): void {
    const ws = this.currentWorkspace;
    const note = ws.notes.find(n => n.id === id);
    if (!note) return;
    note.locked = locked;
    this.emitChange();
  }

  /** Archive or unarchive a note */
  archiveNote(id: number, archived: boolean): void {
    this.updateNote(id, { archived });
  }

  /** Delete a note from the active workspace */
  deleteNote(id: number): void {
    const ws = this.currentWorkspace;
    const index = ws.notes.findIndex(n => n.id === id);
    if (index === -1) return;
    ws.notes.splice(index, 1);
    this.emitChange();
  }

  /** Set canvas pan offset */
  setOffset(pos: { x: number; y: number }): void {
    const ws = this.currentWorkspace;
    ws.canvas.offset = pos;
    this.emitChange();
  }

  /** Enable or disable snapping notes to edges */
  setSnapToEdges(enabled: boolean): void {
    const ws = this.currentWorkspace;
    ws.canvas.snapToEdges = enabled;
    this.emitChange();
  }

  /** Set canvas zoom level */
  setZoom(z: number): void {
    const ws = this.currentWorkspace;
    ws.canvas.zoom = z;
    this.emitChange();
  }
}

/** Singleton instance used throughout the app */
export const appService = new AppService();

