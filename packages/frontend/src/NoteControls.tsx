import React from 'react';
import { createPortal } from 'react-dom';
import type { Note } from '@sticky-notes/shared';
import './NoteControls.css';

export interface NoteControlsProps {
  note: Note;
  overlayContainer: HTMLElement | null;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const NoteControls: React.FC<NoteControlsProps> = ({
  note,
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
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        transform: `rotate(${note.rotation}deg)`,
      }}
    >
      {!note.locked && (
        <div
          className="resize-handle note-control"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        >
          <i className="fa-solid fa-up-right-and-down-left-from-center" />
        </div>
      )}
      {!note.locked && (
        <button
          type="button"
          className="rotate-handle note-control"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        >
          <i className="fa-solid fa-rotate" />
        </button>
      )}
    </div>,
    overlayContainer,
  );
};
