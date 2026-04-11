export interface SyncRecord {
  pk: string;           // USER#<userId>
  sk: string;           // PROFILE#<id> | FOLDER#<id> | ENV#<id>
  workspaceId: string;
  type: "profile" | "folder" | "environment";
  data: Record<string, unknown>;
  version: number;
  updatedAt: string;
  createdAt: string;
}

export interface PushRequest {
  records: Array<{
    type: SyncRecord["type"];
    id: string;
    data: Record<string, unknown>;
    version: number;
  }>;
}

export interface PullResponse {
  records: SyncRecord[];
  syncedAt: string;
}

export function getUserId(event: { requestContext: { authorizer?: { claims?: { sub?: string } } } }): string {
  const sub = event.requestContext?.authorizer?.claims?.sub;
  if (!sub) throw new Error("Unauthorized");
  return sub;
}

export function skPrefix(type: SyncRecord["type"]): string {
  switch (type) {
    case "profile": return "PROFILE#";
    case "folder": return "FOLDER#";
    case "environment": return "ENV#";
  }
}
