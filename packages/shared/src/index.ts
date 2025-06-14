// Example function exported from the shared package. In a real project this
// would contain utilities used by both the frontend and backend packages.
export const hello = () => 'Hello from shared library';

export * from './models/User.js';
export * from './models/Shape.js';
export * from './models/Note.js';
export * from './models/Workspace.js';
export * from './TypedEmitter.js';
