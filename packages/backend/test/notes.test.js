require('ts-node/register');
const assert = require('assert');
const AWS = require('aws-sdk');

class StubClient {
  constructor(responses = {}) {
    this.responses = responses;
    this.calls = { put: [], get: [], update: [], query: [], delete: [], batchGet: [] };
  }
  put(params) { this.calls.put.push(params); return { promise: async () => ({}) }; }
  get(params) { this.calls.get.push(params); return { promise: async () => ({ Item: this.responses.get }) }; }
  update(params) { this.calls.update.push(params); return { promise: async () => ({ Attributes: this.responses.update || params }) }; }
  delete(params) { this.calls.delete.push(params); return { promise: async () => ({}) }; }
  query(params) { this.calls.query.push(params); return { promise: async () => ({ Items: this.responses.query || [] }) }; }
  batchGet(params) { this.calls.batchGet.push(params); return { promise: async () => ({ Responses: { [process.env.TABLE_NAME]: this.responses.batchGet || [] } }) }; }
}

function requireFresh(path) {
  delete require.cache[require.resolve(path)];
  return require(path);
}

process.env.TABLE_NAME = 'TestTable';

(async function testCreateNoteUnauthorized() {
  const stub = new StubClient({ get: { id: 1, ownerId: 'user1', contributorIds: [] } });
  AWS.DynamoDB.DocumentClient = function() { return stub; };
  const { createNote } = requireFresh('../src/notes');
  const event = {
    body: JSON.stringify({ workspaceId: 1 }),
    requestContext: { authorizer: { jwt: { claims: { sub: 'user2' } } } }
  };
  const res = await createNote(event);
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.headers, undefined);
})();

(async function testCreateNoteAuthorized() {
  const stub = new StubClient({ get: { id: 1, ownerId: 'user1', contributorIds: [] } });
  AWS.DynamoDB.DocumentClient = function() { return stub; };
  const { createNote } = requireFresh('../src/notes');
  const event = {
    body: JSON.stringify({ workspaceId: 1, content: 'A' }),
    requestContext: { authorizer: { jwt: { claims: { sub: 'user1' } } } }
  };
  const res = await createNote(event);
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(stub.calls.put.length, 1);
  assert.strictEqual(res.headers, undefined);
})();
