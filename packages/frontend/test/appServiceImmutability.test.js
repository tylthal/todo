require('ts-node/register');
const assert = require('assert');
const { AppService } = require('../src/services/AppService');

(function testStateSnapshotImmutability(){
  const service = new AppService();
  const id = service.addNote();
  const snapshot = service.getState();
  snapshot.user = { id: 123 };
  snapshot.workspaces[0].notes[0].content = 'changed';

  const fresh = service.getState();
  assert.strictEqual(fresh.user, null);
  const note = fresh.workspaces[0].notes.find(n => n.id === id);
  assert.strictEqual(note.content, '');
})();

console.log('appServiceImmutability tests passed');
