import React, { useRef, useState, useEffect } from 'react';
import { Note } from './App';
import { NoteControls } from './NoteControls';

// Interactive sticky note component that can be dragged, resized and edited.

// Slightly darken or lighten a hex color by `amount`. Used to compute borders
// that stand out against the note background.
const adjustColor = (color: string, amount: number) => {
  let c = color.startsWith('#') ? color.slice(1) : color;
  if (c.length === 3) {
    c = c.split('').map(ch => ch + ch).join('');
  }
  const num = parseInt(c, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0xff) + amount;
  let b = (num & 0xff) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export interface StickyNoteProps {
  /** Note data model */
  note: Note;
  /** Called when the note position/size/content changes */
  onUpdate: (id: number, data: Partial<Note>) => void;
  /** Archive or unarchive the note */
  onArchive: (id: number, archived: boolean) => void;
  /** Whether this note is currently selected */
  selected: boolean;
  /** Select this note */
  onSelect: (id: number) => void;
  /** Pin or unpin this note behind all others */
  onSetPinned: (id: number, pinned: boolean) => void;
  /** Board offset used to translate screen to board coordinates */
  offset: { x: number; y: number };
  /** Current zoom level of the board */
  zoom: number;
  /** DOM element to render controls overlay into */
  overlayContainer?: HTMLElement | null;
}

export const StickyNote: React.FC<StickyNoteProps> = ({ note, onUpdate, onArchive, selected, onSelect, onSetPinned, offset, zoom, overlayContainer }) => {
  // Track the current interaction mode (dragging vs resizing) and store
  // temporary data needed to calculate positions during the gesture.
  const modeRef = useRef<'drag' | 'resize' | null>(null);
  // For drag operations we store the pointer's offset from the note's origin
  const offsetRef = useRef({ x: 0, y: 0 });
  // For resize operations we remember the starting pointer position and note
  // dimensions.
  const resizeRef = useRef({
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });
  // Whether the note text is currently being edited
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      const len = el.value.length;
      el.focus();
      el.setSelectionRange(len, len);
    }
  }, [editing]);

  // Convert screen coordinates to board coordinates taking zoom/offset into
  // account.
  const toBoard = (clientX: number, clientY: number) => ({
    x: (clientX - offset.x) / zoom,
    y: (clientY - offset.y) / zoom,
  });

  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Begin a drag or resize interaction. Determine which based on the element
    // under the pointer.
    e.stopPropagation();
    onSelect(note.id);
    if (editing) return;
    const target = e.target as HTMLElement;
    const pos = toBoard(e.clientX, e.clientY);
    if (target.closest('.resize-handle')) {
      // Start resizing from the current pointer position
      modeRef.current = 'resize';
      resizeRef.current = {
        startX: pos.x,
        startY: pos.y,
        startWidth: note.width,
        startHeight: note.height,
      };
    } else {
      // Start dragging
      modeRef.current = 'drag';
      offsetRef.current = { x: pos.x - note.x, y: pos.y - note.y };
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editing) return;
    const pos = toBoard(e.clientX, e.clientY);
    if (modeRef.current === 'drag') {
      // Move the note according to the pointer, keeping the initial offset.
      onUpdate(note.id, {
        x: pos.x - offsetRef.current.x,
        y: pos.y - offsetRef.current.y,
      });
    }
    if (modeRef.current === 'resize') {
      // Resize the note based on pointer delta from the start of the gesture.
      const dx = pos.x - resizeRef.current.startX;
      const dy = pos.y - resizeRef.current.startY;
      const newWidth = Math.max(80, resizeRef.current.startWidth + dx);
      const newHeight = Math.max(60, resizeRef.current.startHeight + dy);
      onUpdate(note.id, { width: newWidth, height: newHeight });
    }
  };

  const pointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Gesture finished
    modeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const pointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    // Gesture aborted
    modeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleChange = (value: string) => {
    // Update the note content as the user types
    onUpdate(note.id, { content: value });
  };

  // Render the note along with its controls. The styling is dynamic based on
  // selection state and zoom level.
  return (
    <>
    <div
      className={`note${note.archived ? ' archived' : ''}${selected ? ' selected' : ''}${editing ? ' editing' : ''}`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        backgroundColor: note.color,
        borderColor: adjustColor(note.color, -30),
        zIndex: note.zIndex,
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerCancel}
      onDoubleClick={() => setEditing(true)}
      draggable={false}
    >
      {!editing && <div className="note-drag-target" draggable={false} onDragStart={e => e.preventDefault()} />}
      {editing ? (
        // Editable textarea shown on double-click
        <textarea
          ref={textareaRef}
          className="note-text"
          value={note.content}
          onChange={e => handleChange(e.target.value)}
          onBlur={() => setEditing(false)}
          autoFocus
        />
      ) : (
        // Static display of note content
        <div className={`note-content${note.content ? '' : ' placeholder'}`}>{note.content || 'Empty Note'}</div>
      )}
    </div>
    {overlayContainer && selected && !editing && (
      <NoteControls
        note={note}
        onUpdate={onUpdate}
        onArchive={onArchive}
        onSetPinned={onSetPinned}
        overlayContainer={overlayContainer}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerCancel}
      />
    )}
    </>
  );
};
