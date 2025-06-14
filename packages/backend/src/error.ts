import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export type APIGatewayHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
) => Promise<APIGatewayProxyResult>;

export function withErrorHandling(fn: APIGatewayHandler): APIGatewayHandler {
  return async (event, context) => {
    try {
      return await fn(event, context);
    } catch (err) {
      console.error(err);
      return { statusCode: 500, body: 'Internal Server Error' };
    }
  };
}
