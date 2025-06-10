import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Note } from './App';
import { ColorPalette } from './ColorPalette';
import { useDialog } from './DialogService';
import ConfirmDialog from './ConfirmDialog';
import './NoteControls.css';

export interface NoteControlsProps {
  note: Note;
  onUpdate: (id: number, data: Partial<Note>) => void;
  onArchive: (id: number, archived: boolean) => void;
  onSetPinned: (id: number, pinned: boolean) => void;
  onDelete: (id: number) => void;
  overlayContainer: HTMLElement | null;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const NoteControls: React.FC<NoteControlsProps> = ({
  note,
  onUpdate,
  onArchive,
  onSetPinned,
  onDelete,
  overlayContainer,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}) => {
  const dialog = useDialog();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!overlayContainer) return null;
  return createPortal(
    <div
      className="note-controls"
      style={{ left: note.x, top: note.y, width: note.width, height: note.height }}
    >
      <div className="note-toolbar">
        <button
          className={`pin-back note-control${note.pinned ? ' active' : ''}`}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onSetPinned(note.id, !note.pinned)}
          title={note.pinned ? 'Unpin from Back' : 'Pin to Back'}
        >
          <i className="fa-solid fa-thumbtack" />
        </button>
        <ColorPalette
          value={note.color}
          onChange={(color) => onUpdate(note.id, { color })}
        />
        <div className="menu-container" onPointerDown={e => e.stopPropagation()}>
          <button
            className="note-control menu-button"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setMenuOpen(o => !o)}
            title="More"
          >
            <i className="fa-solid fa-ellipsis" />
          </button>
          {menuOpen && (
            <div className="note-menu">
              <button
                className="note-control"
                onClick={() => { onArchive(note.id, !note.archived); setMenuOpen(false); }}
                title={note.archived ? 'Unarchive' : 'Archive'}
              >
                <i className={`fa-solid ${note.archived ? 'fa-box-open' : 'fa-box-archive'}`} />
              </button>
              <button
                className="note-control"
                onClick={async () => {
                  try {
                    await dialog.open<void>((close) => (
                      <ConfirmDialog
                        message="Delete this note?"
                        onConfirm={() => close.resolve()}
                        onCancel={close.reject}
                      />
                    ));
                    onDelete(note.id);
                  } catch {
                    /* cancelled */
                  }
                  setMenuOpen(false);
                }}
                title="Delete"
              >
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          )}
        </div>
      </div>
      <div
        className="resize-handle note-control"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <i className="fa-solid fa-up-right-and-down-left-from-center" />
      </div>
    </div>,
    overlayContainer
  );
};
