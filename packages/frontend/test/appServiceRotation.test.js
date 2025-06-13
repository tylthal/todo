require('ts-node/register');
const assert = require('assert');
const { AppService } = require('../src/services/AppService');
const { copyNote, pasteNote } = require('../src/services/Clipboard');

(function testAddNoteRotation(){
  const service = new AppService();
  const id = service.addNote();
  const ws = service.getState().workspaces[0];
  const note = ws.notes.find(n => n.id === id);
  assert.strictEqual(note.rotation, 0);
})();

(function testCopyPasteRotation(){
  const service = new AppService();
  const id = service.addNote();
  service.updateNote(id, { rotation: 45 });
  copyNote(service, id);
  const newId = pasteNote(service);
  const ws = service.getState().workspaces[0];
  const pasted = ws.notes.find(n => n.id === newId);
  assert.strictEqual(pasted.rotation, 45);
})();

console.log('appServiceRotation tests passed');
