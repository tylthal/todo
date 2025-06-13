/** User account model */
export interface User {
  id: string;
  name: string;
  email?: string;
  /** Workspace IDs this user owns */
  ownedWorkspaceIds?: number[];
  /** Workspace IDs this user can contribute to */
  contributedWorkspaceIds?: number[];
}
