import React from 'react';

export interface StickyNoteProps {
  id: number;
  text: string;
  onDelete: (id: number) => void;
  onUpdate: (id: number, text: string) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({ id, text, onDelete, onUpdate }) => {
  const [value, setValue] = React.useState(text);

  return (
    <div className="note">
      <button className="delete" onClick={() => onDelete(id)}>&times;</button>
      <textarea
        className="note-text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={() => onUpdate(id, value)}
        placeholder="Write something..."
      />
    </div>
  );
};
