import * as AWSXRay from 'aws-xray-sdk';
AWSXRay.captureAWS(require('aws-sdk'));
import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB, ApiGatewayManagementApi } from 'aws-sdk';

const TABLE_NAME = process.env.TABLE_NAME as string;
const WS_ENDPOINT = process.env.WS_ENDPOINT as string;

const db = new DynamoDB.DocumentClient();
const api = WS_ENDPOINT ? new ApiGatewayManagementApi({ endpoint: WS_ENDPOINT }) : undefined;

export const subscribe: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId as string;
  const body = event.body ? JSON.parse(event.body) : {};
  const workspaceId = body.workspaceId;
  if (!workspaceId) {
    return { statusCode: 400, body: 'Missing workspaceId' };
  }

  await db
    .put({
      TableName: TABLE_NAME,
      Item: {
        PK: `WORKSPACE#${workspaceId}`,
        SK: `CONNECTION#${connectionId}`,
      },
    })
    .promise();

  return { statusCode: 200, body: 'Subscribed' };
};

export const unsubscribe: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId as string;
  const body = event.body ? JSON.parse(event.body) : {};
  const workspaceId = body.workspaceId;
  if (!workspaceId) {
    return { statusCode: 400, body: 'Missing workspaceId' };
  }

  await db
    .delete({
      TableName: TABLE_NAME,
      Key: {
        PK: `WORKSPACE#${workspaceId}`,
        SK: `CONNECTION#${connectionId}`,
      },
    })
    .promise();

  return { statusCode: 200, body: 'Unsubscribed' };
};

export const disconnect: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId as string;

  const scan = await db
    .scan({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(SK, :c)',
      ExpressionAttributeValues: {
        ':c': `CONNECTION#${connectionId}`,
      },
      ProjectionExpression: 'PK, SK',
    })
    .promise();

  const promises = (scan.Items || []).map((item) =>
    db
      .delete({ TableName: TABLE_NAME, Key: { PK: item.PK, SK: item.SK } })
      .promise()
  );
  await Promise.all(promises);

  return { statusCode: 200, body: 'Disconnected' };
};

export async function broadcastWorkspaceEvent(
  workspaceId: number | string,
  payload: any
): Promise<void> {
  if (!api) return;

  const res = await db
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk and begins_with(SK, :c)',
      ExpressionAttributeValues: {
        ':pk': `WORKSPACE#${workspaceId}`,
        ':c': 'CONNECTION#',
      },
    })
    .promise();

  const connections = res.Items || [];
  const data = JSON.stringify(payload);

  await Promise.all(
    connections.map(async (item) => {
      const id = (item.SK as string).slice('CONNECTION#'.length);
      try {
        await api!.postToConnection({ ConnectionId: id, Data: data }).promise();
      } catch (err: any) {
        if (err.statusCode === 410) {
          await db
            .delete({ TableName: TABLE_NAME, Key: { PK: item.PK, SK: item.SK } })
            .promise();
        }
      }
    })
  );
}
