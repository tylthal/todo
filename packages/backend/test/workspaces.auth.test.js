require('ts-node/register');
const assert = require('assert');
const AWS = require('aws-sdk');

class StubClient {
  constructor(responses = {}) {
    this.responses = responses;
    this.calls = { get: [], update: [] };
  }
  get(params) { this.calls.get.push(params); return { promise: async () => ({ Item: this.responses.get }) }; }
  update(params) { this.calls.update.push(params); return { promise: async () => ({ Attributes: this.responses.update || params }) }; }
}

function requireFresh(path) {
  delete require.cache[require.resolve(path)];
  return require(path);
}

process.env.TABLE_NAME = 'TestTable';

(async function testUpdateWorkspaceForbidden() {
  const stub = new StubClient({ get: { id: 1, ownerId: 'owner', contributorIds: [] } });
  AWS.DynamoDB.DocumentClient = function() { return stub; };
  const { updateWorkspace } = requireFresh('../src/workspaces');
  const event = {
    pathParameters: { id: '1' },
    body: JSON.stringify({ name: 'New' }),
    requestContext: { authorizer: { jwt: { claims: { sub: 'hacker' } } } }
  };
  const res = await updateWorkspace(event);
  assert.strictEqual(res.statusCode, 403);
})();

(async function testUpdateWorkspaceAllowed() {
  const stub = new StubClient({ get: { id: 1, ownerId: 'owner', contributorIds: [] }, update: { id: 1, name: 'Ok' } });
  AWS.DynamoDB.DocumentClient = function() { return stub; };
  const { updateWorkspace } = requireFresh('../src/workspaces');
  const event = {
    pathParameters: { id: '1' },
    body: JSON.stringify({ name: 'Ok' }),
    requestContext: { authorizer: { jwt: { claims: { sub: 'owner' } } } }
  };
  const res = await updateWorkspace(event);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(stub.calls.update.length, 1);
})();
