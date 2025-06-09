import React, { useState } from 'react';

export interface ColorPaletteProps {
  value: string;
  onChange: (color: string) => void;
}

export const PALETTE_COLORS = [
  '#fef08a',
  '#fdba74',
  '#fecaca',
  '#fcd34d',
  '#86efac',
  '#93c5fd',
  '#e9d5ff',
  '#c7d2fe',
];

export const ColorPalette: React.FC<ColorPaletteProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="palette-toggle">
        <button
          className="note-control palette-button"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setOpen(true)}
          title="Change color"
        >
          <i className="fa-solid fa-palette" />
        </button>
      </div>
    );
  }

  return (
    <div className="color-palette" onPointerDown={e => e.stopPropagation()}>
      {PALETTE_COLORS.map((color) => (
        <button
          key={color}
          className={`color-swatch${color === value ? ' selected' : ''}`}
          style={{ backgroundColor: color }}
          title="Change color"
          onClick={() => {
            onChange(color);
            setOpen(false);
          }}
        />
      ))}
    </div>
  );
};
