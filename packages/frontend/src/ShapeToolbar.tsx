import React from 'react';
import type { Note } from '@sticky-notes/shared';
import { ColorPalette } from './ColorPalette';
import './NoteControls.css';
import './App.css';
import { useDialog } from './DialogService';
import ConfirmDialog from './ConfirmDialog';

export interface ShapeToolbarProps {
  onAddNote: () => void;
  selectedNote: Note | null;
  onUpdateNote: (id: number, data: Partial<Note>) => void;
  onSetPinned: (id: number, pinned: boolean) => void;
  onSetLocked: (id: number, locked: boolean) => void;
  onArchive: (id: number, archived: boolean) => void;
  onDelete: (id: number) => void;
  showArchived: boolean;
  onToggleShowArchived: () => void;
  snapToEdges: boolean;
  onToggleSnap: () => void;
}

export const ShapeToolbar: React.FC<ShapeToolbarProps> = ({
  onAddNote,
  selectedNote,
  onUpdateNote,
  onSetPinned,
  onSetLocked,
  onArchive,
  onDelete,
  showArchived,
  onToggleShowArchived,
  snapToEdges,
  onToggleSnap,
}) => {
  const dialog = useDialog();
  return (
    <div className="toolbar" style={{ '--zoom': 1 } as React.CSSProperties}>
      <button onClick={onAddNote} title="Add Note">
        <i className="fa-solid fa-plus" />
      </button>
      <div className="toolbar-divider" />
      {selectedNote && (
        <>
          <ColorPalette
            value={selectedNote.color}
            onChange={(color) => onUpdateNote(selectedNote.id, { color })}
          />
          <button
            onClick={() => onSetPinned(selectedNote.id, !selectedNote.pinned)}
            title={selectedNote.pinned ? 'Unpin from Back' : 'Pin to Back'}
          >
            <i className="fa-solid fa-thumbtack" />
          </button>
          <button
            onClick={() => onSetLocked(selectedNote.id, !selectedNote.locked)}
            title={selectedNote.locked ? 'Unlock' : 'Lock'}
          >
            <i className={`fa-solid ${selectedNote.locked ? 'fa-lock' : 'fa-lock-open'}`} />
          </button>
          <button
            onClick={() => onArchive(selectedNote.id, !selectedNote.archived)}
            title={selectedNote.archived ? 'Unarchive' : 'Archive'}
          >
            <i className={`fa-solid ${selectedNote.archived ? 'fa-box-open' : 'fa-box-archive'}`} />
          </button>
          <button
            onClick={async () => {
              try {
                await dialog.open<void>((close) => (
                  <ConfirmDialog
                    message="Delete this note?"
                    confirmLabel="Delete"
                    onConfirm={() => close.resolve()}
                    onCancel={close.reject}
                  />
                ));
                onDelete(selectedNote.id);
              } catch {
                /* cancelled */
              }
            }}
            title="Delete"
          >
            <i className="fa-solid fa-trash" />
          </button>
          <div className="toolbar-divider" />
        </>
      )}
      <button onClick={onToggleShowArchived} title={showArchived ? 'Hide Archived' : 'Show Archived'}>
        <i className={`fa-solid ${showArchived ? 'fa-eye-slash' : 'fa-eye'}`} />
      </button>
      <button onClick={onToggleSnap} title={snapToEdges ? 'Disable Snap' : 'Enable Snap'}>
        <i className="fa-solid fa-magnet" />
      </button>
    </div>
  );
};
