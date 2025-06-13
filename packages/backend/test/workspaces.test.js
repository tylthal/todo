require('ts-node/register');
const assert = require('assert');
const AWS = require('aws-sdk');

class StubClient {
  constructor() { this.calls = { put: [], get: [], update: [], delete: [], batchGet: [], query: [] }; }
  put(p) { this.calls.put.push(p); return { promise: async () => ({}) }; }
  get(p) {
    this.calls.get.push(p);
    if (String(p.Key.PK).startsWith('USER#')) {
      return { promise: async () => ({ Item: { ownedWorkspaceIds: [1,2], contributedWorkspaceIds: [] } }) };
    }
    const id = Number(String(p.Key.PK).replace('WORKSPACE#',''));
    return { promise: async () => ({ Item: { id, ownerId: 'user1', contributorIds: [] } }) };
  }
  update(p) {
    this.calls.update.push(p);
    const id = Number(String(p.Key.PK).replace('WORKSPACE#',''));
    return { promise: async () => ({ Attributes: { id, name: 'Updated', ownerId: 'user2', contributorIds: [] } }) };
  }
  delete(p) { this.calls.delete.push(p); return { promise: async () => ({}) }; }
  batchGet(p) { this.calls.batchGet.push(p); return { promise: async () => ({ Responses: { [process.env.TABLE_NAME]: [ { id: 1, ownerId: 'user1', contributorIds: [] }, { id: 2, ownerId: 'user1', contributorIds: [] } ] } }) }; }
  query(p) { this.calls.query.push(p); return { promise: async () => ({ Items: [] }) }; }
}
process.env.TABLE_NAME = 'TestTable';
AWS.DynamoDB.DocumentClient = function() { return new StubClient(); };
const { createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace, listWorkspaces } = require('../src/workspaces');

function authCtx(sub) {
  return { requestContext: { authorizer: { jwt: { claims: { sub } } } } };
}

(async function testCreateWorkspace(){
  const event = Object.assign({ body: JSON.stringify({ name: 'My WS', ownerId: 'user1', contributorIds: ['user2'] }) }, authCtx('user1'));
  const res = await createWorkspace(event);
  assert.strictEqual(res.statusCode, 201);
  const ws = JSON.parse(res.body);
  assert.strictEqual(ws.name, 'My WS');
  assert.strictEqual(ws.ownerId, 'user1');
  assert.deepStrictEqual(ws.contributorIds, ['user2']);
})();

(async function testGetWorkspace(){
  const event = Object.assign({ pathParameters: { id: '5' } }, authCtx('user1'));
  const res = await getWorkspace(event);
  assert.strictEqual(res.statusCode, 200);
  const ws = JSON.parse(res.body);
  assert.strictEqual(ws.id, 5);
})();

(async function testUpdateWorkspace(){
  const event = Object.assign({ pathParameters: { id: '1' }, body: JSON.stringify({ name: 'Updated', ownerId: 'user2', contributorIds: [] }) }, authCtx('user1'));
  const res = await updateWorkspace(event);
  assert.strictEqual(res.statusCode, 200);
  const ws = JSON.parse(res.body);
  assert.strictEqual(ws.id, 1);
  assert.strictEqual(ws.name, 'Updated');
  assert.strictEqual(ws.ownerId, 'user2');
})();

(async function testDeleteWorkspace(){
  const res = await deleteWorkspace(Object.assign({ pathParameters: { id: '1' } }, authCtx('user1')));
  assert.strictEqual(res.statusCode, 204);
  assert.strictEqual(res.body, '');
})();

(async function testListWorkspaces(){
  const res = await listWorkspaces(authCtx('user1'));
  assert.strictEqual(res.statusCode, 200);
  const arr = JSON.parse(res.body);
  assert.ok(Array.isArray(arr));
  assert.ok(arr.length >= 2);
})();

console.log('backend workspaces tests passed');
