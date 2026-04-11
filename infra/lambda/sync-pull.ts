import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserId, SyncRecord } from "./types";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME!;

export async function handler(event: {
  queryStringParameters?: { since?: string; type?: string };
  requestContext: { authorizer?: { claims?: { sub?: string } } };
}) {
  const userId = getUserId(event);
  const since = event.queryStringParameters?.since;
  const typeFilter = event.queryStringParameters?.type;

  const pk = `USER#${userId}`;

  // Build query — optionally filter by updatedAt > since
  let expression = "pk = :pk";
  const values: Record<string, unknown> = { ":pk": pk };

  if (since) {
    expression += " AND updatedAt > :since";
    values[":since"] = since;
  }

  // If filtering by type, we need a filter expression (not key condition)
  let filterExpression: string | undefined;
  if (typeFilter) {
    filterExpression = "#type = :type";
    values[":type"] = typeFilter;
  }

  const result = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "pk = :pk",
    FilterExpression: filterExpression,
    ExpressionAttributeValues: values,
    ...(filterExpression ? { ExpressionAttributeNames: { "#type": "type" } } : {}),
  }));

  const records = (result.Items ?? []) as SyncRecord[];

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      records,
      syncedAt: new Date().toISOString(),
    }),
  };
}
