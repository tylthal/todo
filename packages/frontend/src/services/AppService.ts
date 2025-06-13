import { EventEmitter } from 'events';
import type { TypedEmitter, User, Note, Workspace as SharedWorkspace } from '@sticky-notes/shared';
import {
  getWorkspaces,
  getNotes,
  createWorkspace as apiCreateWorkspace,
  updateWorkspace as apiUpdateWorkspace,
  deleteWorkspace as apiDeleteWorkspace,
  createNote as apiCreateNote,
  updateNote as apiUpdateNote,
} from './api';



/** Canvas state for a workspace */
export interface CanvasState {
  offset: { x: number; y: number };
  zoom: number;
  zCounter: number; // used to maintain z-order of notes
  snapToEdges: boolean;
}

/** Workspace groups a canvas and its notes */
export interface Workspace extends SharedWorkspace {
  notes: Note[];
  canvas: CanvasState;
}

/** Shape of the global application state managed by {@link AppService}. */
export interface AppState {
  user: User | null;
  workspaces: Workspace[];
  currentWorkspaceId: number;
}

interface AppServiceEvents {
  change: [AppState];
}

/**
 * Centralized service responsible for storing application state. All
 * components should mutate state through this service so that future API
 * integration can synchronize changes with the backend.
 *
 * The service emits a `"change"` event whenever state updates.
 */
export class AppService extends EventEmitter implements TypedEmitter<AppServiceEvents> {
  private state: AppState;

  constructor() {
    super();
    const defaultWorkspace: Workspace = {
      id: 1,
      name: 'Default',
      ownerId: null,
      contributorIds: [],
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
    return structuredClone(this.state);
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
  }

  /** Fetch workspaces from the backend and hydrate state */
  private async loadWorkspaces(): Promise<void> {
    try {
      const data = await getWorkspaces();
      this.state.workspaces = data.map(w => ({
        ...w,
        notes: [],
        canvas: { offset: { x: 0, y: 0 }, zoom: 1, zCounter: 0, snapToEdges: false },
      }));
      if (this.state.workspaces.length > 0) {
        this.state.currentWorkspaceId = this.state.workspaces[0].id;
        await this.loadNotes(this.state.currentWorkspaceId);
      }
      this.emitChange();
    } catch (err) {
      console.error('Failed to load workspaces', err);
    }
  }

  /** Fetch notes for a workspace */
  private async loadNotes(workspaceId: number): Promise<void> {
    try {
      const ws = this.state.workspaces.find(w => w.id === workspaceId);
      if (!ws) return;
      const notes = await getNotes(workspaceId);
      ws.notes = notes;
      ws.canvas.zCounter = notes.reduce((m, n) => Math.max(m, n.zIndex), 0);
      this.emitChange();
    } catch (err) {
      console.error('Failed to load notes', err);
    }
  }

  // ─── User Actions ────────────────────────────────────────────────────────

  /** Set the currently authenticated user */
  setUser(user: User | null): void {
    this.state.user = user;
    this.emitChange();
    if (user) {
      void this.loadWorkspaces();
    }
  }

  // ─── Workspace Actions ───────────────────────────────────────────────────

  /** Create a new workspace and switch to it */
  async createWorkspace(name?: string): Promise<number> {
    const created = await apiCreateWorkspace({ name });
    const ws: Workspace = {
      ...created,
      notes: [],
      canvas: { offset: { x: 0, y: 0 }, zoom: 1, zCounter: 0, snapToEdges: false },
    };
    this.state.workspaces.push(ws);
    this.state.currentWorkspaceId = ws.id;
    this.emitChange();
    return ws.id;
  }

  /** Rename a workspace */
  async renameWorkspace(id: number, name: string): Promise<void> {
    const ws = this.state.workspaces.find(w => w.id === id);
    if (!ws || ws.id === 1) return; // default workspace immutable
    const updated = await apiUpdateWorkspace(id, { name });
    ws.name = updated.name;
    this.emitChange();
  }

  /** Switch to another workspace */
  async switchWorkspace(id: number): Promise<void> {
    if (this.state.workspaces.some(w => w.id === id)) {
      this.state.currentWorkspaceId = id;
      this.emitChange();
      await this.loadNotes(id);
    }
  }

  /** Delete a workspace */
  async deleteWorkspace(id: number): Promise<void> {
    if (id === 1) return; // prevent deleting default workspace
    const index = this.state.workspaces.findIndex(w => w.id === id);
    if (index === -1) return;
    await apiDeleteWorkspace(id);
    this.state.workspaces.splice(index, 1);
    if (this.state.currentWorkspaceId === id) {
      const next = this.state.workspaces[0];
      this.state.currentWorkspaceId = next ? next.id : 1;
      await this.loadNotes(this.state.currentWorkspaceId);
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
  async addNote(): Promise<number> {
    const ws = this.currentWorkspace;
    const newZ = ws.canvas.zCounter + 1;
    const payload: Partial<Note> & { workspaceId: number } = {
      content: '',
      x: (-ws.canvas.offset.x + 40) / ws.canvas.zoom,
      y: (-ws.canvas.offset.y + 40) / ws.canvas.zoom,
      width: 150,
      height: 120,
      rotation: 0,
      archived: false,
      color: '#fef08a',
      zIndex: newZ,
      pinned: false,
      locked: false,
      workspaceId: ws.id,
    };
    const created = await apiCreateNote(payload);
    ws.canvas.zCounter = Math.max(ws.canvas.zCounter, created.zIndex);
    ws.notes.push(created);
    this.emitChange();
    return created.id;
  }

  /** Update an existing note */
  updateNote(id: number, data: Partial<Note>): void {
    const ws = this.currentWorkspace;
    const note = ws.notes.find(n => n.id === id);
    if (!note) return;
    Object.assign(note, data);
    this.emitChange();
    void apiUpdateNote(id, { ...note, workspaceId: ws.id }).catch(err => {
      console.error('Failed to update note', err);
    });
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
    void apiUpdateNote(id, { ...note, workspaceId: ws.id }).catch(err => {
      console.error('Failed to update note order', err);
    });
  }

  /** Move a note to the back of the z-order */
  sendNoteToBack(id: number): void {
    const ws = this.currentWorkspace;
    const note = ws.notes.find(n => n.id === id);
    if (!note) return;
    const minZ = Math.min(...ws.notes.map(n => n.zIndex));
    note.zIndex = minZ - 1;
    this.emitChange();
    void apiUpdateNote(id, { ...note, workspaceId: ws.id }).catch(err => {
      console.error('Failed to update note order', err);
    });
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
      void apiUpdateNote(id, { ...note, workspaceId: ws.id }).catch(err => {
        console.error('Failed to pin note', err);
      });
    } else {
      this.bringNoteToFront(id);
      void apiUpdateNote(id, { ...note, workspaceId: ws.id }).catch(err => {
        console.error('Failed to unpin note', err);
      });
    }
  }

  /** Lock or unlock a note */
  setNoteLocked(id: number, locked: boolean): void {
    const ws = this.currentWorkspace;
    const note = ws.notes.find(n => n.id === id);
    if (!note) return;
    note.locked = locked;
    this.emitChange();
    void apiUpdateNote(id, { ...note, workspaceId: ws.id }).catch(err => {
      console.error('Failed to set lock state', err);
    });
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
    void apiUpdateNote(id, { workspaceId: ws.id, archived: true }).catch(err => {
      console.error('Failed to delete note', err);
    });
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

