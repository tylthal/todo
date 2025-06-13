import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { Workspace } from '@sticky-notes/shared';
import { getUserId, hasWorkspaceAccess } from './auth';

const TABLE_NAME = process.env.TABLE_NAME as string;
const db = new DynamoDB.DocumentClient();

/**
 * Create a new workspace. Accepts a partial Workspace in the request body and
 * returns the created Workspace object. This is a placeholder implementation
 * that simply echoes the provided values with a generated id.
 */
export const createWorkspace: APIGatewayProxyHandler = async (event) => {
  const userId = getUserId(event);
  const input: Partial<Workspace> = event.body ? JSON.parse(event.body) : {};

  const workspace: Workspace = {
    id: Date.now(),
    name: input.name ?? 'Untitled workspace',
    ownerId: userId,
    contributorIds: input.contributorIds ?? [],
  };

  await db
    .put({
      TableName: TABLE_NAME,
      Item: {
        PK: `WORKSPACE#${workspace.id}`,
        SK: 'META',
        ...workspace,
      },
    })
    .promise();

  await db
    .update({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'META' },
      UpdateExpression:
        'SET ownedWorkspaceIds = list_append(if_not_exists(ownedWorkspaceIds, :empty), :w)',
      ExpressionAttributeValues: {
        ':w': [workspace.id],
        ':empty': [],
      },
    })
    .promise();

  return {
    statusCode: 201,
    body: JSON.stringify(workspace),
  };
};

/**
 * Retrieve a workspace by id. In this placeholder implementation the returned
 * data is not persisted anywhere and simply returns an example Workspace.
 */
export const getWorkspace: APIGatewayProxyHandler = async (event) => {
  const userId = getUserId(event);
  const id = event.pathParameters?.id;
  if (!id) {
    return { statusCode: 400, body: 'Missing id' };
  }

  const data = await db
    .get({ TableName: TABLE_NAME, Key: { PK: `WORKSPACE#${id}`, SK: 'META' } })
    .promise();
  const workspace = data.Item as Workspace | undefined;

  if (!workspace) {
    return { statusCode: 404, body: 'Workspace not found' };
  }

  if (!hasWorkspaceAccess(workspace, userId)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(workspace),
  };
};

/**
 * Update an existing workspace. Accepts partial Workspace fields in the request
 * body and returns the updated object. Data is not persisted yet.
 */
export const updateWorkspace: APIGatewayProxyHandler = async (event) => {
  const userId = getUserId(event);
  const id = event.pathParameters?.id;
  if (!id) {
    return { statusCode: 400, body: 'Missing id' };
  }

  const existing = await db
    .get({ TableName: TABLE_NAME, Key: { PK: `WORKSPACE#${id}`, SK: 'META' } })
    .promise();
  const workspace = existing.Item as Workspace | undefined;

  if (!workspace) {
    return { statusCode: 404, body: 'Workspace not found' };
  }

  if (!hasWorkspaceAccess(workspace, userId)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const updates: Partial<Workspace> = event.body ? JSON.parse(event.body) : {};
  const exprParts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, any> = {};

  if (updates.name !== undefined) {
    names['#n'] = 'name';
    values[':n'] = updates.name;
    exprParts.push('#n = :n');
  }
  if (updates.ownerId !== undefined) {
    names['#o'] = 'ownerId';
    values[':o'] = updates.ownerId;
    exprParts.push('#o = :o');
  }
  if (updates.contributorIds !== undefined) {
    names['#c'] = 'contributorIds';
    values[':c'] = updates.contributorIds;
    exprParts.push('#c = :c');
  }

  const updated = await db
    .update({
      TableName: TABLE_NAME,
      Key: { PK: `WORKSPACE#${id}`, SK: 'META' },
      UpdateExpression: 'SET ' + exprParts.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify(updated.Attributes),
  };
};

/**
 * Delete a workspace. Simply returns a 204 status code to indicate success.
 */
export const deleteWorkspace: APIGatewayProxyHandler = async (event) => {
  const userId = getUserId(event);
  const id = event.pathParameters?.id;
  if (!id) {
    return { statusCode: 400, body: 'Missing id' };
  }

  const res = await db
    .get({ TableName: TABLE_NAME, Key: { PK: `WORKSPACE#${id}`, SK: 'META' } })
    .promise();
  const workspace = res.Item as Workspace | undefined;

  if (!workspace) {
    return { statusCode: 404, body: 'Workspace not found' };
  }

  if (!hasWorkspaceAccess(workspace, userId)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  await db
    .delete({ TableName: TABLE_NAME, Key: { PK: `WORKSPACE#${id}`, SK: 'META' } })
    .promise();

  return {
    statusCode: 204,
    body: '',
  };
};

/**
 * List workspaces accessible to the caller. Returns a few example items.
 */
export const listWorkspaces: APIGatewayProxyHandler = async (event) => {
  const userId = getUserId(event);

  const user = await db
    .get({ TableName: TABLE_NAME, Key: { PK: `USER#${userId}`, SK: 'META' } })
    .promise();

  const owned: number[] = user.Item?.ownedWorkspaceIds ?? [];
  const contrib: number[] = user.Item?.contributedWorkspaceIds ?? [];
  const ids = Array.from(new Set([...owned, ...contrib]));

  if (ids.length === 0) {
    return { statusCode: 200, body: '[]' };
  }

  const res = await db
    .batchGet({
      RequestItems: {
        [TABLE_NAME]: {
          Keys: ids.map((id) => ({ PK: `WORKSPACE#${id}`, SK: 'META' })),
        },
      },
    })
    .promise();
  const workspaces = (res.Responses?.[TABLE_NAME] as Workspace[]) || [];

  return {
    statusCode: 200,
    body: JSON.stringify(workspaces),
  };
};
