import { APIGatewayProxyHandler } from 'aws-lambda';
import { Workspace } from '@sticky-notes/shared';

/**
 * Create a new workspace. Accepts a partial Workspace in the request body and
 * returns the created Workspace object. This is a placeholder implementation
 * that simply echoes the provided values with a generated id.
 */
export const createWorkspace: APIGatewayProxyHandler = async (event) => {
  const input: Partial<Workspace> = event.body ? JSON.parse(event.body) : {};

  const workspace: Workspace = {
    id: Date.now(),
    name: input.name ?? 'Untitled workspace',
    ownerId: input.ownerId ?? null,
    contributorIds: input.contributorIds ?? [],
  };

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
  const id = event.pathParameters?.id;

  const workspace: Workspace = {
    id: id ? Number(id) : 1,
    name: 'Example Workspace',
    ownerId: 'user-123',
    contributorIds: [],
  };

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
  const id = event.pathParameters?.id;
  const updates: Partial<Workspace> = event.body ? JSON.parse(event.body) : {};

  const workspace: Workspace = {
    id: id ? Number(id) : 1,
    name: updates.name ?? 'Updated Workspace',
    ownerId: updates.ownerId ?? 'user-123',
    contributorIds: updates.contributorIds ?? [],
  };

  return {
    statusCode: 200,
    body: JSON.stringify(workspace),
  };
};

/**
 * Delete a workspace. Simply returns a 204 status code to indicate success.
 */
export const deleteWorkspace: APIGatewayProxyHandler = async () => {
  return {
    statusCode: 204,
    body: '',
  };
};

/**
 * List workspaces accessible to the caller. Returns a few example items.
 */
export const listWorkspaces: APIGatewayProxyHandler = async () => {
  const workspaces: Workspace[] = [
    { id: 1, name: 'Example 1', ownerId: 'user-123', contributorIds: [] },
    { id: 2, name: 'Example 2', ownerId: null, contributorIds: ['user-123'] },
  ];

  return {
    statusCode: 200,
    body: JSON.stringify(workspaces),
  };
};
