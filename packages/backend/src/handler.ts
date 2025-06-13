import { APIGatewayProxyHandler } from 'aws-lambda';
import { CORS_HEADERS } from './cors';

// Minimal Lambda function used during development. It simply returns a JSON
// payload. Real API logic would go here.

export const handler: APIGatewayProxyHandler = async () => {
  // Respond with a simple greeting
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ message: 'Hello from backend' })
  };
};
