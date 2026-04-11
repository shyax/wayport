import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { getUserId, skPrefix, SyncRecord } from "./types";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME!;

export async function handler(event: {
  body?: string;
  requestContext: { authorizer?: { claims?: { sub?: string } } };
}) {
  const userId = getUserId(event);

  let body: { records: Array<{ type: SyncRecord["type"]; id: string }> };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!body.records?.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "No records provided" }) };
  }

  const deleted = [];

  for (const record of body.records) {
    const sk = `${skPrefix(record.type)}${record.id}`;

    await client.send(new DeleteCommand({
      TableName: TABLE,
      Key: { pk: `USER#${userId}`, sk },
      // Only delete if it belongs to this user
      ConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": `USER#${userId}` },
    })).catch((err: { name?: string }) => {
      if (err.name !== "ConditionalCheckFailedException") throw err;
    });

    deleted.push({ id: record.id, type: record.type });
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deleted }),
  };
}
