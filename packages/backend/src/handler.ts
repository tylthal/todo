import * as AWSXRay from 'aws-xray-sdk';
AWSXRay.captureAWS(require('aws-sdk'));
import { APIGatewayProxyHandler } from 'aws-lambda';
import { CORS_HEADERS, withErrorHandling } from './cors';

// Minimal Lambda function used during development. It simply returns a JSON
// payload. Real API logic would go here.

export const handler = withErrorHandling(async () => {
  // Respond with a simple greeting
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ message: 'Hello from backend' })
  };
});
