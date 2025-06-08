import React from 'react';

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
  return (
    <div className="color-palette" onPointerDown={e => e.stopPropagation()}>
      {PALETTE_COLORS.map((color) => (
        <button
          key={color}
          className={`color-swatch${color === value ? ' selected' : ''}`}
          style={{ backgroundColor: color }}
          title="Change color"
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
};
