import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getUserId, skPrefix, PushRequest } from "./types";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME!;

export async function handler(event: { body?: string; requestContext: { authorizer?: { claims?: { sub?: string } } } }) {
  const userId = getUserId(event);

  let body: PushRequest;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!body.records?.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "No records provided" }) };
  }

  const now = new Date().toISOString();
  const results = [];

  for (const record of body.records) {
    const sk = `${skPrefix(record.type)}${record.id}`;
    const item = {
      pk: `USER#${userId}`,
      sk,
      workspaceId: (record.data.workspace_id as string) ?? "local",
      type: record.type,
      data: record.data,
      version: record.version,
      updatedAt: now,
      createdAt: now,
    };

    await client.send(new PutCommand({
      TableName: TABLE,
      Item: item,
      // Only write if version is newer (optimistic concurrency)
      ConditionExpression: "attribute_not_exists(pk) OR version < :v",
      ExpressionAttributeValues: { ":v": record.version },
    })).catch((err: { name?: string }) => {
      // ConditionalCheckFailedException means a newer version exists — skip
      if (err.name !== "ConditionalCheckFailedException") throw err;
    });

    results.push({ id: record.id, type: record.type, version: record.version });
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pushed: results, syncedAt: now }),
  };
}
