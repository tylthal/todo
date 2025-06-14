import { APIGatewayProxyHandler } from 'aws-lambda';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN as string,
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
};

export function withErrorHandling(fn: APIGatewayProxyHandler): APIGatewayProxyHandler {
  return async (event, context) => {
    try {
      return await fn(event, context);
    } catch (err) {
      console.error(err);
      return { statusCode: 500, headers: CORS_HEADERS, body: 'Internal Server Error' };
    }
  };
}
