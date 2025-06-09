import React, { useEffect, useRef, useState } from 'react';
import { StickyNote } from './StickyNote';
import './App.css';
import { Note } from './App';

export interface NoteCanvasProps {
  notes: Note[];
  onUpdate: (id: number, data: Partial<Note>) => void;
  onArchive: (id: number, archived: boolean) => void;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  offset: { x: number; y: number };
  setOffset: (pos: { x: number; y: number }) => void;
  zoom: number;
  setZoom: (z: number) => void;
}

export const NoteCanvas: React.FC<NoteCanvasProps> = ({
  notes,
  onUpdate,
  onArchive,
  selectedId,
  onSelect,
  offset,
  setOffset,
  zoom,
  setZoom
}) => {
  const panRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const touchesRef = useRef(new Map<number, {x: number; y: number}>());
  const pinchRef = useRef<{
    start: number;
    zoom: number;
    centerScreen: { x: number; y: number };
    centerBoard: { x: number; y: number };
  } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(offset);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const clampZoom = (z: number) => Math.max(0.5, Math.min(3, z));

  const applyZoom = (newZoom: number) => {
    const clamped = clampZoom(newZoom);
    setZoom(clamped);
  };

  const fitToScreen = () => {
    const board = boardRef.current;
    if (!board || notes.length === 0) return;
    const rect = board.getBoundingClientRect();
    const minX = Math.min(...notes.map(n => n.x));
    const minY = Math.min(...notes.map(n => n.y));
    const maxX = Math.max(...notes.map(n => n.x + n.width));
    const maxY = Math.max(...notes.map(n => n.y + n.height));
    const width = maxX - minX || rect.width;
    const height = maxY - minY || rect.height;
    const scale = clampZoom(Math.min(rect.width / width, rect.height / height));
    zoomRef.current = scale;
    setZoom(scale);
    const x = (rect.width - width * scale) / 2 - minX * scale;
    const y = (rect.height - height * scale) / 2 - minY * scale;
    setOffset({ x, y });
  };

  const zoomRef = useRef(zoom);

  useEffect(() => {
    const prev = zoomRef.current;
    if (prev === zoom) return;
    if (!pinchRef.current) {
      const board = boardRef.current;
      if (board) {
        const rect = board.getBoundingClientRect();
        const dx = (rect.width / 2) * (1 / zoom - 1 / prev);
        const dy = (rect.height / 2) * (1 / zoom - 1 / prev);
        setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
      }
    }
    zoomRef.current = zoom;
  }, [zoom, setOffset]);

  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onSelect(null);
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
    setPanning(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touchesRef.current.size === 2) {
        const [a, b] = Array.from(touchesRef.current.values());
        const start = Math.hypot(a.x - b.x, a.y - b.y);
        const centerScreen = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const centerBoard = {
          x: (centerScreen.x - offset.x) / zoomRef.current,
          y: (centerScreen.y - offset.y) / zoomRef.current,
        };
        pinchRef.current = {
          start,
          zoom: zoomRef.current,
          centerScreen,
          centerBoard,
        };
      }
    }
  };

  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchRef.current && touchesRef.current.size === 2) {
        const [a, b] = Array.from(touchesRef.current.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const newZoom = pinchRef.current.zoom * (dist / pinchRef.current.start);
        const clamped = clampZoom(newZoom);
        const { centerScreen, centerBoard } = pinchRef.current;
        setZoom(clamped);
        setOffset({
          x: centerScreen.x - centerBoard.x * clamped,
          y: centerScreen.y - centerBoard.y * clamped,
        });
        return;
      }
    }
    if (!panRef.current || pinchRef.current) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setOffset({ x: panRef.current.startOffsetX + dx, y: panRef.current.startOffsetY + dy });
  };

  const pointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    panRef.current = null;
    setPanning(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    touchesRef.current.delete(e.pointerId);
    if (touchesRef.current.size < 2) {
      pinchRef.current = null;
    }
  };

  const applyWheelZoom = (
    clientX: number,
    clientY: number,
    deltaY: number,
    target: HTMLElement
  ) => {
    const factor = deltaY < 0 ? 1.1 : 0.9;
    const rect = target.getBoundingClientRect();
    const boardX = (clientX - rect.left - offsetRef.current.x) / zoomRef.current;
    const boardY = (clientY - rect.top - offsetRef.current.y) / zoomRef.current;
    const newZoom = clampZoom(zoomRef.current * factor);
    setZoom(newZoom);
    setOffset({
      x: clientX - rect.left - boardX * newZoom,
      y: clientY - rect.top - boardY * newZoom,
    });
  };


  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyWheelZoom(e.clientX, e.clientY, e.deltaY, board);
    };
    board.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      board.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const gestureStart = (e: any) => {
      e.preventDefault();
      pinchRef.current = {
        start: 1,
        zoom: zoomRef.current,
        centerScreen: { x: e.clientX, y: e.clientY },
        centerBoard: {
          x: (e.clientX - offset.x) / zoomRef.current,
          y: (e.clientY - offset.y) / zoomRef.current,
        },
      };
    };
    const gestureChange = (e: any) => {
      if (!pinchRef.current) return;
      e.preventDefault();
      const newZoom = pinchRef.current.zoom * e.scale;
      const clamped = clampZoom(newZoom);
      const { centerScreen, centerBoard } = pinchRef.current;
      setZoom(clamped);
      setOffset({
        x: centerScreen.x - centerBoard.x * clamped,
        y: centerScreen.y - centerBoard.y * clamped,
      });
    };
    const gestureEnd = () => {
      pinchRef.current = null;
    };
    board.addEventListener('gesturestart', gestureStart as EventListener);
    board.addEventListener('gesturechange', gestureChange as EventListener);
    board.addEventListener('gestureend', gestureEnd as EventListener);
    return () => {
      board.removeEventListener('gesturestart', gestureStart as EventListener);
      board.removeEventListener('gesturechange', gestureChange as EventListener);
      board.removeEventListener('gestureend', gestureEnd as EventListener);
    };
  }, [offset]);

  return (
    <div
      className={`board${panning ? ' panning' : ''}`}
      ref={boardRef}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    >
      <div
        className="notes"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
      >
        {notes.map(note => (
          <StickyNote
            key={note.id}
            note={note}
            onUpdate={onUpdate}
            onArchive={onArchive}
            selected={selectedId === note.id}
            onSelect={onSelect}
            offset={offset}
            zoom={zoom}
          />
        ))}
      </div>
      <div className="zoom-controls" onPointerDown={e => e.stopPropagation()}>
        <button onClick={() => applyZoom(zoomRef.current * 0.9)} title="Zoom Out">
          <i className="fa-solid fa-magnifying-glass-minus" />
        </button>
        <input
          className="zoom-slider"
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={zoom}
          onChange={e => applyZoom(Number(e.target.value))}
        />
        <div className="zoom-percentage">{Math.round(zoom * 100)}%</div>
        <button onClick={fitToScreen} title="Fit to Screen">
          <i className="fa-solid fa-up-right-and-down-left-from-center" />
        </button>
        <button onClick={() => applyZoom(zoomRef.current * 1.1)} title="Zoom In">
          <i className="fa-solid fa-magnifying-glass-plus" />
        </button>
      </div>
    </div>
  );
};
