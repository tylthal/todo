import React from 'react';
import { createPortal } from 'react-dom';
import { Note } from './App';
import { ColorPalette } from './ColorPalette';
import './NoteControls.css';

export interface NoteControlsProps {
  note: Note;
  onUpdate: (id: number, data: Partial<Note>) => void;
  onArchive: (id: number, archived: boolean) => void;
  onSetPinned: (id: number, pinned: boolean) => void;
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
  overlayContainer,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}) => {
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
        <button
          className="archive note-control"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onArchive(note.id, !note.archived)}
          title={note.archived ? 'Unarchive' : 'Archive'}
        >
          <i className={`fa-solid ${note.archived ? 'fa-box-open' : 'fa-box-archive'}`} />
        </button>
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
