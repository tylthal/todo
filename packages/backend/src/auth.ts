import { APIGatewayProxyEvent } from 'aws-lambda';
import { Workspace } from '@sticky-notes/shared';

/**
 * Extract the authenticated user id from an API Gateway event. The JWT has
 * already been validated by the API Gateway authorizer, so this function just
 * pulls the `sub` claim from the authorizer context.
 *
 * @throws if no valid authorizer payload is present
 */
export function getUserId(event: APIGatewayProxyEvent): string {
  const authorizer: any = (event.requestContext as any).authorizer;
  if (!authorizer) {
    throw new Error('Missing authorizer');
  }

  // HTTP API v2 JWT authorizer
  const claims = authorizer.jwt?.claims;
  const sub = claims?.sub ?? authorizer.principalId;
  if (typeof sub !== 'string') {
    throw new Error('Invalid authorizer claims');
  }
  return sub;
}

/** Determine if the given user is the owner of the workspace. */
export function isWorkspaceOwner(workspace: Workspace, userId: string): boolean {
  return workspace.ownerId === userId;
}

/** Determine if the given user is listed as a contributor of the workspace. */
export function isWorkspaceContributor(
  workspace: Workspace,
  userId: string
): boolean {
  return workspace.contributorIds.includes(userId);
}

/** Check if the user either owns or contributes to the workspace. */
export function hasWorkspaceAccess(workspace: Workspace, userId: string): boolean {
  return isWorkspaceOwner(workspace, userId) || isWorkspaceContributor(workspace, userId);
}
