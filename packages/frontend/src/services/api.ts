import { Auth } from '@aws-amplify/auth';
import type { Workspace, Note } from '@sticky-notes/shared';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  let session;
  try {
    session = await Auth.currentSession();
  } catch (err) {
    console.warn('Unable to retrieve current session. Redirecting to login.', err);
    try {
      await Auth.federatedSignIn();
    } catch (redirectErr) {
      console.warn('Failed to initiate federated sign in.', redirectErr);
    }
    throw new Error('Not authenticated');
  }

  const token = session.getIdToken().getJwtToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const url = `${API_URL}/workspaces`;
  const res = await authorizedFetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function getWorkspace(id: number): Promise<Workspace> {
  const url = `${API_URL}/workspaces/${id}`;
  const res = await authorizedFetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function createWorkspace(data: Partial<Workspace>): Promise<Workspace> {
  const url = `${API_URL}/workspaces`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function updateWorkspace(id: number, data: Partial<Workspace>): Promise<Workspace> {
  const url = `${API_URL}/workspaces/${id}`;
  const res = await authorizedFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function deleteWorkspace(id: number): Promise<void> {
  const url = `${API_URL}/workspaces/${id}`;
  const res = await authorizedFetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
}

export async function createNote(data: Partial<Note> & { workspaceId: number }): Promise<Note> {
  const url = `${API_URL}/notes`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function updateNote(id: number, data: Partial<Note> & { workspaceId: number }): Promise<Note> {
  const url = `${API_URL}/notes/${id}`;
  const res = await authorizedFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function getNotes(workspaceId: number): Promise<Note[]> {
  const url = `${API_URL}/notes?workspaceId=${workspaceId}`;
  const res = await authorizedFetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

