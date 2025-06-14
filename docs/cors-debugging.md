# CORS Debugging Guide

When the backend rejects requests due to incorrect CORS headers, use your browser's developer tools to verify the response.

1. **Open the Network panel**
   - In most browsers press `F12` to open Developer Tools and switch to the **Network** tab.
   - Reload the page so the requests appear in the list.
2. **Inspect the preflight request**
   - Find the `OPTIONS` call to your API endpoint and click it.
   - In the **Headers** section confirm the response includes:
     - `Access-Control-Allow-Origin`
     - `Access-Control-Allow-Methods`
     - `Access-Control-Allow-Headers`
3. **Inspect the actual request**
   - Locate the subsequent `GET` request for the same endpoint.
   - Check that the same CORS headers are present in this response as well.

CORS configuration is controlled by the `ALLOWED_ORIGIN` environment variable defined in
[`packages/backend/src/cors.ts`](../packages/backend/src/cors.ts). For `GET` requests
this value must exactly match your frontend's origin or the browser will reject the
response.
