import * as AWSXRay from 'aws-xray-sdk';
AWSXRay.captureAWS(require('aws-sdk'));
import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { Note, Workspace } from '@sticky-notes/shared';
import { getUserId, hasWorkspaceAccess } from './auth';
import { broadcastWorkspaceEvent } from './websocket';
import { withErrorHandling } from './error';

const TABLE_NAME = process.env.TABLE_NAME as string;
const db = new DynamoDB.DocumentClient();

export const createNote = withErrorHandling(async (event) => {
  const userId = getUserId(event);
  const input: Partial<Note & { workspaceId: number }> = event.body
    ? JSON.parse(event.body)
    : {};
  const workspaceId = input.workspaceId;
  if (!workspaceId) {
    return { statusCode: 400, body: 'Missing workspaceId' };
  }

  const wsRes = await db
    .get({ TableName: TABLE_NAME, Key: { PK: `WORKSPACE#${workspaceId}`, SK: 'META' } })
    .promise();
  const workspace = wsRes.Item as Workspace | undefined;
  if (!workspace) {
    return { statusCode: 404, body: 'Workspace not found' };
  }
  if (!hasWorkspaceAccess(workspace, userId)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const note: Note = {
    id: Date.now(),
    content: input.content ?? '',
    x: input.x ?? 0,
    y: input.y ?? 0,
    width: input.width ?? 100,
    height: input.height ?? 100,
    zIndex: input.zIndex ?? 0,
    rotation: input.rotation ?? 0,
    color: input.color ?? '#fef08a',
    pinned: input.pinned ?? false,
    locked: input.locked ?? false,
    archived: input.archived ?? false,
  };

  await db
    .put({
      TableName: TABLE_NAME,
      Item: {
        PK: `WORKSPACE#${workspaceId}`,
        SK: `NOTE#${note.id}`,
        ...note,
      },
    })
    .promise();

  await broadcastWorkspaceEvent(workspaceId, {
    type: 'note.created',
    note,
  });

  return {
    statusCode: 201,
    body: JSON.stringify(note),
  };
});

export const updateNote = withErrorHandling(async (event) => {
  const userId = getUserId(event);
  const id = event.pathParameters?.id;
  if (!id) {
    return { statusCode: 400, body: 'Missing id' };
  }
  const body = event.body ? JSON.parse(event.body) : {};
  const workspaceId = body.workspaceId;
  if (!workspaceId) {
    return { statusCode: 400, body: 'Missing workspaceId' };
  }

  const wsRes = await db
    .get({ TableName: TABLE_NAME, Key: { PK: `WORKSPACE#${workspaceId}`, SK: 'META' } })
    .promise();
  const workspace = wsRes.Item as Workspace | undefined;
  if (!workspace) {
    return { statusCode: 404, body: 'Workspace not found' };
  }
  if (!hasWorkspaceAccess(workspace, userId)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const exprParts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, any> = {};

  const allowedFields = [
    'content',
    'x',
    'y',
    'width',
    'height',
    'zIndex',
    'rotation',
    'color',
    'pinned',
    'locked',
    'archived',
  ];
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      const nameKey = `#${key}`;
      const valueKey = `:${key}`;
      names[nameKey] = key;
      values[valueKey] = body[key];
      exprParts.push(`${nameKey} = ${valueKey}`);
    }
  }

  const updated = await db
    .update({
      TableName: TABLE_NAME,
      Key: { PK: `WORKSPACE#${workspaceId}`, SK: `NOTE#${id}` },
      UpdateExpression: 'SET ' + exprParts.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    })
    .promise();

  await broadcastWorkspaceEvent(workspaceId, {
    type: 'note.updated',
    note: updated.Attributes,
  });

  return {
    statusCode: 200,
    body: JSON.stringify(updated.Attributes),
  };
});

export const listNotes = withErrorHandling(async (event) => {
  const userId = getUserId(event);
  const workspaceId = event.queryStringParameters?.workspaceId;
  if (!workspaceId) {
    return { statusCode: 400, body: 'Missing workspaceId' };
  }

  const wsRes = await db
    .get({ TableName: TABLE_NAME, Key: { PK: `WORKSPACE#${workspaceId}`, SK: 'META' } })
    .promise();
  const workspace = wsRes.Item as Workspace | undefined;
  if (!workspace) {
    return { statusCode: 404, body: 'Workspace not found' };
  }
  if (!hasWorkspaceAccess(workspace, userId)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const res = await db
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk and begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `WORKSPACE#${workspaceId}`,
        ':prefix': 'NOTE#',
      },
    })
    .promise();
  const notes = (res.Items as Note[]) || [];

  return {
    statusCode: 200,
    body: JSON.stringify(notes),
  };
});

export { createNote as postNotes, updateNote as patchNote, listNotes as getNotes };
