export interface Workspace {
  id: number;
  name: string;
  ownerId: string | null;
  contributorIds: string[];
}
