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
