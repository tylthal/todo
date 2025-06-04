import React from 'react';

export interface StickyNoteProps {
  id: number;
  text: string;
  onDelete: (id: number) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({ id, text, onDelete }) => {
  return (
    <div className="note">
      <button className="delete" onClick={() => onDelete(id)}>&times;</button>
      <p>{text}</p>
    </div>
  );
};
