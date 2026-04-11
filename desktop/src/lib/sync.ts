import { cognitoConfig } from "./auth";
import { useAuthStore } from "../stores/authStore";

interface SyncRecord {
  type: "profile" | "folder" | "environment";
  id: string;
  data: Record<string, unknown>;
  version: number;
}

interface PushResponse {
  pushed: Array<{ id: string; type: string; version: number }>;
  syncedAt: string;
}

interface PullResponse {
  records: Array<SyncRecord & { updatedAt: string }>;
  syncedAt: string;
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await useAuthStore.getState().getValidToken();
  if (!token) throw new Error("Not authenticated");

  return fetch(`${cognitoConfig.syncApiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

export async function pushRecords(records: SyncRecord[]): Promise<PushResponse> {
  const resp = await authFetch("/sync/push", {
    method: "POST",
    body: JSON.stringify({ records }),
  });

  if (!resp.ok) {
    throw new Error(`Sync push failed: ${resp.status}`);
  }

  return resp.json();
}

export async function pullRecords(since?: string, type?: string): Promise<PullResponse> {
  const params = new URLSearchParams();
  if (since) params.set("since", since);
  if (type) params.set("type", type);

  const query = params.toString();
  const resp = await authFetch(`/sync/pull${query ? `?${query}` : ""}`);

  if (!resp.ok) {
    throw new Error(`Sync pull failed: ${resp.status}`);
  }

  return resp.json();
}

export async function deleteRecords(records: Array<{ type: SyncRecord["type"]; id: string }>): Promise<void> {
  const resp = await authFetch("/sync/delete", {
    method: "POST",
    body: JSON.stringify({ records }),
  });

  if (!resp.ok) {
    throw new Error(`Sync delete failed: ${resp.status}`);
  }
}
