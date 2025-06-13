export interface Shape {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  pinned?: boolean;
  locked?: boolean;
  color: string;
  archived: boolean;
}

export type ShapeBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function getShapeBounds(shape: Pick<Shape, 'x' | 'y' | 'width' | 'height'>): ShapeBounds {
  return {
    left: shape.x,
    top: shape.y,
    right: shape.x + shape.width,
    bottom: shape.y + shape.height,
  };
}
