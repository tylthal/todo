import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Context } from 'aws-lambda';

type AsyncHandler = (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>;

export function withErrorHandling(fn: AsyncHandler): APIGatewayProxyHandler {
  return async (event, context) => {
    try {
      return await fn(event, context);
    } catch (err) {
      console.error(err);
      return { statusCode: 500, body: 'Internal Server Error' };
    }
  };
}
