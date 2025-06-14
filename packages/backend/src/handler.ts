import * as AWSXRay from 'aws-xray-sdk';
AWSXRay.captureAWS(require('aws-sdk'));
import { APIGatewayProxyHandler } from 'aws-lambda';
import { withErrorHandling } from './error';
import {
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  listWorkspaces,
} from './workspaces';
import { createNote, updateNote, listNotes } from './notes';
import { subscribe, unsubscribe, disconnect } from './websocket';

export const handler: APIGatewayProxyHandler = withErrorHandling(
  async (event, context) => {
    // Handle WebSocket routes first
    const routeKey = (event.requestContext as any).routeKey as string | undefined;
    if (routeKey) {
      switch (routeKey) {
        case '$connect':
          return { statusCode: 200, body: 'Connected' };
        case '$disconnect':
          return disconnect(event, context);
        case 'subscribe':
          return subscribe(event, context);
        case 'unsubscribe':
          return unsubscribe(event, context);
        default:
          return { statusCode: 404, body: 'Not Found' };
      }
    }

    const { httpMethod, resource } = event;

    if (resource === '/workspaces') {
      if (httpMethod === 'POST') return createWorkspace(event, context);
      if (httpMethod === 'GET') return listWorkspaces(event, context);
    } else if (resource === '/workspaces/{id}') {
      if (httpMethod === 'GET') return getWorkspace(event, context);
      if (httpMethod === 'PATCH') return updateWorkspace(event, context);
      if (httpMethod === 'DELETE') return deleteWorkspace(event, context);
    } else if (resource === '/notes') {
      if (httpMethod === 'POST') return createNote(event, context);
      if (httpMethod === 'GET') return listNotes(event, context);
    } else if (resource === '/notes/{id}') {
      if (httpMethod === 'PATCH') return updateNote(event, context);
    }

    return { statusCode: 404, body: 'Not Found' };
  }
);
