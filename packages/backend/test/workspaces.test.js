require('ts-node/register');
const assert = require('assert');
const { createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace, listWorkspaces } = require('../src/workspaces');

(async function testCreateWorkspace(){
  const event = { body: JSON.stringify({ name: 'My WS', ownerId: 'user1', contributorIds: ['user2'] }) };
  const res = await createWorkspace(event);
  assert.strictEqual(res.statusCode, 201);
  const ws = JSON.parse(res.body);
  assert.strictEqual(ws.name, 'My WS');
  assert.strictEqual(ws.ownerId, 'user1');
  assert.deepStrictEqual(ws.contributorIds, ['user2']);
})();

(async function testGetWorkspace(){
  const event = { pathParameters: { id: '5' } };
  const res = await getWorkspace(event);
  assert.strictEqual(res.statusCode, 200);
  const ws = JSON.parse(res.body);
  assert.strictEqual(ws.id, 5);
})();

(async function testUpdateWorkspace(){
  const event = { pathParameters: { id: '1' }, body: JSON.stringify({ name: 'Updated', ownerId: 'user2', contributorIds: [] }) };
  const res = await updateWorkspace(event);
  assert.strictEqual(res.statusCode, 200);
  const ws = JSON.parse(res.body);
  assert.strictEqual(ws.id, 1);
  assert.strictEqual(ws.name, 'Updated');
  assert.strictEqual(ws.ownerId, 'user2');
})();

(async function testDeleteWorkspace(){
  const res = await deleteWorkspace({});
  assert.strictEqual(res.statusCode, 204);
  assert.strictEqual(res.body, '');
})();

(async function testListWorkspaces(){
  const res = await listWorkspaces({});
  assert.strictEqual(res.statusCode, 200);
  const arr = JSON.parse(res.body);
  assert.ok(Array.isArray(arr));
  assert.ok(arr.length >= 2);
})();

console.log('backend workspaces tests passed');
