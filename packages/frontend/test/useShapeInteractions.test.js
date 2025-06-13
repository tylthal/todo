require('ts-node/register');
const assert = require('assert');
const { ShapeInteractions } = require('../src/shapes/useShapeInteractions');

function create(shape, all = [], snap = false) {
  let updated = null;
  const si = new ShapeInteractions({
    shape,
    allShapes: all,
    zoom: 1,
    offset: { x: 0, y: 0 },
    snapToEdges: snap,
    onUpdate: (_, d) => { updated = d; Object.assign(shape, d); },
    onSnapLinesChange: () => {}
  });
  return { si, updated: () => updated };
}

// Dragging should update x/y
(function(){
  const shape = { id: 1, x: 0, y: 0, width: 100, height: 100, zIndex: 1, color: '#fff', archived: false };
  const { si, updated } = create(shape);
  si.pointerDown({ clientX: 0, clientY: 0, target: { closest: () => null }, pointerId: 1 });
  si.pointerMove({ clientX: 10, clientY: 15 });
  assert.deepStrictEqual(updated(), { x: 10, y: 15 });
})();

// Snapping when near other shape
// Horizontal snapping when near other shape
(function(){
  const shape = { id: 1, x: 0, y: 0, width: 50, height: 50, zIndex: 1, color: '#fff', archived: false };
  const other = { id: 2, x: 100, y: 0, width: 50, height: 50, zIndex: 1, color: '#fff', archived: false };
  const { si } = create(shape, [shape, other], true);
  si.pointerDown({ clientX: 0, clientY: 0, target: { closest: () => null }, pointerId: 1 });
  si.pointerMove({ clientX: 93, clientY: 0 });
  assert.strictEqual(shape.x, 100);
})();

// Vertical snapping when near other shape
(function(){
  const shape = { id: 1, x: 0, y: 0, width: 50, height: 50, zIndex: 1, color: '#fff', archived: false };
  const other = { id: 2, x: 0, y: 100, width: 50, height: 50, zIndex: 1, color: '#fff', archived: false };
  const { si } = create(shape, [shape, other], true);
  si.pointerDown({ clientX: 0, clientY: 0, target: { closest: () => null }, pointerId: 1 });
  si.pointerMove({ clientX: 0, clientY: 93 });
  assert.strictEqual(shape.y, 100);
})();

// Updating options mid-drag should not reset the drag offset
(function(){
  const shape = { id: 1, x: 0, y: 0, width: 100, height: 100, zIndex: 1, color: '#fff', archived: false };
  const { si } = create(shape);
  si.pointerDown({ clientX: 0, clientY: 0, target: { closest: () => null }, pointerId: 1 });
  si.updateOptions({
    shape,
    allShapes: [shape],
    zoom: 1,
    offset: { x: 0, y: 0 },
    snapToEdges: false,
    onUpdate: (_, d) => Object.assign(shape, d),
    onSnapLinesChange: () => {}
  });
  si.pointerMove({ clientX: 20, clientY: 0 });
  assert.strictEqual(shape.x, 20);
})();

console.log('useShapeInteractions tests passed');
