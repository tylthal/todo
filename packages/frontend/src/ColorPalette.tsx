import React, { useState } from 'react';

// Small popover component used by a sticky note to select a background color.

export interface ColorPaletteProps {
  /** Currently selected color */
  value: string;
  /** Notify parent when a new color is picked */
  onChange: (color: string) => void;
}

// Colors offered in the picker. The first color is also used as the default
// for newly created notes.
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
  // Controls whether the palette is expanded or just shows the palette button
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="palette-toggle">
        {/* Compact button shown when the palette is closed */}
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
    // Expanded palette of color choices
    <div className="color-palette" onPointerDown={e => e.stopPropagation()}>
      {PALETTE_COLORS.map((color) => (
        <button
          key={color}
          className={`color-swatch${color === value ? ' selected' : ''}`}
          style={{ backgroundColor: color }}
          title="Change color"
          onClick={() => {
            // Update the parent with the new color and close the palette
            onChange(color);
            setOpen(false);
          }}
        />
      ))}
    </div>
  );
};
